import { useCallback, useEffect, useState } from 'react';
import { fetchUnreadCount, getThread, listMessages, listSent, markRead, sendMessage } from '../../services/message';

export function useUnreadBadge(pollInterval=60000){
  const [unread,setUnread] = useState(0);
  const refresh = useCallback(async ()=>{ setUnread(await fetchUnreadCount()); },[]);
  useEffect(()=>{ refresh(); const t=setInterval(refresh,pollInterval); return ()=>clearInterval(t);},[refresh,pollInterval]);
  return { unread, refresh };
}

export function useInbox(initialPageSize=20){
  const [items,setItems]=useState([]); const [size]=useState(initialPageSize); const [total,setTotal]=useState(0); const [loading,setLoading]=useState(false); const [nextAfter,setNextAfter]=useState(0);
  const reset = useCallback(async()=>{ setLoading(true); const data = await listMessages(0,size); setItems(data.items||[]); setTotal(data.total||0); setNextAfter(data.next_after||0); setLoading(false); },[size]);
  const loadMore = useCallback(async()=>{ if(!nextAfter||loading) return; setLoading(true); const data = await listMessages(nextAfter,size); setItems(prev=>[...prev, ...(data.items||[])]); setTotal(data.total||total); setNextAfter(data.next_after||0); setLoading(false); },[nextAfter,size,loading,total]);
  // incremental append for realtime events (window-level dispatch)
  useEffect(()=>{
    const handler = (e)=>{
      const msg = e.detail; if(!msg || !msg.id) return;
      setItems(prev=>{
        // if real message arrives, remove optimistic with negative temp reply_to match if same content+subject (heuristic)
        let next = prev;
        if(msg.id>0){
          next = prev.filter(p=>!(p._optimistic && p.subject===msg.subject && p.content===msg.content));
          if(next.some(p=>p.id===msg.id)) return next; // already have real one
        } else if(prev.some(p=>p.id===msg.id)) { return prev; }
        return [msg, ...next];
      });
    };
    window.addEventListener('inbox-incremental', handler);
    return ()=>window.removeEventListener('inbox-incremental', handler);
  },[]);
  return {items,size,total,loading,reset,loadMore,nextAfter,hasMore: !!nextAfter,setItems};
}

export function useSent(initialPageSize=20){
  const [items,setItems]=useState([]); const [size]=useState(initialPageSize); const [total,setTotal]=useState(0); const [loading,setLoading]=useState(false); const [nextAfter,setNextAfter]=useState(0);
  const reset = useCallback(async()=>{ setLoading(true); const data = await listSent(0,size); setItems(data.items||[]); setTotal(data.total||0); setNextAfter(data.next_after||0); setLoading(false); },[size]);
  const loadMore = useCallback(async()=>{ if(!nextAfter||loading) return; setLoading(true); const data = await listSent(nextAfter,size); setItems(prev=>[...prev, ...(data.items||[])]); setTotal(data.total||total); setNextAfter(data.next_after||0); setLoading(false); },[nextAfter,size,loading,total]);
  return {items,size,total,loading,reset,loadMore,nextAfter,hasMore: !!nextAfter};
}

export function useThread(){
  const [data,setData]=useState(null); const [loading,setLoading]=useState(false);
  const load = useCallback(async(id)=>{ if(!id) return; setLoading(true); const t = await getThread(id); setData(t); setLoading(false); },[]);
  return {thread:data, loading, load};
}

export function useSend(){
  const [sending,setSending]=useState(false);
  const send = useCallback(async(payload)=>{ if(sending) return null; setSending(true); try { const r=await sendMessage(payload); return r; } finally { setSending(false); } },[sending]);
  return { send, sending };
}

export async function markMessagesRead(ids){ if(!ids||!ids.length) return; await markRead(ids); }

// Optimistic helper: dispatch a temporary pending message to inbox (only client-side) and reconcile on ack
export function optimisticInsertMessage(temp){
  window.dispatchEvent(new CustomEvent('inbox-incremental',{ detail: temp }));
}
