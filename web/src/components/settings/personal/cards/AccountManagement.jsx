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

import React from 'react';
import {
  Button,
  Card,
  Input,
  Space,
  Typography,
  Avatar,
  Tabs,
  TabPane,
  Popover,
  Modal,
} from '@douyinfe/semi-ui';
import {
  IconMail,
  IconShield,
  IconGithubLogo,
  IconKey,
  IconLock,
  IconDelete,
} from '@douyinfe/semi-icons';
import { SiTelegram, SiWechat, SiLinux } from 'react-icons/si';
import { UserPlus, ShieldCheck } from 'lucide-react';
import TelegramLoginButton from 'react-telegram-login';
import {
  onGitHubOAuthClicked,
  onOIDCClicked,
  onLinuxDOOAuthClicked,
  onDiscordOAuthClicked,
} from '../../../../helpers';
import TwoFASetting from '../components/TwoFASetting';

const AccountManagement = ({
  t,
  userState,
  status,
  systemToken,
  setShowEmailBindModal,
  setShowWeChatBindModal,
  generateAccessToken,
  handleSystemTokenClick,
  setShowChangePasswordModal,
  setShowAccountDeleteModal,
  passkeyStatus,
  passkeySupported,
  passkeyRegisterLoading,
  passkeyDeleteLoading,
  onPasskeyRegister,
  onPasskeyDelete,
}) => {
  const renderAccountInfo = (accountId, label) => {
    if (!accountId || accountId === '') {
      return <span className='text-gray-500'>{t('未绑定')}</span>;
    }

    const popContent = (
      <div className='text-xs p-2'>
        <Typography.Paragraph copyable={{ content: accountId }}>
          {accountId}
        </Typography.Paragraph>
        {label ? (
          <div className='mt-1 text-[11px] text-gray-500'>{label}</div>
        ) : null}
      </div>
    );

    return (
      <Popover content={popContent} position='top' trigger='hover'>
        <span className='block max-w-full truncate text-gray-600 hover:text-blue-600 cursor-pointer'>
          {accountId}
        </span>
      </Popover>
    );
  };
  const isBound = (accountId) => Boolean(accountId);
  const [showTelegramBindModal, setShowTelegramBindModal] = React.useState(false);
  const passkeyEnabled = passkeyStatus?.enabled;
  const lastUsedLabel = passkeyStatus?.last_used_at
    ? new Date(passkeyStatus.last_used_at).toLocaleString()
    : t('尚未使用');

  return (
    <Card className='!rounded-2xl'>
      {/* 卡片头部 */}
      <div className='flex items-center mb-4'>
        <Avatar size='small' color='teal' className='mr-3 shadow-md'>
          <UserPlus size={16} />
        </Avatar>
        <div>
          <Typography.Text className='text-lg font-medium'>
            {t('账户管理')}
          </Typography.Text>
          <div className='text-xs text-gray-600'>
            {t('账户绑定、安全设置和身份验证')}
          </div>
        </div>
      </div>

      <Tabs type='card' defaultActiveKey='binding'>
        {/* 账户绑定 Tab */}
        <TabPane
          tab={
            <div className='flex items-center'>
              <UserPlus size={16} className='mr-2' />
              {t('账户绑定')}
            </div>
          }
          itemKey='binding'
        >
          <div className='py-4'>
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
              {/* 邮箱绑定 */}
              <Card className='!rounded-xl'>
                <div className='flex items-center justify-between gap-3'>
                  <div className='flex items-center flex-1 min-w-0'>
                    <div className='w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mr-3 flex-shrink-0'>
                      <IconMail
                        size='default'
                        className='text-slate-600 dark:text-slate-300'
                      />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='font-medium text-gray-900'>
                        {t('邮箱')}
                      </div>
                      <div className='text-sm text-gray-500 truncate'>
                        {renderAccountInfo(
                          userState.user?.email,
                          t('邮箱地址'),
                        )}
                      </div>
                    </div>
                  </div>
                  <div className='flex-shrink-0'>
                    <Button
                      type='primary'
                      theme='outline'
                      size='small'
                      onClick={() => setShowEmailBindModal(true)}
                    >
                      {isBound(userState.user?.email)
                        ? t('修改绑定')
                        : t('绑定')}
                    </Button>
                  </div>
                </div>
              </Card>

              {/* 微信绑定 */}
              <Card className='!rounded-xl'>
                <div className='flex items-center justify-between gap-3'>
                  <div className='flex items-center flex-1 min-w-0'>
                    <div className='w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mr-3 flex-shrink-0'>
                      <SiWechat
                        size={20}
                        className='text-slate-600 dark:text-slate-300'
                      />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='font-medium text-gray-900'>
                        {t('微信')}
                      </div>
                      <div className='text-sm text-gray-500 truncate'>
                        {!status.wechat_login
                          ? t('未启用')
                          : isBound(userState.user?.wechat_id)
                            ? t('已绑定')
                            : t('未绑定')}
                      </div>
                    </div>
                  </div>
                  <div className='flex-shrink-0'>
                    <Button
                      type='primary'
                      theme='outline'
                      size='small'
                      disabled={!status.wechat_login}
                      onClick={() => setShowWeChatBindModal(true)}
                    >
                      {isBound(userState.user?.wechat_id)
                        ? t('修改绑定')
                        : status.wechat_login
                          ? t('绑定')
                          : t('未启用')}
                    </Button>
                  </div>
                </div>
              </Card>

              {/* GitHub绑定 */}
              <Card className='!rounded-xl'>
                <div className='flex items-center justify-between gap-3'>
                  <div className='flex items-center flex-1 min-w-0'>
                    <div className='w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mr-3 flex-shrink-0'>
                      <IconGithubLogo
                        size='default'
                        className='text-slate-600 dark:text-slate-300'
                      />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='font-medium text-gray-900'>
                        {t('GitHub')}
                      </div>
                      <div className='text-sm text-gray-500 truncate'>
                        {renderAccountInfo(
                          userState.user?.github_id,
                          t('GitHub ID'),
                        )}
                      </div>
                    </div>
                  </div>
                  <div className='flex-shrink-0'>
                    <Button
                      type='primary'
                      theme='outline'
                      size='small'
                      onClick={() =>
                        onGitHubOAuthClicked(status.github_client_id)
                      }
                      disabled={
                        isBound(userState.user?.github_id) || !status.github_oauth
                      }
                    >
                      {status.github_oauth ? t('绑定') : t('未启用')}
                    </Button>
                  </div>
                </div>
              </Card>

              {/* OIDC绑定 */}
              <Card className='!rounded-xl'>
                <div className='flex items-center justify-between gap-3'>
                  <div className='flex items-center flex-1 min-w-0'>
                    <div className='w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mr-3 flex-shrink-0'>
                      <IconShield
                        size='default'
                        className='text-slate-600 dark:text-slate-300'
                      />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='font-medium text-gray-900'>
                        {t('OIDC')}
                      </div>
                      <div className='text-sm text-gray-500 truncate'>
                        {renderAccountInfo(
                          userState.user?.oidc_id,
                          t('OIDC ID'),
                        )}
                      </div>
                    </div>
                  </div>
                  <div className='flex-shrink-0'>
                    <Button
                      type='primary'
                      theme='outline'
                      size='small'
                      onClick={() =>
                        onOIDCClicked(
                          status.oidc_authorization_endpoint,
                          status.oidc_client_id,
                        )
                      }
                      disabled={
                        isBound(userState.user?.oidc_id) || !status.oidc_enabled
                      }
                    >
                      {status.oidc_enabled ? t('绑定') : t('未启用')}
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Telegram绑定 */}
              <Card className='!rounded-xl'>
                <div className='flex items-center justify-between gap-3'>
                  <div className='flex items-center flex-1 min-w-0'>
                    <div className='w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mr-3 flex-shrink-0'>
                      <SiTelegram
                        size={20}
                        className='text-slate-600 dark:text-slate-300'
                      />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='font-medium text-gray-900'>
                        {t('Telegram')}
                      </div>
                      <div className='text-sm text-gray-500 truncate'>
                        {renderAccountInfo(
                          userState.user?.telegram_id,
                          t('Telegram ID'),
                        )}
                      </div>
                    </div>
                  </div>
                  <div className='flex-shrink-0'>
                    {status.telegram_oauth ? (
                      isBound(userState.user?.telegram_id) ? (
                        <Button
                          disabled
                          size='small'
                          type='primary'
                          theme='outline'
                        >
                          {t('已绑定')}
                        </Button>
                      ) : (
                        <Button
                          type='primary'
                          theme='outline'
                          size='small'
                          onClick={() => setShowTelegramBindModal(true)}
                        >
                          {t('绑定')}
                        </Button>
                      )
                    ) : (
                      <Button
                        disabled
                        size='small'
                        type='primary'
                        theme='outline'
                      >
                        {t('未启用')}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
              <Modal
                title={t('绑定 Telegram')}
                visible={showTelegramBindModal}
                onCancel={() => setShowTelegramBindModal(false)}
                footer={null}
              >
                <div className='my-3 text-sm text-gray-600'>
                  {t('点击下方按钮通过 Telegram 完成绑定')}
                </div>
                <div className='flex justify-center'>
                  <div className='scale-90'>
                    <TelegramLoginButton
                      dataAuthUrl='/api/oauth/telegram/bind'
                      botName={status.telegram_bot_name}
                    />
                  </div>
                </div>
              </Modal>

              {/* LinuxDO绑定 */}
              <Card className='!rounded-xl'>
                <div className='flex items-center justify-between gap-3'>
                  <div className='flex items-center flex-1 min-w-0'>
                    <div className='w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mr-3 flex-shrink-0'>
                      <SiLinux
                        size={20}
                        className='text-slate-600 dark:text-slate-300'
                      />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='font-medium text-gray-900'>
                        {t('LinuxDO')}
                      </div>
                      <div className='text-sm text-gray-500 truncate'>
                        {renderAccountInfo(
                          userState.user?.linux_do_id,
                          t('LinuxDO ID'),
                        )}
                      </div>
                    </div>
                  </div>
                  <div className='flex-shrink-0'>
                    <Button
                      type='primary'
                      theme='outline'
                      size='small'
                      onClick={() =>
                        onLinuxDOOAuthClicked(status.linuxdo_client_id)
                      }
                      disabled={
                        isBound(userState.user?.linux_do_id) || !status.linuxdo_oauth
                      }
                    >
                      {status.linuxdo_oauth ? t('绑定') : t('未启用')}
                    </Button>
                  </div>
                </div>
              </Card>
              
              {/* Discord绑定 */}
              <Card className='!rounded-xl'>
                <div className='flex items-center justify-between gap-3'>
                  <div className='flex items-center flex-1 min-w-0'>
                    <div className='w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mr-3 flex-shrink-0'>
                      <div className='text-slate-600 dark:text-slate-300'>
                        <svg viewBox="0 0 71 55" fill="none" width="20" height="20">
                          <g clipPath="url(#clip0)">
                            <path
                              d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978Z"
                              fill="#5865F2"
                            />
                          </g>
                          <defs>
                            <clipPath id="clip0">
                              <rect width="71" height="55" fill="white"/>
                            </clipPath>
                          </defs>
                        </svg>
                      </div>
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='font-medium text-gray-900'>
                        {t('Discord')}
                      </div>
                      <div className='text-sm text-gray-500 truncate'>
                        {renderAccountInfo(
                          userState.user?.discord_username || userState.user?.discord_id,
                          t('Discord 用户名'),
                        )}
                      </div>
                    </div>
                  </div>
                  <div className='flex-shrink-0'>
                    <Button
                      type='primary'
                      theme='outline'
                      size='small'
                      onClick={() =>
                        onDiscordOAuthClicked(status.discord_client_id, status.discord_request_guild_scope)
                      }
                      disabled={
                        isBound(userState.user?.discord_id) || !status.discord_oauth
                      }
                    >
                      {status.discord_oauth ? t('绑定') : t('未启用')}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabPane>

        {/* 安全设置 Tab */}
        <TabPane
          tab={
            <div className='flex items-center'>
              <ShieldCheck size={16} className='mr-2' />
              {t('安全设置')}
            </div>
          }
          itemKey='security'
        >
          <div className='py-4'>
            <div className='space-y-6'>
              <Space vertical className='w-full'>
                {/* 系统访问令牌 */}
                <Card className='!rounded-xl w-full'>
                  <div className='flex flex-col sm:flex-row items-start sm:justify-between gap-4'>
                    <div className='flex items-start w-full sm:w-auto'>
                      <div className='w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mr-4 flex-shrink-0'>
                        <IconKey size='large' className='text-slate-600' />
                      </div>
                      <div className='flex-1'>
                        <Typography.Title heading={6} className='mb-1'>
                          {t('系统访问令牌')}
                        </Typography.Title>
                        <Typography.Text type='tertiary' className='text-sm'>
                          {t('用于API调用的身份验证令牌，请妥善保管')}
                        </Typography.Text>
                        {systemToken && (
                          <div className='mt-3'>
                            <Input
                              readonly
                              value={systemToken}
                              onClick={handleSystemTokenClick}
                              size='large'
                              prefix={<IconKey />}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      type='primary'
                      theme='solid'
                      onClick={generateAccessToken}
                      className='!bg-slate-600 hover:!bg-slate-700 w-full sm:w-auto'
                      icon={<IconKey />}
                    >
                      {systemToken ? t('重新生成') : t('生成令牌')}
                    </Button>
                  </div>
                </Card>

                {/* 密码管理 */}
                <Card className='!rounded-xl w-full'>
                  <div className='flex flex-col sm:flex-row items-start sm:justify-between gap-4'>
                    <div className='flex items-start w-full sm:w-auto'>
                      <div className='w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mr-4 flex-shrink-0'>
                        <IconLock size='large' className='text-slate-600' />
                      </div>
                      <div>
                        <Typography.Title heading={6} className='mb-1'>
                          {t('密码管理')}
                        </Typography.Title>
                        <Typography.Text type='tertiary' className='text-sm'>
                          {t('定期更改密码可以提高账户安全性')}
                        </Typography.Text>
                      </div>
                    </div>
                    <Button
                      type='primary'
                      theme='solid'
                      onClick={() => setShowChangePasswordModal(true)}
                      className='!bg-slate-600 hover:!bg-slate-700 w-full sm:w-auto'
                      icon={<IconLock />}
                    >
                      {t('修改密码')}
                    </Button>
                  </div>
                </Card>

                {/* Passkey 设置 */}
                <Card className='!rounded-xl w-full'>
                  <div className='flex flex-col sm:flex-row items-start sm:justify-between gap-4'>
                    <div className='flex items-start w-full sm:w-auto'>
                      <div className='w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mr-4 flex-shrink-0'>
                        <IconKey size='large' className='text-slate-600' />
                      </div>
                      <div>
                        <Typography.Title heading={6} className='mb-1'>
                          {t('Passkey 登录')}
                        </Typography.Title>
                        <Typography.Text type='tertiary' className='text-sm'>
                          {passkeyEnabled
                            ? t('已启用 Passkey，无需密码即可登录')
                            : t('使用 Passkey 实现免密且更安全的登录体验')}
                        </Typography.Text>
                        <div className='mt-2 text-xs text-gray-500 space-y-1'>
                          <div>
                            {t('最后使用时间')}：{lastUsedLabel}
                          </div>
                          {/*{passkeyEnabled && (*/}
                          {/*  <div>*/}
                          {/*    {t('备份支持')}：*/}
                          {/*    {passkeyStatus?.backup_eligible*/}
                          {/*      ? t('支持备份')*/}
                          {/*      : t('不支持')}*/}
                          {/*    ，{t('备份状态')}：*/}
                          {/*    {passkeyStatus?.backup_state ? t('已备份') : t('未备份')}*/}
                          {/*  </div>*/}
                          {/*)}*/}
                          {!passkeySupported && (
                            <div className='text-amber-600'>
                              {t('当前设备不支持 Passkey')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      type={passkeyEnabled ? 'danger' : 'primary'}
                      theme={passkeyEnabled ? 'solid' : 'solid'}
                      onClick={
                        passkeyEnabled
                          ? () => {
                              Modal.confirm({
                                title: t('确认解绑 Passkey'),
                                content: t('解绑后将无法使用 Passkey 登录，确定要继续吗？'),
                                okText: t('确认解绑'),
                                cancelText: t('取消'),
                                okType: 'danger',
                                onOk: onPasskeyDelete,
                              });
                            }
                          : onPasskeyRegister
                      }
                      className={`w-full sm:w-auto ${passkeyEnabled ? '!bg-slate-500 hover:!bg-slate-600' : ''}`}
                      icon={<IconKey />}
                      disabled={!passkeySupported && !passkeyEnabled}
                      loading={passkeyEnabled ? passkeyDeleteLoading : passkeyRegisterLoading}
                    >
                      {passkeyEnabled ? t('解绑 Passkey') : t('注册 Passkey')}
                    </Button>
                  </div>
                </Card>

                {/* 两步验证设置 */}
                <TwoFASetting t={t} />

                {/* 危险区域 */}
                <Card className='!rounded-xl w-full'>
                  <div className='flex flex-col sm:flex-row items-start sm:justify-between gap-4'>
                    <div className='flex items-start w-full sm:w-auto'>
                      <div className='w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mr-4 flex-shrink-0'>
                        <IconDelete size='large' className='text-slate-600' />
                      </div>
                      <div>
                        <Typography.Title
                          heading={6}
                          className='mb-1 text-slate-700'
                        >
                          {t('删除账户')}
                        </Typography.Title>
                        <Typography.Text type='tertiary' className='text-sm'>
                          {t('此操作不可逆，所有数据将被永久删除')}
                        </Typography.Text>
                      </div>
                    </div>
                    <Button
                      type='danger'
                      theme='solid'
                      onClick={() => setShowAccountDeleteModal(true)}
                      className='w-full sm:w-auto !bg-slate-500 hover:!bg-slate-600'
                      icon={<IconDelete />}
                    >
                      {t('删除账户')}
                    </Button>
                  </div>
                </Card>
              </Space>
            </div>
          </div>
        </TabPane>
      </Tabs>
    </Card>
  );
};

export default AccountManagement;
