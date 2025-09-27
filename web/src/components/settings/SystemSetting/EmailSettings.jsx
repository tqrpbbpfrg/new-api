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
} from '@douyinfe/semi-ui';
import { IconMail, IconSetting } from '@douyinfe/semi-icons';

const { Text, Title } = Typography;

const EmailSettings = ({ 
  inputs, 
  setInputs, 
  originInputs, 
  updateOptions,
  t 
}) => {

  const submitSMTP = async () => {
    const options = [];
    if (originInputs['SMTPServer'] !== inputs.SMTPServer) {
      options.push({ key: 'SMTPServer', value: inputs.SMTPServer });
    }
    if (originInputs['SMTPPort'] !== inputs.SMTPPort) {
      options.push({ key: 'SMTPPort', value: inputs.SMTPPort });
    }
    if (originInputs['SMTPAccount'] !== inputs.SMTPAccount) {
      options.push({ key: 'SMTPAccount', value: inputs.SMTPAccount });
    }
    if (
      originInputs['SMTPToken'] !== inputs.SMTPToken &&
      inputs.SMTPToken !== ''
    ) {
      options.push({ key: 'SMTPToken', value: inputs.SMTPToken });
    }
    if (options.length > 0) {
      await updateOptions(options);
    }
  };

  const handleCheckboxChange = async (optionKey, event) => {
    const value = event.target.checked;
    await updateOptions([{ key: optionKey, value }]);
  };

  return (
    <div className="space-y-6">
      {/* SMTP 配置 */}
      <Card>
        <div className="mb-4">
          <Title heading={4}>
            <Space>
              <IconMail />
              {t('SMTP 邮件配置')}
            </Space>
          </Title>
          <Text type="secondary">
            {t('配置SMTP服务器以支持邮件发送功能')}
          </Text>
        </div>
        
        <Form.Section>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={24} md={24} lg={24} xl={24}>
              <Form.Checkbox
                field='SMTPSSLEnabled'
                noLabel
                onChange={(e) => handleCheckboxChange('SMTPSSLEnabled', e)}
              >
                {t('启用 SMTP SSL/TLS')}
              </Form.Checkbox>
            </Col>
          </Row>
          
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={12} md={12} lg={12} xl={12}>
              <Form.Input
                field='SMTPServer'
                label={t('SMTP 服务器地址')}
                placeholder='smtp.example.com'
              />
            </Col>
            <Col xs={24} sm={12} md={6} lg={6} xl={6}>
              <Form.Input
                field='SMTPPort'
                label={t('SMTP 端口')}
                placeholder='587'
              />
            </Col>
            <Col xs={24} sm={12} md={6} lg={6} xl={6}>
              <Form.Input
                field='SMTPAccount'
                label={t('SMTP 账户')}
                placeholder='noreply@example.com'
              />
            </Col>
          </Row>
          
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={24} md={24} lg={24} xl={24}>
              <Form.Input
                field='SMTPToken'
                label={t('SMTP 密码/令牌')}
                type='password'
                placeholder={t('敏感信息不会发送到前端显示')}
              />
            </Col>
          </Row>
          
          <div className="mt-4">
            <Button type="primary" onClick={submitSMTP}>
              {t('保存 SMTP 设置')}
            </Button>
          </div>
        </Form.Section>
      </Card>

      {/* 邮件模板设置 */}
      <Card>
        <div className="mb-4">
          <Title heading={4}>
            <Space>
              <IconSetting />
              {t('邮件模板设置')}
            </Space>
          </Title>
          <Text type="secondary">
            {t('自定义邮件模板和发送设置')}
          </Text>
        </div>

        <Form.Section>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={24} md={24} lg={24} xl={24}>
              <Form.TextArea
                field='EmailTemplate'
                label={t('邮件模板')}
                placeholder={t('自定义邮件模板，支持HTML')}
                rows={6}
              />
            </Col>
          </Row>
          
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={12} md={12} lg={12} xl={12}>
              <Form.Input
                field='EmailFrom'
                label={t('发件人名称')}
                placeholder={t('系统通知')}
              />
            </Col>
            <Col xs={24} sm={12} md={12} lg={12} xl={12}>
              <Form.Input
                field='EmailSubject'
                label={t('邮件主题前缀')}
                placeholder='[OneAPI]'
              />
            </Col>
          </Row>
          
          <div className="mt-4">
            <Button type="primary" onClick={async () => {
              const options = [];
              if (originInputs['EmailTemplate'] !== inputs.EmailTemplate) {
                options.push({ key: 'EmailTemplate', value: inputs.EmailTemplate });
              }
              if (originInputs['EmailFrom'] !== inputs.EmailFrom) {
                options.push({ key: 'EmailFrom', value: inputs.EmailFrom });
              }
              if (originInputs['EmailSubject'] !== inputs.EmailSubject) {
                options.push({ key: 'EmailSubject', value: inputs.EmailSubject });
              }
              if (options.length > 0) {
                await updateOptions(options);
              }
            }}>
              {t('保存邮件模板设置')}
            </Button>
          </div>
        </Form.Section>
      </Card>
    </div>
  );
};

export default EmailSettings;