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

import { Button, Card, Space, Row, Col, Typography, Progress, Avatar, Descriptions, Divider } from '@douyinfe/semi-ui';
import { IconUser, IconClock, IconActivity, IconBarChart, IconCalendar, IconGift } from '@douyinfe/semi-icons';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isLoggedIn, isMobile } from '../../helpers';
import { API } from '../../helpers';

const { Title, Text } = Typography;

export default function Workspace(){
  const { t } = useTranslation();
  const [checkinStatus, setCheckinStatus] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [signing, setSigning] = useState(false);

  // 加载签到状态
  const loadCheckinStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/checkin/status');
      const data = await res.json();
      if (data.success) setCheckinStatus(data.data);
    } finally { 
      setLoading(false); 
    }
  };

  // 加载用户统计数据（数据看板）
  const loadUserStats = async () => {
    setStatsLoading(true);
    try {
      const res = await API.get('/api/user/dashboard');
      const { success, data } = res.data;
      if (success) {
        setUserStats(data);
      }
    } catch (error) {
      console.error('获取用户统计数据失败:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  // 执行签到
  const doCheckin = async () => {
    setSigning(true);
    try {
      const res = await fetch('/api/checkin/', {method: 'POST'});
      const data = await res.json();
      if (data.success) { 
        await loadCheckinStatus();
        // 签到成功后刷新用户统计
        await loadUserStats();
      }
    } finally { 
      setSigning(false); 
    }
  };

  useEffect(() => { 
    if (isLoggedIn()) {
      loadCheckinStatus();
      loadUserStats();
    }
  }, []); 

  const currentUser = window?.CURRENT_USER;
  const lastLoginTime = currentUser?.last_login_at ? dayjs.unix(currentUser.last_login_at) : null;
  const registrationTime = currentUser?.created_at ? dayjs.unix(currentUser.created_at) : null;

  return (
    <div className='p-4' style={{ background: '#f6f7f9', minHeight: '100vh' }}>
      <div className='mb-4'>
        <Title heading={3} style={{ marginBottom: 8 }}>
          <IconActivity style={{ marginRight: 8 }} />
          {t('工作台')}
        </Title>
        <Text type="tertiary">{t('用户数据概览与日常操作')}</Text>
      </div>

      <Row gutter={[16, 16]}>
        {/* 用户基本信息卡片 */}
        <Col span={isMobile() ? 24 : 12}>
          <Card 
            title={
              <Space>
                <IconUser />
                {t('用户信息')}
              </Space>
            }
            loading={statsLoading}
            style={{ height: '100%' }}
          >
            <Space vertical align='start' style={{ width: '100%' }}>
              <Space>
                <Avatar size='large' color='blue'>
                  {currentUser?.username?.charAt(0)?.toUpperCase() || 'U'}
                </Avatar>
                <div>
                  <Title heading={5} style={{ margin: 0 }}>{currentUser?.username || '未知用户'}</Title>
                  <Text type="tertiary">{currentUser?.email || ''}</Text>
                </div>
              </Space>
              
              <Divider />
              
              <Descriptions size="small" row>
                <Descriptions.Item itemKey={t('用户ID')}>
                  {currentUser?.id || '--'}
                </Descriptions.Item>
                <Descriptions.Item itemKey={t('用户组')}>
                  {currentUser?.group || t('默认组')}
                </Descriptions.Item>
                <Descriptions.Item itemKey={t('注册时间')}>
                  {registrationTime ? registrationTime.format('YYYY-MM-DD HH:mm') : '--'}
                </Descriptions.Item>
                <Descriptions.Item itemKey={t('上次登录')}>
                  {lastLoginTime ? lastLoginTime.format('YYYY-MM-DD HH:mm') : '--'}
                </Descriptions.Item>
              </Descriptions>
            </Space>
          </Card>
        </Col>

        {/* 数据看板 */}
        <Col span={isMobile() ? 24 : 12}>
          <Card 
            title={
              <Space>
                <IconBarChart />
                {t('数据看板')}
              </Space>
            }
            loading={statsLoading}
            style={{ height: '100%' }}
          >
            <Space vertical align='start' style={{ width: '100%' }}>
              <Row gutter={16} style={{ width: '100%' }}>
                <Col span={12}>
                  <div className='text-center p-3' style={{ background: '#f0f9ff', borderRadius: 8 }}>
                    <Title heading={4} style={{ color: '#1890ff', margin: 0 }}>
                      {userStats?.quota || 0}
                    </Title>
                    <Text size="small" type="tertiary">{t('剩余额度')}</Text>
                  </div>
                </Col>
                <Col span={12}>
                  <div className='text-center p-3' style={{ background: '#f6ffed', borderRadius: 8 }}>
                    <Title heading={4} style={{ color: '#52c41a', margin: 0 }}>
                      {userStats?.used_quota || 0}
                    </Title>
                    <Text size="small" type="tertiary">{t('已用额度')}</Text>
                  </div>
                </Col>
              </Row>
              
              <Row gutter={16} style={{ width: '100%' }}>
                <Col span={12}>
                  <div className='text-center p-3' style={{ background: '#fff2e8', borderRadius: 8 }}>
                    <Title heading={4} style={{ color: '#fa8c16', margin: 0 }}>
                      {userStats?.request_count || 0}
                    </Title>
                    <Text size="small" type="tertiary">{t('请求次数')}</Text>
                  </div>
                </Col>
                <Col span={12}>
                  <div className='text-center p-3' style={{ background: '#f9f0ff', borderRadius: 8 }}>
                    <Title heading={4} style={{ color: '#722ed1', margin: 0 }}>
                      {userStats?.token_count || 0}
                    </Title>
                    <Text size="small" type="tertiary">{t('令牌数量')}</Text>
                  </div>
                </Col>
              </Row>

              {userStats?.quota > 0 && (
                <>
                  <Divider />
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text size="small">{t('额度使用率')}</Text>
                      <Text size="small">
                        {(((userStats?.used_quota || 0) / userStats.quota) * 100).toFixed(1)}%
                      </Text>
                    </div>
                    <Progress 
                      percent={(userStats?.used_quota || 0) / userStats.quota * 100} 
                      stroke={userStats?.used_quota / userStats.quota > 0.8 ? '#ff4d4f' : '#1890ff'}
                      size="small"
                    />
                  </div>
                </>
              )}
            </Space>
          </Card>
        </Col>

        {/* 每日签到卡片 */}
        <Col span={24}>
          <Card 
            title={
              <Space>
                <IconGift />
                {t('每日签到')}
              </Space>
            }
            loading={loading}
          >
            <Row gutter={[16, 16]} align="middle">
              <Col span={isMobile() ? 24 : 8}>
                <Space vertical align='start'>
                  {checkinStatus && (
                    <>
                      <div>
                        <Text strong>{t('今日奖励')}: </Text>
                        <Text type={checkinStatus.checked_today ? 'success' : 'primary'}>
                          {checkinStatus.today_reward ?? (checkinStatus.checked_today ? t('已签到') : '—')}
                        </Text>
                      </div>
                      <div>
                        <Text strong>{t('连续天数')}: </Text>
                        <Text type="warning">{checkinStatus.streak}</Text>
                      </div>
                      <div>
                        <Text strong>{t('本月总奖励')}: </Text>
                        <Text type="success">{checkinStatus.month_total_reward}</Text>
                      </div>
                    </>
                  )}
                </Space>
              </Col>
              
              <Col span={isMobile() ? 24 : 16}>
                <Space wrap>
                  <Button 
                    type='primary' 
                    size='large'
                    loading={signing} 
                    disabled={checkinStatus?.checked_today} 
                    onClick={doCheckin}
                    icon={<IconGift />}
                  >
                    {checkinStatus?.checked_today ? t('已签到') : t('签到领取')}
                  </Button>
                  
                  <Button 
                    size='large'
                    icon={<IconCalendar />}
                    onClick={() => { window.location.href = '/console/checkin'; }}
                  >
                    {t('签到日历')}
                  </Button>
                  
                  <Button 
                    size='large'
                    icon={<IconClock />}
                    onClick={() => {
                      loadCheckinStatus();
                      loadUserStats();
                    }}
                  >
                    {t('刷新数据')}
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
