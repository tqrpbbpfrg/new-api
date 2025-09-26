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

import { IconMail } from '@douyinfe/semi-icons';
import { Badge, Button, Tooltip } from '@douyinfe/semi-ui';
import { useUnread } from '../../../context/Unread';
import LanguageSelector from './LanguageSelector';
import NewYearButton from './NewYearButton';
import ThemeToggle from './ThemeToggle';
import UserArea from './UserArea';

const ActionButtons = ({
  isNewYear,
  unreadCount,
  theme,
  onThemeToggle,
  currentLang,
  onLanguageChange,
  userState,
  isLoading,
  isMobile,
  isSelfUseMode,
  logout,
  navigate,
  t,
}) => {
  // Hook must be called at the top level - ErrorBoundary will catch any issues
  // 通知按钮已移除；若未来需要，可重新引入 useUnifiedUnread()
  
  const unread = useUnread();
  const goInfo = () => navigate('/console/info');
  return (
    <div className='flex items-center gap-2 md:gap-3'>
      <NewYearButton isNewYear={isNewYear} />
  <Tooltip content={t('信息中心')} position='bottom'>
        <Badge count={unread?.total||0} overflowCount={99} type='danger' style={{ transform:'scale(.85)' }}>
          <Button size='small' theme='borderless' icon={<IconMail />} onClick={goInfo} aria-label='info-center' />
        </Badge>
      </Tooltip>
      <ThemeToggle theme={theme} onThemeToggle={onThemeToggle} t={t} />
      <LanguageSelector
        currentLang={currentLang}
        onLanguageChange={onLanguageChange}
        t={t}
      />

      <UserArea
        userState={userState}
        isLoading={isLoading}
        isMobile={isMobile}
        isSelfUseMode={isSelfUseMode}
        logout={logout}
        navigate={navigate}
        t={t}
      />
    </div>
  );
};

export default ActionButtons;
