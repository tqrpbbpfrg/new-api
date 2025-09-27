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

import { ChevronLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { useUnread } from '../../context/Unread';
import { isAdmin, isRoot, showError } from '../../helpers';
import { getLucideIcon } from '../../helpers/render';
import { useMinimumLoadingTime } from '../../hooks/common/useMinimumLoadingTime';
import { useSidebar } from '../../hooks/common/useSidebar';
import { useSidebarCollapsed } from '../../hooks/common/useSidebarCollapsed';
import { useBlurGlass } from '../../hooks/ui/useBlurGlass';
import SkeletonWrapper from './components/SkeletonWrapper';

import { Badge, Button, Divider, Nav, Tag, Tooltip } from '@douyinfe/semi-ui';
import { API } from '../../helpers';
const routerMap = {
  home: '/',
  channel: '/console/channel',
  token: '/console/token',
  redemption: '/console/redemption',
  topup: '/console/topup',
  user: '/console/user',
  log: '/console/log',
  midjourney: '/console/midjourney',
  setting: '/console/setting',
  about: '/about',
  detail: '/console',
  pricing: '/pricing',
  task: '/console/task',
  checkin: '/console/checkin',
  models: '/console/models',
  playground: '/console/playground',
  personal: '/console/personal',
  control: '/control',
  info: '/console/info',
  entertainment: '/console/entertainment',
};

const SiderBar = ({ onNavigate = () => {} }) => {
  const { t } = useTranslation();
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const {
    isModuleVisible,
    hasSectionVisibleModules,
    loading: sidebarLoading,
  } = useSidebar();

  const showSkeleton = useMinimumLoadingTime(sidebarLoading);

  const [selectedKeys, setSelectedKeys] = useState(['home']);
  const [chatItems, setChatItems] = useState([]);
  const [openedKeys, setOpenedKeys] = useState([]);
  const location = useLocation();
  const [routerMapState, setRouterMapState] = useState(routerMap);

  // ===== 奖励窗口（免费 / 双倍）状态与计时 =====
  const [windows, setWindows] = useState({
    free_quota_until: 0,
    double_cost_until: 0,
    now: 0,
  });
  // 周期性拉取用户窗口信息
  useEffect(() => {
    const fetchWin = async () => {
      try {
        const r = await API.get('/api/user/self');
        if (r.data?.success) {
          const d = r.data.data || {};
          setWindows((w) => ({
            ...w,
            free_quota_until: d.free_quota_until || 0,
            double_cost_until: d.double_cost_until || 0,
            now: Math.floor(Date.now() / 1000),
          }));
        }
      } catch (e) {
        // 静默失败
      }
    };
    fetchWin();
    const iv = setInterval(fetchWin, 30000);
    return () => clearInterval(iv);
  }, []);
  // 本地秒更新
  useEffect(() => {
    const iv = setInterval(
      () => setWindows((w) => ({ ...w, now: w.now + 1 })),
      1000,
    );
    return () => clearInterval(iv);
  }, []);

  const renderWindows = () => {
    const { free_quota_until, double_cost_until, now } = windows;
    if (free_quota_until <= now && double_cost_until <= now) return null;
    const pillStyle = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 6px',
      borderRadius: 4,
      fontSize: 12,
      background: 'var(--semi-color-bg-1)',
      marginRight: 6,
    };
    const remainFmt = (sec) => {
      if (sec <= 0) return '0s';
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = sec % 60;
      if (h > 0) return `${h}h${m.toString().padStart(2, '0')}m`;
      if (m > 0) return `${m}m${s.toString().padStart(2, '0')}s`;
      return `${s}s`;
    };
    return (
      <div
        style={{
          padding: '8px 12px 4px',
          borderTop: '1px solid var(--semi-color-border)',
          marginTop: 8,
        }}
      >
        {free_quota_until > now && (
          <Tooltip content={t('免费调用期内调用不扣额度')}>
            <span style={pillStyle}>
              <Tag color='green' size='small'>
                {t('免费期剩余')}
              </Tag>
              {remainFmt(free_quota_until - now)}
            </span>
          </Tooltip>
        )}
        {double_cost_until > now && (
          <Tooltip content={t('双倍消耗期内调用扣费翻倍')}>
            <span style={pillStyle}>
              <Tag color='red' size='small'>
                {t('双倍期剩余')}
              </Tag>
              {remainFmt(double_cost_until - now)}
            </span>
          </Tooltip>
        )}
      </div>
    );
  };

  const workspaceItems = useMemo(() => {
    const items = [
      { text: t('工作台'), itemKey: 'control', to: '/control' },
      { text: t('操练场'), itemKey: 'playground', to: '/console/playground' },
      { text: t('令牌管理'), itemKey: 'token', to: '/console/token' },
      { text: t('使用日志'), itemKey: 'log', to: '/console/log' },
    ];
    return items.filter((item) => isModuleVisible('console', item.itemKey));
  }, [t, isModuleVisible]);

  const { total:infoUnread } = useUnread() || { total:0 };

  const financeItems = useMemo(() => {
    const items = [
      {
        text: (
          <span className='flex items-center gap-1'>
            {t('信息中心')}
            {infoUnread>0 && <Badge count={infoUnread} overflowCount={99} type='danger' style={{ transform:'scale(0.75)' }} />}
          </span>
        ),
        rawText: t('信息中心'),
        itemKey: 'info',
        to: '/console/info',
      },
      {
        text: t('娱乐中心'),
        itemKey: 'entertainment',
        to: '/console/entertainment',
      },
      {
        text: t('钱包管理'),
        itemKey: 'topup',
        to: '/console/topup',
      },
      {
        text: t('个人设置'),
        itemKey: 'personal',
        to: '/console/personal',
      },
    ];

    const filteredItems = items.filter((item) => {
      const configVisible = isModuleVisible('personal', item.itemKey);
      return configVisible;
    });
    return filteredItems;
  }, [t, isModuleVisible, infoUnread]);

  const adminItems = useMemo(() => {
    const items = [
      {
        text: t('渠道管理'),
        itemKey: 'channel',
        to: '/console/channel',
        className: isAdmin() ? '' : 'tableHiddle',
      },
      {
        text: t('抽奖奖品'),
        itemKey: 'lottery-prize',
        to: '/console/entertainment/admin',
        className: isAdmin() ? '' : 'tableHiddle',
      },
      {
        text: t('抽奖券兑换码'),
        itemKey: 'lottery-codes',
        to: '/console/entertainment/admin/codes',
        className: isAdmin() ? '' : 'tableHiddle',
      },
      {
        text: t('模型管理'),
        itemKey: 'models',
        to: '/console/models',
        className: isAdmin() ? '' : 'tableHiddle',
      },
      {
        text: t('兑换码管理'),
        itemKey: 'redemption',
        to: '/console/redemption',
        className: isAdmin() ? '' : 'tableHiddle',
      },
      {
        text: t('用户管理'),
        itemKey: 'user',
        to: '/console/user',
        className: isAdmin() ? '' : 'tableHiddle',
      },
      {
        text: t('邮件'),
        itemKey: 'admin-mail',
        to: '/console/admin/mail',
        className: isAdmin() ? '' : 'tableHiddle',
      },
      {
        text: t('系统设置'),
        itemKey: 'setting',
        to: '/console/setting',
        className: isRoot() ? '' : 'tableHiddle',
      },
    ];

    // 根据配置过滤项目
    const filteredItems = items.filter((item) => {
      const configVisible = isModuleVisible('admin', item.itemKey);
      return configVisible;
    });

    return filteredItems;
  }, [isAdmin(), isRoot(), t, isModuleVisible]);

  const chatMenuItems = useMemo(() => {
    const items = [
      {
        text: t('操练场'),
        itemKey: 'playground',
        to: '/console/playground',
      },
      {
        text: t('聊天'),
        itemKey: 'chat',
        items: chatItems,
      },
    ];

    // 根据配置过滤项目
    const filteredItems = items.filter((item) => {
      const configVisible = isModuleVisible('chat', item.itemKey);
      return configVisible;
    });

    return filteredItems;
  }, [chatItems, t, isModuleVisible]);

  // 更新路由映射，添加聊天路由
  const updateRouterMapWithChats = (chats) => {
    const newRouterMap = { ...routerMap };

    if (Array.isArray(chats) && chats.length > 0) {
      for (let i = 0; i < chats.length; i++) {
        newRouterMap['chat' + i] = '/console/chat/' + i;
      }
    }

    setRouterMapState(newRouterMap);
    return newRouterMap;
  };

  // 加载聊天项
  useEffect(() => {
    let chats = localStorage.getItem('chats');
    if (chats) {
      try {
        chats = JSON.parse(chats);
        if (Array.isArray(chats)) {
          let chatItems = [];
          for (let i = 0; i < chats.length; i++) {
            let shouldSkip = false;
            let chat = {};
            for (let key in chats[i]) {
              let link = chats[i][key];
              if (typeof link !== 'string') continue; // 确保链接是字符串
              if (link.startsWith('fluent')) {
                shouldSkip = true;
                break; // 跳过 Fluent Read
              }
              chat.text = key;
              chat.itemKey = 'chat' + i;
              chat.to = '/console/chat/' + i;
            }
            if (shouldSkip || !chat.text) continue; // 避免推入空项
            chatItems.push(chat);
          }
          setChatItems(chatItems);
          updateRouterMapWithChats(chats);
        }
      } catch (e) {
        showError('聊天数据解析失败');
      }
    }
  }, []);

  // 根据当前路径设置选中的菜单项
  useEffect(() => {
    const currentPath = location.pathname;
    let matchingKey = Object.keys(routerMapState).find(
      (key) => routerMapState[key] === currentPath,
    );

    // 处理聊天路由
    if (!matchingKey && currentPath.startsWith('/console/chat/')) {
      const chatIndex = currentPath.split('/').pop();
      if (!isNaN(chatIndex)) {
        matchingKey = 'chat' + chatIndex;
      } else {
        matchingKey = 'chat';
      }
    }

    // 如果找到匹配的键，更新选中的键
    if (matchingKey) {
      setSelectedKeys([matchingKey]);
    }
  }, [location.pathname, routerMapState]);

  // 监控折叠状态变化以更新 body class
  useEffect(() => {
    if (collapsed) {
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }
  }, [collapsed]);

  // 选中高亮颜色（统一）
  const SELECTED_COLOR = 'var(--semi-color-primary)';

  // 渲染自定义菜单项
  const renderNavItem = (item) => {
    // 跳过隐藏的项目
    if (item.className === 'tableHiddle') return null;

    const isSelected = selectedKeys.includes(item.itemKey);
    const textColor = isSelected ? SELECTED_COLOR : 'inherit';

    return (
      <Nav.Item
        key={item.itemKey}
        itemKey={item.itemKey}
        text={
          <span
            className='truncate font-medium text-sm'
            style={{ color: textColor }}
          >
            {item.text}
          </span>
        }
        icon={
          <div className='sidebar-icon-container flex-shrink-0'>
            {getLucideIcon(item.itemKey, isSelected)}
          </div>
        }
        className={item.className}
      />
    );
  };

  // 渲染子菜单项
  const renderSubItem = (item) => {
    if (item.items && item.items.length > 0) {
      const isSelected = selectedKeys.includes(item.itemKey);
      const textColor = isSelected ? SELECTED_COLOR : 'inherit';

      return (
        <Nav.Sub
          key={item.itemKey}
          itemKey={item.itemKey}
          text={
            <span
              className='truncate font-medium text-sm'
              style={{ color: textColor }}
            >
              {item.text}
            </span>
          }
          icon={
            <div className='sidebar-icon-container flex-shrink-0'>
              {getLucideIcon(item.itemKey, isSelected)}
            </div>
          }
        >
          {item.items.map((subItem) => {
            const isSubSelected = selectedKeys.includes(subItem.itemKey);
            const subTextColor = isSubSelected ? SELECTED_COLOR : 'inherit';

            return (
              <Nav.Item
                key={subItem.itemKey}
                itemKey={subItem.itemKey}
                text={
                  <span
                    className='truncate font-medium text-sm'
                    style={{ color: subTextColor }}
                  >
                    {subItem.text}
                  </span>
                }
              />
            );
          })}
        </Nav.Sub>
      );
    } else {
      return renderNavItem(item);
    }
  };

  const blurState = useBlurGlass();
  const blurActive = blurState.enabled && (blurState.area==='both' || blurState.area==='sidebar');
  const sidebarStyle = {
    width:'var(--sidebar-current-width)',
    background:'var(--semi-color-bg-0)',
    ...(blurActive?{ backdropFilter:`blur(${blurState.strength}px)`}:{})
  };

  return (
    <div
      className={`sidebar-container ${blurActive ? 'sidebar-blur-enabled bg-white/70 dark:bg-zinc-900/50' : 'bg-white dark:bg-zinc-900'}`}
      style={sidebarStyle}
    >
      <SkeletonWrapper
        loading={showSkeleton}
        type='sidebar'
        className=''
        collapsed={collapsed}
        showAdmin={isAdmin()}
      >
        <Nav
          className='sidebar-nav'
          defaultIsCollapsed={collapsed}
          isCollapsed={collapsed}
          onCollapseChange={toggleCollapsed}
          selectedKeys={selectedKeys}
          itemStyle='sidebar-nav-item'
          hoverStyle='sidebar-nav-item:hover'
          selectedStyle='sidebar-nav-item-selected'
          renderWrapper={({ itemElement, props }) => {
            const to =
              routerMapState[props.itemKey] || routerMap[props.itemKey];

            // 如果没有路由，直接返回元素
            if (!to) return itemElement;

            return (
              <Link
                style={{ textDecoration: 'none' }}
                to={to}
                onClick={onNavigate}
              >
                {itemElement}
              </Link>
            );
          }}
          onSelect={(key) => {
            // 如果点击的是已经展开的子菜单的父项，则收起子菜单
            if (openedKeys.includes(key.itemKey)) {
              setOpenedKeys(openedKeys.filter((k) => k !== key.itemKey));
            }

            setSelectedKeys([key.itemKey]);
          }}
          openKeys={openedKeys}
          onOpenChange={(data) => {
            setOpenedKeys(data.openKeys);
          }}
        >
          {/* 聊天分组已合并 / 隐藏：playground 迁移至控制台，聊天对话暂不在侧边栏展示 */}

          {/* 控制台区域 */}
          {hasSectionVisibleModules('console') && (
            <>
              <Divider className='sidebar-divider' />
              <div>
                {!collapsed && (
                  <div className='sidebar-group-label'>{t('控制台')}</div>
                )}
                {workspaceItems.map((item) => renderNavItem(item))}
                {renderWindows()}
              </div>
            </>
          )}

          {/* 个人中心区域 */}
          {hasSectionVisibleModules('personal') && (
            <>
              <Divider className='sidebar-divider' />
              <div>
                {!collapsed && (
                  <div className='sidebar-group-label'>{t('个人中心')}</div>
                )}
                {financeItems.map((item) => renderNavItem(item))}
              </div>
            </>
          )}

          {/* 管理员区域 - 只在管理员时显示且配置允许时显示 */}
          {isAdmin() && hasSectionVisibleModules('admin') && (
            <>
              <Divider className='sidebar-divider' />
              <div>
                {!collapsed && (
                  <div className='sidebar-group-label'>{t('管理员')}</div>
                )}
                {adminItems.map((item) => renderNavItem(item))}
              </div>
            </>
          )}
        </Nav>
      </SkeletonWrapper>

      {/* 底部折叠按钮 */}
      <div className='sidebar-collapse-button'>
        <SkeletonWrapper
          loading={showSkeleton}
          type='button'
          width={collapsed ? 36 : 156}
          height={24}
          className='w-full'
        >
          <Button
            theme='outline'
            type='tertiary'
            size='small'
            icon={
              <ChevronLeft
                size={16}
                strokeWidth={2.5}
                color='var(--semi-color-text-2)'
                style={{
                  transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
            }
            onClick={toggleCollapsed}
            icononly={collapsed}
            style={collapsed ? { width: 36, height: 24, padding: 0 } : { padding: '4px 12px', width: '100%' }}
          >
            {!collapsed ? t('收起侧边栏') : null}
          </Button>
        </SkeletonWrapper>
      </div>
    </div>
  );
};

export default SiderBar;
