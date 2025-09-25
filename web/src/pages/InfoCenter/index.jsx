import { Tabs } from '@douyinfe/semi-ui';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isAdmin } from '../../helpers';
import { useAnnouncements } from '../../hooks/message/useAnnouncements';
import { useMessageRealtime } from '../../hooks/message/useRealtime';
import AdminAnalytics from './components/AdminAnalytics';
import { InboxList, SentList } from './components/MessageList';
import MessageThread from './components/MessageThread';
import SendPanel from './components/SendPanel';

export default function InfoCenter(){
  const { t } = useTranslation();
  const admin = isAdmin();
  const [activeMessage,setActiveMessage]=useState(null);
  const [activeTab,setActiveTab]=useState('inbox');
  const { items:anncs } = useAnnouncements();
  const handleIncoming = useCallback((msg)=>{
    if(activeTab==='inbox' && msg){
      window.dispatchEvent(new CustomEvent('inbox-incremental',{ detail: {
        id: msg.id,
        sender_id: msg.sender_id,
        receiver_id: msg.receiver_id,
        subject: msg.subject,
        content: msg.content,
        reply_to: msg.reply_to,
        created_at: msg.created_at,
        is_read: false,
        is_broadcast: msg.is_broadcast,
      }}));
    }
  },[activeTab]);
  useMessageRealtime({ onMessage: handleIncoming });
  return <div className='p-4 grid gap-4' style={{gridTemplateColumns:'300px 1fr'}}>
    <div className='space-y-4'>
      <div className='border rounded-md p-2 max-h-40 overflow-auto text-xs space-y-1'>
        <div className='font-semibold opacity-70'>{t('系统公告')}</div>
        { anncs.length===0 && <div className='opacity-50'>{t('暂无公告')}</div> }
        { anncs.map(a=> <div key={a.id||a.date} className='leading-snug'>
            <span className='opacity-60'>{(a.date||'').slice(5,10)} </span>
            <span dangerouslySetInnerHTML={{__html: a.content}} />
        </div>) }
      </div>
      <Tabs activeKey={activeTab} onChange={k=>{ setActiveTab(k); setActiveMessage(null); }} type='line'>
        <Tabs.TabPane tab={t('我的消息')} itemKey='inbox'>
          <InboxList onSelect={m=>setActiveMessage(m)} />
        </Tabs.TabPane>
        { admin && <Tabs.TabPane tab={t('已发送')} itemKey='sent'>
          <SentList onSelect={m=>setActiveMessage(m)} />
        </Tabs.TabPane> }
        { admin && <Tabs.TabPane tab={t('统计')} itemKey='analytics'>
          <AdminAnalytics />
        </Tabs.TabPane> }
      </Tabs>
      <SendPanel replyTo={activeMessage && !activeMessage.is_broadcast? activeMessage.id: null} onSent={()=>{}} />
    </div>
    <div className='border rounded-md h-[calc(100vh-120px)] min-h-[480px] overflow-hidden'>
      <MessageThread messageId={activeMessage?.id} />
    </div>
  </div>;
}
