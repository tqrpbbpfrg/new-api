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
import { IconEyeClosed, IconEyeOpened, IconFile, IconReply, IconSend } from '@douyinfe/semi-icons';
import { AutoComplete, Button, Form, Select, Switch, Tooltip, Typography } from '@douyinfe/semi-ui';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDebounce } from 'use-debounce';
import MarkdownRenderer from '../../../components/common/markdown/MarkdownRenderer';
import { isAdmin } from '../../../helpers';
import { optimisticInsertMessage, useSend } from '../../../hooks/message/useMessages';
import { searchUsersSimple } from '../../../services/message';

export default function SendPanel({ replyTo, onSent }){
  const { t } = useTranslation();
  const { send, sending } = useSend();
  const [formApi,setFormApi]=useState();
  const isReply = !!replyTo;
  const admin = isAdmin();
  const [markdown,setMarkdown] = useState(true);
  const [showPreview,setShowPreview] = useState(true);
  const [contentValue,setContentValue] = useState('');
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
  return <div className='send-panel-glass'>
    <div className='send-panel-head'>
      <Typography.Text className='title'>{ isReply? t('回复消息') : t('发送消息')}</Typography.Text>
      <div className='actions'>
  <Tooltip content={markdown? t('切换到纯文本'): t('切换到 Markdown')}><Button size='small' theme='borderless' icon={<IconFile />} onClick={()=>setMarkdown(m=>!m)} /></Tooltip>
        <Tooltip content={t('清空')}><Button size='small' theme='borderless' onClick={()=> formApi && formApi.reset()} >⌫</Button></Tooltip>
      </div>
    </div>
    { isReply && <div className='reply-context'>
      <IconReply /> <span>{t('当前将回复消息')} #{replyTo}</span>
      <Button size='extra-small' theme='borderless' style={{marginLeft:'auto'}} onClick={()=>{ setFormApi && formApi.setValue('reply_to', null); }}>×</Button>
    </div> }
    <Form getFormApi={setFormApi} labelPosition='inset' onSubmit={handleSubmit} className='space-y-3 send-form'
      onValueChange={(vals)=>{ if('content' in vals) setContentValue(vals.content||''); }}>
      { !isReply && admin && <Form.Select field='audience' label={t('受众')} initValue='direct'>
        <Select.Option value='direct'>{t('定向用户')}</Select.Option>
        <Select.Option value='all'>{t('全部用户')}</Select.Option>
        <Select.Option value='new'>{t('新注册用户')}</Select.Option>
        <Select.Option value='active'>{t('活跃用户')}</Select.Option>
      </Form.Select> }
      { (!isReply) && <Form.Input field='receiver_id' label='UID' placeholder='UID 或选择用户' initValue='' suffix={<span className='text-xs text-gray-400'>{t('可输入或搜索')}</span>} /> }
      { (!isReply && admin) && <AutoComplete value={search} data={userOptions.map(u=>({value:String(u.id), label:`${u.id} - ${u.label}`}))} placeholder={t('搜索用户（用户名/昵称/UID）')} onChange={v=>setSearch(v)} onSelect={(_, option)=>{ formApi && formApi.setValue('receiver_id', option.value); }} /> }
      <Form.Input field='subject' label={t('主题')} placeholder={t('主题')} />
      <Form.TextArea field='content' label={t('内容')} placeholder={markdown? t('支持 Markdown 内容 (可使用标题/列表/代码块等)') : t('纯文本模式')} rows={markdown? 6:4} rules={[{ required:true, message:t('内容不能为空') }]} />
      { markdown && (
        <div className='markdown-preview-block'>
          <div className='preview-head'>
            <span className='preview-label text-xs'>{t('实时预览')}</span>
            <div className='flex items-center gap-1'>
              <Tooltip content={showPreview? t('隐藏预览'): t('显示预览')}>
                <Button size='extra-small' theme='borderless' icon={showPreview? <IconEyeOpened />:<IconEyeClosed />} onClick={()=>setShowPreview(v=>!v)} />
              </Tooltip>
            </div>
          </div>
          { showPreview && <div className='preview-body'>
            { contentValue?.trim()? <MarkdownRenderer content={contentValue} /> : <div className='placeholder text-xs opacity-60'>{t('暂无内容')}</div> }
          </div> }
        </div>
      ) }
      <div className='send-footer-row'>
        <div className='left-tools'>
          <Switch size='small' checked={markdown} onChange={setMarkdown} />
          <span className='mode-text'>{markdown? 'Markdown':'Plain'}</span>
        </div>
        <Button icon={<IconSend />} htmlType='submit' type='primary' loading={sending}>{ isReply? t('回复') : t('发送')}</Button>
      </div>
    </Form>
  </div>;
}
