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
import { Button, Card, Form, Modal, Space, Table, Tag, Toast } from '@douyinfe/semi-ui';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API } from '../../helpers';

export default function AdminTicketCodes(){
  const { t } = useTranslation();
  const [list,setList] = useState([]);
  const [loading,setLoading] = useState(false);
  const [visible,setVisible] = useState(false);
  const [form] = Form.useForm();

  const load = async()=>{ setLoading(true); try { const res = await API.get('/api/lottery/ticket/code'); if(res.data.success) setList(res.data.data); } finally { setLoading(false);} };
  useEffect(()=>{ load(); },[]);

  const createCodes = async(values)=>{ try { const res = await API.post('/api/lottery/ticket/code', values); if(res.data.success){ Toast.success(t('保存成功')); setVisible(false); load(); } else Toast.error(res.data.message||t('保存失败')); } catch(e){ Toast.error(t('保存失败')); } };

  return <div className='p-4'>
    <Card title={t('抽奖券兑换码')} extra={<Space><Button type='primary' onClick={()=>{form.resetFields(); setVisible(true);}}>{t('新增')}</Button></Space>} loading={loading}>
      <Table rowKey='id' dataSource={list} size='small' pagination={false} columns={[
        {title:'ID', dataIndex:'id', width:60},
        {title:t('兑换码'), dataIndex:'code', render:v=> <code>{v}</code>},
        {title:t('抽奖券'), dataIndex:'tickets'},
        {title:t('状态'), dataIndex:'status', render:v=> v===1? <Tag color='green'>{t('启用')}</Tag>: v===2? <Tag color='grey'>{t('已使用')}</Tag>: <Tag color='red'>{t('停用')}</Tag>},
        {title:t('使用者'), dataIndex:'used_user_id'},
        {title:t('使用时间'), dataIndex:'used_time', render:v=> v? new Date(v*1000).toLocaleString():''},
      ]} />
    </Card>
    <Modal title={t('生成兑换码')} visible={visible} onCancel={()=>setVisible(false)} onOk={()=>form.submit()}>
      <Form form={form} onSubmit={createCodes} labelPosition='inset'>
        <Form.InputNumber field='count' label={t('生成数量')} initValue={10} min={1} max={100}/>
        <Form.InputNumber field='tickets' label={t('每个包含抽奖券')} initValue={1} min={1}/>
      </Form>
    </Modal>
  </div>;
}
