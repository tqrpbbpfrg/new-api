import { useCallback, useEffect, useState } from 'react';
import { SSE } from 'sse.js';
import { authHeader } from '../../helpers/auth';
import { fetchUnreadCount } from '../../services/message';

// Global unread manager: initialize via fetch, then keep in sync with SSE unread events.
export function useGlobalUnread(){
  const [unread,setUnread] = useState(0);
  const init = useCallback(async()=>{ const v = await fetchUnreadCount(); setUnread(v); },[]);
  useEffect(()=>{ init(); },[init]);
  useEffect(()=>{
    const headers = authHeader();
    if(!headers.Authorization){ return; }
    const es = new SSE('/api/message/stream',{ headers });
    es.addEventListener('unread', e=>{ try { const d=JSON.parse(e.data); if(typeof d.unread==='number') setUnread(d.unread); } catch(_){} });
    return ()=>{ try { es.close(); } catch(_){} };
  },[]);
  return unread;
}
