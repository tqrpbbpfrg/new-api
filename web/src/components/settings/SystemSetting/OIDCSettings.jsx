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
import { IconUser, IconShield } from '@douyinfe/semi-icons';
import { showError } from '../../../helpers';
import axios from 'axios';

const { Text, Title } = Typography;

const OIDCSettings = ({ 
  inputs, 
  setInputs, 
  originInputs, 
  updateOptions,
  t 
}) => {

  const handleCheckboxChange = async (optionKey, event) => {
    const value = event.target.checked;
    await updateOptions([{ key: optionKey, value }]);
  };

  const submitOIDCSettings = async () => {
    if (inputs['oidc.well_known'] && inputs['oidc.well_known'] !== '') {
      if (
        !inputs['oidc.well_known'].startsWith('http://') &&
        !inputs['oidc.well_known'].startsWith('https://')
      ) {
        showError(t('Well-Known URL 必须以 http:// 或 https:// 开头'));
        return;
      }
      try {
        const res = await axios.create().get(inputs['oidc.well_known']);
        setInputs(prevInputs => ({
          ...prevInputs,
          'oidc.authorization_endpoint': res.data['authorization_endpoint'],
          'oidc.token_endpoint': res.data['token_endpoint'],
          'oidc.user_info_endpoint': res.data['userinfo_endpoint'],
        }));
      } catch (e) {
        showError(t('获取 OIDC 配置失败，请检查 URL 是否正确'));
        return;
      }
    }

    const options = [];
    const oidcKeys = [
      'oidc.well_known',
      'oidc.client_id',
      'oidc.client_secret',
      'oidc.scope',
      'oidc.claim.username',
      'oidc.claim.email',
      'oidc.claim.display_name',
      'oidc.authorization_endpoint',
      'oidc.token_endpoint',
      'oidc.user_info_endpoint',
    ];

    oidcKeys.forEach(key => {
      if (originInputs[key] !== inputs[key]) {
        if (key === 'oidc.client_secret' && inputs[key] === '') {
          return; // 不发送空的客户端密钥
        }
        options.push({ key, value: inputs[key] });
      }
    });

    if (options.length > 0) {
      await updateOptions(options);
    }
  };

  return (
    <div className="space-y-6">
      {/* OIDC 基础设置 */}
      <Card>
        <div className="mb-4">
          <Title heading={4}>
            <Space>
              <IconUser />
              {t('OIDC 身份认证设置')}
            </Space>
          </Title>
          <Text type="secondary">
            {t('配置 OpenID Connect 单点登录')}
          </Text>
        </div>
        
        <Form.Section>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={24} md={24} lg={24} xl={24}>
              <Form.Checkbox
                field="['oidc.enabled']"
                noLabel
                onChange={(e) => handleCheckboxChange('oidc.enabled', e)}
              >
                {t('启用 OIDC 登录')}
              </Form.Checkbox>
            </Col>
          </Row>

          <Banner
            type='info'
            description={`${t('回调 URL 为')} ${inputs.ServerAddress || t('网站地址')}/oauth/oidc`}
            style={{ marginTop: 16, marginBottom: 16 }}
          />
          
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={24} md={24} lg={24} xl={24}>
              <Form.Input
                field="['oidc.well_known']"
                label={t('Well-Known URL')}
                placeholder={t('输入 OIDC 的 Well-Known URL (可选)')}
                extraText={t('填写后将自动获取其他端点配置')}
              />
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={12} md={12} lg={12} xl={12}>
              <Form.Input
                field="['oidc.client_id']"
                label={t('Client ID')}
                placeholder={t('输入 OIDC 的 Client ID')}
              />
            </Col>
            <Col xs={24} sm={12} md={12} lg={12} xl={12}>
              <Form.Input
                field="['oidc.client_secret']"
                label={t('Client Secret')}
                type='password'
                placeholder={t('敏感信息不会发送到前端显示')}
              />
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={24} md={24} lg={24} xl={24}>
              <Form.Input
                field="['oidc.scope']"
                label={t('Scope')}
                placeholder='openid profile email'
                extraText={t('OIDC 请求的权限范围，多个用空格分隔')}
              />
            </Col>
          </Row>

          <div className="mt-4">
            <Button type="primary" onClick={submitOIDCSettings}>
              {t('保存 OIDC 设置')}
            </Button>
          </div>
        </Form.Section>
      </Card>

      {/* OIDC 高级设置 */}
      <Card>
        <div className="mb-4">
          <Title heading={4}>
            <Space>
              <IconShield />
              {t('OIDC 高级配置')}
            </Space>
          </Title>
          <Text type="secondary">
            {t('配置用户信息字段映射和端点地址')}
          </Text>
        </div>

        <Form.Section>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8} md={8} lg={8} xl={8}>
              <Form.Input
                field="['oidc.claim.username']"
                label={t('用户名字段')}
                placeholder='preferred_username'
                extraText={t('用户名的字段名')}
              />
            </Col>
            <Col xs={24} sm={8} md={8} lg={8} xl={8}>
              <Form.Input
                field="['oidc.claim.email']"
                label={t('邮箱字段')}
                placeholder='email'
                extraText={t('邮箱的字段名')}
              />
            </Col>
            <Col xs={24} sm={8} md={8} lg={8} xl={8}>
              <Form.Input
                field="['oidc.claim.display_name']"
                label={t('显示名字段')}
                placeholder='name'
                extraText={t('显示名的字段名')}
              />
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={8} md={8} lg={8} xl={8}>
              <Form.Input
                field="['oidc.authorization_endpoint']"
                label={t('Authorization Endpoint')}
                placeholder={t('输入 OIDC 的 Authorization Endpoint')}
              />
            </Col>
            <Col xs={24} sm={8} md={8} lg={8} xl={8}>
              <Form.Input
                field="['oidc.token_endpoint']"
                label={t('Token Endpoint')}
                placeholder={t('输入 OIDC 的 Token Endpoint')}
              />
            </Col>
            <Col xs={24} sm={8} md={8} lg={8} xl={8}>
              <Form.Input
                field="['oidc.user_info_endpoint']"
                label={t('User Info Endpoint')}
                placeholder={t('输入 OIDC 的 Userinfo Endpoint')}
              />
            </Col>
          </Row>
        </Form.Section>
      </Card>
    </div>
  );
};

export default OIDCSettings;