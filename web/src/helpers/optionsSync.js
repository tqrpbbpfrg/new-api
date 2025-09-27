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

/**
 * 同步开关设置到本地存储的通用工具函数
 * 确保前端配置开关在保存后立即生效，防止页面刷新后状态丢失
 */

/**
 * 将指定的开关配置同步到 localStorage
 * @param {Array} updateArray - 需要更新的配置项数组
 * @param {Object} inputs - 当前表单输入值
 * @param {Array} switchKeys - 需要同步的开关键名数组
 * @param {Object} specialMappings - 特殊映射关系（可选）
 */
export function syncSwitchesToLocalStorage(
  updateArray,
  inputs,
  switchKeys,
  specialMappings = {},
) {
  const hasSwitchUpdates = updateArray.some((i) => switchKeys.includes(i.key));

  if (!hasSwitchUpdates) return;

  try {
    // 获取当前缓存
    const cache = localStorage.getItem('options_cache');
    let options = {};
    if (cache) {
      options = JSON.parse(cache);
    }

    // 更新所有变更的开关
    switchKeys.forEach((key) => {
      if (key in inputs) {
        const value = String(inputs[key]);
        localStorage.setItem(key, value);
        options[key] = inputs[key];

        // 处理特殊映射关系
        if (specialMappings[key]) {
          specialMappings[key].forEach((specialKey) => {
            localStorage.setItem(specialKey, value);
          });
        }
      }
    });

    // 更新 options_cache
    localStorage.setItem('options_cache', JSON.stringify(options));

    // 触发全局事件通知其他组件配置已更新
    window.dispatchEvent(new Event('options-updated'));
  } catch (e) {
    console.warn('Failed to sync switches to localStorage:', e);
  }
}

/**
 * 预定义的开关分类配置
 */
export const SWITCH_CATEGORIES = {
  // 通用设置开关
  GENERAL: [
    'CheckinEnabled',
    'DisplayInCurrencyEnabled',
    'DisplayTokenStatEnabled',
    'DefaultCollapseSidebar',
    'DemoSiteEnabled',
    'SelfUseModeEnabled',
  ],

  // 毛玻璃UI设置
  UI_BLUR: ['UIBlurGlassEnabled', 'UIBlurGlassStrength', 'UIBlurGlassArea'],

  // 监控设置开关
  MONITORING: [
    'AutomaticDisableChannelEnabled',
    'AutomaticEnableChannelEnabled',
  ],

  // 绘图功能开关
  DRAWING: [
    'DrawingEnabled',
    'MjNotifyEnabled',
    'MjAccountFilterEnabled',
    'MjModeClearEnabled',
    'MjForwardUrlEnabled',
    'MjActionCheckSuccessEnabled',
  ],

  // 敏感词过滤开关
  SENSITIVE: [
    'CheckSensitiveEnabled',
    'CheckSensitiveOnPromptEnabled',
    'StopOnSensitiveEnabled',
  ],

  // 日志设置开关
  LOG: ['LogConsumeEnabled'],

  // 速率限制开关
  RATE_LIMIT: ['ModelRequestRateLimitEnabled'],

  // 身份验证开关
  AUTH: [
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
  ],

  // 任务和功能开关
  FEATURES: ['TaskEnabled', 'DataExportEnabled', 'LotteryEnabled'],
};

/**
 * 特殊映射关系：某些开关需要同时更新到多个 localStorage 键
 */
export const SPECIAL_MAPPINGS = {
  // DefaultCollapseSidebar 需要同时更新到 default_collapse_sidebar
  DefaultCollapseSidebar: ['default_collapse_sidebar'],

  // MjNotifyEnabled 需要同时更新到 mj_notify_enabled
  MjNotifyEnabled: ['mj_notify_enabled'],

  // DrawingEnabled 需要同时更新到 enable_drawing
  DrawingEnabled: ['enable_drawing'],

  // DisplayInCurrencyEnabled 需要同时更新到 display_in_currency
  DisplayInCurrencyEnabled: ['display_in_currency'],

  // TaskEnabled 需要同时更新到 enable_task
  TaskEnabled: ['enable_task'],

  // DataExportEnabled 需要同时更新到 enable_data_export
  DataExportEnabled: ['enable_data_export'],
};

/**
 * 便捷方法：根据分类同步开关
 * @param {Array} updateArray - 需要更新的配置项数组
 * @param {Object} inputs - 当前表单输入值
 * @param {string} category - 开关分类名称
 */
export function syncSwitchCategory(updateArray, inputs, category) {
  const switchKeys = SWITCH_CATEGORIES[category];
  if (!switchKeys) {
    console.warn(`Unknown switch category: ${category}`);
    return;
  }

  // 获取该分类下的特殊映射关系
  const categoryMappings = {};
  switchKeys.forEach((key) => {
    if (SPECIAL_MAPPINGS[key]) {
      categoryMappings[key] = SPECIAL_MAPPINGS[key];
    }
  });

  syncSwitchesToLocalStorage(updateArray, inputs, switchKeys, categoryMappings);
}
