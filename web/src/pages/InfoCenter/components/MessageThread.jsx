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
import { IconMail } from '@douyinfe/semi-icons';
import { Avatar, Skeleton } from '@douyinfe/semi-ui';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import MarkdownRenderer from '../../../components/common/markdown/MarkdownRenderer';
import { useThread } from '../../../hooks/message/useMessages';

export default function MessageThread({ messageId, onReply }){
  const { t } = useTranslation();
  const { thread, loading, load } = useThread();
  useEffect(()=>{ if(messageId) load(messageId); },[messageId, load]);
  const skeleton = <div className='thread-bubbles-skeleton'>
    {Array.from({length:5}).map((_,i)=>(
      <div key={i} className={`bubble-line skeleton ${i%2?'right':'left'}`}>
        <Skeleton.Avatar size='small' style={{marginRight:8}} />
        <div className='flex-1 space-y-2'>
          <Skeleton.Title style={{width: i%2? '40%':'55%', marginBottom:4}} />
          <Skeleton.Paragraph rows={1} style={{width: i%2? '70%':'85%'}} />
        </div>
      </div>
    ))}
  </div>;

  if(!messageId) return <div className='thread-empty'><IconMail /> <span>{t('暂无消息')}</span></div>;
  if(loading || !thread) return <div className='p-4'>{skeleton}</div>;
  const { ancestors = [], message, replies = [] } = thread;

  const timeline = useMemo(()=>{
    const items = [];
    if(ancestors.length){
      ancestors.forEach(a=> items.push({...a, _role:'ancestor'}));
    }
    if(message){ items.push({...message, _role:'root'}); }
    replies.forEach(r=> items.push({...r, _role:'reply'}));
    return items;
  },[ancestors, message, replies]);

  return <div className='thread-bubbles overflow-y-auto h-full px-4 py-5'>
    {timeline.map((m,idx)=>{
      const isSelf = m.is_self || false; // 后端若未来补充
      const cls = ['bubble-item', isSelf? 'self':'other', m._role==='ancestor'?'ancestor':'', m._role==='root'?'root':'', m.is_broadcast?'broadcast':''].filter(Boolean).join(' ');
      return <div key={m.id || idx} className={cls} onDoubleClick={()=>{ if(onReply && m.id) onReply(m); }} title={t('双击以引用回复')}> 
        <Avatar size='small' className='bubble-avatar'>{(m.sender_name || 'U').slice(0,1)}</Avatar>
        <div className='bubble-body'>
          <div className='bubble-meta'>
            <span className='sender'>{m.sender_name || (isSelf? t('我'): t('用户'))}</span>
            <span className='time'>{m.created_at}</span>
            {m._role==='ancestor' && <span className='tag chain'>{t('父链')}</span>}
            {m._role==='root' && <span className='tag root'>{t('主题')}</span>}
            {m.is_broadcast && <span className='tag broadcast'>{t('广播')}</span>}
          </div>
          {m.subject && <div className='bubble-subject'>{m.subject}</div>}
          <div className='bubble-content'>
            <MarkdownRenderer content={m.content || ''} />
          </div>
        </div>
      </div>;
    })}
  </div>;
}
