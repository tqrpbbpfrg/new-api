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
import { renderQuota, showError, showSuccess } from '../../helpers';
import { CheckInService } from '../../services/checkin';

const { Text } = Typography;

const CheckIn = () => {
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [config, setConfig] = useState(null);
  const [monthHistory, setMonthHistory] = useState([]); // 用于日历显示的月度历史
  const [pagedHistory, setPagedHistory] = useState([]); // 用于表格显示的分页历史
  const [leaderboard, setLeaderboard] = useState([]);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);

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

  // 获取月度签到历史（用于日历显示）
  const fetchMonthHistory = async (year, month) => {
    try {
      setHistoryLoading(true);
      const response = await CheckInService.getHistory(year, month);
      if (response.success) {
        const historyData = response.data || [];
        console.log(`[签到日历] 获取 ${year}-${month} 月历史数据:`, historyData);
        setMonthHistory(historyData);
      }
    } catch (error) {
      console.error('获取月度签到历史失败:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  // 获取分页签到历史（用于表格显示）
  const fetchPagedHistory = async (page = 1) => {
    try {
      setHistoryLoading(true);
      const response = await CheckInService.getHistoryPaged(page, pageSize);
      if (response.success) {
        setPagedHistory(response.data || []);
        setTotal(response.total || 0);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('获取分页签到历史失败:', error);
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
    // 记录签到前的状态
    const beforeStatus = status;
    
    try {
      setLoading(true);
      const response = await CheckInService.checkIn(code);
      
      // 无论响应如何，都延迟后重新验证状态
      setTimeout(async () => {
        try {
          // 重新获取最新状态
          const statusResponse = await CheckInService.getUserStatus();
          
          if (statusResponse.success) {
            const newStatus = statusResponse.data;
            
            // 通过对比状态判断签到是否真正成功
            const actuallyCheckedIn = newStatus.checked_in_today && 
              (!beforeStatus?.checked_in_today || 
               newStatus.total_checkins > (beforeStatus?.total_checkins || 0));
            
            if (actuallyCheckedIn) {
              // 签到确实成功了
              const reward = newStatus.today_reward || response.reward || 0;
              const balanceText = renderQuota(reward, 2);
              showSuccess(`签到成功！获得 ${balanceText}`);
              setShowVerifyModal(false);
              setVerifyCode('');
            } else if (newStatus.checked_in_today) {
              // 今天已经签到过了
              showError('今日已签到');
            } else if (response.success) {
              // 响应成功但状态未更新，可能是延迟
              const reward = response.reward || 0;
              const balanceText = renderQuota(reward, 2);
              showSuccess(`签到成功！获得 ${balanceText}`);
              setShowVerifyModal(false);
              setVerifyCode('');
            } else {
              // 确实失败了
              showError(response.message || '签到失败');
            }
            
            // 更新所有数据
            setStatus(newStatus);
            await fetchMonthHistory(currentYear, currentMonth);
            await fetchPagedHistory(currentPage);
            await fetchLeaderboard();
          } else {
            // 无法获取状态，使用响应判断
            if (response.success) {
              const reward = response.reward || 0;
              const balanceText = renderQuota(reward, 2);
              showSuccess(`签到成功！获得 ${balanceText}`);
              setShowVerifyModal(false);
              setVerifyCode('');
            } else {
              showError(response.message || '签到失败');
            }
            // 尝试刷新数据
            await fetchStatus();
            await fetchMonthHistory(currentYear, currentMonth);
            await fetchPagedHistory(currentPage);
            await fetchLeaderboard();
          }
        } catch (verifyError) {
          console.error('验证签到状态失败:', verifyError);
          // 验证失败，根据原始响应判断
          if (response.success) {
            const reward = response.reward || 0;
            const balanceText = renderQuota(reward, 2);
            showSuccess(`签到成功！获得 ${balanceText}`);
            setShowVerifyModal(false);
            setVerifyCode('');
          } else {
            showError(response.message || '签到失败');
          }
          // 尝试刷新数据
          await fetchStatus();
          await fetchMonthHistory(currentYear, currentMonth);
          await fetchPagedHistory(currentPage);
          await fetchLeaderboard();
        }
      }, 200); // 增加延迟到200ms，确保数据库完全提交
      
    } catch (error) {
      console.error('签到请求失败:', error);
      
      // 请求失败时，延迟后通过状态验证实际结果
      setTimeout(async () => {
        try {
          const statusResponse = await CheckInService.getUserStatus();
          
          if (statusResponse.success) {
            const newStatus = statusResponse.data;
            
            // 判断是否真的签到成功了
            const actuallyCheckedIn = newStatus.checked_in_today && 
              (!beforeStatus?.checked_in_today || 
               newStatus.total_checkins > (beforeStatus?.total_checkins || 0));
            
            if (actuallyCheckedIn) {
              // 虽然请求失败，但签到实际成功了
              const reward = newStatus.today_reward || 0;
              const balanceText = renderQuota(reward, 2);
              showSuccess(`签到成功！获得 ${balanceText}`);
              setShowVerifyModal(false);
              setVerifyCode('');
            } else if (newStatus.checked_in_today) {
              // 今天已经签到过了
              showError('今日已签到');
            } else {
              // 确实失败了
              const errorMsg = error.response?.data?.message || error.message || '签到失败';
              showError(errorMsg);
            }
            
            // 更新所有数据
            setStatus(newStatus);
            await fetchMonthHistory(currentYear, currentMonth);
            await fetchPagedHistory(currentPage);
            await fetchLeaderboard();
          } else {
            // 无法验证，显示原始错误
            const errorMsg = error.response?.data?.message || error.message || '签到失败';
            showError(errorMsg);
            // 尝试刷新数据
            await fetchStatus();
            await fetchMonthHistory(currentYear, currentMonth);
            await fetchPagedHistory(currentPage);
            await fetchLeaderboard();
          }
        } catch (verifyError) {
          console.error('验证签到状态失败:', verifyError);
          // 验证也失败了，显示原始错误
          const errorMsg = error.response?.data?.message || error.message || '签到失败';
          showError(errorMsg);
          // 尝试刷新数据
          await fetchStatus();
          await fetchMonthHistory(currentYear, currentMonth);
          await fetchPagedHistory(currentPage);
          await fetchLeaderboard();
        }
      }, 200);
    } finally {
      // 延迟关闭加载状态，等待验证完成
      setTimeout(() => {
        setLoading(false);
      }, 300);
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
  const renderCalendarCell = (dateValue, dateObj) => {
    // Semi UI Calendar 的 dateCellRender 接收两个参数：
    // dateValue: dayjs 对象
    // dateObj: { dateString, dateInstance, ... }
    
    const pad = (n) => String(n).padStart(2, '0');
    let dateStr = '';
    
    try {
      // 优先使用 dateValue (dayjs 对象)
      if (dateValue && dateValue.format) {
        dateStr = dateValue.format('YYYY-MM-DD');
      }
      // 备用：使用 dateObj
      else if (dateObj && dateObj.dateString) {
        dateStr = dateObj.dateString;
      }
      // 再备用：尝试从 dateValue 提取
      else if (dateValue instanceof Date) {
        dateStr = `${dateValue.getFullYear()}-${pad(dateValue.getMonth() + 1)}-${pad(dateValue.getDate())}`;
      }
      // 最后备用：如果 dateValue 有 toDate 方法
      else if (dateValue && dateValue.toDate) {
        const d = dateValue.toDate();
        dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      }
    } catch (error) {
      console.error('[签到日历] 日期解析错误:', error, dateValue);
      return null;
    }

    if (!dateStr) {
      return null;
    }

    // 查找该日期的签到记录
    const checkinRecord = monthHistory.find(item => item.check_date === dateStr);
    
    // 调试：记录找到的签到记录
    if (checkinRecord) {
      console.log(`[签到日历] ${dateStr} 找到签到记录:`, checkinRecord);
    }
    
    // 根据连续天数设置背景颜色
    let bg = 'transparent';
    let rewardColor = 'var(--semi-color-success)';
    let textColor = 'var(--semi-color-text-2)';
    
    if (checkinRecord) {
      const days = checkinRecord.continuous || checkinRecord.continuous_days || 1;
      textColor = '#fff';
      
      if (days >= 15) {
        bg = 'linear-gradient(135deg,#52c41a 0%,#237804 100%)';
        rewardColor = '#fff';
      } else if (days >= 7) {
        bg = 'linear-gradient(135deg,#73d13d 0%,#52c41a 100%)';
        rewardColor = '#fff';
      } else if (days >= 3) {
        bg = 'linear-gradient(135deg,#b7eb8f 0%,#73d13d 100%)';
        rewardColor = '#1f1f1f';
      } else {
        bg = 'linear-gradient(135deg,#f6ffed 0%,#d9f7be 100%)';
        rewardColor = 'var(--semi-color-success)';
      }
    }
    
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px',
        position: 'relative',
        borderRadius: 6,
        background: bg,
        transition: 'all .2s',
        boxShadow: checkinRecord ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
        minHeight: '60px'
      }}>
        {/* 日期号码 */}
        <div style={{
          position: 'absolute',
          top: 4,
          left: 6,
          fontSize: 11,
          fontWeight: 500,
          color: textColor
        }}>
          {dateStr.split('-')[2]}
        </div>
        
        {checkinRecord ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            width: '100%',
            height: '100%',
            paddingTop: '8px'
          }}>
            {/* 签到对勾 */}
            <div style={{
              fontSize: 18,
              lineHeight: 1,
              color: '#fff',
              fontWeight: 700
            }}>✓</div>
            {/* 奖励额度 */}
            <div style={{
              fontSize: 10,
              fontWeight: 600,
              color: rewardColor,
              padding: '2px 6px',
              borderRadius: 4,
              background: rewardColor === '#fff' ? 'rgba(255,255,255,0.25)' : 'transparent'
            }}>
              {formatReward(checkinRecord.reward)}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  // 监听日历月份变化
  const handleCalendarChange = (date) => {
    const year = date.year();
    const month = date.month() + 1;
    if (year !== currentYear || month !== currentMonth) {
      setCurrentYear(year);
      setCurrentMonth(month);
      fetchMonthHistory(year, month);
    }
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

  // 奖励显示为 $xx
  const formatReward = (reward, digits = 2) => {
    if (reward === null || reward === undefined || isNaN(reward)) return '$0';
    let quotaPerUnit = parseFloat(localStorage.getItem('quota_per_unit'));
    if (!quotaPerUnit || isNaN(quotaPerUnit) || quotaPerUnit === 0) {
      return '$' + reward;
    }
    const result = reward / quotaPerUnit;
    const fixed = result.toFixed(digits);
    if (parseFloat(fixed) === 0 && reward > 0 && result > 0) {
      const minValue = Math.pow(10, -digits).toFixed(digits);
      return '$' + minValue;
    }
    return '$' + fixed;
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
          {formatReward(text)}
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
    fetchMonthHistory(currentYear, currentMonth);
    fetchPagedHistory(1);
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
      {/* 签到日历 - 整合签到状态和历史 */}
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarIcon size={18} />
            签到日历与历史
          </div>
        }
        loading={historyLoading || loading}
        headerExtraContent={
          <Button
            type={status?.checked_in_today ? "tertiary" : "primary"}
            icon={<Gift />}
            loading={loading}
            onClick={handleCheckIn}
            size="large"
            disabled={status?.checked_in_today}
          >
            {status?.checked_in_today ? "今日已签" : "立即签到"}
          </Button>
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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px' }}>
          <Calendar
            mode="month"
            // 使用 Semi UI 支持的自定义日期单元格渲染属性
            dateCellRender={renderCalendarCell}
            dateFullCellRender={renderCalendarCell}
            // 兼容旧写法（如果仍被支持则无害）
            // dateRender={renderCalendarCell}
            onChange={handleCalendarChange}
            style={{ width: '100%', maxWidth: '800px' }}
          />
        </div>

        {/* 签到历史表格 - 整合到日历卡片内 */}
        <div style={{ marginTop: '24px', borderTop: '1px solid var(--semi-color-border)', paddingTop: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <History size={18} />
            <Text strong style={{ fontSize: '16px' }}>我的签到记录</Text>
          </div>
          <Table
            columns={historyColumns}
            dataSource={pagedHistory}
            pagination={{
              currentPage,
              pageSize,
              total,
              onPageChange: fetchPagedHistory,
            }}
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
                  <Text type="success" strong>{formatReward(item.total_rewards)}</Text>
                  <div style={{ fontSize: '12px', color: 'var(--semi-color-text-2)' }}>
                    总奖励
                  </div>
                </div>
              </div>
            </List.Item>
          )}
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
