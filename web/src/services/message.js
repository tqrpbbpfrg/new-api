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
import { showError, showSuccess } from '../helpers';
import { authHeader } from '../helpers/auth';
import { secureFetch } from '../helpers/secureFetch';

function buildHeaders() {
  const headers = authHeader();
  return headers && Object.keys(headers).length > 0 ? headers : {};
}

export async function fetchUnreadCount() {
  try {
    // 若未登录直接返回 0，避免 401 触发组件异常渲染路径
    const raw = localStorage.getItem('user');
    if (!raw) return 0;
    const headers = buildHeaders();
    const res = await secureFetch('/api/message/unread_count', { headers });
    if (res.status === 401) return 0; // 防止未登录 / 过期导致初始化阶段抛错
    const data = await res.json();
    if (!data.success) return 0;
    return data.data.unread || 0;
  } catch (e) {
    return 0;
  }
}

export async function listMessages(after = 0, size = 20) {
  const qs = new URLSearchParams();
  if (after > 0) qs.set('after', after);
  if (size) qs.set('size', size);
  const headers = buildHeaders();
  const res = await secureFetch(`/api/message/list?${qs.toString()}`, {
    headers,
  });
  const data = await res.json();
  if (!data.success) {
    showError(data.message || '加载失败');
    return { items: [], total: 0, size, next_after: 0 };
  }
  return data.data;
}

export async function listSent(after = 0, size = 20) {
  const qs = new URLSearchParams();
  if (after > 0) qs.set('after', after);
  if (size) qs.set('size', size);
  const headers = buildHeaders();
  const res = await secureFetch(`/api/message/sent?${qs.toString()}`, {
    headers,
  });
  const data = await res.json();
  if (!data.success) {
    showError(data.message || '加载失败');
    return { items: [], total: 0, size, next_after: 0 };
  }
  return data.data;
}

export async function getThread(id) {
  const headers = buildHeaders();
  const res = await secureFetch(`/api/message/thread/${id}`, { headers });
  const data = await res.json();
  if (!data.success) {
    showError(data.message || '加载失败');
    return null;
  }
  return data.data;
}

export async function markRead(ids) {
  try {
    const base = buildHeaders();
    const res = await secureFetch('/api/message/mark_read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...base },
      body: JSON.stringify({ ids }),
    });
    const data = await res.json();
    if (!data.success) showError(data.message || '标记失败');
  } catch (e) {
    showError('网络错误');
  }
}

export async function markAllRead() {
  try {
    const headers = buildHeaders();
    const res = await secureFetch('/api/message/mark_all_read', {
      method: 'POST',
      headers,
    });
    const data = await res.json();
    if (!data.success) showError(data.message || '操作失败');
    else showSuccess('已全部标记已读');
  } catch (e) {
    showError('网络错误');
  }
}

export async function searchUsersSimple(q) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  const res = await fetch('/api/user/search_simple?' + params.toString(), {
    credentials: 'include',
  });
  const data = await res.json();
  if (!data.success) return [];
  return data.data.items || [];
}

export async function listAnnouncements() {
  const headers = buildHeaders();
  const res = await secureFetch('/api/announcements', { headers });
  const data = await res.json();
  if (!data.success) return [];
  return data.data.items || [];
}

export async function sendMessage(payload) {
  const base = buildHeaders();
  const res = await secureFetch('/api/message/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...base },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.success) {
    showError(data.message || '发送失败');
    return null;
  }
  showSuccess('发送成功');
  return data.data;
}

export async function fetchMessageStats(id) {
  const headers = buildHeaders();
  const res = await secureFetch(`/api/message/stats/${id}`, { headers });
  const data = await res.json();
  if (!data.success) {
    showError(data.message || '加载失败');
    return null;
  }
  return data.data;
}

export async function fetchBroadcastSummary(limit = 20) {
  const qs = new URLSearchParams();
  if (limit) qs.set('limit', limit);
  const headers = buildHeaders();
  const res = await secureFetch(
    '/api/message/broadcast_summary?' + qs.toString(),
    { headers },
  );
  const data = await res.json();
  if (!data.success) {
    showError(data.message || '加载失败');
    return { items: [] };
  }
  return data.data;
}
