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

import { IconEdit, IconGlobe, IconImage } from '@douyinfe/semi-icons';
import {
    Avatar,
    Button,
    Card,
    Col,
    Form,
    Row,
    Space,
    Typography
} from '@douyinfe/semi-ui';

const { Text, Title } = Typography;

const InterfaceSettings = ({ 
  inputs, 
  setInputs, 
  originInputs, 
  updateOptions,
  t 
}) => {

  const submitInterfaceSettings = async () => {
    const options = [];
    if (originInputs['SystemName'] !== inputs.SystemName) {
      options.push({ key: 'SystemName', value: inputs.SystemName });
    }
    if (originInputs['Logo'] !== inputs.Logo) {
      options.push({ key: 'Logo', value: inputs.Logo });
    }
    if (originInputs['HomePageContent'] !== inputs.HomePageContent) {
      options.push({ key: 'HomePageContent', value: inputs.HomePageContent });
    }
    if (originInputs['About'] !== inputs.About) {
      options.push({ key: 'About', value: inputs.About });
    }
    if (originInputs['Footer'] !== inputs.Footer) {
      options.push({ key: 'Footer', value: inputs.Footer });
    }
    if (originInputs['Theme'] !== inputs.Theme) {
      options.push({ key: 'Theme', value: inputs.Theme });
    }
    if (options.length > 0) {
      await updateOptions(options);
    }
  };

  const submitNoticeSettings = async () => {
    const options = [];
    if (originInputs['Notice'] !== inputs.Notice) {
      options.push({ key: 'Notice', value: inputs.Notice });
    }
    if (originInputs['NoticeColor'] !== inputs.NoticeColor) {
      options.push({ key: 'NoticeColor', value: inputs.NoticeColor });
    }
    if (options.length > 0) {
      await updateOptions(options);
    }
  };

  const submitCustomSettings = async () => {
    const options = [];
    if (originInputs['CustomCSS'] !== inputs.CustomCSS) {
      options.push({ key: 'CustomCSS', value: inputs.CustomCSS });
    }
    if (originInputs['CustomJS'] !== inputs.CustomJS) {
      options.push({ key: 'CustomJS', value: inputs.CustomJS });
    }
    if (options.length > 0) {
      await updateOptions(options);
    }
  };

  return (
    <div className="space-y-6">
      {/* 基础界面设置 */}
      <Card>
        <div className="mb-4">
          <Title heading={4}>
            <Space>
              <IconGlobe />
              {t('基础界面设置')}
            </Space>
          </Title>
          <Text type="secondary">
            {t('配置系统名称、Logo和主题')}
          </Text>
        </div>
        
        <Form.Section>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={12} lg={12} xl={12}>
              <Form.Input
                field='SystemName'
                label={t('系统名称')}
                placeholder='OneAPI'
                extraText={t('显示在页面标题和导航栏中')}
              />
            </Col>
            <Col xs={24} sm={12} md={12} lg={12} xl={12}>
              <Form.Select
                field='Theme'
                label={t('默认主题')}
                placeholder={t('选择默认主题')}
                style={{ width: '100%' }}
              >
                <Form.Select.Option value='light'>{t('浅色主题')}</Form.Select.Option>
                <Form.Select.Option value='dark'>{t('深色主题')}</Form.Select.Option>
                <Form.Select.Option value='auto'>{t('跟随系统')}</Form.Select.Option>
              </Form.Select>
            </Col>
          </Row>
          
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={24} md={24} lg={24} xl={24}>
              <Form.Input
                field='Logo'
                label={t('系统 Logo URL')}
                placeholder='https://example.com/logo.png'
                extraText={t('留空使用默认Logo')}
                addonAfter={
                  inputs.Logo && (
                    <Avatar 
                      src={inputs.Logo} 
                      size="small" 
                      alt={t('Logo 预览')}
                    />
                  )
                }
              />
            </Col>
          </Row>
          
          <div className="mt-4">
            <Button type="primary" onClick={submitInterfaceSettings}>
              {t('保存界面设置')}
            </Button>
          </div>
        </Form.Section>
      </Card>

      {/* 页面内容设置 */}
      <Card>
        <div className="mb-4">
          <Title heading={4}>
            <Space>
              <IconEdit />
              {t('页面内容设置')}
            </Space>
          </Title>
          <Text type="secondary">
            {t('自定义首页、关于页面和页脚内容')}
          </Text>
        </div>

        <Form.Section>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={24} md={24} lg={24} xl={24}>
              <Form.TextArea
                field='HomePageContent'
                label={t('首页内容')}
                placeholder={t('支持 Markdown 和 HTML')}
                rows={6}
                extraText={t('首页显示的主要内容')}
              />
            </Col>
          </Row>
          
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={12} md={12} lg={12} xl={12}>
              <Form.TextArea
                field='About'
                label={t('关于页面内容')}
                placeholder={t('支持 Markdown 和 HTML')}
                rows={6}
                extraText={t('关于页面的内容')}
              />
            </Col>
            <Col xs={24} sm={12} md={12} lg={12} xl={12}>
              <Form.TextArea
                field='Footer'
                label={t('页脚内容')}
                placeholder={t('支持 HTML')}
                rows={6}
                extraText={t('网站底部显示的内容')}
              />
            </Col>
          </Row>
        </Form.Section>
      </Card>

      {/* 公告设置 */}
      <Card>
        <div className="mb-4">
          <Title heading={4}>
            <Space>
              <IconEdit />
              {t('公告设置')}
            </Space>
          </Title>
          <Text type="secondary">
            {t('配置站点公告信息')}
          </Text>
        </div>

        <Form.Section>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={18} md={18} lg={18} xl={18}>
              <Form.TextArea
                field='Notice'
                label={t('公告内容')}
                placeholder={t('支持 Markdown 和 HTML')}
                rows={4}
                extraText={t('留空则不显示公告')}
              />
            </Col>
            <Col xs={24} sm={6} md={6} lg={6} xl={6}>
              <Form.Select
                field='NoticeColor'
                label={t('公告颜色')}
                placeholder={t('选择公告颜色')}
                style={{ width: '100%' }}
              >
                <Form.Select.Option value='primary'>{t('主色')}</Form.Select.Option>
                <Form.Select.Option value='secondary'>{t('次要')}</Form.Select.Option>
                <Form.Select.Option value='success'>{t('成功')}</Form.Select.Option>
                <Form.Select.Option value='warning'>{t('警告')}</Form.Select.Option>
                <Form.Select.Option value='danger'>{t('危险')}</Form.Select.Option>
                <Form.Select.Option value='info'>{t('信息')}</Form.Select.Option>
              </Form.Select>
            </Col>
          </Row>
          
          <div className="mt-4">
            <Button type="primary" onClick={submitNoticeSettings}>
              {t('保存公告设置')}
            </Button>
          </div>
        </Form.Section>
      </Card>

      {/* 自定义样式和脚本 */}
      <Card>
        <div className="mb-4">
          <Title heading={4}>
            <Space>
              <IconImage />
              {t('自定义样式和脚本')}
            </Space>
          </Title>
          <Text type="secondary">
            {t('添加自定义 CSS 和 JavaScript 代码')}
          </Text>
        </div>

        <Form.Section>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={12} lg={12} xl={12}>
              <Form.TextArea
                field='CustomCSS'
                label={t('自定义 CSS')}
                placeholder='/* 在这里添加自定义 CSS */'
                rows={8}
                extraText={t('将会注入到所有页面的 <head> 中')}
              />
            </Col>
            <Col xs={24} sm={12} md={12} lg={12} xl={12}>
              <Form.TextArea
                field='CustomJS'
                label={t('自定义 JavaScript')}
                placeholder='// 在这里添加自定义 JavaScript'
                rows={8}
                extraText={t('将会注入到所有页面的底部')}
              />
            </Col>
          </Row>
          
          <div className="mt-4">
            <Button type="primary" onClick={submitCustomSettings}>
              {t('保存自定义设置')}
            </Button>
          </div>
        </Form.Section>
      </Card>
    </div>
  );
};

export default InterfaceSettings;