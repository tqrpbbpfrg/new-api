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
  Card,
  Select,
  Input,
  Space,
  Tag,
  message,
  Divider,
} from '@douyinfe/semi-ui';
const { Text } = Typography;
import {
  API,
  showError,
  showSuccess,
} from '../../helpers';
import { useTranslation } from 'react-i18next';

const DefaultExtraUserGroupSetting = () => {
  const { t } = useTranslation();
  const formApiRef = useRef();
  const [loading, setLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [registrationMethods, setRegistrationMethods] = useState([
    { key: 'email', label: '邮箱注册', extraGroups: [] },
    { key: 'github', label: 'GitHub注册', extraGroups: [] },
    { key: 'oidc', label: 'OIDC注册', extraGroups: [] },
    { key: 'wechat', label: '微信注册', extraGroups: [] },
    { key: 'telegram', label: 'Telegram注册', extraGroups: [] },
    { key: 'discord', label: 'Discord注册', extraGroups: [] },
    { key: 'linuxdo', label: 'LinuxDO注册', extraGroups: [] },
  ]);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState('');

  const getOptions = async () => {
    setLoading(true);
    try {
      // 获取默认额外用户组配置
      const res = await API.get('/api/option/');
      const { success, message, data } = res.data;
      if (success) {
        const newInputs = {};
        data.forEach((item) => {
          if (item.key === 'DefaultExtraUserGroups') {
            try {
              const defaultExtraGroups = JSON.parse(item.value);
              newInputs[item.key] = defaultExtraGroups;
              
              // 更新注册方法的额外用户组
              const updatedMethods = registrationMethods.map(method => ({
                ...method,
                extraGroups: defaultExtraGroups[method.key] || []
              }));
              setRegistrationMethods(updatedMethods);
            } catch (e) {
              newInputs[item.key] = {};
            }
          }
        });
        if (formApiRef.current) {
          formApiRef.current.setValues(newInputs);
        }
        setIsLoaded(true);
      } else {
        showError(message);
      }
    } catch (error) {
      showError(t('获取配置失败'));
    }
    setLoading(false);
  };

  const getAvailableGroups = async () => {
    try {
      const res = await API.get('/api/group/');
      const { success, data } = res.data;
      if (success) {
        setAvailableGroups(data);
      }
    } catch (error) {
      console.error('获取可用用户组失败:', error);
    }
  };

  useEffect(() => {
    getOptions();
    getAvailableGroups();
  }, []);

  const handleMethodChange = (methodKey) => {
    setSelectedMethod(methodKey);
  };

  const handleExtraGroupsChange = (selectedGroups) => {
    const updatedMethods = registrationMethods.map(method =>
      method.key === selectedMethod ? { ...method, extraGroups: selectedGroups } : method
    );
    setRegistrationMethods(updatedMethods);
    
    // 更新表单值
    if (formApiRef.current) {
      const currentValues = formApiRef.current.getValue('DefaultExtraUserGroups') || {};
      formApiRef.current.setValue('DefaultExtraUserGroups', {
        ...currentValues,
        [selectedMethod]: selectedGroups
      });
    }
  };

  const submitDefaultExtraUserGroups = async () => {
    setLoading(true);
    try {
      const values = formApiRef.current ? formApiRef.current.getValues() : {};
      const defaultExtraGroups = values.DefaultExtraUserGroups || {};
      
      await updateOptions([
        {
          key: 'DefaultExtraUserGroups',
          value: JSON.stringify(defaultExtraGroups),
        },
      ]);
      
      showSuccess(t('默认额外用户组配置已更新'));
    } catch (error) {
      showError(t('更新失败'));
    }
    setLoading(false);
  };

  const updateOptions = async (options) => {
    try {
      const requestQueue = options.map((opt) =>
        API.put('/api/option/', {
          key: opt.key,
          value: opt.value,
        }),
      );

      const results = await Promise.all(requestQueue);

      // 检查所有请求是否成功
      const errorResults = results.filter((res) => !res.data.success);
      errorResults.forEach((res) => {
        showError(res.data.message);
      });

      if (errorResults.length === 0) {
        return true;
      }
      return false;
    } catch (error) {
      showError(t('更新失败'));
      return false;
    }
  };

  const getCurrentExtraGroups = () => {
    if (!selectedMethod) return [];
    const method = registrationMethods.find(m => m.key === selectedMethod);
    return method ? method.extraGroups : [];
  };

  return (
    <div>
      {isLoaded ? (
        <Form getFormApi={(api) => (formApiRef.current = api)} layout="vertical">
          <Card>
            <Form.Section text={t('默认额外用户组配置')}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                {t('配置不同注册方式下用户的默认额外用户组，用户将同时拥有主用户组和额外用户组的权限')}
              </Text>
              
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={12}>
                  <Text>{t('选择注册方式')}</Text>
                </Col>
                <Col span={12}>
                  <Select
                    value={selectedMethod}
                    onChange={handleMethodChange}
                    placeholder={t('请选择注册方式')}
                    style={{ width: '100%' }}
                    optionList={registrationMethods.map(method => ({
                      label: method.label,
                      value: method.key,
                    }))}
                  />
                </Col>
              </Row>

              {selectedMethod && (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={12}>
                      <Text>{t('额外用户组')}</Text>
                    </Col>
                    <Col span={12}>
                      <Select
                        multiple
                        value={getCurrentExtraGroups()}
                        onChange={handleExtraGroupsChange}
                        placeholder={t('请选择该注册方式的默认额外用户组')}
                        style={{ width: '100%' }}
                        optionList={availableGroups.map(group => ({
                          label: group,
                          value: group,
                        }))}
                      />
                    </Col>
                  </Row>

                  <Divider />
                </>
              )}

              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--semi-color-border)' }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                  {t('当前配置预览')}:
                </Text>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {registrationMethods.map((method) => (
                    <div key={method.key} style={{ marginBottom: 8 }}>
                      <Text strong>{method.label}:</Text>
                      <Space wrap style={{ marginLeft: 8 }}>
                        {method.extraGroups.length > 0 ? (
                          method.extraGroups.map(group => (
                            <Tag key={group} color="purple">
                              {group}
                            </Tag>
                          ))
                        ) : (
                          <Tag color="gray">无额外用户组</Tag>
                        )}
                      </Space>
                    </div>
                  ))}
                </Space>
              </div>

              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--semi-color-border)' }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                  {t('可用用户组说明')}:
                </Text>
                <Space wrap>
                  {availableGroups.map(group => (
                    <Tag key={group} color="blue">
                      {group}
                    </Tag>
                  ))}
                </Space>
              </div>

              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--semi-color-border)' }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                  {t('功能说明')}:
                </Text>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  <li>主用户组：用户的主要用户组，决定基础权限和功能</li>
                  <li>额外用户组：用户可以同时拥有的额外用户组，提供额外的权限和功能</li>
                  <li>渠道分组：特殊的用户组，通常用于渠道管理和分组</li>
                  <li>用户将拥有主用户组和所有额外用户组的组合权限</li>
                </ul>
              </div>

              <Button
                type="primary"
                onClick={submitDefaultExtraUserGroups}
                loading={loading}
                style={{ marginTop: 24 }}
              >
                {t('保存默认额外用户组配置')}
              </Button>
            </Form.Section>
          </Card>
        </Form>
      ) : (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '200px',
          }}
        >
          <div loading={true} />
        </div>
      )}
    </div>
  );
};

export default DefaultExtraUserGroupSetting;
