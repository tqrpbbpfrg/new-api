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

import { IconActivity, IconCalendar, IconClock, IconGift, IconUser } from '@douyinfe/semi-icons';
import { Avatar, Button, Card, Col, Descriptions, Divider, Progress, Row, Space, Typography, Toast } from '@douyinfe/semi-ui';
import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API, isLoggedIn } from '../../helpers';
import { useIsMobile } from '../../hooks/common/useIsMobile';

// 子组件拆分：保持文件内可读性（规模尚小，无需额外文件导出）
function StatBlock({ value, label, color, bg }) {
  return (
    <div className='text-center p-3' style={{ background: bg, borderRadius: 8 }}>
      <Typography.Title heading={4} style={{ color, margin: 0 }}>
        {value}
      </Typography.Title>
      <Typography.Text size="small" type="tertiary">{label}</Typography.Text>
    </div>
  );
}

function UserInfoCard({ t, currentUser, statsLoading }) {
  const lastLoginTime = currentUser?.last_login_at ? dayjs.unix(currentUser.last_login_at) : null;
  const registrationTime = currentUser?.created_at ? dayjs.unix(currentUser.created_at) : null;
  return (
    <Card 
      title={<Space><IconUser />{t('用户信息')}</Space>} 
      loading={statsLoading}
      style={{ height: '100%' }}
    >
      <Space vertical align='start' style={{ width: '100%' }}>
        <Space>
          <Avatar size='large' color='blue'>
            {currentUser?.username?.charAt(0)?.toUpperCase() || 'U'}
          </Avatar>
          <div>
            <Typography.Title heading={5} style={{ margin: 0 }}>{currentUser?.username || t('未知用户')}</Typography.Title>
            <Typography.Text type="tertiary">{currentUser?.email || ''}</Typography.Text>
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
  );
}

function DashboardCard({ t, userStats, statsLoading, currentUser }) {
  const lastLoginTime = currentUser?.last_login_at ? dayjs.unix(currentUser.last_login_at) : null;
  const quota = userStats?.quota || 0;
  const used = userStats?.used_quota || 0;
  const percent = quota > 0 ? ((used / quota) * 100) : 0;
  return (
    <Card 
      title={<Space><IconActivity />{t('数据看板')}</Space>} 
      loading={statsLoading} style={{ height: '100%' }}
    >
      <Space vertical align='start' style={{ width: '100%' }}>
        <div style={{ width: '100%' }}>
          <Typography.Text size="small" type="tertiary">
            {t('上次登录')}: {lastLoginTime ? lastLoginTime.format('YYYY-MM-DD HH:mm') : '--'}
          </Typography.Text>
        </div>
        <Row gutter={16} style={{ width: '100%' }}>
          <Col span={12}><StatBlock value={quota} label={t('剩余额度')} color='#1890ff' bg='#f0f9ff' /></Col>
          <Col span={12}><StatBlock value={used} label={t('已用额度')} color='#52c41a' bg='#f6ffed' /></Col>
        </Row>
        <Row gutter={16} style={{ width: '100%' }}>
          <Col span={12}><StatBlock value={userStats?.request_count || 0} label={t('请求次数')} color='#fa8c16' bg='#fff2e8' /></Col>
          <Col span={12}><StatBlock value={userStats?.token_count || 0} label={t('令牌数量')} color='#722ed1' bg='#f9f0ff' /></Col>
        </Row>
        {quota > 0 && (
          <>
            <Divider />
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Typography.Text size="small">{t('额度使用率')}</Typography.Text>
                <Typography.Text size="small">{percent.toFixed(1)}%</Typography.Text>
              </div>
              <Progress 
                percent={percent} 
                stroke={percent > 80 ? '#ff4d4f' : '#1890ff'}
                size="small"
              />
            </div>
          </>
        )}
      </Space>
    </Card>
  );
}

function CheckinCard({ t, loading, checkinStatus, signing, onCheckin, onRefresh, isMobile }) {
  return (
    <Card 
      title={<Space><IconGift />{t('每日签到')}</Space>} 
      loading={loading}
    >
      <Row gutter={[16, 16]} align="middle">
        <Col span={isMobile() ? 24 : 8}>
          <Space vertical align='start'>
            {checkinStatus && (
              <>
                <div>
                  <Typography.Text strong>{t('今日奖励')}: </Typography.Text>
                  <Typography.Text type={checkinStatus.checked_today ? 'success' : 'primary'}>
                    {checkinStatus.today_reward ?? (checkinStatus.checked_today ? t('已签到') : '—')}
                  </Typography.Text>
                </div>
                <div>
                  <Typography.Text strong>{t('连续天数')}: </Typography.Text>
                  <Typography.Text type="warning">{checkinStatus.streak}</Typography.Text>
                </div>
                <div>
                  <Typography.Text strong>{t('本月总奖励')}: </Typography.Text>
                  <Typography.Text type="success">{checkinStatus.month_total_reward}</Typography.Text>
                </div>
              </>
            )}
          </Space>
        </Col>
        <Col span={isMobile() ? 24 : 16}>
          <Space wrap>
            <Button type='primary' size='large' loading={signing} disabled={checkinStatus?.checked_today} onClick={onCheckin} icon={<IconGift />}>
              {checkinStatus?.checked_today ? t('已签到') : t('签到领取')}
            </Button>
            <Button size='large' icon={<IconCalendar />} onClick={() => { window.location.href = '/console/checkin'; }}>
              {t('签到日历')}
            </Button>
            <Button size='large' icon={<IconClock />} onClick={onRefresh} disabled={loading}>
              {t('刷新数据')}
            </Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );
}

const { Title, Text } = Typography;

export default function Workspace(){
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [checkinStatus, setCheckinStatus] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(false); // 签到状态加载
  const [statsLoading, setStatsLoading] = useState(false); // 数据看板加载
  const [signing, setSigning] = useState(false); // 签到按钮提交

  // 加载签到状态
  const loadCheckinStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/checkin/status');
      const data = await res.json();
      if (data.success) setCheckinStatus(data.data); else Toast.error(t('加载签到状态失败'));
    } catch (e) {
      Toast.error(t('加载签到状态失败'));
    } finally { 
      setLoading(false); 
    }
  }, [t]);

  // 加载用户统计数据（数据看板）
  const loadUserStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await API.get('/api/user/dashboard');
      const { success, data } = res.data;
      if (success) {
        setUserStats(data);
      } else {
        Toast.error(t('加载用户统计失败'));
      }
    } catch (error) {
      Toast.error(t('加载用户统计失败'));
    } finally {
      setStatsLoading(false);
    }
  }, [t]);

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
        Toast.success(t('签到成功'));
      } else {
        Toast.error(data.message || t('签到失败'));
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
        <Col span={isMobile() ? 24 : 12}>
          <UserInfoCard t={t} currentUser={currentUser} statsLoading={statsLoading} />
        </Col>
        <Col span={isMobile() ? 24 : 12}>
          <DashboardCard t={t} userStats={userStats} statsLoading={statsLoading} currentUser={currentUser} />
        </Col>
        <Col span={24}>
          <CheckinCard 
            t={t} 
            loading={loading} 
            checkinStatus={checkinStatus} 
            signing={signing} 
            onCheckin={doCheckin}
            onRefresh={() => { loadCheckinStatus(); loadUserStats(); }}
            isMobile={isMobile}
          />
        </Col>
      </Row>
    </div>
  );
}
