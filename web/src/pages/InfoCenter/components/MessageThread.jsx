import { Divider, List, Spin, Typography } from '@douyinfe/semi-ui';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useThread } from '../../../hooks/message/useMessages';

export default function MessageThread({ messageId }){
  const { t } = useTranslation();
  const { thread, loading, load } = useThread();
  useEffect(()=>{ if(messageId) load(messageId); },[messageId, load]);
  if(!messageId) return <div className='p-4 text-sm opacity-60'>{t('暂无消息')}</div>;
  if(loading || !thread) return <div className='p-4'><Spin /></div>;
  const { ancestors, message, replies } = thread;
  return <div className='p-3 space-y-6 overflow-y-auto h-full'>
    <div>
      <Typography.Title heading={6}>{message.subject || '(No Subject)'}</Typography.Title>
      <div className='text-xs opacity-70'>{t('创建于')}: {message.created_at}</div>
      <div className='mt-2 whitespace-pre-wrap break-words text-sm'>{message.content}</div>
    </div>
    { ancestors?.length>0 && <div>
      <Divider margin='12px'>{t('父级链')}</Divider>
      <List size='small' dataSource={ancestors} renderItem={a=> <List.Item main={<div>
        <div className='text-xs opacity-70'>{a.created_at}</div>
        <div className='text-xs whitespace-pre-wrap'>{a.content}</div>
      </div>} /> } />
    </div> }
    <div>
      <Divider margin='12px'>{t('回复列表')}</Divider>
      <List size='small' dataSource={replies} renderItem={r=> <List.Item main={<div>
        <div className='text-xs opacity-70'>{r.created_at}</div>
        <div className='text-xs whitespace-pre-wrap'>{r.content}</div>
      </div>} /> } />
    </div>
  </div>;
}
