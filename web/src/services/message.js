// Message related API helpers
import { showError, showSuccess } from '../helpers';

export async function fetchUnreadCount() {
  try {
    const res = await fetch('/api/message/unread_count');
    const data = await res.json();
    if (!data.success) return 0;
    return data.data.unread || 0;
  } catch (e) { return 0; }
}

export async function listMessages(after=0,size=20){
  const qs = new URLSearchParams();
  if(after>0) qs.set('after', after);
  if(size) qs.set('size', size);
  const res = await fetch(`/api/message/list?${qs.toString()}`);
  const data = await res.json();
  if(!data.success){ showError(data.message||'加载失败'); return {items:[],total:0,size, next_after:0}; }
  return data.data;
}

export async function listSent(after=0,size=20){
  const qs = new URLSearchParams();
  if(after>0) qs.set('after', after);
  if(size) qs.set('size', size);
  const res = await fetch(`/api/message/sent?${qs.toString()}`);
  const data = await res.json();
  if(!data.success){ showError(data.message||'加载失败'); return {items:[],total:0,size, next_after:0}; }
  return data.data;
}

export async function getThread(id){
  const res = await fetch(`/api/message/thread/${id}`);
  const data = await res.json();
  if(!data.success){ showError(data.message||'加载失败'); return null; }
  return data.data;
}

export async function markRead(ids){
  try {
    const res = await fetch('/api/message/mark_read',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids})});
    const data = await res.json();
    if(!data.success) showError(data.message||'标记失败');
  } catch(e){ showError('网络错误'); }
}

export async function markAllRead(){
  try {
    const res = await fetch('/api/message/mark_all_read',{method:'POST'});
    const data = await res.json();
    if(!data.success) showError(data.message||'操作失败'); else showSuccess('已全部标记已读');
  } catch(e){ showError('网络错误'); }
}

export async function searchUsersSimple(q){
  const params = new URLSearchParams(); if(q) params.set('q', q);
  const res = await fetch('/api/user/search_simple?'+params.toString());
  const data = await res.json(); if(!data.success) return [];
  return (data.data.items||[]);
}

export async function listAnnouncements(){
  const res = await fetch('/api/announcements');
  const data = await res.json(); if(!data.success) return [];
  return data.data.items||[];
}

export async function sendMessage(payload){
  const res = await fetch('/api/message/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const data = await res.json();
  if(!data.success){ showError(data.message||'发送失败'); return null; }
  showSuccess('发送成功');
  return data.data;
}

export async function fetchMessageStats(id){
  const res = await fetch(`/api/message/stats/${id}`);
  const data = await res.json(); if(!data.success) { showError(data.message||'加载失败'); return null; }
  return data.data;
}

export async function fetchBroadcastSummary(limit=20){
  const qs = new URLSearchParams(); if(limit) qs.set('limit', limit);
  const res = await fetch('/api/message/broadcast_summary?'+qs.toString());
  const data = await res.json(); if(!data.success){ showError(data.message||'加载失败'); return {items:[]}; }
  return data.data;
}
