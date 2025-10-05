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

import {
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
} from '@douyinfe/semi-ui';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  API,
  showError,
  showSuccess,
} from '../../helpers';
const { Text } = Typography;

const GroupAvailableGroupsSetting = () => {
  const { t } = useTranslation();
  const formApiRef = useRef();
  const [loading, setLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [groupAvailableGroups, setGroupAvailableGroups] = useState({});
  // 全局可用分组及其说明（与 UserUsableGroups 共用同一后端配置）
  const [userUsableGroups, setUserUsableGroups] = useState({});
  const [availableGroups, setAvailableGroups] = useState([]);
  const [selectedUserGroup, setSelectedUserGroup] = useState('');
  // 高级模式相关状态
  const [advancedMode, setAdvancedMode] = useState(false);
  const [rawGroupAvailableGroups, setRawGroupAvailableGroups] = useState('');
  const [rawUserUsableGroups, setRawUserUsableGroups] = useState('');

  const getOptions = async () => {
    setLoading(true);
    try {
      // 获取用户组可选分组配置 & 可用分组描述
      const res = await API.get('/api/option/');
      const { success, message, data } = res.data;
      if (success) {
        const newInputs = {};
        data.forEach((item) => {
          if (item.key === 'GroupAvailableGroups') {
            try {
              const gag = JSON.parse(item.value);
              newInputs[item.key] = gag;
              setGroupAvailableGroups(gag);
              setRawGroupAvailableGroups(JSON.stringify(gag, null, 2));
            } catch (e) {
              newInputs[item.key] = {};
              setGroupAvailableGroups({});
              setRawGroupAvailableGroups('{}');
            }
          } else if (item.key === 'UserUsableGroups') {
            try {
              const groups = JSON.parse(item.value);
              setUserUsableGroups(groups);
              setRawUserUsableGroups(JSON.stringify(groups, null, 2));
            } catch (e) {
              setUserUsableGroups({});
              setRawUserUsableGroups('{}');
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

    // 新增的分组如果在描述映射中不存在，则添加默认描述
    const updatedUsableGroups = { ...userUsableGroups };
    selectedGroups.forEach(g => {
      if (!updatedUsableGroups[g]) {
        updatedUsableGroups[g] = g; // 默认使用自身名称
      }
    });
    setUserUsableGroups(updatedUsableGroups);
  };

  const handleGroupDescriptionChange = (group, desc) => {
    const updated = { ...userUsableGroups, [group]: desc };
    setUserUsableGroups(updated);
  };

  const submitGroupAvailableGroups = async () => {
    setLoading(true);
    try {
      const values = formApiRef.current ? formApiRef.current.getValues() : {};
      const groupAvailableGroups = values.GroupAvailableGroups || {};
      let finalGAG = groupAvailableGroups;
      let finalUUG = userUsableGroups;

      if (advancedMode) {
        // 解析高级模式文本
        try {
          const parsed = rawGroupAvailableGroups.trim() ? JSON.parse(rawGroupAvailableGroups) : {};
          if (typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('root must be object');
          for (const [k, v] of Object.entries(parsed)) {
            if (!Array.isArray(v)) {
              showError(t('分组 "{{name}}" 的值必须是数组', { name: k }));
              setLoading(false); return;
            }
          }
          finalGAG = parsed;
        } catch (e) {
          showError(t('解析 用户组可选分组 JSON 失败: ') + e.message);
          setLoading(false); return;
        }
        try {
          const parsed = rawUserUsableGroups.trim() ? JSON.parse(rawUserUsableGroups) : {};
          if (typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('root must be object');
          const norm = {};
          for (const [k, v] of Object.entries(parsed)) norm[k] = v == null ? k : String(v);
          finalUUG = norm;
        } catch (e) {
          showError(t('解析 可用分组说明 JSON 失败: ') + e.message);
          setLoading(false); return;
        }
        // 同步内存，便于切回普通模式
        setGroupAvailableGroups(finalGAG);
        setUserUsableGroups(finalUUG);
      }

      // 同时保存可用分组描述 (UserUsableGroups) 以便令牌创建/编辑界面展示
      await updateOptions([
        { key: 'GroupAvailableGroups', value: JSON.stringify(finalGAG) },
        { key: 'UserUsableGroups', value: JSON.stringify(finalUUG) },
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <Switch
                  checked={advancedMode}
                  onChange={(v) => {
                    setAdvancedMode(v);
                    if (v) {
                      setRawGroupAvailableGroups(JSON.stringify(groupAvailableGroups, null, 2));
                      setRawUserUsableGroups(JSON.stringify(userUsableGroups, null, 2));
                    }
                  }}
                />
                <Text>{advancedMode ? t('高级模式: 直接编辑 JSON') : t('普通模式')}</Text>
              </div>

              {advancedMode && (
                <div style={{
                  border: '1px solid var(--semi-color-border)',
                  padding: 16,
                  borderRadius: 4,
                  marginBottom: 24,
                  background: 'var(--semi-color-fill-0)'
                }}>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>{t('用户组可选分组 JSON')}</Text>
                  <Input.TextArea
                    value={rawGroupAvailableGroups}
                    onChange={setRawGroupAvailableGroups}
                    rows={10}
                    placeholder={t('示例: {"default":["default","premium"],"vip":["vip","premium"]}')}
                    style={{ fontFamily: 'monospace', marginBottom: 16 }}
                    spellCheck={false}
                  />
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>{t('可用分组说明 JSON')}</Text>
                  <Input.TextArea
                    value={rawUserUsableGroups}
                    onChange={setRawUserUsableGroups}
                    rows={8}
                    placeholder={t('示例: {"default":"默认分组","vip":"VIP分组"}')}
                    style={{ fontFamily: 'monospace' }}
                    spellCheck={false}
                  />
                  <Text type="tertiary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                    {t('保存时会校验 JSON 格式，若解析失败将阻止提交。')}
                  </Text>
                  <Divider />
                </div>
              )}
              
              {!advancedMode && (
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
              )}

              {!advancedMode && selectedUserGroup && (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={24}>
                      <Text strong>{t('可选分组')}</Text>
                    </Col>
                    <Col span={24}>
                      <Select
                        multiple
                        value={getCurrentAvailableGroups()}
                        onChange={handleAvailableGroupsChange}
                        placeholder={t('请选择该用户组可以使用的分组')}
                        style={{ width: '100%' }}
                        optionList={availableGroups.map(group => ({
                          label: userUsableGroups[group] ? `${group} (${userUsableGroups[group]})` : group,
                          value: group,
                        }))}
                      />
                    </Col>
                  </Row>

                  {/* 分组说明编辑区域 */}
                  {getCurrentAvailableGroups().length > 0 && (
                    <div style={{
                      marginBottom: 16,
                      padding: 16,
                      border: '1px solid var(--semi-color-border)',
                      borderRadius: 4,
                    }}>
                      <Text strong style={{ display: 'block', marginBottom: 12 }}>
                        {t('分组说明配置')}
                      </Text>
                      <Space direction="vertical" style={{ width: '100%' }} spacing="medium">
                        {getCurrentAvailableGroups().map(group => (
                          <Row key={group} gutter={12} style={{ alignItems: 'center' }}>
                            <Col span={6}>
                              <Tag color="blue">{group}</Tag>
                            </Col>
                            <Col span={18}>
                              <Input
                                value={userUsableGroups[group] || group}
                                placeholder={t('请输入该分组说明，例如：这是xx渠道')}
                                onChange={(val) => handleGroupDescriptionChange(group, val)}
                              />
                            </Col>
                          </Row>
                        ))}
                      </Space>
                      <Text type="tertiary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
                        {t('这些说明会在令牌创建/编辑时显示，帮助用户理解分组作用')}。
                      </Text>
                    </div>
                  )}

                  <Divider />
                </>
              )}

              {!advancedMode && (
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
                            {userUsableGroups[group] ? `${group} (${userUsableGroups[group]})` : group}
                          </Tag>
                        ))}
                      </Space>
                    </div>
                  ))}
                </Space>
              </div>
              )}

              {!advancedMode && (
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--semi-color-border)' }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                  {t('可用用户组说明')}:
                </Text>
                <Space wrap>
                  {availableGroups.map(group => (
                    <Tag key={group} color="green">
                      {userUsableGroups[group] ? `${group} (${userUsableGroups[group]})` : group}
                    </Tag>
                  ))}
                </Space>
              </div>
              )}

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
