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
  Form, 
  Input, 
  InputNumber, 
  Switch, 
  Button, 
  Space, 
  Card, 
  Divider,
  Toast,
  Spin
} from '@douyinfe/semi-ui';
import { CheckInService } from '../../services/checkin';
import { showSuccess, showError } from '../../helpers';

const CheckInSetting = ({ options = {}, refresh }) => {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    enabled: false,
    minReward: 100,
    maxReward: 1000,
    verifyCodeEnabled: false,
    verifyCode: '',
    continuousBonusEnabled: false,
    continuousBonusDays: 7,
    continuousBonusMultiplier: 1.5
  });

  const formApiRef = React.useRef();

  // 获取签到配置
  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await CheckInService.getConfig();
      if (response.success) {
        setConfig(response.data);
        if (formApiRef.current) {
          formApiRef.current.setValues(response.data);
        }
      }
    } catch (error) {
      console.error('获取签到配置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 保存配置
  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await formApiRef.current.getValues();
      const response = await CheckInService.updateConfig(values);
      if (response.success) {
        showSuccess('签到配置已更新');
        setConfig(values);
        refresh();
      } else {
        showError(response.message || '更新配置失败');
      }
    } catch (error) {
      console.error('保存签到配置失败:', error);
      showError('保存配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 重置配置
  const handleReset = () => {
    if (formApiRef.current) {
      formApiRef.current.setValues(config);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return (
    <Spin spinning={loading}>
      <Card title="签到设置" style={{ marginBottom: 16 }}>
        <Form
          getFormApi={(api) => (formApiRef.current = api)}
          onSubmit={handleSave}
          labelPosition="top"
          style={{ maxWidth: 600 }}
        >
          <Form.Switch
            field="enabled"
            label="启用签到功能"
            initValue={false}
            extraText="开启后用户可以进行每日签到获得额度奖励"
          />

          <Divider margin="12px" />

          <Form.InputNumber
            field="minReward"
            label="最小奖励额度"
            initValue={100}
            min={0}
            step={100}
            suffix="额度"
            extraText="用户签到时可能获得的最小额度奖励"
            style={{ width: '100%' }}
          />

          <Form.InputNumber
            field="maxReward"
            label="最大奖励额度"
            initValue={1000}
            min={0}
            step={100}
            suffix="额度"
            extraText="用户签到时可能获得的最大额度奖励"
            style={{ width: '100%' }}
            rules={[
              (value, values) => {
                if (value < values.minReward) {
                  return {
                    validateStatus: 'error',
                    helpMessage: '最大奖励不能小于最小奖励',
                  };
                }
                return {};
              }
            ]}
          />

          <Divider margin="12px" />

          <Form.Switch
            field="verifyCodeEnabled"
            label="启用鉴权码"
            initValue={false}
            extraText="开启后用户签到时需要输入鉴权码"
          />

          <Form.Input
            field="verifyCode"
            label="鉴权码"
            initValue=""
            placeholder="请输入鉴权码"
            extraText="用户签到时需要输入的鉴权码，留空则关闭鉴权码验证"
            style={{ width: '100%' }}
            disabled={!config.verifyCodeEnabled}
            rules={[
              {
                required: config.verifyCodeEnabled,
                message: '请输入鉴权码',
              }
            ]}
          />

          <Divider margin="12px" />

          <Form.Switch
            field="continuousBonusEnabled"
            label="启用连续签到奖励"
            initValue={false}
            extraText="开启后连续签到可获得额外奖励"
          />

          <Form.InputNumber
            field="continuousBonusDays"
            label="连续签到天数要求"
            initValue={7}
            min={2}
            max={30}
            step={1}
            suffix="天"
            extraText="达到此连续天数后开始获得额外奖励"
            style={{ width: '100%' }}
            disabled={!config.continuousBonusEnabled}
          />

          <Form.InputNumber
            field="continuousBonusMultiplier"
            label="连续签到奖励倍数"
            initValue={1.5}
            min={1}
            max={5}
            step={0.1}
            extraText="连续签到奖励的倍数，例如1.5表示基础奖励的1.5倍"
            style={{ width: '100%' }}
            disabled={!config.continuousBonusEnabled}
          />

          <Space style={{ marginTop: 24 }}>
            <Button type="primary" htmlType="submit" loading={loading}>
              保存设置
            </Button>
            <Button onClick={handleReset}>
              重置
            </Button>
          </Space>
        </Form>
      </Card>
    </Spin>
  );
};

export default CheckInSetting;
