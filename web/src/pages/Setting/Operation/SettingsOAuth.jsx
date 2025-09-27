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

import { IconGithubLogo, IconGlobe } from '@douyinfe/semi-icons';
import {
  Banner,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Row,
  Space,
  Switch,
  Typography
} from '@douyinfe/semi-ui';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  API,
  compareObjects,
  showError,
  showSuccess,
  showWarning,
} from '../../../helpers';

const { Title, Text } = Typography;

export default function OAuthSettings(props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({
    // GitHub OAuth
    GitHubOAuthEnabled: false,
    GitHubClientId: '',
    GitHubClientSecret: '',
    
    // Discord OAuth
    DiscordOAuthEnabled: false,
    DiscordClientId: '',
    DiscordClientSecret: '',
    DiscordOAuthScopes: 'identify email',
    
    // Telegram OAuth
    TelegramOAuthEnabled: false,
    TelegramBotToken: '',
    TelegramBotName: '',
    
    // LinuxDO OAuth
    LinuxDOOAuthEnabled: false,
    LinuxDOClientId: '',
    LinuxDOClientSecret: '',
    
    // WeChat OAuth
    WeChatAuthEnabled: false,
    WeChatServerAddress: '',
    WeChatServerToken: '',
    WeChatAccountQRCodeImageURL: '',
  });

  const refForm = useRef();
  const [inputsRow, setInputsRow] = useState(inputs);

  function handleFieldChange(fieldName) {
    return (value) => {
      setInputs((inputs) => ({ ...inputs, [fieldName]: value }));
    };
  }

  function validateBeforeSubmit() {
    // Discord：若要启用必须有 ClientId + Secret + Scopes
    if (inputs.DiscordOAuthEnabled) {
      if (!inputs.DiscordClientId) return showError(t('启用 Discord 需要填写 Client ID'));
      if (!inputs.DiscordClientSecret) return showError(t('启用 Discord 需要填写 Client Secret'));
      if (!inputs.DiscordOAuthScopes) return showError(t('启用 Discord 需要至少一个 Scope'));
      // 简单校验字符
      if (/[^a-zA-Z0-9_\s,]/.test(inputs.DiscordOAuthScopes)) return showWarning(t('Scopes 仅支持字母、数字、下划线、逗号与空格')); 
    }
    if (inputs.GitHubOAuthEnabled) {
      if (!inputs.GitHubClientId || !inputs.GitHubClientSecret) return showError(t('启用 GitHub 需要填写 Client ID 与 Client Secret'));
    }
    if (inputs.LinuxDOOAuthEnabled) {
      if (!inputs.LinuxDOClientId || !inputs.LinuxDOClientSecret) return showError(t('启用 LinuxDO 需要填写 Client ID 与 Client Secret'));
    }
    if (inputs.TelegramOAuthEnabled) {
      if (!inputs.TelegramBotToken || !inputs.TelegramBotName) return showError(t('启用 Telegram 需要 Bot Token 与 Bot Name'));
    }
    return true;
  }

  function onSubmit() {
    if (!validateBeforeSubmit()) return;
    const updateArray = compareObjects(inputsRow, inputs);
    if (!updateArray.length) return showWarning(t('你似乎并没有修改什么'));
    
    const requestQueue = updateArray.map((item) => {
      let value = '';
      if (typeof inputs[item.key] === 'boolean') {
        value = String(inputs[item.key]);
      } else {
        value = inputs[item.key];
      }
      return API.put('/api/option/', {
        key: item.key,
        value,
      });
    });
    
    setLoading(true);
    Promise.all(requestQueue)
      .then((resList) => {
        // 检查后端返回内是否有失败（后端失败时我们 helper 里会 showError 并返回 undefined）
        if (resList.includes(undefined)) {
          return showError(t('部分保存失败，请检查必填项')); 
        }
        showSuccess(t('保存成功'));
        
        // 立即更新组件状态，确保显示一致性
        const newInputsRow = structuredClone(inputs);
        setInputsRow(newInputsRow);
        
        // 同步OAuth认证开关到本地存储，解决刷新后还原问题
        const oauthSwitches = [
          'GitHubOAuthEnabled',
          'DiscordOAuthEnabled', 
          'TelegramOAuthEnabled',
          'LinuxDOOAuthEnabled',
          'WeChatAuthEnabled',
          'PasswordLoginEnabled',
          'PasswordRegisterEnabled', 
          'EmailVerificationEnabled',
          'TurnstileCheckEnabled',
          'RegisterEnabled'
        ];
        
        try { 
          // 获取当前缓存
          const cache = localStorage.getItem('options_cache');
          let options = cache ? JSON.parse(cache) : {};
          
          // 更新所有变更的配置项
          updateArray.forEach(item => {
            const value = typeof inputs[item.key] === 'boolean' ? inputs[item.key] : inputs[item.key];
            localStorage.setItem(item.key, String(value));
            options[item.key] = value;
          });
          
          // 更新options_cache
          localStorage.setItem('options_cache', JSON.stringify(options));
          
          console.log('OAuth配置已同步至本地缓存');
        } catch(e){
          console.warn('Failed to sync OAuth settings to localStorage:', e);
        }
        
        // 刷新父组件状态
        if (props.refresh) {
          props.refresh();
        }
      })
      .catch((e) => {
        showError(t('保存失败：') + (e?.message || ''));
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const currentInputs = {};
    for (let key in inputs) {
      if (typeof props.options[key] !== 'undefined') {
        if (typeof inputs[key] === 'boolean') {
          currentInputs[key] = props.options[key] === 'true';
        } else {
          currentInputs[key] = props.options[key];
        }
      }
    }
    setInputs(currentInputs);
    setInputsRow(structuredClone(currentInputs));
  }, [props.options]);

  const renderOAuthCard = (title, icon, enabled, enabledKey, fields) => (
    <Card
      title={
        <Space>
          {icon}
          <span>{title}</span>
          <Switch
            checked={enabled}
            onChange={handleFieldChange(enabledKey)}
            size="small"
          />
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      {fields.map((field) => (
        <Form.Input
          key={field.key}
          label={field.label}
          field={field.key}
          placeholder={field.placeholder}
          value={inputs[field.key]}
          onChange={handleFieldChange(field.key)}
          disabled={!enabled}
          type={field.type || 'text'}
          style={{ marginBottom: 16 }}
        />
      ))}
    </Card>
  );

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Title heading={4}>{t('第三方登录设置')}</Title>
        <Text type="tertiary">{t('配置各种第三方OAuth登录选项')}</Text>
      </div>

      <Banner
        type="info"
        description={t('配置第三方登录需要在对应平台创建应用并获取相关凭据。启用前请确保已正确配置所有必需参数。')}
        style={{ marginBottom: 16 }}
      />

      <Form ref={refForm} onSubmit={onSubmit}>
        <Row gutter={16}>
          <Col span={24}>
            {renderOAuthCard(
              'GitHub',
              <IconGithubLogo />,
              inputs.GitHubOAuthEnabled,
              'GitHubOAuthEnabled',
              [
                {
                  key: 'GitHubClientId',
                  label: 'Client ID',
                  placeholder: t('输入GitHub应用的Client ID'),
                },
                {
                  key: 'GitHubClientSecret',
                  label: 'Client Secret',
                  placeholder: t('输入GitHub应用的Client Secret'),
                  type: 'password',
                }
              ]
            )}
          </Col>

          <Col span={24}>
            {renderOAuthCard(
              'Discord',
              <div style={{ width: 14, height: 14, backgroundColor: '#5865F2', borderRadius: '50%' }} />,
              inputs.DiscordOAuthEnabled,
              'DiscordOAuthEnabled',
              [
                {
                  key: 'DiscordClientId',
                  label: 'Client ID',
                  placeholder: t('输入Discord应用的Client ID'),
                },
                {
                  key: 'DiscordClientSecret',
                  label: 'Client Secret',
                  placeholder: t('输入Discord应用的Client Secret'),
                  type: 'password',
                },
                {
                  key: 'DiscordOAuthScopes',
                  label: 'OAuth Scopes',
                  placeholder: 'identify email',
                }
              ]
            )}
          </Col>

          <Col span={24}>
            {renderOAuthCard(
              'Telegram',
              <div style={{ width: 14, height: 14, backgroundColor: '#0088cc', borderRadius: '50%' }} />,
              inputs.TelegramOAuthEnabled,
              'TelegramOAuthEnabled',
              [
                {
                  key: 'TelegramBotToken',
                  label: 'Bot Token',
                  placeholder: t('输入Telegram机器人Token'),
                  type: 'password',
                },
                {
                  key: 'TelegramBotName',
                  label: 'Bot Name',
                  placeholder: t('输入Telegram机器人用户名'),
                }
              ]
            )}
          </Col>

          <Col span={24}>
            {renderOAuthCard(
              'LinuxDO',
              <IconGlobe />,
              inputs.LinuxDOOAuthEnabled,
              'LinuxDOOAuthEnabled',
              [
                {
                  key: 'LinuxDOClientId',
                  label: 'Client ID',
                  placeholder: t('输入LinuxDO应用的Client ID'),
                },
                {
                  key: 'LinuxDOClientSecret',
                  label: 'Client Secret',
                  placeholder: t('输入LinuxDO应用的Client Secret'),
                  type: 'password',
                }
              ]
            )}
          </Col>

          <Col span={24}>
            {renderOAuthCard(
              '微信',
              <div style={{ width: 14, height: 14, backgroundColor: '#1aad19', borderRadius: '50%' }} />,
              inputs.WeChatAuthEnabled,
              'WeChatAuthEnabled',
              [
                {
                  key: 'WeChatServerAddress',
                  label: t('服务器地址'),
                  placeholder: t('输入微信服务器地址'),
                },
                {
                  key: 'WeChatServerToken',
                  label: t('服务器Token'),
                  placeholder: t('输入微信服务器Token'),
                  type: 'password',
                },
                {
                  key: 'WeChatAccountQRCodeImageURL',
                  label: t('二维码图片URL'),
                  placeholder: t('输入微信账号二维码图片URL'),
                }
              ]
            )}
          </Col>
        </Row>

        <Divider />
        
        <Space>
          <Button htmlType="submit" type="primary" loading={loading}>
            {t('保存设置')}
          </Button>
          <Button 
            type="tertiary" 
            onClick={() => {
              setInputs(structuredClone(inputsRow));
            }}
          >
            {t('重置')}
          </Button>
        </Space>
      </Form>
    </div>
  );
}