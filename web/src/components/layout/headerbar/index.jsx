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

import { useHeaderBar } from '../../../hooks/common/useHeaderBar';
import { useNavigation } from '../../../hooks/common/useNavigation';
import { useBlurGlass } from '../../../hooks/ui/useBlurGlass';
import ErrorBoundary from '../../common/ErrorBoundary';
import SafeActionButtonsWrapper from '../../common/SafeActionButtonsWrapper';
import ActionButtons from './ActionButtons';
import HeaderLogo from './HeaderLogo';
import MobileMenuButton from './MobileMenuButton';
import Navigation from './Navigation';

const HeaderBar = ({ onMobileMenuToggle, drawerOpen }) => {
  const {
    userState,
    statusState,
    isMobile,
    collapsed,
    logoLoaded,
    currentLang,
    isLoading,
    systemName,
    logo,
    isNewYear,
    isSelfUseMode,
    docsLink,
    isDemoSiteMode,
    isConsoleRoute,
    theme,
    headerNavModules,
    pricingRequireAuth,
    logout,
    handleLanguageChange,
    handleThemeToggle,
    handleMobileMenuToggle,
    navigate,
    t,
  } = useHeaderBar({ onMobileMenuToggle, drawerOpen });

  const { mainNavLinks } = useNavigation(t, docsLink, headerNavModules);
  const blurState = useBlurGlass();

  return (
    <div
      className={`text-semi-color-text-0 transition-colors duration-200 border-b border-solid border-[rgba(0,0,0,0.06)] header-bar-root glass-lite ${
        blurState.enabled && (blurState.area === 'both' || blurState.area === 'header')
          ? ''
          : 'bg-white dark:bg-zinc-900'
      }`}
      style={
        blurState.enabled && (blurState.area === 'both' || blurState.area === 'header')
          ? { backdropFilter: `blur(${Math.min(8, Math.max(2, blurState.strength))}px)` }
          : {}
      }
    >
      <div className='w-full px-2 md:px-4'>
        <div className='flex items-center h-16 gap-3'>
          {/* 左侧：菜单按钮 + Logo */}
          <div className='flex items-center gap-2 flex-shrink-0'>
            <MobileMenuButton
              isConsoleRoute={isConsoleRoute}
              isMobile={isMobile}
              drawerOpen={drawerOpen}
              collapsed={collapsed}
              onToggle={handleMobileMenuToggle}
              t={t}
            />
            <HeaderLogo
              isMobile={isMobile}
              isConsoleRoute={isConsoleRoute}
              logo={logo}
              logoLoaded={logoLoaded}
              isLoading={isLoading}
              systemName={systemName}
              isSelfUseMode={isSelfUseMode}
              isDemoSiteMode={isDemoSiteMode}
              t={t}
            />
          </div>

          {/* 中间：主导航 */}
          <div className='flex-1 flex justify-center'>
            <Navigation
              mainNavLinks={mainNavLinks}
              isMobile={isMobile}
              isLoading={isLoading}
              userState={userState}
              pricingRequireAuth={pricingRequireAuth}
            />
          </div>

          {/* 右侧：功能按钮组 */}
          <div className='ml-auto flex items-center'>
            <ErrorBoundary>
              <SafeActionButtonsWrapper>
                <ActionButtons
                  isNewYear={isNewYear}
                  theme={theme}
                  onThemeToggle={handleThemeToggle}
                  currentLang={currentLang}
                  onLanguageChange={handleLanguageChange}
                  userState={userState}
                  isLoading={isLoading}
                  isMobile={isMobile}
                  isSelfUseMode={isSelfUseMode}
                  logout={logout}
                  navigate={navigate}
                  t={t}
                />
              </SafeActionButtonsWrapper>
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeaderBar;
