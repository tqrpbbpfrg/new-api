import { Button, Card, Space } from '@douyinfe/semi-ui';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function Workspace(){
  const { t } = useTranslation();
  const [status,setStatus]=useState(null); // checkin status
  const [loading,setLoading]=useState(false);
  const [signing,setSigning]=useState(false);

  const loadStatus = async()=>{
    setLoading(true);
    try{
      const res = await fetch('/api/checkin/status');
      const data = await res.json();
      if(data.success) setStatus(data.data);
    }finally{ setLoading(false); }
  };
  const doCheckin = async()=>{
    setSigning(true);
    try{
      const res = await fetch('/api/checkin/',{method:'POST'});
      const data = await res.json();
      if(data.success){ await loadStatus(); }
    }finally{ setSigning(false); }
  };
  useEffect(()=>{ loadStatus(); },[]);
  const lastLoginTs = window?.CURRENT_USER?.last_login_at || null;
  return (
    <div className='p-4 space-y-16'>
      <Space wrap align='start'>
        <Card loading={loading} title={t('工作台')} style={{minWidth:320}}>
          <div className='space-y-2 text-sm'>
            <div>{t('上次登录')}: { lastLoginTs? dayjs.unix(lastLoginTs).format('YYYY-MM-DD HH:mm'): '—' }</div>
            { status && (
              <>
                <div>{t('今日签到奖励')}: { status.today_reward ?? (status.checked_today? t('已签到') : '—') }</div>
                <div>{t('连续天数')}: { status.streak }</div>
                <div>{t('总计奖励')}: { status.month_total_reward }</div>
              </>
            ) }
            <div className='pt-2'>
              <Space>
                <Button size='small' type='primary' loading={signing} disabled={status?.checked_today} onClick={doCheckin}>{ status?.checked_today? t('已签到'): t('签到领取') }</Button>
                <Button size='small' onClick={()=>{ window.location.href='/console/checkin'; }}>{t('查看签到日历')}</Button>
                <Button size='small' onClick={loadStatus}>{t('刷新')}</Button>
              </Space>
            </div>
          </div>
        </Card>
      </Space>
    </div>
  );
}
