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

import React, { useEffect, useState, useRef } from 'react';
import {
  Button,
  Form,
  Row,
  Col,
  Typography,
  Modal,
  Banner,
  TagInput,
  Spin,
  Card,
  Radio,
  Tabs,
  Space,
  Divider,
} from '@douyinfe/semi-ui';
import {
  IconServer,
  IconSafe,
  IconMail,
  IconUser,
  IconBolt,
  IconSetting,
  IconCloud,
  IconShield,
  IconGlobe,
  IconCode,
} from '@douyinfe/semi-icons';
const { Text, Title } = Typography;
const { TabPane } = Tabs;
import {
  API,
  removeTrailingSlash,
  showError,
  showSuccess,
  toBoolean,
} from '../../helpers';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import ConsoleSection from '../layout/ConsoleSection';

// 子组件
import GeneralSettings from './SystemSetting/GeneralSettings';
import SecuritySettings from './SystemSetting/SecuritySettings';
import EmailSettings from './SystemSetting/EmailSettings';
import OIDCSettings from './SystemSetting/OIDCSettings';
import PaymentSettings from './SystemSetting/PaymentSettings';
import InterfaceSettings from './SystemSetting/InterfaceSettings';
import AdvancedSettings from './SystemSetting/AdvancedSettings';

const SystemSettingNew = () => {
  const { t } = useTranslation();
  const [inputs, setInputs] = useState({});
  const [originInputs, setOriginInputs] = useState({});
  const [isLoaded, setIsLoaded] = useState(false);
  const formApiRef = useRef();
  
  // 各种状态
  const [emailDomainWhitelist, setEmailDomainWhitelist] = useState([]);
  const [ipList, setIpList] = useState([]);
  const [allowedPorts, setAllowedPorts] = useState(['80', '443', '8080', '8443']);
  const [domainFilterMode, setDomainFilterMode] = useState(false);
  const [ipFilterMode, setIpFilterMode] = useState(false);
  const [showPasswordLoginConfirmModal, setShowPasswordLoginConfirmModal] = useState(false);

  const loadOptions = async () => {
    setIsLoaded(false);
    try {
      const res = await API.get('/api/option/');
      const { success, message, data } = res.data;
      if (success) {
        let newInputs = {};
        data.forEach((item) => {
          if (item.key === 'EmailDomainWhitelist') {
            if (item.value === '') {
              setEmailDomainWhitelist([]);
            } else {
              setEmailDomainWhitelist(item.value.split(','));
            }
          } else if (item.key === 'fetch_setting.domain_list') {
            try {
              const domains = item.value ? JSON.parse(item.value) : [];
              setIpList(Array.isArray(domains) ? domains : []);
            } catch (e) {
              setIpList([]);
            }
          } else if (item.key === 'fetch_setting.allowed_ports') {
            try {
              const ports = item.value ? JSON.parse(item.value) : [];
              setAllowedPorts(Array.isArray(ports) ? ports : []);
            } catch (e) {
              setAllowedPorts(['80', '443', '8080', '8443']);
            }
          }
          
          // 处理布尔值
          switch (item.key) {
            case 'PasswordLoginEnabled':
            case 'PasswordRegisterEnabled':
            case 'EmailVerificationEnabled':
            case 'RegisterEnabled':
            case 'TurnstileCheckEnabled':
            case 'EmailDomainRestrictionEnabled':
            case 'EmailAliasRestrictionEnabled':
            case 'SMTPSSLEnabled':
            case 'oidc.enabled':
            case 'WorkerAllowHttpImageRequestEnabled':
              item.value = toBoolean(item.value);
              break;
            case 'Price':
            case 'MinTopUp':
              item.value = parseFloat(item.value);
              break;
            default:
              break;
          }
          newInputs[item.key] = item.value;
        });
        
        setInputs(newInputs);
        setOriginInputs(newInputs);
        
        // 同步模式布尔到本地状态
        if (typeof newInputs['fetch_setting.domain_filter_mode'] !== 'undefined') {
          setDomainFilterMode(!!newInputs['fetch_setting.domain_filter_mode']);
        }
        if (typeof newInputs['fetch_setting.ip_filter_mode'] !== 'undefined') {
          setIpFilterMode(!!newInputs['fetch_setting.ip_filter_mode']);
        }
        
        if (formApiRef.current) {
          formApiRef.current.setValues(newInputs);
        }
      } else {
        showError(message);
      }
    } catch (error) {
      showError(t('加载设置失败'));
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    loadOptions();
  }, []);

  const updateOptions = async (options) => {
    try {
      const res = await API.put('/api/option/', { options });
      const { success, message } = res.data;
      if (success) {
        showSuccess(t('设置已保存'));
        // 更新本地状态
        let newInputs = { ...inputs };
        options.forEach(option => {
          newInputs[option.key] = option.value;
        });
        setInputs(newInputs);
        setOriginInputs(newInputs);
      } else {
        showError(message);
      }
    } catch (error) {
      showError(t('保存设置失败'));
    }
  };

  const handleFormChange = (values) => {
    setInputs(values);
  };

  const commonProps = {
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
    t,
  };

  const tabItems = [
    {
      tab: (
        <Space>
          <IconServer />
          {t('基础设置')}
        </Space>
      ),
      itemKey: 'general',
      content: <GeneralSettings {...commonProps} />,
    },
    {
      tab: (
        <Space>
          <IconShield />
          {t('安全设置')}
        </Space>
      ),
      itemKey: 'security',
      content: <SecuritySettings {...commonProps} />,
    },
    {
      tab: (
        <Space>
          <IconMail />
          {t('邮件设置')}
        </Space>
      ),
      itemKey: 'email',
      content: <EmailSettings {...commonProps} />,
    },
    {
      tab: (
        <Space>
          <IconUser />
          {t('身份认证')}
        </Space>
      ),
      itemKey: 'auth',
      content: <OIDCSettings {...commonProps} />,
    },
    {
      tab: (
        <Space>
          <IconBolt />
          {t('支付设置')}
        </Space>
      ),
      itemKey: 'payment',
      content: <PaymentSettings {...commonProps} />,
    },
    {
      tab: (
        <Space>
          <IconGlobe />
          {t('界面设置')}
        </Space>
      ),
      itemKey: 'interface',
      content: <InterfaceSettings {...commonProps} />,
    },
    {
      tab: (
        <Space>
          <IconCode />
          {t('高级设置')}
        </Space>
      ),
      itemKey: 'advanced',
      content: <AdvancedSettings {...commonProps} />,
    },
  ];

  return (
    <ConsoleSection
      title={t('系统管理')}
      description={t('配置系统各项功能和参数')}
    >
      {isLoaded ? (
        <Form
          initValues={inputs}
          onValueChange={handleFormChange}
          getFormApi={(api) => (formApiRef.current = api)}
        >
          <Card className="system-settings-card">
            <Tabs
              type="card"
              tabPosition="top"
              size="large"
              style={{ minHeight: '600px' }}
            >
              {tabItems.map(item => (
                <TabPane 
                  tab={item.tab}
                  itemKey={item.itemKey}
                  key={item.itemKey}
                >
                  <div className="tab-content-wrapper" style={{ padding: '24px 0' }}>
                    {item.content}
                  </div>
                </TabPane>
              ))}
            </Tabs>
          </Card>
          
          {/* 密码登录确认弹窗 */}
          <Modal
            title={t('确认取消密码登录')}
            visible={showPasswordLoginConfirmModal}
            onOk={async () => {
              await updateOptions([{ key: 'PasswordLoginEnabled', value: false }]);
              setShowPasswordLoginConfirmModal(false);
            }}
            onCancel={() => {
              setShowPasswordLoginConfirmModal(false);
              if (formApiRef.current) {
                formApiRef.current.setValue('PasswordLoginEnabled', true);
              }
            }}
            okText={t('确认')}
            cancelText={t('取消')}
          >
            <p>
              {t('您确定要取消密码登录功能吗？这可能会影响用户的登录方式。')}
            </p>
          </Modal>
        </Form>
      ) : (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '50vh',
          }}
        >
          <Spin size="large" />
        </div>
      )}
    </ConsoleSection>
  );
};

export default SystemSettingNew;