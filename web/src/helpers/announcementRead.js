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
/* Central helper for announcement read tracking */
export function getAnnouncementReadKeys() {
  try {
    return JSON.parse(localStorage.getItem('notice_read_keys')) || [];
  } catch (_) {
    return [];
  }
}
export function addAnnouncementsAsRead(annList) {
  if (!Array.isArray(annList) || annList.length === 0) return;
  const prev = getAnnouncementReadKeys();
  const getKey = (a) =>
    `${a.date || a.publishDate || ''}-${(a.content || '').slice(0, 30)}`;
  const merged = Array.from(new Set([...prev, ...annList.map(getKey)]));
  localStorage.setItem('notice_read_keys', JSON.stringify(merged));
  return merged;
}
export function hasAnnouncementRead(ann) {
  const keys = getAnnouncementReadKeys();
  const getKey = (a) =>
    `${a.date || a.publishDate || ''}-${(a.content || '').slice(0, 30)}`;
  return keys.includes(getKey(ann));
}
