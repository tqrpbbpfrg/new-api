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

import { IconClock, IconCode, IconServer, IconSetting } from '@douyinfe/semi-icons';
import {
    Banner,
    Button,
    Card,
    Col,
    Form,
    Row,
    Space,
    Typography
} from '@douyinfe/semi-ui';

const { Text, Title } = Typography;

const AdvancedSettings = ({ 
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

  const submitPerformanceSettings = async () => {
    const options = [];
    if (originInputs['RequestTimeout'] !== inputs.RequestTimeout) {
      options.push({ key: 'RequestTimeout', value: inputs.RequestTimeout });
    }
    if (originInputs['MaxConcurrency'] !== inputs.MaxConcurrency) {
      options.push({ key: 'MaxConcurrency', value: inputs.MaxConcurrency });
    }
    if (originInputs['RateLimitPerMinute'] !== inputs.RateLimitPerMinute) {
      options.push({ key: 'RateLimitPerMinute', value: inputs.RateLimitPerMinute });
    }
    if (options.length > 0) {
      await updateOptions(options);
    }
  };

  const submitDatabaseSettings = async () => {
    const options = [];
    if (originInputs['DatabaseCleanupEnabled'] !== inputs.DatabaseCleanupEnabled) {
      options.push({ key: 'DatabaseCleanupEnabled', value: inputs.DatabaseCleanupEnabled });
    }
    if (originInputs['LogRetentionDays'] !== inputs.LogRetentionDays) {
      options.push({ key: 'LogRetentionDays', value: inputs.LogRetentionDays });
    }
    if (originInputs['DataExportEnabled'] !== inputs.DataExportEnabled) {
      options.push({ key: 'DataExportEnabled', value: inputs.DataExportEnabled });
    }
    if (options.length > 0) {
      await updateOptions(options);
    }
  };

  const submitAPISettings = async () => {
    const options = [];
    if (originInputs['APIKeyPrefix'] !== inputs.APIKeyPrefix) {
      options.push({ key: 'APIKeyPrefix', value: inputs.APIKeyPrefix });
    }
    if (originInputs['APIVersionEnabled'] !== inputs.APIVersionEnabled) {
      options.push({ key: 'APIVersionEnabled', value: inputs.APIVersionEnabled });
    }
    if (originInputs['DebugMode'] !== inputs.DebugMode) {
      options.push({ key: 'DebugMode', value: inputs.DebugMode });
    }
    if (options.length > 0) {
      await updateOptions(options);
    }
  };

  const submitScheduleSettings = async () => {
    const options = [];
    if (originInputs['AutoChannelTestEnabled'] !== inputs.AutoChannelTestEnabled) {
      options.push({ key: 'AutoChannelTestEnabled', value: inputs.AutoChannelTestEnabled });
    }
    if (originInputs['ChannelTestInterval'] !== inputs.ChannelTestInterval) {
      options.push({ key: 'ChannelTestInterval', value: inputs.ChannelTestInterval });
    }
    if (originInputs['QuotaResetEnabled'] !== inputs.QuotaResetEnabled) {
      options.push({ key: 'QuotaResetEnabled', value: inputs.QuotaResetEnabled });
    }
    if (options.length > 0) {
      await updateOptions(options);
    }
  };

  return (
    <div className="space-y-6">
      {/* 性能设置 */}
      <Card>
        <div className="mb-4">
          <Title heading={4}>
            <Space>
              <IconSetting />
              {t('性能和限制设置')}
            </Space>
          </Title>
          <Text type="secondary">
            {t('配置系统性能参数和请求限制')}
          </Text>
        </div>
        
        <Form.Section>
          <Banner
            type='warning'
            description={t('修改这些设置可能会影响系统性能，请谨慎操作')}
            style={{ marginBottom: 16 }}
          />
          
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8} md={8} lg={8} xl={8}>
              <Form.InputNumber
                field='RequestTimeout'
                label={t('请求超时时间 (秒)')}
                placeholder='300'
                min={1}
                max={3600}
                extraText={t('HTTP请求的超时时间')}
              />
            </Col>
            <Col xs={24} sm={8} md={8} lg={8} xl={8}>
              <Form.InputNumber
                field='MaxConcurrency'
                label={t('最大并发数')}
                placeholder='100'
                min={1}
                max={1000}
                extraText={t('同时处理的最大请求数')}
              />
            </Col>
            <Col xs={24} sm={8} md={8} lg={8} xl={8}>
              <Form.InputNumber
                field='RateLimitPerMinute'
                label={t('每分钟请求限制')}
                placeholder='60'
                min={1}
                max={10000}
                extraText={t('单个用户每分钟最大请求数')}
              />
            </Col>
          </Row>
          
          <div className="mt-4">
            <Button type="primary" onClick={submitPerformanceSettings}>
              {t('保存性能设置')}
            </Button>
          </div>
        </Form.Section>
      </Card>

      {/* 数据库设置 */}
      <Card>
        <div className="mb-4">
          <Title heading={4}>
            <Space>
              <IconServer />
              {t('数据库和存储设置')}
            </Space>
          </Title>
          <Text type="secondary">
            {t('配置数据清理和导出功能')}
          </Text>
        </div>

        <Form.Section>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8} md={8} lg={8} xl={8}>
              <Form.Checkbox
                field='DatabaseCleanupEnabled'
                noLabel
                onChange={(e) => handleCheckboxChange('DatabaseCleanupEnabled', e)}
              >
                {t('启用数据库自动清理')}
              </Form.Checkbox>
            </Col>
            <Col xs={24} sm={8} md={8} lg={8} xl={8}>
              <Form.Checkbox
                field='DataExportEnabled'
                noLabel
                onChange={(e) => handleCheckboxChange('DataExportEnabled', e)}
              >
                {t('启用数据导出功能')}
              </Form.Checkbox>
            </Col>
            <Col xs={24} sm={8} md={8} lg={8} xl={8}>
              <Form.InputNumber
                field='LogRetentionDays'
                label={t('日志保留天数')}
                placeholder='30'
                min={1}
                max={365}
                extraText={t('超过此天数的日志将被自动删除')}
              />
            </Col>
          </Row>
          
          <div className="mt-4">
            <Button type="primary" onClick={submitDatabaseSettings}>
              {t('保存数据库设置')}
            </Button>
          </div>
        </Form.Section>
      </Card>

      {/* API 高级设置 */}
      <Card>
        <div className="mb-4">
          <Title heading={4}>
            <Space>
              <IconCode />
              {t('API 高级设置')}
            </Space>
          </Title>
          <Text type="secondary">
            {t('配置 API 相关的高级功能')}
          </Text>
        </div>

        <Form.Section>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8} md={8} lg={8} xl={8}>
              <Form.Input
                field='APIKeyPrefix'
                label={t('API Key 前缀')}
                placeholder='sk-'
                extraText={t('生成的API密钥前缀')}
              />
            </Col>
            <Col xs={24} sm={8} md={8} lg={8} xl={8}>
              <Form.Checkbox
                field='APIVersionEnabled'
                noLabel
                onChange={(e) => handleCheckboxChange('APIVersionEnabled', e)}
              >
                {t('启用API版本控制')}
              </Form.Checkbox>
            </Col>
            <Col xs={24} sm={8} md={8} lg={8} xl={8}>
              <Form.Checkbox
                field='DebugMode'
                noLabel
                onChange={(e) => handleCheckboxChange('DebugMode', e)}
              >
                {t('启用调试模式')}
              </Form.Checkbox>
            </Col>
          </Row>
          
          <div className="mt-4">
            <Button type="primary" onClick={submitAPISettings}>
              {t('保存 API 设置')}
            </Button>
          </div>
        </Form.Section>
      </Card>

      {/* 定时任务设置 */}
      <Card>
        <div className="mb-4">
          <Title heading={4}>
            <Space>
              <IconClock />
              {t('定时任务设置')}
            </Space>
          </Title>
          <Text type="secondary">
            {t('配置自动化任务和调度')}
          </Text>
        </div>

        <Form.Section>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8} md={8} lg={8} xl={8}>
              <Form.Checkbox
                field='AutoChannelTestEnabled'
                noLabel
                onChange={(e) => handleCheckboxChange('AutoChannelTestEnabled', e)}
              >
                {t('启用自动渠道测试')}
              </Form.Checkbox>
            </Col>
            <Col xs={24} sm={8} md={8} lg={8} xl={8}>
              <Form.InputNumber
                field='ChannelTestInterval'
                label={t('渠道测试间隔 (分钟)')}
                placeholder='60'
                min={1}
                max={1440}
                extraText={t('自动测试渠道可用性的间隔时间')}
              />
            </Col>
            <Col xs={24} sm={8} md={8} lg={8} xl={8}>
              <Form.Checkbox
                field='QuotaResetEnabled'
                noLabel
                onChange={(e) => handleCheckboxChange('QuotaResetEnabled', e)}
              >
                {t('启用配额自动重置')}
              </Form.Checkbox>
            </Col>
          </Row>
          
          <div className="mt-4">
            <Button type="primary" onClick={submitScheduleSettings}>
              {t('保存定时任务设置')}
            </Button>
          </div>
        </Form.Section>
      </Card>

      {/* 系统信息 */}
      <Card>
        <div className="mb-4">
          <Title heading={4}>
            <Space>
              <IconCode />
              {t('系统信息')}
            </Space>
          </Title>
          <Text type="secondary">
            {t('查看系统运行状态和版本信息')}
          </Text>
        </div>

        <Form.Section>
          <Banner
            type='info'
            description={
              <div>
                <div>{t('系统版本')}: {inputs.Version || 'Unknown'}</div>
                <div>{t('构建时间')}: {inputs.BuildTime || 'Unknown'}</div>
                <div>{t('Git 提交')}: {inputs.GitCommit || 'Unknown'}</div>
              </div>
            }
          />
          
          <div className="mt-4">
            <Space>
              <Button 
                onClick={async () => {
                  // 触发系统状态检查
                  window.location.reload();
                }}
              >
                {t('刷新系统信息')}
              </Button>
              
              <Button 
                type="tertiary"
                onClick={() => {
                  // 打开系统监控页面
                  window.open('/console/log', '_blank');
                }}
              >
                {t('查看系统日志')}
              </Button>
            </Space>
          </div>
        </Form.Section>
      </Card>
    </div>
  );
};

export default AdvancedSettings;