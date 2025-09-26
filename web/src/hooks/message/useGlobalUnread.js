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
import { useCallback, useEffect, useState } from 'react';
import { SSE } from 'sse.js';
import { authHeader, USER_ID_HEADER_KEY } from '../../helpers/auth';
import { getUserIdFromLocalStorage } from '../../helpers/utils';
import { fetchUnreadCount } from '../../services/message';

// Global unread manager: initialize via fetch, then keep in sync with SSE unread events.
export function useGlobalUnread() {
  const [unread, setUnread] = useState(0);
  const init = useCallback(async () => {
    try {
      const v = await fetchUnreadCount();
      setUnread(v);
    } catch (error) {
      console.warn('Failed to fetch unread count:', error);
      setUnread(0);
    }
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    let es = null;
    try {
      const headers = authHeader();
      if (headers && !headers[USER_ID_HEADER_KEY]) {
        const uid = getUserIdFromLocalStorage();
        if (uid && uid > 0) {
          headers[USER_ID_HEADER_KEY] = String(uid);
        }
      }
      if (!headers.Authorization) {
        return;
      }
      es = new SSE('/api/message/stream', { headers, withCredentials: true });
      es.addEventListener('unread', (e) => {
        try {
          const d = JSON.parse(e.data);
          if (typeof d.unread === 'number') setUnread(d.unread);
        } catch (_) {}
      });
      es.addEventListener('error', () => {
        console.warn('SSE connection error for unread count');
      });
    } catch (error) {
      console.warn('Failed to setup SSE for unread count:', error);
    }
    return () => {
      if (es) {
        try {
          es.close();
        } catch (_) {}
      }
    };
  }, []);

  return unread;
}
