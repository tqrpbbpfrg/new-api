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
  Calendar,
  Card,
  Descriptions,
  Input,
  List,
  Modal,
  Spin,
  Table,
  Tag,
  Typography
} from '@douyinfe/semi-ui';
import { Award, Calendar as CalendarIcon, Crown, Gift, History, Medal, TrendingUp, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { showError, showSuccess } from '../../helpers';
import { CheckInService } from '../../services/checkin';

const { Text } = Typography;

const CheckIn = () => {
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [config, setConfig] = useState(null);
  const [history, setHistory] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // 获取签到配置
  const fetchConfig = async () => {
    try {
      setConfigLoading(true);
      const response = await CheckInService.getConfig();
      if (response.success) {
        setConfig(response.data);
      }
    } catch (error) {
      console.error('获取签到配置失败:', error);
    } finally {
      setConfigLoading(false);
    }
  };

  // 获取用户签到状态
  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await CheckInService.getUserStatus();
      if (response.success) {
        setStatus(response.data);
      }
    } catch (error) {
      console.error('获取签到状态失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取签到历史
  const fetchHistory = async (page = 1) => {
    try {
      setHistoryLoading(true);
      const response = await CheckInService.getHistory(page, pageSize);
      if (response.success) {
        setHistory(response.data.items || []);
        setTotal(response.data.total || 0);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('获取签到历史失败:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  // 获取签到排行榜
  const fetchLeaderboard = async () => {
    try {
      setLeaderboardLoading(true);
      const response = await CheckInService.getLeaderboard(10);
      if (response.success) {
        setLeaderboard(response.data || []);
      }
    } catch (error) {
      console.error('获取签到排行榜失败:', error);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  // 处理签到
  const handleCheckIn = async () => {
    try {
      // 检查是否需要鉴权码
      if (config?.authCodeEnabled) {
        setShowVerifyModal(true);
        return;
      }

      await performCheckIn('');
    } catch (error) {
      showError('签到失败');
    }
  };

  // 执行签到
  const performCheckIn = async (code) => {
    try {
      setLoading(true);
      const response = await CheckInService.checkIn(code);
      if (response.success) {
        showSuccess(`签到成功！获得 ${response.reward || response.data?.reward} 额度`);
        await fetchStatus();
        await fetchHistory(currentPage);
        await fetchLeaderboard();
        setShowVerifyModal(false);
        setVerifyCode('');
      } else {
        showError(response.message || '签到失败');
      }
    } catch (error) {
      console.error('签到请求失败:', error);
      showError(error.response?.data?.message || error.message || '签到失败');
    } finally {
      setLoading(false);
    }
  };

  // 确认鉴权码签到
  const handleVerifyCheckIn = () => {
    if (!verifyCode.trim()) {
      showError('请输入鉴权码');
      return;
    }
    performCheckIn(verifyCode);
  };

  // 日历渲染函数 - 在日期下方显示签到状态
  const renderCalendarCell = ({ date }) => {
    const dateStr = date.format('YYYY-MM-DD');
    const checkinRecord = history.find(item => 
      new Date(item.created_at).toISOString().split('T')[0] === dateStr
    );
    
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '4px'
      }}>
        {checkinRecord && (
          <div style={{
            marginTop: '4px',
            fontSize: '20px',
            lineHeight: '1'
          }}>
            ✓
          </div>
        )}
      </div>
    );
  };

  // 获取排名图标
  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Crown size={20} style={{ color: '#FFD700' }} />;
      case 2:
        return <Medal size={20} style={{ color: '#C0C0C0' }} />;
      case 3:
        return <Award size={20} style={{ color: '#CD7F32' }} />;
      default:
        return <Trophy size={16} style={{ color: 'var(--semi-color-text-2)' }} />;
    }
  };

  // 历史记录表格列
  const historyColumns = [
    {
      title: '签到时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => new Date(text).toLocaleString(),
    },
    {
      title: '获得额度',
      dataIndex: 'reward',
      key: 'reward',
      render: (text) => (
        <Tag color="green" size="large">
          +{text}
        </Tag>
      ),
    },
    {
      title: '连续天数',
      dataIndex: 'continuous_days',
      key: 'continuous_days',
      render: (text) => (
        <Tag color="blue" size="large">
          {text} 天
        </Tag>
      ),
    },
  ];

  useEffect(() => {
    fetchConfig();
    fetchStatus();
    fetchHistory(1);
    fetchLeaderboard();
  }, []);

  if (configLoading || !config) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  // 如果签到功能未启用
  if (!config.enabled) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <CalendarIcon size={48} style={{ color: 'var(--semi-color-text-3)' }} />
        <Text type="tertiary" size="large">签到功能暂未启用</Text>
      </div>
    );
  }

  return (
    <div className='mt-[60px] px-2' style={{ paddingTop: '20px', paddingBottom: '20px' }}>
      {/* 签到日历 - 整合签到状态 */}
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarIcon size={18} />
            签到日历
          </div>
        }
        loading={historyLoading || loading}
        headerExtraContent={
          !status?.checked_in_today && (
            <Button
              type="primary"
              icon={<Gift />}
              loading={loading}
              onClick={handleCheckIn}
              size="large"
            >
              立即签到
            </Button>
          )
        }
        style={{ marginBottom: '20px' }}
      >
        {/* 签到状态信息栏 */}
        {status && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center',
            gap: '32px',
            padding: '16px',
            backgroundColor: 'var(--semi-color-fill-0)',
            borderRadius: '8px',
            marginBottom: '20px',
            flexWrap: 'wrap'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--semi-color-text-2)', marginBottom: '4px' }}>
                今日状态
              </div>
              {status.checked_in_today ? (
                <Tag color="green" size="large">✓ 已签到</Tag>
              ) : (
                <Tag color="orange" size="large">未签到</Tag>
              )}
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--semi-color-text-2)', marginBottom: '4px' }}>
                连续签到
              </div>
              <Text strong style={{ fontSize: '18px', color: 'var(--semi-color-primary)' }}>
                {status.continuous_days} 天
              </Text>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--semi-color-text-2)', marginBottom: '4px' }}>
                累计签到
              </div>
              <Text strong style={{ fontSize: '18px' }}>
                {status.total_checkins} 次
              </Text>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--semi-color-text-2)', marginBottom: '4px' }}>
                上次签到
              </div>
              <Text type="tertiary" style={{ fontSize: '12px' }}>
                {status.last_checkin ? new Date(status.last_checkin).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '从未'}
              </Text>
            </div>
          </div>
        )}

        {/* 日历 */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Calendar
            mode="month"
            renderCell={renderCalendarCell}
            style={{ width: '100%', maxWidth: '800px' }}
          />
        </div>
      </Card>

      {/* 签到排行榜 */}
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} />
            签到排行榜
          </div>
        }
        loading={leaderboardLoading}
        style={{ marginBottom: '20px' }}
      >
        <List
          dataSource={leaderboard}
          renderItem={(item) => (
            <List.Item
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: '1px solid var(--semi-color-border)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '80px' }}>
                  {getRankIcon(item.rank)}
                  <Text strong>#{item.rank}</Text>
                </div>
                <Avatar size="small" style={{ backgroundColor: 'var(--semi-color-primary)' }}>
                  {item.username ? item.username.charAt(0).toUpperCase() : 'U'}
                </Avatar>
                <div style={{ flex: 1 }}>
                  <Text strong>{item.username || `用户${item.user_id}`}</Text>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <Tag size="small" color="blue">
                      {item.total_checkins}次
                    </Tag>
                    <Tag size="small" color="green">
                      连续{item.continuous_days}天
                    </Tag>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Text type="success" strong>+{item.total_rewards}</Text>
                  <div style={{ fontSize: '12px', color: 'var(--semi-color-text-2)' }}>
                    总奖励
                  </div>
                </div>
              </div>
            </List.Item>
          )}
        />
      </Card>

      {/* 签到历史 */}
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={18} />
            签到历史
          </div>
        }
        loading={historyLoading}
      >
        <Table
          columns={historyColumns}
          dataSource={history}
          pagination={{
            currentPage,
            pageSize,
            total,
            onPageChange: fetchHistory,
          }}
          style={{ marginTop: '16px' }}
        />
      </Card>

      {/* 鉴权码弹窗 */}
      <Modal
        title="请输入鉴权码"
        visible={showVerifyModal}
        onOk={handleVerifyCheckIn}
        onCancel={() => {
          setShowVerifyModal(false);
          setVerifyCode('');
        }}
        confirmLoading={loading}
      >
        <Input
          placeholder="请输入鉴权码"
          value={verifyCode}
          onChange={(value) => setVerifyCode(value)}
          onPressEnter={handleVerifyCheckIn}
          style={{ marginTop: '16px' }}
        />
      </Modal>
    </div>
  );
};

export default CheckIn;
