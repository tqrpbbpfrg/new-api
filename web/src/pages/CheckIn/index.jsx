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

import React, { useEffect, useState } from 'react';
import { 
  Card, 
  Button, 
  Calendar, 
  Modal, 
  Input, 
  Spin, 
  Toast,
  Descriptions,
  Tag,
  Table,
  Typography
} from '@douyinfe/semi-ui';
import { CheckInService } from '../../services/checkin';
import { showSuccess, showError } from '../../helpers';
import { Calendar as CalendarIcon, Gift, TrendingUp, History } from 'lucide-react';

const { Text } = Typography;

const CheckIn = () => {
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [config, setConfig] = useState(null);
  const [history, setHistory] = useState([]);
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

  // 处理签到
  const handleCheckIn = async () => {
    try {
      // 检查是否需要鉴权码
      if (config?.authCodeEnabled && config?.authCode) {
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
        showSuccess(`签到成功！获得 ${response.data.reward} 额度`);
        await fetchStatus();
        await fetchHistory(currentPage);
        setShowVerifyModal(false);
        setVerifyCode('');
      } else {
        showError(response.message || '签到失败');
      }
    } catch (error) {
      showError('签到失败');
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

  // 日历渲染函数
  const renderCalendarCell = ({ date }) => {
    const dateStr = date.format('YYYY-MM-DD');
    const isCheckedIn = history.some(item => 
      new Date(item.created_at).format('YYYY-MM-DD') === dateStr
    );
    
    if (isCheckedIn) {
      return (
        <div style={{ 
          width: '100%', 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: 'var(--semi-color-primary-light-default)',
          borderRadius: '4px'
        }}>
          <Gift size={16} style={{ color: 'var(--semi-color-primary)' }} />
        </div>
      );
    }
    return null;
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
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* 签到状态卡片 */}
        <Card title="签到状态" loading={loading}>
          {status && (
            <Descriptions>
              <Descriptions.Item itemKey="今日签到">
                {status.checked_in_today ? (
                  <Tag color="green">已签到</Tag>
                ) : (
                  <Tag color="orange">未签到</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item itemKey="连续签到">
                <Tag color="blue" size="large">
                  {status.continuous_days} 天
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item itemKey="总签到次数">
                <Text strong>{status.total_checkins} 次</Text>
              </Descriptions.Item>
              <Descriptions.Item itemKey="上次签到时间">
                <Text type="tertiary">
                  {status.last_checkin ? new Date(status.last_checkin).toLocaleString() : '从未签到'}
                </Text>
              </Descriptions.Item>
            </Descriptions>
          )}
          
          {!status?.checked_in_today && (
            <Button
              type="primary"
              size="large"
              icon={<Gift />}
              loading={loading}
              onClick={handleCheckIn}
              style={{ width: '100%', marginTop: '16px' }}
            >
              立即签到
            </Button>
          )}
        </Card>

        {/* 签到日历 */}
        <Card title="签到日历" loading={historyLoading}>
          <Calendar
            mode="month"
            renderCell={renderCalendarCell}
            style={{ width: '100%' }}
          />
        </Card>
      </div>

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
