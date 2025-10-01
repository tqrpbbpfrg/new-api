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
  Divider,
} from '@douyinfe/semi-ui';
const { Text } = Typography;
import {
  API,
  showError,
  showSuccess,
} from '../../helpers';
import { useTranslation } from 'react-i18next';

const GroupAvailableGroupsSetting = () => {
  const { t } = useTranslation();
  const formApiRef = useRef();
  const [loading, setLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [groupAvailableGroups, setGroupAvailableGroups] = useState({});
  const [availableGroups, setAvailableGroups] = useState([]);
  const [selectedUserGroup, setSelectedUserGroup] = useState('');

  const getOptions = async () => {
    setLoading(true);
    try {
      // 获取用户组可选分组配置
      const res = await API.get('/api/option/');
      const { success, message, data } = res.data;
      if (success) {
        const newInputs = {};
        data.forEach((item) => {
          if (item.key === 'GroupAvailableGroups') {
            try {
              const groupAvailableGroups = JSON.parse(item.value);
              newInputs[item.key] = groupAvailableGroups;
              setGroupAvailableGroups(groupAvailableGroups);
            } catch (e) {
              newInputs[item.key] = {};
              setGroupAvailableGroups({});
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

  const handleUserGroupChange = (userGroup) => {
    setSelectedUserGroup(userGroup);
  };

  const handleAvailableGroupsChange = (selectedGroups) => {
    const updatedConfig = {
      ...groupAvailableGroups,
      [selectedUserGroup]: selectedGroups
    };
    setGroupAvailableGroups(updatedConfig);
    
    // 更新表单值
    if (formApiRef.current) {
      formApiRef.current.setValue('GroupAvailableGroups', updatedConfig);
    }
  };

  const submitGroupAvailableGroups = async () => {
    setLoading(true);
    try {
      const values = formApiRef.current ? formApiRef.current.getValues() : {};
      const groupAvailableGroups = values.GroupAvailableGroups || {};
      
      await updateOptions([
        {
          key: 'GroupAvailableGroups',
          value: JSON.stringify(groupAvailableGroups),
        },
      ]);
      
      showSuccess(t('用户组可选分组配置已更新'));
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

  const getCurrentAvailableGroups = () => {
    if (!selectedUserGroup) return [];
    return groupAvailableGroups[selectedUserGroup] || [];
  };

  return (
    <div>
      {isLoaded ? (
        <Form getFormApi={(api) => (formApiRef.current = api)} layout="vertical">
          <Card>
            <Form.Section text={t('用户组可选分组配置')}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                {t('配置每个用户组可以使用的可选分组，实现默认用户分组决定用户可选分组的功能')}
              </Text>
              
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={12}>
                  <Text>{t('选择用户组')}</Text>
                </Col>
                <Col span={12}>
                  <Select
                    value={selectedUserGroup}
                    onChange={handleUserGroupChange}
                    placeholder={t('请选择用户组')}
                    style={{ width: '100%' }}
                    optionList={availableGroups.map(group => ({
                      label: group,
                      value: group,
                    }))}
                  />
                </Col>
              </Row>

              {selectedUserGroup && (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={12}>
                      <Text>{t('可选分组')}</Text>
                    </Col>
                    <Col span={12}>
                      <Select
                        multiple
                        value={getCurrentAvailableGroups()}
                        onChange={handleAvailableGroupsChange}
                        placeholder={t('请选择该用户组可以使用的分组')}
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
                  {Object.entries(groupAvailableGroups).map(([userGroup, availableGroups]) => (
                    <div key={userGroup} style={{ marginBottom: 8 }}>
                      <Text strong>{userGroup}:</Text>
                      <Space wrap style={{ marginLeft: 8 }}>
                        {availableGroups.map(group => (
                          <Tag key={group} color="blue">
                            {group}
                          </Tag>
                        ))}
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
                    <Tag key={group} color="green">
                      {group}
                    </Tag>
                  ))}
                </Space>
              </div>

              <Button
                type="primary"
                onClick={submitGroupAvailableGroups}
                loading={loading}
                style={{ marginTop: 24 }}
              >
                {t('保存用户组可选分组配置')}
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

export default GroupAvailableGroupsSetting;
