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

import { useEffect, useMemo, useState } from 'react';
import { useAnnouncements } from './useAnnouncements';
import { useGlobalUnread } from './useGlobalUnread';

// Combine inbox unread (messages) + announcement unread (local tracking)
export function useUnifiedUnread() {
  const inboxUnread = useGlobalUnread();
  const { items: announcements } = useAnnouncements();
  const [announcementUnread, setAnnouncementUnread] = useState(0);

  useEffect(() => {
    if (!announcements || announcements.length === 0) {
      setAnnouncementUnread(0);
      return;
    }
    let readKeys = [];
    try {
      readKeys = JSON.parse(localStorage.getItem('notice_read_keys')) || [];
    } catch (_) {
      readKeys = [];
    }
    const readSet = new Set(readKeys);
    const getKey = (a) =>
      `${a?.date || a?.publishDate || ''}-${(a?.content || '').slice(0, 30)}`;
    const unread = announcements.filter((a) => !readSet.has(getKey(a))).length;
    setAnnouncementUnread(unread);
  }, [announcements]);

  const total = useMemo(
    () => (inboxUnread || 0) + (announcementUnread || 0),
    [inboxUnread, announcementUnread],
  );
  return { total, inboxUnread, announcementUnread };
}
