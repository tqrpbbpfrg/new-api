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
import { useEffect, useRef } from 'react';
import { SSE } from 'sse.js';
import { authHeader, USER_ID_HEADER_KEY } from '../../helpers/auth';
import { getUserIdFromLocalStorage } from '../../helpers/utils';

// Enhanced realtime hook supporting Last-Event-ID replay (server now supports backlog fill)
export function useMessageRealtime({ onUnread, onMessage } = {}) {
  const lastIdRef = useRef(0);

  useEffect(() => {
    let es = null;
    let closed = false;
    let retryTimer = null;

    const connect = () => {
      if (closed) return;

      try {
        const userHeaders = authHeader();
        // 若未登录则不建立 SSE
        if (!userHeaders || !userHeaders.Authorization) {
          return;
        }

        const headers = { ...userHeaders };
        if (!headers[USER_ID_HEADER_KEY]) {
          const uid = getUserIdFromLocalStorage();
          if (uid && uid > 0) {
            headers[USER_ID_HEADER_KEY] = String(uid);
          }
        }
        if (lastIdRef.current > 0) {
          headers['Last-Event-ID'] = String(lastIdRef.current);
        }

        es = new SSE('/api/message/stream', { headers, withCredentials: true });

        es.addEventListener('unread', (e) => {
          try {
            const d = JSON.parse(e.data);
            onUnread && onUnread(d.unread);
          } catch (_) {}
        });

        es.addEventListener('message', (e) => {
          try {
            const d = JSON.parse(e.data);
            if (d.id) {
              lastIdRef.current = Math.max(lastIdRef.current, d.id);
              onMessage && onMessage(d);
            }
          } catch (_) {}
        });

        es.addEventListener('error', () => {
          if (closed) return;
          try {
            if (es) es.close();
          } catch (_) {}

          retryTimer = setTimeout(() => {
            if (!closed) connect();
          }, 2000);
        });
      } catch (error) {
        console.warn('Failed to setup message realtime connection:', error);
        if (!closed) {
          retryTimer = setTimeout(() => {
            if (!closed) connect();
          }, 5000);
        }
      }
    };

    connect();

    return () => {
      closed = true;
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      if (es) {
        try {
          es.close();
        } catch (_) {}
      }
    };
  }, [onUnread, onMessage]);
}
