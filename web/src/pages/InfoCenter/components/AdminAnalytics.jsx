import { Card, Space, Spin, Table, Typography } from '@douyinfe/semi-ui';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isAdmin } from '../../../helpers';
import { fetchBroadcastSummary, fetchMessageStats } from '../../../services/message';

export default function AdminAnalytics(){
  const admin = isAdmin();
  const { t } = useTranslation();
  const [data,setData]=useState([]); const [loading,setLoading]=useState(false);
  const [detail,setDetail]=useState(null); const [detailLoading,setDetailLoading]=useState(false);
  useEffect(()=>{ if(!admin) return; setLoading(true); fetchBroadcastSummary(30).then(r=>{ setData(r.items||[]); setLoading(false); }); },[admin]);
  const loadDetail = async(id)=>{ setDetailLoading(true); const d=await fetchMessageStats(id); setDetail(d); setDetailLoading(false); };
  if(!admin) return null;
  return <div className='space-y-4'>
    <Card title={t('广播概览')} bodyStyle={{padding:0}}>
      <Table loading={loading} dataSource={data} pagination={false} size='small' onRow={r=>({ onClick:()=>loadDetail(r.id) })} columns={[
        { title:t('ID'), dataIndex:'id', width:70 },
        { title:t('主题'), dataIndex:'subject', ellipsis:true },
        { title:t('受众'), dataIndex:'audience', width:90 },
        { title:t('发送时间'), dataIndex:'created_at', width:140 },
        { title:t('已读'), dataIndex:'read_count', width:90, render:(v, r)=> `${v}/${r.total_targets}` },
        { title:t('触达率'), dataIndex:'reach_rate', width:90, render:v=> (v*100).toFixed(1)+'%' },
        { title:t('中位延迟(分)'), dataIndex:'median_latency_min', width:120, render:v=> v? v.toFixed(1):'0' },
      ]} />
    </Card>
    { detailLoading && <Spin /> }
    { detail && !detailLoading && <Card title={t('消息统计')}>
      <Space vertical spacing={4}>
        <Typography.Text>{t('消息ID')}: {detail.message_id}</Typography.Text>
        <Typography.Text>{t('已读数')}: {detail.read_count}/{detail.total_targets}</Typography.Text>
        <Typography.Text>{t('触达率')}: {(detail.reach_rate*100).toFixed(2)}%</Typography.Text>
        <Typography.Text>{t('延迟分布(分钟)')}:</Typography.Text>
        <pre className='text-xs bg-black/5 p-2 rounded'>{JSON.stringify(detail.latency_buckets,null,2)}</pre>
      </Space>
    </Card> }
  </div>;
}
