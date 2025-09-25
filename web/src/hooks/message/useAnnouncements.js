import { useCallback, useEffect, useState } from 'react';
import { listAnnouncements } from '../../services/message';

export function useAnnouncements(){
  const [items,setItems] = useState([]);
  const [loading,setLoading] = useState(false);
  const refresh = useCallback(async()=>{ setLoading(true); const list = await listAnnouncements(); setItems(list); setLoading(false); },[]);
  useEffect(()=>{ refresh(); },[refresh]);
  return { items, loading, refresh };
}
