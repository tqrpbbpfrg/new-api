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
    
    // 判断是否为今天
    const today = new Date();
    const isToday = dateStr === today.getFullYear() + '-' +
                   String(today.getMonth() + 1).padStart(2, '0') + '-' +
                   String(today.getDate()).padStart(2, '0');
    
    // 根据连续天数设置样式
    let cardStyle = {
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '8px 4px',
      position: 'relative',
      borderRadius: '12px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
      minHeight: '70px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      border: '1px solid rgba(0,0,0,0.05)',
      background: '#ffffff'
    };
    
    let dateStyle = {
      fontSize: '14px',
      fontWeight: 600,
      marginBottom: '4px',
      color: 'var(--semi-color-text-0)',
      transition: 'color 0.2s'
    };
    
    let iconContainerStyle = {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4px',
      width: '100%',
      flex: 1
    };
    
    let iconStyle = {
      fontSize: '20px',
      lineHeight: 1,
      transition: 'transform 0.2s'
    };
    
    let rewardStyle = {
      fontSize: '10px',
      fontWeight: 600,
      padding: '2px 6px',
      borderRadius: '8px',
      transition: 'all 0.2s'
    };
    
    // 如果是今天，添加特殊样式
    if (isToday) {
      cardStyle.border = '2px solid var(--semi-color-primary)';
      cardStyle.boxShadow = '0 0 0 2px rgba(var(--semi-color-primary-rgb), 0.2)';
    }
    
    // 根据签到状态设置样式
    if (checkinRecord) {
      const days = checkinRecord.continuous || checkinRecord.continuous_days || 1;
      
      // 根据连续天数设置不同的颜色方案
      if (days >= 15) {
        // 钻石级别 - 深紫色渐变
        cardStyle.background = 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)';
        cardStyle.boxShadow = '0 4px 12px rgba(114, 46, 209, 0.3)';
        dateStyle.color = '#ffffff';
        iconStyle.color = '#ffffff';
        rewardStyle.background = 'rgba(255, 255, 255, 0.2)';
        rewardStyle.color = '#ffffff';
      } else if (days >= 7) {
        // 黄金级别 - 金色渐变
        cardStyle.background = 'linear-gradient(135deg, #faad14 0%, #d48806 100%)';
        cardStyle.boxShadow = '0 4px 12px rgba(250, 173, 20, 0.3)';
        dateStyle.color = '#ffffff';
        iconStyle.color = '#ffffff';
        rewardStyle.background = 'rgba(255, 255, 255, 0.2)';
        rewardStyle.color = '#ffffff';
      } else if (days >= 3) {
        // 白银级别 - 蓝色渐变
        cardStyle.background = 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)';
        cardStyle.boxShadow = '0 4px 12px rgba(24, 144, 255, 0.3)';
        dateStyle.color = '#ffffff';
        iconStyle.color = '#ffffff';
        rewardStyle.background = 'rgba(255, 255, 255, 0.2)';
        rewardStyle.color = '#ffffff';
      } else {
        // 青铜级别 - 绿色渐变
        cardStyle.background = 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)';
        cardStyle.boxShadow = '0 4px 12px rgba(82, 196, 26, 0.3)';
        dateStyle.color = '#ffffff';
        iconStyle.color = '#ffffff';
        rewardStyle.background = 'rgba(255, 255, 255, 0.2)';
        rewardStyle.color = '#ffffff';
      }
    } else {
      // 未签到的日期
      if (isToday) {
        // 今天的特殊样式
        cardStyle.background = 'linear-gradient(135deg, #f0f5ff 0%, #e6f4ff 100%)';
        dateStyle.color = 'var(--semi-color-primary)';
      } else {
        // 普通未签到日期
        cardStyle.background = '#fafafa';
        dateStyle.color = 'var(--semi-color-text-2)';
      }
    }
    
    return (
      <div
        style={cardStyle}
        onMouseEnter={(e) => {
          if (checkinRecord) {
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
            e.currentTarget.style.boxShadow = cardStyle.boxShadow.replace('0.3', '0.4');
          } else {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          if (checkinRecord) {
            e.currentTarget.style.boxShadow = cardStyle.boxShadow.replace('0.4', '0.3');
          } else {
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
          }
        }}
      >
        {/* 日期号码 */}
        <div style={dateStyle}>
          {dateStr.split('-')[2]}
        </div>
        
        {checkinRecord ? (
          <div style={iconContainerStyle}>
            {/* 签到图标 - 使用更精美的图标 */}
            <div style={iconStyle}>
              {checkinRecord.continuous >= 15 ? '💎' :
               checkinRecord.continuous >= 7 ? '🏆' :
               checkinRecord.continuous >= 3 ? '🥈' : '🥉'}
            </div>
            {/* 奖励额度 */}
            <div style={rewardStyle}>
              {formatReward(checkinRecord.reward)}
            </div>
          </div>
        ) : (
          <div style={iconContainerStyle}>
            {/* 未签到状态显示 */}
            {isToday ? (
              <div style={{
                fontSize: '16px',
                color: 'var(--semi-color-primary)',
                opacity: 0.7
              }}>
                🔓
              </div>
            ) : (
              <div style={{
                fontSize: '16px',
                color: 'var(--semi-color-text-3)',
                opacity: 0.5
              }}>
                🔒
              </div>
            )}
          </div>
        )}
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

        {/* 签到级别图例 */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: '20px',
          padding: '12px',
          backgroundColor: 'var(--semi-color-fill-0)',
          borderRadius: '8px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <Text type="tertiary" style={{ fontSize: '12px', marginRight: '8px' }}>签到级别：</Text>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '4px',
              background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              color: '#fff'
            }}>🥉</div>
            <Text type="tertiary" style={{ fontSize: '12px' }}>青铜(1-2天)</Text>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '4px',
              background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              color: '#fff'
            }}>🥈</div>
            <Text type="tertiary" style={{ fontSize: '12px' }}>白银(3-6天)</Text>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '4px',
              background: 'linear-gradient(135deg, #faad14 0%, #d48806 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              color: '#fff'
            }}>🏆</div>
            <Text type="tertiary" style={{ fontSize: '12px' }}>黄金(7-14天)</Text>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '4px',
              background: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              color: '#fff'
            }}>💎</div>
            <Text type="tertiary" style={{ fontSize: '12px' }}>钻石(15天+)</Text>
          </div>
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
