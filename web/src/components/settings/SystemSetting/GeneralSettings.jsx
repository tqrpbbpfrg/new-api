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

import { IconServer, IconSetting } from '@douyinfe/semi-icons';
import {
    Button,
    Card,
    Col,
    Form,
    Row,
    Space,
    Typography
} from '@douyinfe/semi-ui';

const { Text, Title } = Typography;

const GeneralSettings = ({ 
  inputs, 
  setInputs, 
  originInputs, 
  updateOptions,
  t 
}) => {

  const submitServerAddress = async () => {
    const options = [];
    if (originInputs['ServerAddress'] !== inputs.ServerAddress) {
      options.push({
        key: 'ServerAddress',
        value: inputs.ServerAddress,
      });
    }
    if (options.length > 0) {
      await updateOptions(options);
    }
  };

  const submitProxySettings = async () => {
    const options = [];
    if (originInputs['HTTPProxy'] !== inputs.HTTPProxy) {
      options.push({
        key: 'HTTPProxy',
        value: inputs.HTTPProxy,
      });
    }
    if (originInputs['HTTPSProxy'] !== inputs.HTTPSProxy) {
      options.push({
        key: 'HTTPSProxy',
        value: inputs.HTTPSProxy,
      });
    }
    if (options.length > 0) {
      await updateOptions(options);
    }
  };

  const submitQuotaSettings = async () => {
    const options = [];
    if (originInputs['Price'] !== inputs.Price) {
      options.push({
        key: 'Price',
        value: inputs.Price,
      });
    }
    if (originInputs['MinTopUp'] !== inputs.MinTopUp) {
      options.push({
        key: 'MinTopUp',
        value: inputs.MinTopUp,
      });
    }
    if (originInputs['TopupGroupRatio'] !== inputs.TopupGroupRatio) {
      options.push({
        key: 'TopupGroupRatio',
        value: inputs.TopupGroupRatio,
      });
    }
    if (options.length > 0) {
      await updateOptions(options);
    }
  };

  return (
    <div className="space-y-6">
      {/* 服务器设置 */}
      <Card>
        <div className="mb-4">
          <Title heading={4}>
            <Space>
              <IconServer />
              {t('服务器配置')}
            </Space>
          </Title>
        </div>
        
        <Form.Section>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={24} md={24} lg={24} xl={24}>
              <Form.Input
                field='ServerAddress'
                label={t('服务器地址')}
                placeholder='https://yourdomain.com'
                extraText={t('该服务器地址将影响支付回调地址以及默认首页展示的地址，请确保正确配置')}
                style={{ width: '100%' }}
              />
            </Col>
          </Row>
          <div className="mt-4">
            <Button type="primary" onClick={submitServerAddress}>
              {t('更新服务器地址')}
            </Button>
          </div>
        </Form.Section>
      </Card>

      {/* 代理设置 */}
      <Card>
        <div className="mb-4">
          <Title heading={4}>
            <Space>
              <IconSetting />
              {t('代理设置')}
            </Space>
          </Title>
          <Text type="secondary">
            （支持{' '}
            <a
              href='https://curl.se/libcurl/c/CURLOPT_PROXY.html'
              target='_blank'
              rel="noreferrer"
            >
              curl
            </a>{' '}
            格式，{t('配置后重启生效')}）
          </Text>
        </div>

        <Form.Section>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={12} lg={12} xl={12}>
              <Form.Input
                field='HTTPProxy'
                label={t('HTTP 代理')}
                placeholder='http://proxy.example.com:8080'
              />
            </Col>
            <Col xs={24} sm={12} md={12} lg={12} xl={12}>
              <Form.Input
                field='HTTPSProxy'
                label={t('HTTPS 代理')}
                placeholder='https://proxy.example.com:8080'
              />
            </Col>
          </Row>
          <div className="mt-4">
            <Button type="primary" onClick={submitProxySettings}>
              {t('保存代理设置')}
            </Button>
          </div>
        </Form.Section>
      </Card>

      {/* 配额设置 */}
      <Card>
        <div className="mb-4">
          <Title heading={4}>
            <Space>
              <IconServer />
              {t('配额和定价')}
            </Space>
          </Title>
          <Text type="secondary">
            {t('设置系统的基础定价和充值策略')}
          </Text>
        </div>

        <Form.Section>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8} md={8} lg={8} xl={8}>
              <Form.Input
                field='Price'
                label={t('价格倍率')}
                placeholder='1.0'
                extraText={t('不影响已有令牌的倍率')}
              />
            </Col>
            <Col xs={24} sm={8} md={8} lg={8} xl={8}>
              <Form.Input
                field='MinTopUp'
                label={t('最低充值金额')}
                placeholder='1'
                extraText={t('单位为美元')}
              />
            </Col>
            <Col xs={24} sm={8} md={8} lg={8} xl={8}>
              <Form.Input
                field='TopupGroupRatio'
                label={t('充值分组倍率')}
                placeholder='{}'
                extraText={t('JSON格式，例如：{"default":1,"vip":1.5}')}
              />
            </Col>
          </Row>
          <div className="mt-4">
            <Button type="primary" onClick={submitQuotaSettings}>
              {t('保存配额设置')}
            </Button>
          </div>
        </Form.Section>
      </Card>
    </div>
  );
};

export default GeneralSettings;