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
/* Unified secureFetch wrapper to always attach Authorization & New-Api-User when available. */
import { authHeader, USER_ID_HEADER_KEY } from './auth';
import { getUserIdFromLocalStorage } from './utils';

const DEFAULT_TIMEOUT_MS = 20000; // 20s 默认超时，避免 fetch 长时间悬挂

export async function secureFetch(input, init = {}) {
  const {
    timeout = DEFAULT_TIMEOUT_MS,
    skipAuth = false,
    retries = 0,
    retryDelay = 300,
    retryOn = [408, 429, 500, 502, 503, 504],
  } = init;
  const controller = new AbortController();
  let timeoutId = null;
  if (timeout > 0) {
    timeoutId = setTimeout(() => controller.abort('timeout'), timeout);
  }
  const baseHeaders = authHeader();
  // 可能调用方已传 headers
  const merged = new Headers(init.headers || {});
  if (!skipAuth) {
    if (baseHeaders.Authorization && !merged.has('Authorization')) {
      merged.set('Authorization', baseHeaders.Authorization);
    }
    const uid = baseHeaders[USER_ID_HEADER_KEY] || getUserIdFromLocalStorage();
    if (uid && parseInt(uid) > 0 && !merged.has(USER_ID_HEADER_KEY)) {
      merged.set(USER_ID_HEADER_KEY, String(uid));
    }
  }
  let attempt = 0;
  let lastError = null;
  const method = (init.method || 'GET').toUpperCase();
  const idempotent = ['GET', 'HEAD', 'OPTIONS'].includes(method);
  while (attempt <= retries) {
    try {
      const res = await fetch(input, {
        ...init,
        signal: controller.signal,
        headers: merged,
        credentials: init.credentials || 'include',
      });
      if (attempt < retries && retryOn.includes(res.status) && idempotent) {
        await new Promise((r) =>
          setTimeout(r, retryDelay * Math.pow(2, attempt)),
        ); // exponential backoff
        attempt++;
        continue;
      }
      return res;
    } catch (e) {
      lastError = e;
      if (e.name === 'AbortError') {
        // 超时不再重试（也可以按需允许重试）
        throw new Error(`请求超时: ${input}`);
      }
      if (!(attempt < retries && idempotent)) {
        throw e;
      }
      await new Promise((r) =>
        setTimeout(r, retryDelay * Math.pow(2, attempt)),
      );
    }
    attempt++;
  }
  if (lastError) throw lastError;
  throw new Error('请求失败且无具体错误');
}

export async function secureJson(input, init = {}) {
  const res = await secureFetch(input, init);
  let data = null;
  try {
    data = await res.json();
  } catch (_) {}
  return { res, data };
}
