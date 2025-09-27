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

import { Modal } from '@douyinfe/semi-ui';
import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../context/User';
import { API, copy, showError, showInfo, showSuccess } from '../../helpers';
import { ConsoleSection } from '../layout/ConsoleSection';

// 导入子组件
import AccountManagement from './personal/cards/AccountManagement';
import NotificationSettings from './personal/cards/NotificationSettings_new';
import UserInfoHeader from './personal/components/UserInfoHeader';
import AccountDeleteModal from './personal/modals/AccountDeleteModal';
import ChangePasswordModal from './personal/modals/ChangePasswordModal';
import EmailBindModal from './personal/modals/EmailBindModal';
import WeChatBindModal from './personal/modals/WeChatBindModal';

const PersonalSetting = () => {
  const [userState, userDispatch] = useContext(UserContext);
  let navigate = useNavigate();
  const { t } = useTranslation();

  const [inputs, setInputs] = useState({
    wechat_verification_code: '',
    email_verification_code: '',
    email: '',
    self_account_deletion_confirmation: '',
    original_password: '',
    set_new_password: '',
    set_new_password_confirmation: '',
  });
  const [status, setStatus] = useState({});
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showWeChatBindModal, setShowWeChatBindModal] = useState(false);
  const [showEmailBindModal, setShowEmailBindModal] = useState(false);
  const [showAccountDeleteModal, setShowAccountDeleteModal] = useState(false);
  const [turnstileEnabled, setTurnstileEnabled] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [disableButton, setDisableButton] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [systemToken, setSystemToken] = useState('');
  const [notificationSettings, setNotificationSettings] = useState({
    warningType: 'email',
    warningThreshold: 100000,
    webhookUrl: '',
    webhookSecret: '',
    notificationEmail: '',
    barkUrl: '',
    acceptUnsetModelRatioModel: false,
  });
  // UI 偏好：是否移除全局阴影
  const [noShadow, setNoShadow] = useState(() => {
    return localStorage.getItem('pref_no_shadows') === '1';
  });

  // 应用 body 类
  useEffect(() => {
    if (noShadow) {
      document.body.classList.add('no-shadows');
    } else {
      document.body.classList.remove('no-shadows');
    }
  }, [noShadow]);

  useEffect(() => {
    let status = localStorage.getItem('status');
    if (status) {
      status = JSON.parse(status);
      setStatus(status);
      if (status.turnstile_check) {
        setTurnstileEnabled(true);
        setTurnstileSiteKey(status.turnstile_site_key);
      }
    }
    getUserData().then((res) => {
      console.log(userState);
    });
  }, []);

  useEffect(() => {
    let countdownInterval = null;
    if (disableButton && countdown > 0) {
      countdownInterval = setInterval(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (countdown === 0) {
      setDisableButton(false);
      setCountdown(30);
    }
    return () => clearInterval(countdownInterval); // Clean up on unmount
  }, [disableButton, countdown]);

  useEffect(() => {
    if (userState?.user?.setting) {
      const settings = JSON.parse(userState.user.setting);
      setNotificationSettings({
        warningType: settings.notify_type || 'email',
        warningThreshold: settings.quota_warning_threshold || 500000,
        webhookUrl: settings.webhook_url || '',
        webhookSecret: settings.webhook_secret || '',
        notificationEmail: settings.notification_email || '',
        barkUrl: settings.bark_url || '',
        acceptUnsetModelRatioModel:
          settings.accept_unset_model_ratio_model || false,
      });
    }
  }, [userState?.user?.setting]);

  const handleInputChange = (name, value) => {
    setInputs((inputs) => ({ ...inputs, [name]: value }));
  };

  const generateAccessToken = async () => {
    const res = await API.get('/api/user/token');
    const { success, message, data } = res.data;
    if (success) {
      setSystemToken(data);
      await copy(data);
      showSuccess(t('令牌已重置并已复制到剪贴板'));
    } else {
      showError(message);
    }
  };

  const getUserData = async () => {
    let res = await API.get(`/api/user/self`);
    const { success, message, data } = res.data;
    if (success) {
      userDispatch({ type: 'login', payload: data });
    } else {
      showError(message);
    }
  };

  const handleSystemTokenClick = async (e) => {
    e.target.select();
    await copy(e.target.value);
    showSuccess(t('系统令牌已复制到剪切板'));
  };

  const deleteAccount = async () => {
    if (inputs.self_account_deletion_confirmation !== userState.user.username) {
      showError(t('请输入你的账户名以确认删除！'));
      return;
    }

    const res = await API.delete('/api/user/self');
    const { success, message } = res.data;

    if (success) {
      showSuccess(t('账户已删除！'));
      await API.get('/api/user/logout');
      userDispatch({ type: 'logout' });
      localStorage.removeItem('user');
      navigate('/login');
    } else {
      showError(message);
    }
  };

  const bindWeChat = async () => {
    if (inputs.wechat_verification_code === '') return;
    const res = await API.get(
      `/api/oauth/wechat/bind?code=${inputs.wechat_verification_code}`,
    );
    const { success, message } = res.data;
    if (success) {
      showSuccess(t('微信账户绑定成功！'));
      setShowWeChatBindModal(false);
    } else {
      showError(message);
    }
  };

  const changePassword = async () => {
    if (inputs.original_password === '') {
      showError(t('请输入原密码！'));
      return;
    }
    if (inputs.set_new_password === '') {
      showError(t('请输入新密码！'));
      return;
    }
    if (inputs.original_password === inputs.set_new_password) {
      showError(t('新密码需要和原密码不一致！'));
      return;
    }
    if (inputs.set_new_password !== inputs.set_new_password_confirmation) {
      showError(t('两次输入的密码不一致！'));
      return;
    }
    const res = await API.put(`/api/user/self`, {
      original_password: inputs.original_password,
      password: inputs.set_new_password,
    });
    const { success, message } = res.data;
    if (success) {
      showSuccess(t('密码修改成功！'));
      setShowWeChatBindModal(false);
    } else {
      showError(message);
    }
    setShowChangePasswordModal(false);
  };

  const sendVerificationCode = async () => {
    if (inputs.email === '') {
      showError(t('请输入邮箱！'));
      return;
    }
    setDisableButton(true);
    if (turnstileEnabled && turnstileToken === '') {
      showInfo(t('请稍后几秒重试，Turnstile 正在检查用户环境！'));
      return;
    }
    setLoading(true);
    const res = await API.get(
      `/api/verification?email=${inputs.email}&turnstile=${turnstileToken}`,
    );
    const { success, message } = res.data;
    if (success) {
      showSuccess(t('验证码发送成功，请检查邮箱！'));
    } else {
      showError(message);
    }
    setLoading(false);
  };

  const bindEmail = async () => {
    if (inputs.email_verification_code === '') {
      showError(t('请输入邮箱验证码！'));
      return;
    }
    setLoading(true);
    const res = await API.get(
      `/api/oauth/email/bind?email=${inputs.email}&code=${inputs.email_verification_code}`,
    );
    const { success, message } = res.data;
    if (success) {
      showSuccess(t('邮箱账户绑定成功！'));
      setShowEmailBindModal(false);
      userState.user.email = inputs.email;
    } else {
      showError(message);
    }
    setLoading(false);
  };

  const copyText = async (text) => {
    if (await copy(text)) {
      showSuccess(t('已复制：') + text);
    } else {
      // setSearchKeyword(text);
      Modal.error({ title: t('无法复制到剪贴板，请手动复制'), content: text });
    }
  };

  const handleNotificationSettingChange = (type, value) => {
    setNotificationSettings((prev) => ({
      ...prev,
      [type]: value.target
        ? value.target.value !== undefined
          ? value.target.value
          : value.target.checked
        : value, // handle checkbox properly
    }));
  };

  const saveNotificationSettings = async () => {
    try {
      const res = await API.put('/api/user/setting', {
        notify_type: notificationSettings.warningType,
        quota_warning_threshold: parseFloat(
          notificationSettings.warningThreshold,
        ),
        webhook_url: notificationSettings.webhookUrl,
        webhook_secret: notificationSettings.webhookSecret,
        notification_email: notificationSettings.notificationEmail,
        bark_url: notificationSettings.barkUrl,
        accept_unset_model_ratio_model:
          notificationSettings.acceptUnsetModelRatioModel,
      });

      if (res.data.success) {
        showSuccess(t('设置保存成功'));
        await getUserData();
      } else {
        showError(res.data.message);
      }
    } catch (error) {
      showError(t('设置保存失败'));
    }
  };

  const toggleNoShadow = () => {
    setNoShadow((prev) => {
      const next = !prev;
      localStorage.setItem('pref_no_shadows', next ? '1' : '0');
      return next;
    });
  };

  return (
    <>
      <ConsoleSection
        title={t('个人设置')}
        description={t('管理您的账户信息、安全设置和个人偏好')}
      >
        <div className="space-y-6">
          {/* 顶部用户信息区域 */}
          <UserInfoHeader t={t} userState={userState} />

          {/* 设置区域 - 使用网格布局 */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {/* 左侧：账户管理设置 */}
            <div className="space-y-6">
              <AccountManagement
                t={t}
                userState={userState}
                status={status}
                systemToken={systemToken}
                setShowEmailBindModal={setShowEmailBindModal}
                setShowWeChatBindModal={setShowWeChatBindModal}
                generateAccessToken={generateAccessToken}
                handleSystemTokenClick={handleSystemTokenClick}
                setShowChangePasswordModal={setShowChangePasswordModal}
                setShowAccountDeleteModal={setShowAccountDeleteModal}
              />

              {/* UI 偏好设置 */}
              <div className='bg-white dark:bg-zinc-800 rounded-lg p-6 border border-semi-color-border shadow-sm hover:shadow-md transition-shadow'>
                <h3 className='text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100'>{t('界面外观')}</h3>
                <div className='flex items-center justify-between gap-4'>
                  <div className='flex-1'>
                    <div className='font-medium text-gray-800 dark:text-gray-200'>{t('移除界面阴影')}</div>
                    <div className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
                      {t('启用后将移除卡片、浮层等的阴影，界面更加扁平。')}
                    </div>
                  </div>
                  <label className='inline-flex items-center cursor-pointer select-none'>
                    <input
                      type='checkbox'
                      className='hidden'
                      checked={noShadow}
                      onChange={toggleNoShadow}
                    />
                    <span
                      className={`relative inline-block w-12 h-6 transition-colors duration-200 rounded-full ${
                        noShadow 
                          ? 'bg-blue-500 hover:bg-blue-600' 
                          : 'bg-gray-300 dark:bg-zinc-600 hover:bg-gray-400 dark:hover:bg-zinc-500'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 ${
                          noShadow ? 'translate-x-6' : ''
                        }`}
                      />
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* 右侧：通知设置 */}
            <div>
              <NotificationSettings
                t={t}
                notificationSettings={notificationSettings}
                handleNotificationSettingChange={handleNotificationSettingChange}
                saveNotificationSettings={saveNotificationSettings}
              />
            </div>
          </div>
        </div>
      </ConsoleSection>

      {/* 模态框组件 */}
      <EmailBindModal
        t={t}
        showEmailBindModal={showEmailBindModal}
        setShowEmailBindModal={setShowEmailBindModal}
        inputs={inputs}
        handleInputChange={handleInputChange}
        sendVerificationCode={sendVerificationCode}
        bindEmail={bindEmail}
        disableButton={disableButton}
        loading={loading}
        countdown={countdown}
        turnstileEnabled={turnstileEnabled}
        turnstileSiteKey={turnstileSiteKey}
        setTurnstileToken={setTurnstileToken}
      />

      <WeChatBindModal
        t={t}
        showWeChatBindModal={showWeChatBindModal}
        setShowWeChatBindModal={setShowWeChatBindModal}
        inputs={inputs}
        handleInputChange={handleInputChange}
        bindWeChat={bindWeChat}
        status={status}
      />

      <AccountDeleteModal
        t={t}
        showAccountDeleteModal={showAccountDeleteModal}
        setShowAccountDeleteModal={setShowAccountDeleteModal}
        inputs={inputs}
        handleInputChange={handleInputChange}
        deleteAccount={deleteAccount}
        userState={userState}
        turnstileEnabled={turnstileEnabled}
        turnstileSiteKey={turnstileSiteKey}
        setTurnstileToken={setTurnstileToken}
      />

      <ChangePasswordModal
        t={t}
        showChangePasswordModal={showChangePasswordModal}
        setShowChangePasswordModal={setShowChangePasswordModal}
        inputs={inputs}
        handleInputChange={handleInputChange}
        changePassword={changePassword}
        turnstileEnabled={turnstileEnabled}
        turnstileSiteKey={turnstileSiteKey}
        setTurnstileToken={setTurnstileToken}
      />
    </>
  );
};

export default PersonalSetting;
