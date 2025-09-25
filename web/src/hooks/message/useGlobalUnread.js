import { useCallback, useEffect, useState } from 'react';
import { SSE } from 'sse.js';
import { authHeader } from '../../helpers/auth';
import { fetchUnreadCount } from '../../services/message';

// Global unread manager: initialize via fetch, then keep in sync with SSE unread events.
export function useGlobalUnread(){
  const [unread,setUnread] = useState(0);
  const init = useCallback(async()=>{ 
    try {
      const v = await fetchUnreadCount(); 
      setUnread(v); 
    } catch (error) {
      console.warn('Failed to fetch unread count:', error);
      setUnread(0);
    }
  },[]);
  
  useEffect(()=>{ 
    init(); 
  },[init]);
  
  useEffect(()=>{
    let es = null;
    try {
      const headers = authHeader();
      if(!headers.Authorization){ 
        return; 
      }
      es = new SSE('/api/message/stream',{ headers, withCredentials: true });
      es.addEventListener('unread', e=>{ 
        try { 
          const d=JSON.parse(e.data); 
          if(typeof d.unread==='number') setUnread(d.unread); 
        } catch(_){} 
      });
      es.addEventListener('error', () => {
        console.warn('SSE connection error for unread count');
      });
    } catch (error) {
      console.warn('Failed to setup SSE for unread count:', error);
    }
    return ()=>{ 
      if (es) {
        try { 
          es.close(); 
        } catch(_){} 
      }
    };
  },[]);
  
  return unread;
}
