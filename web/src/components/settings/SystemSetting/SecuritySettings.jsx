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

import { IconGlobe, IconLock, IconShield } from '@douyinfe/semi-icons';
import {
    Banner,
    Button,
    Card,
    Col,
    Form,
    Radio,
    Row,
    Space,
    TagInput,
    Typography,
} from '@douyinfe/semi-ui';

const { Text, Title } = Typography;

const SecuritySettings = ({ 
  inputs, 
  setInputs, 
  originInputs, 
  updateOptions,
  emailDomainWhitelist,
  setEmailDomainWhitelist,
  ipList,
  setIpList,
  allowedPorts,
  setAllowedPorts,
  domainFilterMode,
  setDomainFilterMode,
  ipFilterMode,
  setIpFilterMode,
  showPasswordLoginConfirmModal,
  setShowPasswordLoginConfirmModal,
  formApiRef,
  t 
}) => {

  const handleCheckboxChange = async (optionKey, event) => {
    const value = event.target.checked;

    if (optionKey === 'PasswordLoginEnabled' && !value) {
      setShowPasswordLoginConfirmModal(true);
    } else {
      await updateOptions([{ key: optionKey, value }]);
    }
  };

  const submitDomainWhitelist = async () => {
    const options = [];
    options.push({
      key: 'EmailDomainWhitelist',
      value: emailDomainWhitelist.join(','),
    });
    await updateOptions(options);
  };

  const submitTurnstile = async () => {
    const options = [];
    if (originInputs['TurnstileSiteKey'] !== inputs.TurnstileSiteKey) {
      options.push({ key: 'TurnstileSiteKey', value: inputs.TurnstileSiteKey });
    }
    if (
      originInputs['TurnstileSecretKey'] !== inputs.TurnstileSecretKey &&
      inputs.TurnstileSecretKey !== ''
    ) {
      options.push({
        key: 'TurnstileSecretKey',
        value: inputs.TurnstileSecretKey,
      });
    }
    if (options.length > 0) {
      await updateOptions(options);
    }
  };

  const submitSecurityFilters = async () => {
    const options = [];
    options.push({
      key: 'fetch_setting.domain_list',
      value: JSON.stringify(ipList),
    });
    options.push({
      key: 'fetch_setting.allowed_ports',
      value: JSON.stringify(allowedPorts),
    });
    options.push({
      key: 'fetch_setting.domain_filter_mode',
      value: domainFilterMode,
    });
    options.push({
      key: 'fetch_setting.ip_filter_mode',
      value: ipFilterMode,
    });
    await updateOptions(options);
  };

  return (
    <div className="space-y-6">
      {/* 用户登录和注册设置 */}
      <Card>
        <div className="mb-4">
          <Title heading={4}>
            <Space>
              <IconLock />
              {t('登录和注册设置')}
            </Space>
          </Title>
        </div>
        
        <Form.Section>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8} lg={6} xl={6}>
              <Form.Checkbox
                field='PasswordLoginEnabled'
                noLabel
                onChange={(e) => handleCheckboxChange('PasswordLoginEnabled', e)}
              >
                {t('允许密码登录')}
              </Form.Checkbox>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6} xl={6}>
              <Form.Checkbox
                field='PasswordRegisterEnabled'
                noLabel
                onChange={(e) => handleCheckboxChange('PasswordRegisterEnabled', e)}
              >
                {t('允许密码注册')}
              </Form.Checkbox>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6} xl={6}>
              <Form.Checkbox
                field='RegisterEnabled'
                noLabel
                onChange={(e) => handleCheckboxChange('RegisterEnabled', e)}
              >
                {t('允许新用户注册')}
              </Form.Checkbox>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6} xl={6}>
              <Form.Checkbox
                field='EmailVerificationEnabled'
                noLabel
                onChange={(e) => handleCheckboxChange('EmailVerificationEnabled', e)}
              >
                {t('启用邮箱验证')}
              </Form.Checkbox>
            </Col>
          </Row>
        </Form.Section>
      </Card>

      {/* 邮箱域名白名单 */}
      <Card>
        <div className="mb-4">
          <Title heading={4}>
            <Space>
              <IconShield />
              {t('邮箱域名白名单')}
            </Space>
          </Title>
          <Text type="secondary">
            {t('用以防止恶意用户利用临时邮箱批量注册')}
          </Text>
        </div>

        <Form.Section>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={12} lg={12} xl={12}>
              <Form.Checkbox
                field='EmailDomainRestrictionEnabled'
                noLabel
                onChange={(e) =>
                  handleCheckboxChange('EmailDomainRestrictionEnabled', e)
                }
              >
                {t('启用邮箱域名白名单')}
              </Form.Checkbox>
            </Col>
            <Col xs={24} sm={12} md={12} lg={12} xl={12}>
              <Form.Checkbox
                field='EmailAliasRestrictionEnabled'
                noLabel
                onChange={(e) =>
                  handleCheckboxChange('EmailAliasRestrictionEnabled', e)
                }
              >
                {t('启用邮箱别名限制')}
              </Form.Checkbox>
            </Col>
          </Row>
          <TagInput
            value={emailDomainWhitelist}
            onChange={setEmailDomainWhitelist}
            placeholder={t('输入域名后回车')}
            style={{ width: '100%', marginTop: 16 }}
          />
          <div className="mt-4">
            <Button type="primary" onClick={submitDomainWhitelist}>
              {t('保存邮箱域名设置')}
            </Button>
          </div>
        </Form.Section>
      </Card>

      {/* Turnstile 人机验证 */}
      <Card>
        <div className="mb-4">
          <Title heading={4}>
            <Space>
              <IconShield />
              {t('Turnstile 人机验证')}
            </Space>
          </Title>
          <Text type="secondary">
            {t('用以支持用户校验')}
          </Text>
        </div>

        <Form.Section>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={24} md={24} lg={24} xl={24}>
              <Form.Checkbox
                field='TurnstileCheckEnabled'
                noLabel
                onChange={(e) =>
                  handleCheckboxChange('TurnstileCheckEnabled', e)
                }
              >
                {t('启用 Turnstile 用户校验')}
              </Form.Checkbox>
            </Col>
          </Row>
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={12} md={12} lg={12} xl={12}>
              <Form.Input
                field='TurnstileSiteKey'
                label={t('Turnstile Site Key')}
              />
            </Col>
            <Col xs={24} sm={12} md={12} lg={12} xl={12}>
              <Form.Input
                field='TurnstileSecretKey'
                label={t('Turnstile Secret Key')}
                type='password'
                placeholder={t('敏感信息不会发送到前端显示')}
              />
            </Col>
          </Row>
          <div className="mt-4">
            <Button type="primary" onClick={submitTurnstile}>
              {t('保存 Turnstile 设置')}
            </Button>
          </div>
        </Form.Section>
      </Card>

      {/* 请求安全过滤 */}
      <Card>
        <div className="mb-4">
          <Title heading={4}>
            <Space>
              <IconGlobe />
              {t('请求安全过滤')}
            </Space>
          </Title>
          <Text type="secondary">
            {t('配置HTTP请求的域名和端口过滤策略')}
          </Text>
        </div>

        <Form.Section>
          <Banner
            type='info'
            description={t('配置后需要重启服务生效')}
            style={{ marginBottom: 16 }}
          />
          
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={12} lg={12} xl={12}>
              <Form.Checkbox
                field='WorkerAllowHttpImageRequestEnabled'
                noLabel
                onChange={(e) =>
                  handleCheckboxChange('WorkerAllowHttpImageRequestEnabled', e)
                }
              >
                {t('允许HTTP图片请求')}
              </Form.Checkbox>
            </Col>
          </Row>

          <div style={{ marginTop: 16 }}>
            <Text strong>{t('域名过滤模式：')}</Text>
            <Radio.Group
              value={domainFilterMode}
              onChange={(e) => setDomainFilterMode(e.target.value)}
              style={{ marginLeft: 8 }}
            >
              <Radio value={false}>{t('黑名单')}</Radio>
              <Radio value={true}>{t('白名单')}</Radio>
            </Radio.Group>
          </div>

          <TagInput
            value={ipList}
            onChange={setIpList}
            placeholder={t('输入域名或IP后回车')}
            style={{ width: '100%', marginTop: 16 }}
          />

          <div style={{ marginTop: 16 }}>
            <Text strong>{t('允许的端口：')}</Text>
            <TagInput
              value={allowedPorts}
              onChange={setAllowedPorts}
              placeholder={t('输入端口号后回车')}
              style={{ width: '100%', marginTop: 8 }}
            />
          </div>

          <div className="mt-4">
            <Button type="primary" onClick={submitSecurityFilters}>
              {t('保存安全过滤设置')}
            </Button>
          </div>
        </Form.Section>
      </Card>
    </div>
  );
};

export default SecuritySettings;