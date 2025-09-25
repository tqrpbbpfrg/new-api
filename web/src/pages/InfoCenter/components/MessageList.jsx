import { Button, List } from '@douyinfe/semi-ui';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { markMessagesRead, useInbox, useSent } from '../../../hooks/message/useMessages';
import { markAllRead } from '../../../services/message';

export function InboxList({ onSelect }){
  const { t } = useTranslation();
  const { items, loading, reset, loadMore, hasMore } = useInbox();
  useEffect(()=>{ reset(); },[reset]);
  useEffect(()=>{ const handler=()=>{ reset(); }; window.addEventListener('inbox-refresh', handler); return ()=>window.removeEventListener('inbox-refresh', handler); },[reset]);
  const markAll = async()=>{ await markAllRead(); await reset(); };
  // virtualization
  const containerRef = useRef(null);
  const [scrollTop,setScrollTop]=useState(0);
  const itemHeight = 60;
  const viewport = 420;
  const overscan = 6;
  const total = items.length;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(total, Math.ceil((scrollTop + viewport) / itemHeight) + overscan);
  const visible = useMemo(()=> items.slice(startIndex, endIndex), [items,startIndex,endIndex]);
  const onScroll = useCallback(()=>{ if(!containerRef.current) return; const el = containerRef.current; setScrollTop(el.scrollTop); if(el.scrollHeight - el.scrollTop - el.clientHeight < 200) loadMore(); },[loadMore]);
  return <div className='space-y-2'>
    <div className='flex justify-between items-center'>
      <span className='text-xs opacity-70'>{t('我的消息')}</span>
      <Button size='extra-small' disabled={!items.some(i=>!i.is_read)} onClick={markAll}>{t('全部已读')}</Button>
    </div>
    <div ref={containerRef} onScroll={onScroll} className='h-[420px] overflow-auto border rounded-md relative bg-white/30 backdrop-blur-sm'>
      <div style={{height: total * itemHeight}} />
      <div style={{position:'absolute', top: startIndex*itemHeight, left:0, right:0}}>
        { visible.map(item=>{
          const isUnread = !item.is_read;
          return <div key={item.id} onClick={()=>{ onSelect(item); markMessagesRead([item.id]); }} className='px-3 py-2 border-b cursor-pointer hover:bg-white/60 transition'>
            <div className='flex justify-between gap-2'>
              <div className='flex items-center gap-2'>
                { isUnread && <span className='w-2 h-2 rounded-full bg-red-500 inline-block' /> }
                <span className='font-medium text-sm'>{item.subject||'(No Subject)'}</span>
                { item.is_broadcast && <span className='text-[10px] px-1 py-0.5 bg-blue-500/10 text-blue-600 rounded'>{t('广播')}</span> }
                { item._optimistic && <span className='text-[10px] px-1 py-0.5 bg-gray-400/20 text-gray-600 rounded'>{t('发送中')}</span> }
              </div>
              <span className='text-[11px] opacity-70 whitespace-nowrap'>{dayjs(item.created_at).format('MM-DD HH:mm')}</span>
            </div>
            <div className='text-xs line-clamp-2 opacity-70 mt-0.5'>{item.content}</div>
          </div>;
        }) }
        { !loading && items.length===0 && <div className='p-4 text-center text-xs opacity-60'>{t('暂无消息')}</div> }
      </div>
      { hasMore && <div className='absolute bottom-0 left-0 right-0 text-center py-2'>
        <Button size='small' loading={loading} onClick={loadMore}>{t('加载更多')}</Button>
      </div> }
    </div>
  </div>;
}

export function SentList({ onSelect }){
  const { t } = useTranslation();
  const { items, total, loading, reset, loadMore, hasMore } = useSent();
  useEffect(()=>{ reset(); },[reset]);
  return <div className='space-y-2'>
    <List loading={loading} dataSource={items} renderItem={item=>{
      return <List.Item className='cursor-pointer' onClick={()=>onSelect(item)}
        main={<div className='space-y-1'>
          <div className='font-medium'>{item.subject||'(No Subject)'}</div>
          <div className='text-xs opacity-70'>{t('阅读进度')}: {item.read_count}/{item.total_targets || '-'} | {t('受众')}: {item.audience}</div>
        </div>} extra={<span className='text-xs opacity-70'>{dayjs(item.created_at).format('MM-DD HH:mm')}</span>} />;
    }} emptyContent={t('暂无消息')} />
    { hasMore && <div className='pt-2 text-center'><Button size='small' loading={loading} onClick={loadMore}>{t('加载更多')}</Button></div> }
  </div>;
}
