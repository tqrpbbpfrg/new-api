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

import React, { useEffect, useState } from 'react';
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
} from '@douyinfe/semi-ui';
const { Text } = Typography;
import {
  API,
  showError,
  showSuccess,
} from '../../helpers';
import { useTranslation } from 'react-i18next';

const DefaultUserGroupSetting = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [registrationMethods, setRegistrationMethods] = useState([
    { key: 'email', label: '邮箱注册', group: '' },
    { key: 'github', label: 'GitHub注册', group: '' },
    { key: 'oidc', label: 'OIDC注册', group: '' },
    { key: 'wechat', label: '微信注册', group: '' },
    { key: 'telegram', label: 'Telegram注册', group: '' },
    { key: 'discord', label: 'Discord注册', group: '' },
    { key: 'linuxdo', label: 'LinuxDO注册', group: '' },
  ]);
  const [availableGroups, setAvailableGroups] = useState([]);

  const getOptions = async () => {
    setLoading(true);
    try {
      // 获取默认用户组配置
      const res = await API.get('/api/option/');
      const { success, message, data } = res.data;
      if (success) {
        const newInputs = {};
        data.forEach((item) => {
          if (item.key === 'DefaultUserGroups') {
            try {
              const defaultGroups = JSON.parse(item.value);
              newInputs[item.key] = defaultGroups;
              
              // 更新注册方法的用户组
              const updatedMethods = registrationMethods.map(method => ({
                ...method,
                group: defaultGroups[method.key] || ''
              }));
              setRegistrationMethods(updatedMethods);
            } catch (e) {
              newInputs[item.key] = {};
            }
          }
        });
        form.setFieldsValue(newInputs);
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

  const handleGroupChange = (methodKey, groupName) => {
    const updatedMethods = registrationMethods.map(method =>
      method.key === methodKey ? { ...method, group: groupName } : method
    );
    setRegistrationMethods(updatedMethods);
    
    // 更新表单值
    const currentValues = form.getFieldValue('DefaultUserGroups') || {};
    form.setFieldsValue({
      DefaultUserGroups: {
        ...currentValues,
        [methodKey]: groupName
      }
    });
  };

  const submitDefaultUserGroups = async () => {
    setLoading(true);
    try {
      const values = form.getFieldsValue();
      const defaultGroups = values.DefaultUserGroups || {};
      
      await updateOptions([
        {
          key: 'DefaultUserGroups',
          value: JSON.stringify(defaultGroups),
        },
      ]);
      
      showSuccess(t('主用户组配置已更新'));
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

  return (
    <div>
      {isLoaded ? (
        <Form form={form} layout="vertical">
          <Card>
            <Form.Section text={t('主用户组配置（原默认用户组）')}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                {t('配置不同注册方式下用户的主用户组，主用户组决定用户的基础权限和功能')}
              </Text>
              
              {registrationMethods.map((method) => (
                <Row key={method.key} gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={8}>
                    <Text>{method.label}</Text>
                  </Col>
                  <Col span={16}>
                    <Select
                      value={method.group}
                      onChange={(value) => handleGroupChange(method.key, value)}
                      placeholder={t('请选择主用户组')}
                      style={{ width: '100%' }}
                      optionList={availableGroups.map(group => ({
                        label: group,
                        value: group,
                      }))}
                    />
                  </Col>
                </Row>
              ))}

              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--semi-color-border)' }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                  {t('功能说明')}:
                </Text>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  <li>主用户组：用户的主要用户组，决定基础权限和功能</li>
                  <li>额外用户组：用户可以同时拥有的额外用户组，提供额外的权限和功能</li>
                  <li>用户将拥有主用户组和所有额外用户组的组合权限</li>
                  <li>额外用户组可以在"默认额外用户组配置"中设置</li>
                </ul>
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

              <Button
                type="primary"
                onClick={submitDefaultUserGroups}
                loading={loading}
                style={{ marginTop: 24 }}
              >
                {t('保存主用户组配置')}
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

export default DefaultUserGroupSetting;
