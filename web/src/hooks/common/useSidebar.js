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

import { useContext, useEffect, useMemo, useState } from 'react';
import { StatusContext } from '../../context/Status';
import { API } from '../../helpers';

// 创建一个全局事件系统来同步所有useSidebar实例
const sidebarEventTarget = new EventTarget();
const SIDEBAR_REFRESH_EVENT = 'sidebar-refresh';

export const useSidebar = () => {
  const [statusState] = useContext(StatusContext);
  const [userConfig, setUserConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  // 默认配置
  const defaultAdminConfig = {
    // chat 区域不再显示（兼容保留结构，enabled=false）
    chat: {
      enabled: false,
      chat: true,
      playground: true, // 兼容旧数据迁移用（最终转移到 console）
    },
    console: {
      enabled: true,
      control: true, // 工作台
      playground: true, // 操练场移动至控制台
      token: true, // 令牌管理
      log: true, // 使用日志
      midjourney: true,
      task: true,
    },
    personal: {
      enabled: true,
      info: true, // 信息中心
      entertainment: true, // 娱乐中心
      topup: true, // 钱包管理
      personal: true, // 个人设置
    },
    admin: {
      enabled: true,
      channel: true, // 渠道管理
      models: true, // 模型管理
      redemption: true, // 兑换码
      'lottery-prize': true, // 抽奖设置
      user: true, // 用户管理
      'admin-mail': true, // 邮件中心
      setting: true, // 系统管理
    },
  };

  // 获取管理员配置
  const adminConfig = useMemo(() => {
    let config = { ...defaultAdminConfig }; // 从默认配置开始

    if (statusState?.status?.SidebarModulesAdmin) {
      try {
        const backendConfig = JSON.parse(
          statusState.status.SidebarModulesAdmin,
        );

        // 合并后端配置到默认配置，确保新模块不会丢失
        Object.keys(config).forEach((sectionKey) => {
          if (backendConfig[sectionKey]) {
            config[sectionKey] = {
              ...config[sectionKey], // 保留默认配置
              ...backendConfig[sectionKey], // 用后端配置覆盖
            };
          }
        });

        // 兼容迁移：若 console.playground 缺失而 chat.playground 存在 => 迁移
        if (!config.console) config.console = { enabled: true };
        if (config.chat?.playground && !config.console.playground) {
          config.console.playground = config.chat.playground;
        }
        // 强制 chat.enabled=false（需求：不再单独显示聊天分组）
        if (config.chat) config.chat.enabled = false;
      } catch (error) {
        console.error('解析SidebarModulesAdmin配置失败:', error);
      }
    }

    return config;
  }, [statusState?.status?.SidebarModulesAdmin]);

  // 加载用户配置的通用方法
  const loadUserConfig = async () => {
    try {
      setLoading(true);
      const res = await API.get('/api/user/self');
      if (res.data.success && res.data.data.sidebar_modules) {
        let config;
        // 检查sidebar_modules是字符串还是对象
        if (typeof res.data.data.sidebar_modules === 'string') {
          config = JSON.parse(res.data.data.sidebar_modules);
        } else {
          config = res.data.data.sidebar_modules;
        }
        // 用户配置兼容迁移
        if (!config.console) config.console = { enabled: true };
        if (config.chat?.playground && !config.console.playground) {
          config.console.playground = config.chat.playground;
        }
        if (config.chat) config.chat.enabled = false; // 隐藏旧 chat 区域
        setUserConfig(config);
      } else {
        // 当用户没有配置时，生成一个基于管理员配置的默认用户配置
        // 这样可以确保权限控制正确生效
        const defaultUserConfig = {};
        Object.keys(adminConfig).forEach((sectionKey) => {
          if (adminConfig[sectionKey]?.enabled) {
            defaultUserConfig[sectionKey] = { enabled: true };
            // 为每个管理员允许的模块设置默认值为true
            Object.keys(adminConfig[sectionKey]).forEach((moduleKey) => {
              if (
                moduleKey !== 'enabled' &&
                adminConfig[sectionKey][moduleKey]
              ) {
                defaultUserConfig[sectionKey][moduleKey] = true;
              }
            });
          }
        });
        // 兼容：user 默认也确保 console.playground 存在
        if (
          defaultUserConfig.chat?.playground &&
          !defaultUserConfig.console.playground
        ) {
          defaultUserConfig.console.playground =
            defaultUserConfig.chat.playground;
        }
        if (defaultUserConfig.chat) defaultUserConfig.chat.enabled = false;
        setUserConfig(defaultUserConfig);
      }
    } catch (error) {
      // 出错时也生成默认配置，而不是设置为空对象
      const defaultUserConfig = {};
      Object.keys(adminConfig).forEach((sectionKey) => {
        if (adminConfig[sectionKey]?.enabled) {
          defaultUserConfig[sectionKey] = { enabled: true };
          Object.keys(adminConfig[sectionKey]).forEach((moduleKey) => {
            if (moduleKey !== 'enabled' && adminConfig[sectionKey][moduleKey]) {
              defaultUserConfig[sectionKey][moduleKey] = true;
            }
          });
        }
      });
      if (
        defaultUserConfig.chat?.playground &&
        !defaultUserConfig.console.playground
      ) {
        defaultUserConfig.console.playground =
          defaultUserConfig.chat.playground;
      }
      if (defaultUserConfig.chat) defaultUserConfig.chat.enabled = false;
      setUserConfig(defaultUserConfig);
    } finally {
      setLoading(false);
    }
  };

  // 刷新用户配置的方法（供外部调用）
  const refreshUserConfig = async () => {
    if (Object.keys(adminConfig).length > 0) {
      await loadUserConfig();
    }

    // 触发全局刷新事件，通知所有useSidebar实例更新
    sidebarEventTarget.dispatchEvent(new CustomEvent(SIDEBAR_REFRESH_EVENT));
  };

  // 加载用户配置
  useEffect(() => {
    // 只有当管理员配置加载完成后才加载用户配置
    if (Object.keys(adminConfig).length > 0) {
      loadUserConfig();
    }
  }, [adminConfig]);

  // 监听全局刷新事件
  useEffect(() => {
    const handleRefresh = () => {
      if (Object.keys(adminConfig).length > 0) {
        loadUserConfig();
      }
    };

    sidebarEventTarget.addEventListener(SIDEBAR_REFRESH_EVENT, handleRefresh);

    return () => {
      sidebarEventTarget.removeEventListener(
        SIDEBAR_REFRESH_EVENT,
        handleRefresh,
      );
    };
  }, [adminConfig]);

  // 计算最终的显示配置
  const finalConfig = useMemo(() => {
    const result = {};

    // 确保adminConfig已加载
    if (!adminConfig || Object.keys(adminConfig).length === 0) {
      return result;
    }

    // 如果userConfig未加载，等待加载完成
    if (!userConfig) {
      return result;
    }

    // 遍历所有区域
    Object.keys(adminConfig).forEach((sectionKey) => {
      const adminSection = adminConfig[sectionKey];
      const userSection = userConfig[sectionKey];

      // 如果管理员禁用了整个区域，则该区域不显示
      if (!adminSection?.enabled) {
        result[sectionKey] = { enabled: false };
        return;
      }

      // 区域级别：用户可以选择隐藏管理员允许的区域
      // 当userSection存在时检查enabled状态，否则默认为true
      const sectionEnabled = userSection ? userSection.enabled !== false : true;
      result[sectionKey] = { enabled: sectionEnabled };

      // 功能级别：只有管理员和用户都允许的功能才显示
      Object.keys(adminSection).forEach((moduleKey) => {
        if (moduleKey === 'enabled') return;

        const adminAllowed = adminSection[moduleKey];
        // 当userSection存在时检查模块状态，否则默认为true
        const userAllowed = userSection
          ? userSection[moduleKey] !== false
          : true;

        result[sectionKey][moduleKey] =
          adminAllowed && userAllowed && sectionEnabled;
      });
    });

    return result;
  }, [adminConfig, userConfig]);

  // 检查特定功能是否应该显示
  const isModuleVisible = (sectionKey, moduleKey = null) => {
    if (moduleKey) {
      const sectionConfig = finalConfig[sectionKey];
      if (!sectionConfig) return undefined; // 区域不存在，返回undefined
      if (moduleKey in sectionConfig) {
        return sectionConfig[moduleKey] === true;
      }
      return undefined; // 模块不存在于配置中，返回undefined
    } else {
      return finalConfig[sectionKey]?.enabled === true;
    }
  };

  // 检查区域是否有任何可见的功能
  const hasSectionVisibleModules = (sectionKey) => {
    const section = finalConfig[sectionKey];
    if (!section?.enabled) return false;

    return Object.keys(section).some(
      (key) => key !== 'enabled' && section[key] === true,
    );
  };

  // 获取区域的可见功能列表
  const getVisibleModules = (sectionKey) => {
    const section = finalConfig[sectionKey];
    if (!section?.enabled) return [];

    return Object.keys(section).filter(
      (key) => key !== 'enabled' && section[key] === true,
    );
  };

  return {
    loading,
    adminConfig,
    userConfig,
    finalConfig,
    isModuleVisible,
    hasSectionVisibleModules,
    getVisibleModules,
    refreshUserConfig,
  };
};
