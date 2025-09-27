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

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

/*
 * OptionsContext
 * 统一管理后端 OptionMap / 本地 options_cache 的解析、布尔与数值标准化、以及刷新机制。
 * 使用：
 * const { options, loading, refresh, getBool, getNumber } = useOptions();
 */

const BOOL_KEYS = new Set([
  'DisplayInCurrencyEnabled',
  'DisplayTokenStatEnabled',
  'DefaultCollapseSidebar',
  'DemoSiteEnabled',
  'SelfUseModeEnabled',
  'CheckinEnabled',
  'UIBlurGlassEnabled',
  'PasswordLoginEnabled',
  'PasswordRegisterEnabled',
  'EmailVerificationEnabled',
  'GitHubOAuthEnabled',
  'DiscordOAuthEnabled',
  'TelegramOAuthEnabled',
  'LinuxDOOAuthEnabled',
  'WeChatAuthEnabled',
  'TurnstileCheckEnabled',
  'RegisterEnabled',
  'AutomaticDisableChannelEnabled',
  'AutomaticEnableChannelEnabled',
  'LogConsumeEnabled',
  'DrawingEnabled',
  'TaskEnabled',
  'DataExportEnabled',
  'MjNotifyEnabled',
  'MjAccountFilterEnabled',
  'MjModeClearEnabled',
  'MjForwardUrlEnabled',
  'MjActionCheckSuccessEnabled',
  'CheckSensitiveEnabled',
  'ModelRequestRateLimitEnabled',
  'CheckSensitiveOnPromptEnabled',
  'StopOnSensitiveEnabled',
  'ExposeRatioEnabled',
  'LotteryEnabled'
]);

const NUMBER_KEYS = new Set([
  'CheckinMinReward',
  'CheckinMaxReward',
  'QuotaPerUnit',
  'RetryTimes',
  'USDExchangeRate',
  'SMTPPort',
  'Price',
  'MinTopUp',
  'StripeMinTopUp'
]);

function normalizeOptions(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw)) {
    if (BOOL_KEYS.has(k)) {
      out[k] = v === true || v === 'true';
    } else if (NUMBER_KEYS.has(k)) {
      const n = Number(v);
      out[k] = isNaN(n) ? v : n;
    } else {
      out[k] = v;
    }
  }
  return out;
}

const OptionsContext = createContext({
  options: {},
  loading: true,
  refresh: () => {},
  getBool: () => false,
  getNumber: () => 0,
});

export function OptionsProvider({ children }) {
  const [options, setOptions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 初始从 localStorage 预热，然后自动拉取一次最新公共 options
  useEffect(() => {
    try {
      const cache = localStorage.getItem('options_cache');
      if (cache) {
        const parsed = JSON.parse(cache);
        setOptions(normalizeOptions(parsed));
      }
    } catch {}
    // 立即触发一次后台刷新（不阻塞首屏）
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    let finalNormalized = null;
    try {
      // 优先使用新的公开端点（已类型化）
      let resp = await fetch('/api/options');
      if (resp.ok) {
        const json = await resp.json().catch(() => ({}));
        // /api/options => { success, data: {k:v} }
        const rawMap = json?.data && typeof json.data === 'object' ? json.data : {};
        finalNormalized = normalizeOptions(rawMap);
      } else {
        // 回退：尝试旧 Root 专用端点（需要数组 -> map）
        resp = await fetch('/api/option/');
        if (resp.ok) {
          const legacy = await resp.json().catch(() => ({}));
            const arr = Array.isArray(legacy?.data) ? legacy.data : [];
            const map = {};
            for (const item of arr) {
              if (item && item.key != null) {
                map[item.key] = item.value;
              }
            }
            finalNormalized = normalizeOptions(map);
        }
      }
      if (finalNormalized) {
        setOptions(finalNormalized);
        try { localStorage.setItem('options_cache', JSON.stringify(finalNormalized)); } catch {}
      }
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  const getBool = (k, def = false) => {
    const v = options[k];
    return typeof v === 'boolean' ? v : def;
  };
  const getNumber = (k, def = 0) => {
    const v = options[k];
    return typeof v === 'number' && !isNaN(v) ? v : def;
  };

  const value = useMemo(() => ({ options, loading, error, refresh, getBool, getNumber }), [options, loading, error]);

  return <OptionsContext.Provider value={value}>{children}</OptionsContext.Provider>;
}

export function useOptions() {
  return useContext(OptionsContext);
}

// 兼容性默认导出（可通过 import Options from '.../context/Options' 使用）
// 包含 Provider 与 Hook，避免外部代码误用默认导入导致构建失败
const Options = { OptionsProvider, useOptions };
export default Options;
