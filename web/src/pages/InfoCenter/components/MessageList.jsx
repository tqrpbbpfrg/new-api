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
  const itemHeight = 60; // 单项高度（保持与 skeleton / 虚拟滚动一致）
  const viewport = 420; // 视区高度
  const overscan = 6;
  const total = items.length;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(total, Math.ceil((scrollTop + viewport) / itemHeight) + overscan);
  const visible = useMemo(()=> items.slice(startIndex, endIndex), [items,startIndex,endIndex]);
  const onScroll = useCallback(()=>{ if(!containerRef.current) return; const el = containerRef.current; setScrollTop(el.scrollTop); if(el.scrollHeight - el.scrollTop - el.clientHeight < 200) loadMore(); },[loadMore]);
  return <div className='inbox-list-wrap space-y-2'>
    <div className='inbox-head flex justify-between items-center'>
      <span className='label text-xs opacity-70'>{t('我的消息')}</span>
      <Button size='extra-small' disabled={!items.some(i=>!i.is_read)} onClick={markAll}>{t('全部已读')}</Button>
    </div>
    <div ref={containerRef} onScroll={onScroll} className='inbox-virtual-container h-[420px] overflow-auto relative'>
      <div style={{height: total * itemHeight}} />
      <div style={{position:'absolute', top: startIndex*itemHeight, left:0, right:0}}>
        { visible.map(item=>{
          const isUnread = !item.is_read;
          return <div key={item.id} onClick={()=>{ onSelect(item); markMessagesRead([item.id]); }} className={`inbox-item ${isUnread? 'unread':''}`}>
            <div className='top-row'>
              <div className='left meta'>
                { isUnread && <span className='dot' /> }
                <span className='subject'>{item.subject||'(No Subject)'}</span>
                { item.is_broadcast && <span className='badge broadcast'>{t('广播')}</span> }
                { item._optimistic && <span className='badge pending'>{t('发送中')}</span> }
              </div>
              <span className='time'>{dayjs(item.created_at).format('MM-DD HH:mm')}</span>
            </div>
            <div className='preview'>{item.content}</div>
          </div>;
        }) }
        { !loading && items.length===0 && <div className='p-4 text-center text-xs opacity-60'>{t('暂无消息')}</div> }
      </div>
      { hasMore && <div className='load-more-layer text-center py-2'>
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
