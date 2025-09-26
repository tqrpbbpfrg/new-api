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
import { Button, Card, Descriptions, Divider, Space, Tag, Typography } from '@douyinfe/semi-ui';
import { useCallback, useState } from 'react';
import { authHeader, USER_ID_HEADER_KEY } from '../../helpers/auth';
import { secureFetch } from '../../helpers/secureFetch';
import { getUserIdFromLocalStorage } from '../../helpers/utils';

const { Text } = Typography;

export default function DebugHeaders(){
  const [result,setResult] = useState(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState(null);

  const doProbe = useCallback(async ()=>{
    setLoading(true); setError(null); setResult(null);
    try {
      const h = authHeader();
      const res = await secureFetch('/api/message/unread_count', { timeout: 8000, retries: 1 });
      let json = null;
      try { json = await res.json(); } catch {}
      setResult({ status: res.status, ok: res.ok, json });
    } catch(e){ setError(e.message||String(e)); }
    finally { setLoading(false); }
  },[]);

  const h = authHeader();
  const display = Object.entries(h||{}).map(([k,v])=>({k,v}));

  return <div style={{padding:24}}>
    <Card title='Debug Headers & Auth 状态'>
      <Descriptions data={[
        { key: '登录用户ID(LocalStorage)', value: String(getUserIdFromLocalStorage()) },
        { key: 'Has Authorization', value: h?.Authorization ? 'Yes' : 'No' },
        { key: USER_ID_HEADER_KEY, value: h?.[USER_ID_HEADER_KEY] || '(absent)' },
        { key: 'Header Keys', value: display.length? display.map(x=>x.k).join(', '): '(none)' },
      ]} />
      <Divider>Raw Header Map</Divider>
      <pre style={{background:'#111',color:'#0f0',padding:12,borderRadius:4,fontSize:12,overflow:'auto'}}>{JSON.stringify(h,null,2)}</pre>
      <Space style={{marginTop:16}}>
        <Button loading={loading} onClick={doProbe} type='primary'>探测 /api/message/unread_count</Button>
      </Space>
      <Divider>Probe Result</Divider>
      {!result && !error && <Text type='tertiary'>尚无探测结果</Text>}
      {error && <Tag color='red'>Error: {error}</Tag>}
      {result && <pre style={{background:'#222',color:'#fafafa',padding:12,borderRadius:4,fontSize:12,overflow:'auto'}}>{JSON.stringify(result,null,2)}</pre>}
    </Card>
  </div>;
}
