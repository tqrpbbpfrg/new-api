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

import {
    Avatar,
    Button,
    Card,
    Col,
    Row,
    Switch,
    Typography,
} from '@douyinfe/semi-ui';
import { Settings } from 'lucide-react';
import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StatusContext } from '../../../context/Status';
import { API, showError, showSuccess } from '../../../helpers';
import { useSidebar } from '../../../hooks/common/useSidebar';
import { useUserPermissions } from '../../../hooks/common/useUserPermissions';

const { Text } = Typography;

export default function SettingsSidebarModulesUser() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [statusState] = useContext(StatusContext);

  // 使用后端权限验证替代前端角色判断
  const {
    permissions,
    loading: permissionsLoading,
    hasSidebarSettingsPermission,
    isSidebarSectionAllowed,
    isSidebarModuleAllowed,
  } = useUserPermissions();

  // 使用useSidebar钩子获取刷新方法
  const { refreshUserConfig } = useSidebar();

  // 如果没有边栏设置权限，不显示此组件
  if (!permissionsLoading && !hasSidebarSettingsPermission()) {
    return null;
  }

  // 权限加载中，显示加载状态
  if (permissionsLoading) {
    return null;
  }

  // 根据用户权限生成默认配置
  const generateDefaultConfig = () => {
    const defaultConfig = {};
    // 控制台区域（已合并操练场）
    if (isSidebarSectionAllowed('console')) {
      defaultConfig.console = {
        enabled: true,
        detail: isSidebarModuleAllowed('console', 'detail') || isSidebarModuleAllowed('console', 'control'), // 兼容旧 control -> detail
        playground: isSidebarModuleAllowed('console', 'playground'),
        token: isSidebarModuleAllowed('console', 'token'),
        log: isSidebarModuleAllowed('console', 'log'),
        midjourney: isSidebarModuleAllowed('console', 'midjourney'),
        task: isSidebarModuleAllowed('console', 'task'),
      };
    }

    // 个人中心区域（新增信息中心 info 模块）
    if (isSidebarSectionAllowed('personal')) {
      defaultConfig.personal = {
        enabled: true,
        info: isSidebarModuleAllowed('personal', 'info'),
        topup: isSidebarModuleAllowed('personal', 'topup'),
        personal: isSidebarModuleAllowed('personal', 'personal'),
      };
    }

    // 管理员区域
    if (isSidebarSectionAllowed('admin')) {
      defaultConfig.admin = {
        enabled: true,
        channel: isSidebarModuleAllowed('admin', 'channel'),
        models: isSidebarModuleAllowed('admin', 'models'),
        redemption: isSidebarModuleAllowed('admin', 'redemption'),
        user: isSidebarModuleAllowed('admin', 'user'),
        setting: isSidebarModuleAllowed('admin', 'setting'),
      };
    }

    return defaultConfig;
  };

  // 用户个人左侧边栏模块设置
  const [sidebarModulesUser, setSidebarModulesUser] = useState({});

  // 管理员全局配置
  const [adminConfig, setAdminConfig] = useState(null);

  // 处理区域级别开关变更
  function handleSectionChange(sectionKey) {
    return (checked) => {
      const newModules = {
        ...sidebarModulesUser,
        [sectionKey]: {
          ...sidebarModulesUser[sectionKey],
          enabled: checked,
        },
      };
      setSidebarModulesUser(newModules);
      console.log('用户边栏区域配置变更:', sectionKey, checked, newModules);
    };
  }

  // 处理功能级别开关变更
  function handleModuleChange(sectionKey, moduleKey) {
    return (checked) => {
      const newModules = {
        ...sidebarModulesUser,
        [sectionKey]: {
          ...sidebarModulesUser[sectionKey],
          [moduleKey]: checked,
        },
      };
      setSidebarModulesUser(newModules);
      console.log(
        '用户边栏功能配置变更:',
        sectionKey,
        moduleKey,
        checked,
        newModules,
      );
    };
  }

  // 重置为默认配置（基于权限过滤）
  function resetSidebarModules() {
    const defaultConfig = generateDefaultConfig();
    setSidebarModulesUser(defaultConfig);
    showSuccess(t('已重置为默认配置'));
    console.log('用户边栏配置重置为默认:', defaultConfig);
  }

  // 保存配置
  async function onSubmit() {
    setLoading(true);
    try {
      console.log('保存用户边栏配置:', sidebarModulesUser);
      const res = await API.put('/api/user/self', {
        sidebar_modules: JSON.stringify(sidebarModulesUser),
      });
      const { success, message } = res.data;
      if (success) {
        showSuccess(t('保存成功'));
        console.log('用户边栏配置保存成功');

        // 刷新useSidebar钩子中的用户配置，实现实时更新
        await refreshUserConfig();
        console.log('用户边栏配置已刷新，边栏将立即更新');
      } else {
        showError(message);
        console.error('用户边栏配置保存失败:', message);
      }
    } catch (error) {
      showError(t('保存失败，请重试'));
      console.error('用户边栏配置保存异常:', error);
    } finally {
      setLoading(false);
    }
  }

  // 统一的配置加载逻辑
  useEffect(() => {
    const loadConfigs = async () => {
      try {
        // 获取管理员全局配置
        if (statusState?.status?.SidebarModulesAdmin) {
          const adminConf = JSON.parse(statusState.status.SidebarModulesAdmin);
          setAdminConfig(adminConf);
          console.log('加载管理员边栏配置:', adminConf);
        }

        // 获取用户个人配置
        const userRes = await API.get('/api/user/self');
        if (userRes.data.success && userRes.data.data.sidebar_modules) {
          let userConf;
          if (typeof userRes.data.data.sidebar_modules === 'string') {
            userConf = JSON.parse(userRes.data.data.sidebar_modules);
          } else {
            userConf = userRes.data.data.sidebar_modules;
          }
          console.log('从API加载的用户配置(原始):', userConf);

          // 迁移逻辑：chat.playground -> console.playground
          if (userConf.chat?.playground) {
            userConf.console = userConf.console || { enabled: true };
            if (!userConf.console.playground) {
              userConf.console.playground = userConf.chat.playground;
            }
          }
          // 迁移逻辑：console.control -> console.detail
          if (userConf.console?.control && !userConf.console.detail) {
            userConf.console.detail = userConf.console.control;
            delete userConf.console.control;
          }
          // 强制隐藏 chat 区域（不再展示）
          if (userConf.chat) {
            userConf.chat.enabled = false;
          }

          // 确保存在必要的 section（防止过滤后缺失导致 UI 崩溃）
            if (!userConf.console) userConf.console = { enabled: true };
            if (!userConf.personal) userConf.personal = { enabled: true };

          // 权限过滤
          const filteredUserConf = {};
          Object.keys(userConf).forEach((sectionKey) => {
            if (isSidebarSectionAllowed(sectionKey)) {
              filteredUserConf[sectionKey] = { ...userConf[sectionKey] };
              Object.keys(userConf[sectionKey]).forEach((moduleKey) => {
                if (moduleKey !== 'enabled' && !isSidebarModuleAllowed(sectionKey, moduleKey)) {
                  delete filteredUserConf[sectionKey][moduleKey];
                }
              });
            }
          });
          setSidebarModulesUser(filteredUserConf);
          console.log('权限过滤+迁移后的用户配置:', filteredUserConf);
        } else {
          const defaultConfig = generateDefaultConfig();
          setSidebarModulesUser(defaultConfig);
          console.log('用户无配置，使用默认配置:', defaultConfig);
        }
      } catch (error) {
        console.error('加载边栏配置失败:', error);
        // 出错时也使用默认配置
        const defaultConfig = generateDefaultConfig();
        setSidebarModulesUser(defaultConfig);
      }
    };

    // 只有权限加载完成且有边栏设置权限时才加载配置
    if (!permissionsLoading && hasSidebarSettingsPermission()) {
      loadConfigs();
    }
  }, [
    statusState,
    permissionsLoading,
    hasSidebarSettingsPermission,
    isSidebarSectionAllowed,
    isSidebarModuleAllowed,
  ]);

  // 检查功能是否被管理员允许
  const isAllowedByAdmin = (sectionKey, moduleKey = null) => {
    if (!adminConfig) return true;

    if (moduleKey) {
      return (
        adminConfig[sectionKey]?.enabled && adminConfig[sectionKey]?.[moduleKey]
      );
    } else {
      return adminConfig[sectionKey]?.enabled;
    }
  };

  // 区域配置数据（根据后端权限过滤）
  const sectionConfigs = [
    {
      key: 'console',
      title: t('控制台区域'),
      description: t('数据与任务、操练场等功能'),
      modules: [
        { key: 'detail', title: t('数据看板'), description: t('系统数据统计') },
        { key: 'playground', title: t('操练场'), description: t('AI模型测试环境') },
        { key: 'token', title: t('令牌管理'), description: t('API令牌管理') },
        { key: 'log', title: t('使用日志'), description: t('API使用记录') },
        { key: 'midjourney', title: t('绘图日志'), description: t('绘图任务记录') },
        { key: 'task', title: t('任务日志'), description: t('系统任务记录') },
      ],
    },
    {
      key: 'personal',
      title: t('个人中心区域'),
      description: t('信息中心与个人偏好'),
      modules: [
        { key: 'info', title: t('信息中心'), description: t('系统消息与通知') },
        { key: 'topup', title: t('钱包管理'), description: t('余额充值管理') },
        { key: 'personal', title: t('个人设置'), description: t('个人信息设置') },
      ],
    },
    {
      key: 'admin',
      title: t('管理员区域'),
      description: t('系统管理功能'),
      modules: [
        { key: 'channel', title: t('渠道管理'), description: t('API渠道配置') },
        { key: 'models', title: t('模型管理'), description: t('AI模型配置') },
        { key: 'redemption', title: t('兑换码管理'), description: t('兑换码生成管理') },
        { key: 'user', title: t('用户管理'), description: t('用户账户管理') },
        { key: 'setting', title: t('系统设置'), description: t('系统参数配置') },
      ],
    },
  ]
    .filter((section) => {
      // 使用后端权限验证替代前端角色判断
      return isSidebarSectionAllowed(section.key);
    })
    .map((section) => ({
      ...section,
      modules: section.modules.filter((module) =>
        isSidebarModuleAllowed(section.key, module.key),
      ),
    }))
    .filter(
      (section) =>
        // 过滤掉没有可用模块的区域
        section.modules.length > 0 && isAllowedByAdmin(section.key),
    );

  return (
    <Card className='info-center-panel !rounded-2xl border-0'>
      {/* 卡片头部 */}
      <div className='flex items-center mb-4'>
        <Avatar size='small' color='purple' className='mr-3 shadow-md'>
          <Settings size={16} />
        </Avatar>
        <div>
          <Typography.Text className='text-lg font-medium'>
            {t('左侧边栏个人设置')}
          </Typography.Text>
          <div className='text-xs text-gray-600'>
            {t('个性化设置左侧边栏的显示内容')}
          </div>
        </div>
      </div>

      <div className='mb-4'>
        <Text type='secondary' className='text-sm text-gray-600'>
          {t('您可以个性化设置侧边栏的要显示功能')}
        </Text>
      </div>

      {sectionConfigs.map((section) => (
        <div key={section.key} className='mb-6'>
          {/* 区域标题和总开关 */}
          <div className='info-center-section-head flex justify-between items-center mb-4 p-4 rounded-xl'>
            <div>
              <div className='font-semibold text-base text-gray-900 mb-1'>
                {section.title}
              </div>
              <Text className='text-xs text-gray-600'>
                {section.description}
              </Text>
            </div>
            <Switch
              checked={sidebarModulesUser[section.key]?.enabled}
              onChange={handleSectionChange(section.key)}
              size='default'
            />
          </div>

          {/* 功能模块网格 */}
          <Row gutter={[12, 12]}>
            {section.modules.map((module) => (
              <Col key={module.key} xs={24} sm={12} md={8} lg={6} xl={6}>
                <Card
                  className={`info-center-module !rounded-xl transition-all duration-200 ${
                    sidebarModulesUser[section.key]?.enabled ? '' : 'opacity-50'
                  }`}
                  bodyStyle={{ padding: '16px' }}
                  hoverable
                >
                  <div className='flex justify-between items-center h-full'>
                    <div className='flex-1 text-left'>
                      <div className='font-semibold text-sm text-gray-900 mb-1'>
                        {module.title}
                      </div>
                      <Text className='text-xs text-gray-600 leading-relaxed block'>
                        {module.description}
                      </Text>
                    </div>
                    <div className='ml-4'>
                      <Switch
                        checked={sidebarModulesUser[section.key]?.[module.key]}
                        onChange={handleModuleChange(section.key, module.key)}
                        size='default'
                        disabled={!sidebarModulesUser[section.key]?.enabled}
                      />
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      ))}

      {/* 底部按钮 */}
      <div className='flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200'>
        <Button
          type='tertiary'
          onClick={resetSidebarModules}
          className='!rounded-lg'
        >
          {t('重置为默认')}
        </Button>
        <Button
          type='primary'
          onClick={onSubmit}
          loading={loading}
          className='!rounded-lg'
        >
          {t('保存设置')}
        </Button>
      </div>
    </Card>
  );
}
