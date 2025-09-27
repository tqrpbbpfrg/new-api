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

import React from 'react';
import {
  Button,
  Form,
  Row,
  Col,
  Typography,
  Card,
  Space,
  Banner,
} from '@douyinfe/semi-ui';
import { IconBolt, IconCreditCard } from '@douyinfe/semi-icons';

const { Text, Title } = Typography;

const PaymentSettings = ({ 
  inputs, 
  setInputs, 
  originInputs, 
  updateOptions,
  t 
}) => {

  const submitStripeSettings = async () => {
    const options = [];
    if (originInputs['StripePublishableKey'] !== inputs.StripePublishableKey) {
      options.push({
        key: 'StripePublishableKey',
        value: inputs.StripePublishableKey,
      });
    }
    if (
      originInputs['StripeSecretKey'] !== inputs.StripeSecretKey &&
      inputs.StripeSecretKey !== ''
    ) {
      options.push({
        key: 'StripeSecretKey',
        value: inputs.StripeSecretKey,
      });
    }
    if (originInputs['StripeWebhookSecret'] !== inputs.StripeWebhookSecret) {
      options.push({
        key: 'StripeWebhookSecret',
        value: inputs.StripeWebhookSecret,
      });
    }
    if (options.length > 0) {
      await updateOptions(options);
    }
  };

  const submitPayPalSettings = async () => {
    const options = [];
    if (originInputs['PayPalClientId'] !== inputs.PayPalClientId) {
      options.push({
        key: 'PayPalClientId',
        value: inputs.PayPalClientId,
      });
    }
    if (
      originInputs['PayPalClientSecret'] !== inputs.PayPalClientSecret &&
      inputs.PayPalClientSecret !== ''
    ) {
      options.push({
        key: 'PayPalClientSecret',
        value: inputs.PayPalClientSecret,
      });
    }
    if (options.length > 0) {
      await updateOptions(options);
    }
  };

  const submitAlipaySettings = async () => {
    const options = [];
    if (originInputs['AlipayAppId'] !== inputs.AlipayAppId) {
      options.push({
        key: 'AlipayAppId',
        value: inputs.AlipayAppId,
      });
    }
    if (
      originInputs['AlipayPrivateKey'] !== inputs.AlipayPrivateKey &&
      inputs.AlipayPrivateKey !== ''
    ) {
      options.push({
        key: 'AlipayPrivateKey',
        value: inputs.AlipayPrivateKey,
      });
    }
    if (
      originInputs['AlipayPublicKey'] !== inputs.AlipayPublicKey &&
      inputs.AlipayPublicKey !== ''
    ) {
      options.push({
        key: 'AlipayPublicKey',
        value: inputs.AlipayPublicKey,
      });
    }
    if (options.length > 0) {
      await updateOptions(options);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stripe 支付设置 */}
      <Card>
        <div className="mb-4">
          <Title heading={4}>
            <Space>
              <IconCreditCard />
              {t('Stripe 支付设置')}
            </Space>
          </Title>
          <Text type="secondary">
            {t('配置 Stripe 在线支付')}
          </Text>
        </div>
        
        <Form.Section>
          <Banner
            type='info'
            description={`${t('Webhook URL 为')} ${inputs.ServerAddress || t('网站地址')}/api/stripe/webhook`}
            style={{ marginBottom: 16 }}
          />
          
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={12} lg={12} xl={12}>
              <Form.Input
                field='StripePublishableKey'
                label={t('Stripe Publishable Key')}
                placeholder='pk_test_...'
              />
            </Col>
            <Col xs={24} sm={12} md={12} lg={12} xl={12}>
              <Form.Input
                field='StripeSecretKey'
                label={t('Stripe Secret Key')}
                type='password'
                placeholder={t('敏感信息不会发送到前端显示')}
              />
            </Col>
          </Row>
          
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={24} md={24} lg={24} xl={24}>
              <Form.Input
                field='StripeWebhookSecret'
                label={t('Stripe Webhook Secret')}
                type='password'
                placeholder={t('敏感信息不会发送到前端显示')}
                extraText={t('用于验证 Webhook 请求的签名')}
              />
            </Col>
          </Row>
          
          <div className="mt-4">
            <Button type="primary" onClick={submitStripeSettings}>
              {t('保存 Stripe 设置')}
            </Button>
          </div>
        </Form.Section>
      </Card>

      {/* PayPal 支付设置 */}
      <Card>
        <div className="mb-4">
          <Title heading={4}>
            <Space>
              <IconBolt />
              {t('PayPal 支付设置')}
            </Space>
          </Title>
          <Text type="secondary">
            {t('配置 PayPal 在线支付')}
          </Text>
        </div>

        <Form.Section>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={12} lg={12} xl={12}>
              <Form.Input
                field='PayPalClientId'
                label={t('PayPal Client ID')}
                placeholder='client_id'
              />
            </Col>
            <Col xs={24} sm={12} md={12} lg={12} xl={12}>
              <Form.Input
                field='PayPalClientSecret'
                label={t('PayPal Client Secret')}
                type='password'
                placeholder={t('敏感信息不会发送到前端显示')}
              />
            </Col>
          </Row>
          
          <div className="mt-4">
            <Button type="primary" onClick={submitPayPalSettings}>
              {t('保存 PayPal 设置')}
            </Button>
          </div>
        </Form.Section>
      </Card>

      {/* 支付宝设置 */}
      <Card>
        <div className="mb-4">
          <Title heading={4}>
            <Space>
              <IconCreditCard />
              {t('支付宝设置')}
            </Space>
          </Title>
          <Text type="secondary">
            {t('配置支付宝在线支付')}
          </Text>
        </div>

        <Form.Section>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={24} md={24} lg={24} xl={24}>
              <Form.Input
                field='AlipayAppId'
                label={t('支付宝 App ID')}
                placeholder='app_id'
              />
            </Col>
          </Row>
          
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={12} md={12} lg={12} xl={12}>
              <Form.TextArea
                field='AlipayPrivateKey'
                label={t('应用私钥')}
                placeholder={t('敏感信息不会发送到前端显示')}
                rows={4}
              />
            </Col>
            <Col xs={24} sm={12} md={12} lg={12} xl={12}>
              <Form.TextArea
                field='AlipayPublicKey'
                label={t('支付宝公钥')}
                placeholder={t('敏感信息不会发送到前端显示')}
                rows={4}
              />
            </Col>
          </Row>
          
          <div className="mt-4">
            <Button type="primary" onClick={submitAlipaySettings}>
              {t('保存支付宝设置')}
            </Button>
          </div>
        </Form.Section>
      </Card>
    </div>
  );
};

export default PaymentSettings;