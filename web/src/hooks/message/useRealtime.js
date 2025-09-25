import { useEffect, useRef } from 'react';
import { SSE } from 'sse.js';

// Enhanced realtime hook supporting Last-Event-ID replay (server now supports backlog fill)
export function useMessageRealtime({ onUnread, onMessage } = {}){
  const lastIdRef = useRef(0);
  useEffect(()=>{
    let es; let closed = false; let retryTimer;
    const connect = () => {
      const headers = {};
      if(lastIdRef.current>0) headers['Last-Event-ID'] = String(lastIdRef.current);
      es = new SSE('/api/message/stream',{ headers });
      es.addEventListener('unread', e=>{ try { const d=JSON.parse(e.data); onUnread && onUnread(d.unread); } catch(_){} });
      es.addEventListener('message', e=>{ try { const d=JSON.parse(e.data); if(d.id){ lastIdRef.current = Math.max(lastIdRef.current,d.id); onMessage && onMessage(d);} } catch(_){} });
      es.addEventListener('error', ()=>{ if(closed) return; try { es.close(); } catch(_){}; retryTimer = setTimeout(connect, 2000); });
    };
    connect();
    return ()=>{ closed = true; if(retryTimer) clearTimeout(retryTimer); try { es && es.close(); } catch(_){} };
  },[onUnread,onMessage]);
}
