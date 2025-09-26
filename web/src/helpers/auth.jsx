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

import { Navigate } from 'react-router-dom';
import { history } from './history';

// 统一使用的用户 ID 头字段名称（后端读取 New-Api-User）
export const USER_ID_HEADER_KEY = 'New-Api-User';

export function authHeader() {
  // 构造包含 Authorization 与 New-Api-User 的请求头
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return {};
    const user = JSON.parse(raw);
    if (!user || !user.token || typeof user.id === 'undefined' || user.id === null) return {};
    return {
      Authorization: 'Bearer ' + user.token,
      [USER_ID_HEADER_KEY]: String(user.id),
    };
  } catch (_) {
    return {};
  }
}

// Lightweight login state detector – used to avoid unauthenticated API calls during app bootstrap
export function isLoggedIn(){
  try {
    const raw = localStorage.getItem('user');
    if(!raw) return false;
    const u = JSON.parse(raw);
    return !!(u && u.token);
  } catch(_) { return false; }
}

export const AuthRedirect = ({ children }) => {
  const user = localStorage.getItem('user');

  if (user) {
    return <Navigate to='/console' replace />;
  }

  return children;
};

function PrivateRoute({ children }) {
  if (!localStorage.getItem('user')) {
    return <Navigate to='/login' state={{ from: history.location }} />;
  }
  return children;
}

export function AdminRoute({ children }) {
  const raw = localStorage.getItem('user');
  if (!raw) {
    return <Navigate to='/login' state={{ from: history.location }} />;
  }
  try {
    const user = JSON.parse(raw);
    if (user && typeof user.role === 'number' && user.role >= 10) {
      return children;
    }
  } catch (e) {
    // ignore
  }
  return <Navigate to='/forbidden' replace />;
}

export { PrivateRoute };

