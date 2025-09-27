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

import { Layout } from '@douyinfe/semi-ui';
import { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import App from '../../App';
import { useOptions } from '../../context/Options';
import { StatusContext } from '../../context/Status';
import { UserContext } from '../../context/User';
import {
  API,
  getLogo,
  getSystemName,
  setStatusData,
  showError,
} from '../../helpers';
import { useIsMobile } from '../../hooks/common/useIsMobile';
import { useSidebarCollapsed } from '../../hooks/common/useSidebarCollapsed';
import '../../styles/console-layout.css';
import FooterBar from './Footer';
import HeaderBar from './headerbar';
import SiderBar from './SiderBar';
const { Sider, Content, Header } = Layout;

const PageLayout = () => {
  const [, userDispatch] = useContext(UserContext);
  const [, statusDispatch] = useContext(StatusContext);
  const { options: opt } = useOptions();
  const isMobile = useIsMobile();
  const [collapsed, , setCollapsed] = useSidebarCollapsed();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { i18n } = useTranslation();
  const location = useLocation();

  const shouldHideFooter =
    location.pathname.startsWith('/console') ||
    location.pathname === '/pricing';

  const shouldInnerPadding =
    location.pathname.includes('/console') &&
    !location.pathname.startsWith('/console/chat') &&
    location.pathname !== '/console/playground';

  const isConsoleRoute = location.pathname.startsWith('/console');
  const showSider = isConsoleRoute && (!isMobile || drawerOpen);

  useEffect(() => {
    if (isMobile && drawerOpen && collapsed) {
      setCollapsed(false);
    }
  }, [isMobile, drawerOpen, collapsed, setCollapsed]);

  const loadUser = () => {
    let user = localStorage.getItem('user');
    if (user) {
      let data = JSON.parse(user);
      userDispatch({ type: 'login', payload: data });
    }
  };

  const loadStatus = async () => {
    try {
      const res = await API.get('/api/status');
      const { success, data } = res.data;
      if (success) {
        statusDispatch({ type: 'set', payload: data });
        setStatusData(data);
        // 同步仅当 options 未提供时的名称/Logo（向后兼容旧 localStorage 获取逻辑）
        if (!localStorage.getItem('system_name') && data.system_name) {
          localStorage.setItem('system_name', data.system_name);
        }
        if (!localStorage.getItem('logo') && data.logo) {
          localStorage.setItem('logo', data.logo);
        }
        if (data.footer_html) {
          localStorage.setItem('footer_html', data.footer_html);
        }
      } else {
        // 若后端返回特定失败但非 401，提示；否则静默
        if(res.status !== 401) showError('Unable to connect to server');
      }
    } catch (error) {
      // 对 401 静默，避免初始化阶段未登录噪音
      if(error?.response?.status !== 401) showError('Failed to load status');
    }
  };

  useEffect(() => {
    loadUser();
    loadStatus().catch(console.error);
    // 初次渲染使用本地缓存（或旧逻辑），稍后由 options 覆盖
    const cachedName = getSystemName();
    if (cachedName) document.title = cachedName;
    const cachedLogo = getLogo();
    if (cachedLogo) {
      let linkElement = document.querySelector("link[rel~='icon']");
      if (linkElement) linkElement.href = cachedLogo;
    }
    const savedLang = localStorage.getItem('i18nextLng');
    if (savedLang) {
      i18n.changeLanguage(savedLang);
    }
  }, [i18n]);

  // 如果 options 中提供系统名或 Logo，使用其覆盖（新来源）
  useEffect(() => {
    if (opt) {
      if (opt.SystemName) {
        document.title = opt.SystemName;
        localStorage.setItem('system_name', opt.SystemName);
      }
      if (opt.Logo) {
        let linkElement = document.querySelector("link[rel~='icon']");
        if (linkElement) linkElement.href = opt.Logo;
        localStorage.setItem('logo', opt.Logo);
      }
    }
  }, [opt]);

  // 动态测量 Header 实际高度，避免硬编码 paddingTop 造成大面积留白
  const headerWrapRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(56); // 与新的 header 高度一致
  useLayoutEffect(() => {
    const measure = () => {
      if (headerWrapRef.current) {
  const h = headerWrapRef.current.getBoundingClientRect().height;
  // 阈值缩小避免频繁布局抖动
  if (h && Math.abs(h - headerHeight) > 1) setHeaderHeight(h);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [headerHeight]);

  return (
    <Layout
      style={{
        '--app-header-height': headerHeight + 'px',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: isMobile ? 'visible' : 'hidden',
      }}
    >
      <Header
        style={{
          padding: 0,
          height: 'auto',
          lineHeight: 'normal',
          width: '100%',
          zIndex: 100,
        }}
      >
        <div ref={headerWrapRef} style={{position:'fixed',top:0,left:0,right:0,zIndex:100}}>
          <HeaderBar
            onMobileMenuToggle={() => setDrawerOpen((prev) => !prev)}
            drawerOpen={drawerOpen}
          />
        </div>
      </Header>
      <Layout
        style={{
          overflow: isMobile ? 'visible' : 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {showSider && (
          <Sider
            style={{
              position: 'fixed',
              left: 0,
              top: 'var(--app-header-height)',
              zIndex: 99,
              border: 'none',
              paddingRight: '0',
              height: 'calc(100vh - var(--app-header-height))',
              width: 'var(--sidebar-current-width)',
            }}
          >
            <SiderBar
              onNavigate={() => {
                if (isMobile) setDrawerOpen(false);
              }}
            />
          </Sider>
        )}
        <Layout
          style={{
            marginLeft: isMobile
              ? '0'
              : showSider
                ? 'var(--sidebar-current-width)'
                : '0',
            flex: '1 1 auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Content
            className={isConsoleRoute ? 'console-layout-root' : ''}
            style={{
              flex: '1 0 auto',
              overflow: 'hidden',
              position: 'relative',
              boxSizing: 'border-box'
            }}
          >
            {isConsoleRoute ? (
              <div className='console-main'>
                <App />
              </div>
            ) : (
              <div style={{
                paddingTop: shouldInnerPadding ? (headerHeight + (isMobile ? 8 : 16)) : headerHeight,
                padding: shouldInnerPadding ? (isMobile ? '8px' : '24px') : '0',
                boxSizing: 'border-box',
                minHeight: `calc(100vh - ${headerHeight}px)`
              }}>
                <App />
              </div>
            )}
          </Content>
          {!shouldHideFooter && (
            <Layout.Footer
              style={{
                flex: '0 0 auto',
                width: '100%',
              }}
            >
              <FooterBar />
            </Layout.Footer>
          )}
        </Layout>
      </Layout>
      <ToastContainer />
    </Layout>
  );
};

export default PageLayout;
