import { AutoComplete, Button, Form, Select } from '@douyinfe/semi-ui';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDebounce } from 'use-debounce';
import { isAdmin } from '../../../helpers';
import { optimisticInsertMessage, useSend } from '../../../hooks/message/useMessages';
import { searchUsersSimple } from '../../../services/message';

export default function SendPanel({ replyTo, onSent }){
  const { t } = useTranslation();
  const { send, sending } = useSend();
  const [formApi,setFormApi]=useState();
  const isReply = !!replyTo;
  const admin = isAdmin();
  const handleSubmit = async(values)=>{
    const payload = { ...values };
    if(isReply){ payload.reply_to = replyTo; payload.audience='direct'; }
    // optimistic only for direct (非广播)
    const isDirect = (payload.audience||'direct')==='direct';
    if(isDirect){
      optimisticInsertMessage({
        id: Date.now()*-1,
        sender_id: 0,
        receiver_id: Number(payload.receiver_id)||0,
        subject: payload.subject,
        content: payload.content,
        reply_to: payload.reply_to||null,
        created_at: new Date().toISOString().slice(0,19).replace('T',' '),
        is_read: true,
        is_broadcast: false,
        _optimistic: true,
      });
    }
    const result = await send(payload);
    if(result && onSent) onSent(result);
    formApi && formApi.reset();
  };
  const [search,setSearch] = useState('');
  const [debounced] = useDebounce(search, 400);
  const [userOptions,setUserOptions] = useState([]);
  useEffect(()=>{ let cancelled=false; if(debounced){ searchUsersSimple(debounced).then(items=>{ if(!cancelled) setUserOptions(items); }); } else { setUserOptions([]);} return ()=>{cancelled=true}; },[debounced]);
  return <div className='p-3 border rounded-md'>
    <Form getFormApi={setFormApi} labelPosition='inset' onSubmit={handleSubmit} className='space-y-2'>
      { !isReply && admin && <Form.Select field='audience' label={t('受众')} initValue='direct'>
        <Select.Option value='direct'>{t('定向用户')}</Select.Option>
        <Select.Option value='all'>{t('全部用户')}</Select.Option>
        <Select.Option value='new'>{t('新注册用户')}</Select.Option>
        <Select.Option value='active'>{t('活跃用户')}</Select.Option>
      </Form.Select> }
      { (!isReply) && <Form.Input field='receiver_id' label='UID' placeholder='UID 或选择用户' initValue='' suffix={<span className='text-xs text-gray-400'>{t('可输入或搜索')}</span>} /> }
      { (!isReply && admin) && <AutoComplete value={search} data={userOptions.map(u=>({value:String(u.id), label:`${u.id} - ${u.label}`}))} placeholder={t('搜索用户（用户名/昵称/UID）')} onChange={v=>setSearch(v)} onSelect={(_, option)=>{ formApi && formApi.setValue('receiver_id', option.value); }} /> }
      <Form.Input field='subject' label={t('主题')} placeholder={t('主题')} />
      <Form.TextArea field='content' label={t('内容')} placeholder={t('内容')} rows={4} rules={[{ required:true, message:t('内容不能为空') }]} />
      <Button htmlType='submit' type='primary' loading={sending}>{ isReply? t('回复') : t('发送')}</Button>
    </Form>
  </div>;
}
