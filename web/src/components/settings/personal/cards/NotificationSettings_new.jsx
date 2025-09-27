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

import { IconBell, IconKey, IconLink, IconMail } from '@douyinfe/semi-icons';
import {
  Button,
  Card,
  Form,
  Radio,
  Typography
} from '@douyinfe/semi-ui';
import { Bell } from 'lucide-react';
import { useRef } from 'react';
import {
  renderQuotaWithPrompt,
} from '../../../../helpers';

const NotificationSettings = ({
  t,
  notificationSettings,
  handleNotificationSettingChange,
  saveNotificationSettings,
}) => {
  const formApiRef = useRef(null);

  const handleSubmit = () => {
    saveNotificationSettings();
  };

  const handleFormChange = (field, value) => {
    handleNotificationSettingChange(field, value);
  };

  return (
    <div className="space-y-6">
      {/* 通知设置卡片 */}
      <Card className='!rounded-lg shadow-sm hover:shadow-md transition-shadow border border-semi-color-border'>
        <div className='flex items-center justify-between mb-6'>
          <div className='flex items-center'>
            <div className='w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3'>
              <Bell size={20} className='text-blue-600 dark:text-blue-400' />
            </div>
            <div>
              <Typography.Text className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                {t('通知设置')}
              </Typography.Text>
              <div className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
                {t('管理您的通知偏好和警报配置')}
              </div>
            </div>
          </div>
          <Button 
            type='primary' 
            onClick={handleSubmit}
            className="!rounded-lg"
            size="small"
          >
            {t('保存设置')}
          </Button>
        </div>
        
        <Form
          getFormApi={(api) => (formApiRef.current = api)}
          initValues={notificationSettings}
          onSubmit={handleSubmit}
        >
          <div className="space-y-6">
            <Form.RadioGroup
              field='warningType'
              label={t('通知方式')}
              initValue={notificationSettings.warningType}
              onChange={(value) => handleFormChange('warningType', value)}
              rules={[{ required: true, message: t('请选择通知方式') }]}
            >
              <div className="flex flex-wrap gap-4">
                <Radio value='email'>{t('邮件通知')}</Radio>
                <Radio value='webhook'>{t('Webhook通知')}</Radio>
                <Radio value='bark'>{t('Bark通知')}</Radio>
              </div>
            </Form.RadioGroup>

            <Form.AutoComplete
              field='warningThreshold'
              label={
                <span>
                  {t('额度预警阈值')}{' '}
                  {renderQuotaWithPrompt(
                    notificationSettings.warningThreshold,
                  )}
                </span>
              }
              placeholder={t('请输入预警额度')}
              data={[
                { value: 100000, label: '0.2$' },
                { value: 500000, label: '1$' },
                { value: 1000000, label: '5$' },
                { value: 5000000, label: '10$' },
              ]}
              onChange={(val) => handleFormChange('warningThreshold', val)}
              prefix={<IconBell />}
              extraText={t(
                '当剩余额度低于此数值时，系统将通过选择的方式发送通知',
              )}
              style={{ width: '100%', maxWidth: '400px' }}
              rules={[
                { required: true, message: t('请输入预警阈值') },
                {
                  validator: (rule, value) => {
                    const numValue = Number(value);
                    if (isNaN(numValue) || numValue <= 0) {
                      return Promise.reject(t('预警阈值必须为正数'));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            />

            {/* 邮件通知设置 */}
            {notificationSettings.warningType === 'email' && (
              <Form.Input
                field='notificationEmail'
                label={t('通知邮箱')}
                placeholder={t('留空则使用账号绑定的邮箱')}
                onChange={(val) =>
                  handleFormChange('notificationEmail', val)
                }
                prefix={<IconMail />}
                style={{ width: '100%', maxWidth: '400px' }}
              />
            )}

            {/* Webhook通知设置 */}
            {notificationSettings.warningType === 'webhook' && (
              <div className="space-y-4">
                <Form.Input
                  field='webhookUrl'
                  label={t('Webhook URL')}
                  placeholder='https://example.com/webhook'
                  onChange={(val) => handleFormChange('webhookUrl', val)}
                  prefix={<IconLink />}
                  style={{ width: '100%' }}
                />
                <Form.Input
                  field='webhookSecret'
                  label={t('Webhook 密钥')}
                  placeholder={t('可选，用于验证请求来源')}
                  onChange={(val) => handleFormChange('webhookSecret', val)}
                  prefix={<IconKey />}
                  style={{ width: '100%', maxWidth: '400px' }}
                />
              </div>
            )}

            {/* Bark通知设置 */}
            {notificationSettings.warningType === 'bark' && (
              <Form.Input
                field='barkUrl'
                label={t('Bark URL')}
                placeholder='https://api.day.app/your_key/'
                onChange={(val) => handleFormChange('barkUrl', val)}
                prefix={<IconLink />}
                style={{ width: '100%' }}
              />
            )}

            <Form.Switch
              field='acceptUnsetModelRatioModel'
              label={t('自动接受未设定倍率的模型')}
              checked={notificationSettings.acceptUnsetModelRatioModel}
              onChange={(checked) =>
                handleFormChange('acceptUnsetModelRatioModel', checked)
              }
              extraText={t(
                '启用后，当遇到未设定倍率的模型时，系统将自动使用默认倍率而不是拒绝请求',
              )}
            />

            <Form.Switch
              field='displayInCurrency'
              label={t('以货币形式显示额度')}
              checked={notificationSettings.displayInCurrency}
              onChange={(checked) =>
                handleFormChange('displayInCurrency', checked)
              }
              extraText={t(
                '启用后，系统将以美元等货币单位显示额度，而不是积分形式',
              )}
            />
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default NotificationSettings;