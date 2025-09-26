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

function headers() {
  const h = authHeader();
  return h && Object.keys(h).length ? h : {};
}

// send admin bulk / targeted mail
export async function adminSendMail(payload) {
  try {
    const res = await secureFetch('/api/admin/mail/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers() },
      body: JSON.stringify(payload),
    });
    let data = {};
    try {
      data = await res.json();
    } catch (e) {
      /* ignore */
    }
    if (res.status !== 200 || !data || data.error) {
      showError((data && data.error) || '发送失败');
      return null;
    }
    showSuccess('发送任务完成');
    return data;
  } catch (e) {
    showError('网络错误');
    return null;
  }
}

// helper to parse uid textarea content
export function parseUIDText(text) {
  if (!text) return [];
  return Array.from(
    new Set(
      text
        .split(/[^0-9]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((v) => Number(v))
        .filter((n) => Number.isInteger(n) && n > 0),
    ),
  );
}
