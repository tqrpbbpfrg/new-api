/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { getAnnouncementReadKeys } from '../helpers/announcementRead';

const UnreadContext = createContext(null);
export function UnreadProvider({ children }) {
  const [state, setState] = useState({
    announcements: 0,
    messages: 0,
    total: 0,
    loading: false,
    ts: 0,
  });
  const fetching = useRef(false);
  const debounceTimer = useRef(null);
  const cacheRef = useRef({ annsHash: '', expires: 0 });

  const compute = useCallback(async (force = false) => {
    if (fetching.current) return;
    fetching.current = true;
    try {
      setState((s) => ({ ...s, loading: true }));
      // announcements
      let annUnread = 0;
      let anns = [];
      let needFetch = true;
      const now = Date.now();
      if (!force && cacheRef.current.expires > now) {
        needFetch = false;
        anns = cacheRef.current.lastAnns || [];
      }
      if (needFetch) {
        try {
          const r = await fetch('/api/announcements', {
            credentials: 'include',
          });
          const j = await r.json();
          if (j.success) anns = j.data.items || [];
        } catch {}
        const hash = anns
          .map((a) => (a.date || '') + (a.content || '').slice(0, 30))
          .join('|');
        cacheRef.current = {
          lastAnns: anns,
          annsHash: hash,
          expires: now + 60000,
        }; // 60s TTL
      }
      const readKeys = getAnnouncementReadKeys();
      const readSet = new Set(readKeys);
      const getKey = (a) => `${a.date || ''}-${(a.content || '').slice(0, 30)}`;
      annUnread = anns.filter((a) => !readSet.has(getKey(a))).length;
      // messages
      let msgUnread = 0;
      try {
        const r = await fetch('/api/message/unread_count', {
          credentials: 'include',
        });
        const j = await r.json();
        if (j.success) msgUnread = j.data.unread || 0;
      } catch {}
      setState({
        announcements: annUnread,
        messages: msgUnread,
        total: annUnread + msgUnread,
        loading: false,
        ts: Date.now(),
      });
    } finally {
      fetching.current = false;
    }
  }, []);

  useEffect(() => {
    compute();
  }, [compute]);
  useEffect(() => {
    const schedule = (e) => {
      // inbox-incremental 事件可携带 detail.increment = 1 之类信息
      if (
        e?.type === 'inbox-incremental' &&
        e?.detail &&
        typeof e.detail.increment === 'number'
      ) {
        setState((s) => {
          const messages = s.messages + e.detail.increment;
          return { ...s, messages, total: messages + s.announcements };
        });
        return; // 不触发重新拉取，延迟全量校准
      }
      if (debounceTimer.current) return; // batch rapid events
      debounceTimer.current = setTimeout(() => {
        debounceTimer.current = null;
        compute();
      }, 300);
    };
    window.addEventListener('announcements-marked-read', schedule);
    window.addEventListener('inbox-incremental', schedule);
    return () => {
      window.removeEventListener('announcements-marked-read', schedule);
      window.removeEventListener('inbox-incremental', schedule);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [compute]);

  return (
    <UnreadContext.Provider
      value={{ ...state, refresh: (opts) => compute(opts?.force) }}
    >
      {children}
    </UnreadContext.Provider>
  );
}
export function useUnread() {
  return (
    useContext(UnreadContext) || {
      announcements: 0,
      messages: 0,
      total: 0,
      loading: false,
      refresh: () => {},
    }
  );
}
