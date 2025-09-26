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

import { IconMail, IconSend } from '@douyinfe/semi-icons';
import { Button, Card, Descriptions, Form, Select, Tag, Toast, Typography } from '@douyinfe/semi-ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isAdmin } from '../../helpers/utils';
import { adminSendMail, parseUIDText } from '../../services/adminMail';

export default function AdminMail(){
  const { t } = useTranslation();
  const admin = isAdmin();
  const [formApi,setFormApi] = useState();
  const [sending,setSending] = useState(false);
  const [result,setResult] = useState(null);
  if(!admin){
    return <div style={{padding:40}}><Typography.Text type='danger'>{t('无权限')}</Typography.Text></div>;
  }
  const handleSubmit = async(values)=>{
    try {
      setSending(true);
      const payload = {
        subject: values.subject?.trim(),
        content: values.content, // markdown raw
        audience: values.audience||'all',
      };
      if(payload.audience === 'custom'){
        const uids = parseUIDText(values.uids||'');
        if(!uids.length){ Toast.error(t('自定义受众需要提供 UID 列表')); setSending(false); return; }
        payload.uids = uids;
      }
      const resp = await adminSendMail(payload);
      if(resp){
        setResult(resp);
        formApi && formApi.reset();
      }
    } catch(e){
      if(String(e).includes('rate')) Toast.error(t('速率限制，请稍后再试')); else Toast.error(e.message||String(e));
    } finally { setSending(false); }
  };
  return <div className='info-center-layout'>
    <div className='info-center-header'>
      <div className='info-center-title'>
        <IconMail className='icon' />
        <Typography.Title heading={3}>{t('管理员邮件')}</Typography.Title>
      </div>
      <Typography.Text type="tertiary">{t('向用户发送通知邮件')}</Typography.Text>
    </div>
    <Card className='info-center-card' bodyStyle={{padding:'20px 22px 28px'}}> 
      <Form getFormApi={setFormApi} labelPosition='top' onSubmit={handleSubmit} className='space-y-4'>
        <Form.Section text={t('基础信息')}>
          <Form.Input field='subject' label={t('主题')} placeholder={t('邮件主题')} rules={[{required:true,message:t('主题不能为空')}]} />
          <Form.TextArea field='content' label={t('HTML 内容')} placeholder={t('支持 HTML（建议避免内联脚本）')} rows={10} rules={[{required:true,message:t('内容不能为空')}]} />
        </Form.Section>
        <Form.Section text={t('收件人范围')}>
          <Form.Select field='audience' label={t('受众')} initValue='all'>
            <Select.Option value='all'>{t('全部用户')}</Select.Option>
            <Select.Option value='active'>{t('活跃用户')}</Select.Option>
            <Select.Option value='new'>{t('新注册用户')}</Select.Option>
            <Select.Option value='custom'>{t('自定义 UID 列表')}</Select.Option>
          </Form.Select>
          <Form.TextArea field='uids' label={t('UID 列表')} placeholder={t('当选择自定义时：以逗号/空格/换行分隔 UID')} rows={4} />
        </Form.Section>
        <div style={{display:'flex',justifyContent:'flex-end',marginTop:12}}>
          <Button icon={<IconSend />} type='primary' htmlType='submit' loading={sending}>{t('发送')}</Button>
        </div>
      </Form>
      { result && <div style={{marginTop:24}}>
        <Typography.Title heading={5}>{t('发送结果')}</Typography.Title>
        <Descriptions data={[
          { key: t('任务 ID'), value: result.task_id },
          { key: t('受众'), value: result.audience },
          { key: t('目标数'), value: result.total_targets },
          { key: t('成功'), value: <Tag type='solid' color='green'>{result.accepted}</Tag> },
          { key: t('跳过'), value: <Tag color='orange'>{result.skipped}</Tag> },
          result.message_id ? { key: 'message_id', value: result.message_id } : null,
          result.message_ids ? { key: 'message_ids', value: (result.message_ids||[]).join(',') } : null,
        ]} />
      </div> }
    </Card>
  </div>;
}
