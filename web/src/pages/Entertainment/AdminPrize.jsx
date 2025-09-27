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
import { Button, Card, Form, Modal, Popconfirm, Space, Table, Tag, Toast } from '@douyinfe/semi-ui';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API } from '../../helpers';

export default function AdminPrize(){
  const { t } = useTranslation();
  const [list,setList] = useState([]);
  const [loading,setLoading] = useState(false);
  const [visible,setVisible] = useState(false);
  const [editing,setEditing] = useState(null);
  const [formApi, setFormApi] = useState();

  const load = async()=>{ setLoading(true); try { const res = await API.get('/api/lottery/prize'); if(res.data.success) setList(res.data.data); } finally { setLoading(false);} };
  const rarityTag = (r)=>{
    const colorMap={normal:'purple',rare:'cyan',epic:'orange',legend:'red'};
    return <Tag color={colorMap[r]||'blue'} size='small'>{r}</Tag>;
  };
  useEffect(()=>{ load(); },[]);

  const openAdd = ()=>{ setEditing(null); formApi && formApi.reset(); setVisible(true); };
  const openEdit = (r)=>{ setEditing(r); formApi && formApi.setValues(r); setVisible(true); };
  const submit = async(values)=>{ 
    if(values.type==='quota_range'){
      if(values.range_min===undefined || values.range_max===undefined){ Toast.error(t('请输入区间')); return; }
      if(values.range_max < values.range_min){ Toast.error(t('区间无效')); return; }
    }
    if(values.type==='free_hours' || values.type==='double_hours'){
      if(!values.value || values.value<=0){ Toast.error(t('数值必须大于0')); return; }
    }
    if(editing) values.id = editing.id; 
    try { const res = await API.post('/api/lottery/prize', values); if(res.data.success){ Toast.success(t('保存成功')); setVisible(false); load(); } else Toast.error(res.data.message||t('保存失败')); } catch(e){ Toast.error(t('保存失败')); } };
  const del = async(id)=>{ try { const res = await API.delete('/api/lottery/prize/'+id); if(res.data.success){ Toast.success(t('删除成功')); load(); } else Toast.error(res.data.message||t('删除失败')); } catch(e){ Toast.error(t('删除失败')); } };

  return <div className='p-4'>
    <Card title={t('奖品管理')} extra={<Space><Button type='primary' onClick={openAdd}>{t('新增')}</Button></Space>} loading={loading}>
      <Table rowKey='id' dataSource={list} pagination={false} columns={[
        {title:'ID', dataIndex:'id', width:60},
        {title:t('名称'), dataIndex:'name'},
  {title:t('类型'), dataIndex:'type'},
  {title:t('稀有度'), dataIndex:'rarity', render:v=>rarityTag(v)},
        {title:t('数值'), dataIndex:'value'},
        {title:t('权重'), dataIndex:'weight'},
        {title:t('库存'), dataIndex:'stock'},
        {title:t('状态'), dataIndex:'status', render:v=> v===1?t('启用'):t('停用')},
        {title:t('操作'), render:(_,r)=> <Space><Button size='small' onClick={()=>openEdit(r)}>{t('编辑')}</Button><Popconfirm title={t('确定删除?')} onConfirm={()=>del(r.id)}><Button size='small' type='danger'>{t('删除')}</Button></Popconfirm></Space>}
      ]}/>
    </Card>
    <Modal title={editing?t('编辑奖品'):t('新增奖品')} visible={visible} onCancel={()=>setVisible(false)} onOk={()=>formApi && formApi.submit()}>
      <Form getFormApi={setFormApi} onSubmit={submit} labelPosition='inset'>
        <Form.Input field='name' label={t('名称')} rules={[{required:true,message:t('必填')}]}/>
  <Form.Select field='type' label={t('类型')} optionList={[
    {value:'quota', label:t('固定额度')},
    {value:'quota_range', label:t('随机额度')},
    {value:'ticket',label:t('抽奖券')},
    {value:'free_hours',label:t('免费期(小时)')},
    {value:'double_hours',label:t('双倍期(小时)')},
    {value:'custom',label:t('自定义')}
  ]} rules={[{required:true,message:t('必填')}]}/>
  <Form.Select field='rarity' label={t('稀有度')} optionList={[{value:'normal',label:t('普通')},{value:'rare',label:t('稀有')},{value:'epic',label:t('史诗')},{value:'legend',label:t('传说')}]} initValue='normal'/>
        <Form.Slot label={t('数值')}>
          <Form.Consumer>{({values})=>{
            const type = values.type;
            if(type==='quota' || type==='ticket' || type==='free_hours' || type==='double_hours' || type==='custom'){
              return <Form.InputNumber field='value' min={0} placeholder={t('数值')} style={{width:'60%'}} />;
            }
            if(type==='quota_range'){
              return <div style={{display:'flex', gap:8}}>
                <Form.InputNumber field='range_min' placeholder={t('最小')} style={{flex:1}} />
                <Form.InputNumber field='range_max' placeholder={t('最大')} style={{flex:1}} />
              </div>;
            }
            return null;
          }}</Form.Consumer>
        </Form.Slot>
        <Form.InputNumber field='weight' label={t('权重')} min={0}/>
        <Form.InputNumber field='stock' label={t('库存')} min={-1} extraText={t(' -1 表示无限')}/>
        <Form.Switch field='status' label={t('启用')} checkedText={t('是')} uncheckedText={t('否')} initValue={true} />
      </Form>
    </Modal>
  </div>;
}
