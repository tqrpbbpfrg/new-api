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
  Col,
  Divider,
  Empty,
  List,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  Toast,
  Input,
  Select,
} from '@douyinfe/semi-ui';
import {
  IconCreditCard,
  IconPlus,
  IconTick,
  IconClose,
  IconClock,
  IconSearch,
  IconRefresh,
  IconGift,
} from '@douyinfe/semi-icons';
import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserContext } from '../../context/User';
import { API, showError, showSuccess } from '../../helpers';
import ConsoleSection from '../layout/ConsoleSection';

const { Title, Text } = Typography;

const TopUpNew = () => {
  const { t } = useTranslation();
  const [userState, userDispatch] = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [topUpRecords, setTopUpRecords] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedAmount, setSelectedAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // 预设充值金额
  const presetAmounts = [
    { value: '10', label: '$10', popular: false },
    { value: '20', label: '$20', popular: true },
    { value: '50', label: '$50', popular: true },
    { value: '100', label: '$100', popular: false },
    { value: '200', label: '$200', popular: false },
    { value: '500', label: '$500', popular: false },
  ];

  useEffect(() => {
    loadTopUpRecords();
    loadPaymentMethods();
  }, []);

  const loadTopUpRecords = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/user/topup');
      if (res.data.success) {
        setTopUpRecords(res.data.data || []);
      }
    } catch (error) {
      showError(t('加载充值记录失败'));
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentMethods = async () => {
    try {
      // 模拟获取支付方式
      setPaymentMethods([
        { id: 'alipay', name: '支付宝', icon: '💰', color: 'blue' },
        { id: 'wechat', name: '微信支付', icon: '💚', color: 'green' },
        { id: 'stripe', name: 'Stripe', icon: '💳', color: 'purple' },
      ]);
    } catch (error) {
      console.error('Failed to load payment methods:', error);
    }
  };

  const handleTopUp = async () => {
    const amount = selectedAmount || customAmount;
    if (!amount || !selectedMethod) {
      showError(t('请选择充值金额和支付方式'));
      return;
    }

    if (parseFloat(amount) <= 0) {
      showError(t('充值金额必须大于0'));
      return;
    }

    setLoading(true);
    try {
      const res = await API.post('/api/user/topup', {
        amount: parseFloat(amount),
        method: selectedMethod,
      });

      if (res.data.success) {
        showSuccess(t('充值订单创建成功'));
        // 这里应该跳转到支付页面或显示支付信息
        if (res.data.data?.payment_url) {
          window.open(res.data.data.payment_url, '_blank');
        }
        loadTopUpRecords();
      } else {
        showError(res.data.message || t('充值失败'));
      }
    } catch (error) {
      showError(t('充值请求失败'));
    } finally {
      setLoading(false);
    }
  };

  const getStatusTag = (status) => {
    const statusConfig = {
      pending: { color: 'orange', text: '待支付', icon: <IconClock /> },
      completed: { color: 'green', text: '已完成', icon: <IconTick /> },
      failed: { color: 'red', text: '失败', icon: <IconClose /> },
      cancelled: { color: 'grey', text: '已取消', icon: <IconClose /> },
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Tag color={config.color} prefixIcon={config.icon} size="small">
        {config.text}
      </Tag>
    );
  };

  const filteredRecords = topUpRecords.filter(record => {
    const matchesKeyword = !searchKeyword || 
      record.id?.toString().includes(searchKeyword) ||
      record.amount?.toString().includes(searchKeyword);
    
    const matchesStatus = filterStatus === 'all' || record.status === filterStatus;
    
    return matchesKeyword && matchesStatus;
  });

  const columns = [
    {
      title: t('订单ID'),
      dataIndex: 'id',
      key: 'id',
      render: (text) => <Text code>{text}</Text>,
    },
    {
      title: t('充值金额'),
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => (
        <Text strong style={{ color: 'var(--semi-color-success)' }}>
          ${parseFloat(amount).toFixed(2)}
        </Text>
      ),
    },
    {
      title: t('支付方式'),
      dataIndex: 'method',
      key: 'method',
      render: (method) => {
        const methodInfo = paymentMethods.find(m => m.id === method);
        return methodInfo ? (
          <Space>
            <span>{methodInfo.icon}</span>
            <Text>{methodInfo.name}</Text>
          </Space>
        ) : method;
      },
    },
    {
      title: t('状态'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
    },
    {
      title: t('创建时间'),
      dataIndex: 'created_time',
      key: 'created_time',
      render: (time) => time ? new Date(time * 1000).toLocaleString() : '未知',
    },
  ];

  return (
    <ConsoleSection
      title={t('钱包管理')}
      description={t('管理您的账户余额，查看充值记录')}
    >
      <div className="space-y-6">
        {/* 余额概览 */}
        <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <Text className="text-white/80 text-lg">{t('当前余额')}</Text>
                <Title heading={1} className="text-white mt-2" style={{ margin: '8px 0', color: 'white' }}>
                  ${(userState?.user?.quota || 0).toFixed(2)}
                </Title>
                <Text className="text-white/60">
                  {t('账户ID')}: {userState?.user?.id}
                </Text>
              </div>
              <Avatar
                size="large"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
              >
                <IconCreditCard size="large" />
              </Avatar>
            </div>
          </div>
        </Card>

        <Row gutter={24}>
          {/* 充值区域 */}
          <Col xs={24} lg={12}>
            <Card title={
              <Space>
                <IconPlus />
                {t('账户充值')}
              </Space>
            }>
              <div className="space-y-4">
                {/* 预设金额选择 */}
                <div>
                  <Text strong className="block mb-3">{t('选择充值金额')}</Text>
                  <div className="grid grid-cols-3 gap-2">
                    {presetAmounts.map((preset) => (
                      <Button
                        key={preset.value}
                        onClick={() => {
                          setSelectedAmount(preset.value);
                          setCustomAmount('');
                        }}
                        type={selectedAmount === preset.value ? 'primary' : 'tertiary'}
                        className={`relative ${preset.popular ? 'ring-2 ring-orange-300' : ''}`}
                        block
                      >
                        {preset.label}
                        {preset.popular && (
                          <div className="absolute -top-1 -right-1">
                            <Tag color="orange" size="small">热门</Tag>
                          </div>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* 自定义金额 */}
                <div>
                  <Text strong className="block mb-2">{t('或输入自定义金额')}</Text>
                  <Input
                    prefix="$"
                    placeholder={t('输入充值金额')}
                    value={customAmount}
                    onChange={(value) => {
                      setCustomAmount(value);
                      setSelectedAmount('');
                    }}
                    type="number"
                    min="0.01"
                    step="0.01"
                  />
                </div>

                {/* 支付方式选择 */}
                <div>
                  <Text strong className="block mb-3">{t('选择支付方式')}</Text>
                  <div className="grid grid-cols-1 gap-2">
                    {paymentMethods.map((method) => (
                      <Button
                        key={method.id}
                        onClick={() => setSelectedMethod(method.id)}
                        type={selectedMethod === method.id ? 'primary' : 'tertiary'}
                        block
                        className="justify-start"
                      >
                        <Space>
                          <span style={{ fontSize: '18px' }}>{method.icon}</span>
                          <Text>{method.name}</Text>
                        </Space>
                      </Button>
                    ))}
                  </div>
                </div>

                <Divider />

                {/* 充值按钮 */}
                <Button
                  type="primary"
                  size="large"
                  block
                  loading={loading}
                  onClick={handleTopUp}
                  disabled={!(selectedAmount || customAmount) || !selectedMethod}
                >
                  {t('确认充值')} {(selectedAmount || customAmount) && `$${selectedAmount || customAmount}`}
                </Button>

                <Text type="secondary" size="small" className="text-center block">
                  {t('充值后将自动增加到您的账户余额中')}
                </Text>
              </div>
            </Card>
          </Col>

          {/* 充值优惠 */}
          <Col xs={24} lg={12}>
            <Card title={
              <Space>
                <IconGift />
                {t('充值优惠')}
              </Space>
            }>
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
                  <div className="flex items-center space-x-3">
                    <Avatar size="small" style={{ backgroundColor: 'var(--semi-color-warning)' }}>
                      🎁
                    </Avatar>
                    <div>
                      <Text strong>{t('首次充值优惠')}</Text>
                      <Text type="secondary" size="small" className="block">
                        {t('首次充值满$20即享9折优惠')}
                      </Text>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-3">
                    <Avatar size="small" style={{ backgroundColor: 'var(--semi-color-success)' }}>
                      💎
                    </Avatar>
                    <div>
                      <Text strong>{t('大额充值奖励')}</Text>
                      <Text type="secondary" size="small" className="block">
                        {t('单次充值满$100额外赠送5%')}
                      </Text>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                  <div className="flex items-center space-x-3">
                    <Avatar size="small" style={{ backgroundColor: 'var(--semi-color-primary)' }}>
                      ⭐
                    </Avatar>
                    <div>
                      <Text strong>{t('会员特权')}</Text>
                      <Text type="secondary" size="small" className="block">
                        {t('VIP用户充值享受专属折扣')}
                      </Text>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* 充值记录 */}
        <Card 
          title={
            <Space>
              <IconCreditCard />
              {t('充值记录')}
            </Space>
          }
          extra={
            <Button 
              icon={<IconRefresh />}
              onClick={loadTopUpRecords}
              loading={loading}
              theme="borderless"
            >
              {t('刷新')}
            </Button>
          }
        >
          {/* 搜索和筛选 */}
          <div className="flex items-center space-x-4 mb-4">
            <Input
              prefix={<IconSearch />}
              placeholder={t('搜索订单ID或金额')}
              value={searchKeyword}
              onChange={setSearchKeyword}
              className="flex-1"
            />
            <Select
              value={filterStatus}
              onChange={setFilterStatus}
              style={{ width: 120 }}
            >
              <Select.Option value="all">{t('全部状态')}</Select.Option>
              <Select.Option value="pending">{t('待支付')}</Select.Option>
              <Select.Option value="completed">{t('已完成')}</Select.Option>
              <Select.Option value="failed">{t('失败')}</Select.Option>
              <Select.Option value="cancelled">{t('已取消')}</Select.Option>
            </Select>
          </div>

          <Spin spinning={loading}>
            {filteredRecords.length > 0 ? (
              <Table
                columns={columns}
                dataSource={filteredRecords}
                rowKey="id"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total) => t(`共 ${total} 条记录`),
                }}
              />
            ) : (
              <Empty
                image={<IconCreditCard size="large" />}
                title={t('暂无充值记录')}
                description={t('您还没有任何充值记录，立即充值开始使用服务吧')}
              />
            )}
          </Spin>
        </Card>
      </div>
    </ConsoleSection>
  );
};

export default TopUpNew;