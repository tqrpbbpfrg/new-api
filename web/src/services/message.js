// Message related API helpers
import { showError, showSuccess } from '../helpers';
import { authHeader } from '../helpers/auth';

export async function fetchUnreadCount() {
  try {
    // 若未登录直接返回 0，避免 401 触发组件异常渲染路径
    const raw = localStorage.getItem('user');
    if (!raw) return 0;
    const headers = authHeader();
    const res = await fetch('/api/message/unread_count', { headers, credentials: 'include' });
    if(res.status === 401) return 0; // 防止未登录 / 过期导致初始化阶段抛错
    const data = await res.json();
    if (!data.success) return 0;
    return data.data.unread || 0;
  } catch (e) { return 0; }
}

export async function listMessages(after=0,size=20){
  const qs = new URLSearchParams();
  if(after>0) qs.set('after', after);
  if(size) qs.set('size', size);
  const res = await fetch(`/api/message/list?${qs.toString()}`,{ credentials: 'include' });
  const data = await res.json();
  if(!data.success){ showError(data.message||'加载失败'); return {items:[],total:0,size, next_after:0}; }
  return data.data;
}

export async function listSent(after=0,size=20){
  const qs = new URLSearchParams();
  if(after>0) qs.set('after', after);
  if(size) qs.set('size', size);
  const res = await fetch(`/api/message/sent?${qs.toString()}`,{ credentials: 'include' });
  const data = await res.json();
  if(!data.success){ showError(data.message||'加载失败'); return {items:[],total:0,size, next_after:0}; }
  return data.data;
}

export async function getThread(id){
  const res = await fetch(`/api/message/thread/${id}`,{ credentials: 'include' });
  const data = await res.json();
  if(!data.success){ showError(data.message||'加载失败'); return null; }
  return data.data;
}

export async function markRead(ids){
  try {
  const res = await fetch('/api/message/mark_read',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids}),credentials:'include'});
    const data = await res.json();
    if(!data.success) showError(data.message||'标记失败');
  } catch(e){ showError('网络错误'); }
}

export async function markAllRead(){
  try {
  const res = await fetch('/api/message/mark_all_read',{method:'POST',credentials:'include'});
    const data = await res.json();
    if(!data.success) showError(data.message||'操作失败'); else showSuccess('已全部标记已读');
  } catch(e){ showError('网络错误'); }
}

export async function searchUsersSimple(q){
  const params = new URLSearchParams(); if(q) params.set('q', q);
  const res = await fetch('/api/user/search_simple?'+params.toString(),{ credentials:'include' });
  const data = await res.json(); if(!data.success) return [];
  return (data.data.items||[]);
}

export async function listAnnouncements(){
  const res = await fetch('/api/announcements',{ credentials:'include' });
  const data = await res.json(); if(!data.success) return [];
  return data.data.items||[];
}

export async function sendMessage(payload){
  const res = await fetch('/api/message/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),credentials:'include'});
  const data = await res.json();
  if(!data.success){ showError(data.message||'发送失败'); return null; }
  showSuccess('发送成功');
  return data.data;
}

export async function fetchMessageStats(id){
  const res = await fetch(`/api/message/stats/${id}`,{ credentials:'include' });
  const data = await res.json(); if(!data.success) { showError(data.message||'加载失败'); return null; }
  return data.data;
}

export async function fetchBroadcastSummary(limit=20){
  const qs = new URLSearchParams(); if(limit) qs.set('limit', limit);
  const res = await fetch('/api/message/broadcast_summary?'+qs.toString(),{ credentials:'include' });
  const data = await res.json(); if(!data.success){ showError(data.message||'加载失败'); return {items:[]}; }
  return data.data;
}
