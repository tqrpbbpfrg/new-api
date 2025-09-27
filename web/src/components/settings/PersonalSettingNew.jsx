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
  Divider,
  Progress,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  Badge,
} from '@douyinfe/semi-ui';
import {
  IconCreditCard,
  IconGift,
  IconHistory,
  IconSafe,
  IconSetting,
  IconUser,
  IconMail,
  IconBell,
  IconMoon,
  IconSun,
  IconRefresh,
} from '@douyinfe/semi-icons';
import { useState, useContext, useEffect } from 'react';
import { UserContext } from '../../context/User';
import { useTranslation } from 'react-i18next';
import { useTheme, useSetTheme } from '../../context/Theme';
import ConsoleSection from '../layout/ConsoleSection';
import { API, showError, showSuccess } from '../../helpers';

const { Title, Text } = Typography;

const PersonalSettingNew = () => {
  const { t } = useTranslation();
  const [userState, userDispatch] = useContext(UserContext);
  const theme = useTheme();
  const setTheme = useSetTheme();
  const [loading, setLoading] = useState(false);
  const [userStats, setUserStats] = useState({
    totalRequests: 0,
    totalTokens: 0,
    quotaUsed: 0,
    quotaRemaining: 0,
  });
  
  const [notificationSettings, setNotificationSettings] = useState({
    warningType: 'email',
    warningThreshold: 100000,
    webhookUrl: '',
    webhookSecret: '',
    notificationEmail: '',
    barkUrl: '',
  });

  useEffect(() => {
    loadUserStats();
    loadNotificationSettings();
  }, []);

  const loadUserStats = async () => {
    try {
      const res = await API.get('/api/user/dashboard');
      if (res.data.success) {
        setUserStats(res.data.data);
      }
    } catch (error) {
      console.error('Failed to load user stats:', error);
    }
  };

  const loadNotificationSettings = async () => {
    try {
      const res = await API.get('/api/user/self');
      if (res.data.success) {
        const userData = res.data.data;
        setNotificationSettings({
          warningType: userData.notify_type || 'email',
          warningThreshold: userData.quota_warning_threshold || 100000,
          webhookUrl: userData.webhook_url || '',
          webhookSecret: userData.webhook_secret || '',
          notificationEmail: userData.notification_email || '',
          barkUrl: userData.bark_url || '',
        });
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  };

  const saveNotificationSettings = async () => {
    setLoading(true);
    try {
      const res = await API.put('/api/user/setting', {
        notify_type: notificationSettings.warningType,
        quota_warning_threshold: parseFloat(notificationSettings.warningThreshold),
        webhook_url: notificationSettings.webhookUrl,
        webhook_secret: notificationSettings.webhookSecret,
        notification_email: notificationSettings.notificationEmail,
        bark_url: notificationSettings.barkUrl,
      });

      if (res.data.success) {
        showSuccess(t('通知设置保存成功'));
      } else {
        showError(res.data.message);
      }
    } catch (error) {
      showError(t('保存失败'));
    } finally {
      setLoading(false);
    }
  };

  const handleThemeToggle = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const getRoleBadge = (role) => {
    const roleConfig = {
      1: { text: '普通用户', color: 'blue' },
      10: { text: '管理员', color: 'red' },
      100: { text: '超级管理员', color: 'purple' },
    };
    const config = roleConfig[role] || roleConfig[1];
    return <Tag color={config.color} size="small">{config.text}</Tag>;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      1: { text: '正常', color: 'green' },
      2: { text: '已封禁', color: 'red' },
      3: { text: '待激活', color: 'orange' },
    };
    const config = statusConfig[status] || statusConfig[1];
    return <Badge count={config.text} style={{ backgroundColor: `var(--semi-color-${config.color}-5)` }} />;
  };

  return (
    <ConsoleSection
      title={t('个人设置')}
      description={t('管理您的账户信息、通知设置和个人偏好')}
    >
      <div className="space-y-6">
        {/* 用户信息概览 */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-4">
              <Avatar size="large" style={{ backgroundColor: 'var(--semi-color-primary)' }}>
                <IconUser />
              </Avatar>
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <Title heading={4} style={{ margin: 0 }}>
                    {userState?.user?.username || '用户'}
                  </Title>
                  {getRoleBadge(userState?.user?.role)}
                  {getStatusBadge(userState?.user?.status)}
                </div>
                <Text type="secondary">
                  ID: {userState?.user?.id} | 
                  邮箱: {userState?.user?.email || '未绑定'} |
                  注册时间: {userState?.user?.created_time ? new Date(userState.user.created_time * 1000).toLocaleDateString() : '未知'}
                </Text>
              </div>
            </div>
            <Button 
              icon={theme === 'light' ? <IconMoon /> : <IconSun />}
              onClick={handleThemeToggle}
              theme="borderless"
              size="large"
            />
          </div>
        </Card>

        <Row gutter={16}>
          {/* 账户统计 */}
          <Col xs={24} sm={12} md={8}>
            <Card>
              <div className="text-center p-4">
                <IconHistory size="large" style={{ color: 'var(--semi-color-primary)' }} />
                <div className="mt-3">
                  <Title heading={3} style={{ margin: 0 }}>
                    {userStats.totalRequests?.toLocaleString() || 0}
                  </Title>
                  <Text type="secondary">{t('总请求数')}</Text>
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} md={8}>
            <Card>
              <div className="text-center p-4">
                <IconCreditCard size="large" style={{ color: 'var(--semi-color-success)' }} />
                <div className="mt-3">
                  <Title heading={3} style={{ margin: 0 }}>
                    ${(userState?.user?.quota || 0).toFixed(2)}
                  </Title>
                  <Text type="secondary">{t('剩余额度')}</Text>
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} md={8}>
            <Card>
              <div className="text-center p-4">
                <IconGift size="large" style={{ color: 'var(--semi-color-warning)' }} />
                <div className="mt-3">
                  <Title heading={3} style={{ margin: 0 }}>
                    ${(userStats.quotaUsed || 0).toFixed(2)}
                  </Title>
                  <Text type="secondary">{t('已用额度')}</Text>
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* 额度使用进度 */}
        <Card title={t('额度使用情况')}>
          <div className="p-4">
            <Progress
              percent={userStats.quotaUsed / (userStats.quotaUsed + (userState?.user?.quota || 1)) * 100}
              showInfo={true}
              format={(percent) => `${percent.toFixed(1)}%`}
              stroke="var(--semi-color-success)"
            />
            <div className="flex justify-between mt-2">
              <Text type="secondary">
                已使用: ${(userStats.quotaUsed || 0).toFixed(4)}
              </Text>
              <Text type="secondary">
                剩余: ${(userState?.user?.quota || 0).toFixed(4)}
              </Text>
            </div>
          </div>
        </Card>

        {/* 通知设置 */}
        <Card title={
          <Space>
            <IconBell />
            {t('通知设置')}
          </Space>
        }>
          <div className="space-y-4 p-4">
            <div>
              <Text strong>{t('额度预警阈值')}</Text>
              <div className="mt-2">
                <input
                  type="number"
                  value={notificationSettings.warningThreshold}
                  onChange={(e) => setNotificationSettings({
                    ...notificationSettings,
                    warningThreshold: e.target.value
                  })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="100000"
                />
              </div>
            </div>

            <div>
              <Text strong>{t('通知邮箱')}</Text>
              <div className="mt-2">
                <input
                  type="email"
                  value={notificationSettings.notificationEmail}
                  onChange={(e) => setNotificationSettings({
                    ...notificationSettings,
                    notificationEmail: e.target.value
                  })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('输入接收通知的邮箱地址')}
                />
              </div>
            </div>

            <div>
              <Text strong>{t('Webhook URL')}</Text>
              <div className="mt-2">
                <input
                  type="url"
                  value={notificationSettings.webhookUrl}
                  onChange={(e) => setNotificationSettings({
                    ...notificationSettings,
                    webhookUrl: e.target.value
                  })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://hooks.example.com/webhook"
                />
              </div>
            </div>

            <Divider />
            
            <div className="flex justify-end">
              <Button 
                type="primary" 
                loading={loading}
                onClick={saveNotificationSettings}
              >
                {t('保存通知设置')}
              </Button>
            </div>
          </div>
        </Card>

        {/* 快捷操作 */}
        <Card title={t('快捷操作')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
            <Button 
              block 
              icon={<IconMail />}
              onClick={() => window.open('/console/info')}
            >
              {t('消息中心')}
            </Button>
            <Button 
              block 
              icon={<IconSafe />}
              onClick={() => window.open('/console/token')}
            >
              {t('令牌管理')}
            </Button>
            <Button 
              block 
              icon={<IconHistory />}
              onClick={() => window.open('/console/log')}
            >
              {t('使用日志')}
            </Button>
            <Button 
              block 
              icon={<IconRefresh />}
              onClick={loadUserStats}
            >
              {t('刷新数据')}
            </Button>
          </div>
        </Card>
      </div>
    </ConsoleSection>
  );
};

export default PersonalSettingNew;