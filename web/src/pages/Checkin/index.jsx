import { Button, Card, Spin, Tag, Tooltip, Typography, Banner, Divider } from '@douyinfe/semi-ui';
import { IconTickCircle, IconGift } from '@douyinfe/semi-icons';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './style.css';

const fetchJSON = async (url, options={}) => {
  const resp = await fetch(url, {credentials:'include', ...options});
  const data = await resp.json();
  if(data && typeof data.code !== 'undefined') return data; // unified format
  return {code:0, data};
};

const genMonthDays = (month) => { // month YYYY-MM
  const first = dayjs(month+'-01');
  const daysInMonth = first.daysInMonth();
  const res = [];
  for(let d=1; d<=daysInMonth; d++){
    res.push(first.date(d));
  }
  return res;
};

const CheckinPage = () => {
  const { t } = useTranslation();
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const [records, setRecords] = useState({});
  const [status, setStatus] = useState(null); // status.data
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState(null);
  const [disabled, setDisabled] = useState(false);
  const [bestStreak, setBestStreak] = useState(0);

  // 简单的选项缓存（避免单独接口，利用已经存储的 option map，若不存在则回退默认）
  const getOptionBool = (k, def=false) => {
    try { const val = localStorage.getItem('options_cache'); if(!val) return def; const obj = JSON.parse(val); return obj[k] === true || obj[k] === 'true'; } catch { return def; }
  };
  const getOptionNumber = (k, def=0) => { try { const val = localStorage.getItem('options_cache'); if(!val) return def; const obj = JSON.parse(val); const v = obj[k]; const n = Number(v); return isNaN(n)?def:n; } catch { return def; } };
  const displayCurrency = getOptionBool('DisplayInCurrencyEnabled', false);
  const quotaPerUnit = getOptionNumber('QuotaPerUnit', 500000); // 与后端默认一致

  const formatAmount = (raw) => {
    if(raw == null) return '';
    if(displayCurrency){
      const usd = raw / quotaPerUnit; // raw 为内部额度
      return '$' + usd.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    return raw.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const load = async () => {
    setLoading(true);
    try {
      setError(null);
  const cal = await fetchJSON(`/api/checkin/calendar?month=${month}`);
      if(cal.code!==0){
        if(cal.message && cal.message.includes('未开启')){ setDisabled(true); localStorage.setItem('CheckinEnabled','false'); }
        setError(cal.message); return; }
      const map = {};
      (cal.data.records||[]).forEach(r=>{map[r.date]=r;});
      setRecords(map);
      const st = await fetchJSON('/api/checkin/status');
      if(st.code===0){
        setStatus(st.data);
        localStorage.setItem('CheckinEnabled','true');
        setDisabled(false);
        setBestStreak(st.data?.best_streak || 0);
      } else {
        setError(st.message);
        if(st.message && st.message.includes('未开启')){ setDisabled(true); localStorage.setItem('CheckinEnabled','false'); }
      }
    } finally { setLoading(false); }
  };

  useEffect(()=>{load();},[month]);

  const handleCheckin = async () => {
    setPosting(true);
    try {
      const res = await fetchJSON('/api/checkin/', {method:'POST'});
      if(res.code!==0){ setError(res.message); }
      await load();
    } finally { setPosting(false); }
  };

  const days = genMonthDays(month);
  const today = dayjs().format('YYYY-MM-DD');

  const prevMonth = () => setMonth(dayjs(month+'-01').subtract(1,'month').format('YYYY-MM'));
  const nextMonth = () => setMonth(dayjs(month+'-01').add(1,'month').format('YYYY-MM'));

  const weekHeaders = useMemo(()=>['日','一','二','三','四','五','六'],[]);
  const streakBonusDesc = useMemo(()=>{
    const list = status?.config?.streak_bonus_list;
    if(Array.isArray(list) && list.length){
      return list.map(item=>`${item.threshold}${t('天')}${t('≥')}+${item.percent}%`).join(' / ');
    }
    if(!status?.config?.streak_bonus) return '';
    const entries = Object.entries(status.config.streak_bonus).sort((a,b)=>Number(a[0])-Number(b[0]));
    return entries.map(([d,p])=>`${d}${t('天')}${t('≥')}+${p}%`).join(' / ');
  },[status, t]);

  const monthRewardSum = status?.month_reward_sum || 0;
  const monthCheckedDays = status?.month_checked_days || 0;

  if(disabled){
    return <div className='mt-[60px] px-4'>
      <Card title={t('每日签到')}>
        <Banner type='warning' description={error || t('签到功能未开启')} closeIcon={null} />
      </Card>
    </div>;
  }

  return (
    <div className='mt-[60px] px-4 checkin-wrapper'>
      <Card title={t('每日签到')}>
        {loading ? <Spin /> : (
          <div className='flex flex-col gap-4'>
            {error && <Typography.Text type='danger'>{error}</Typography.Text>}
            {/* 头部统计区 */}
            <div className='checkin-stats-bar'>
              <div className='stat-item'>
                <div className='label'>{t('本月已签')}</div>
                <div className='value'>{monthCheckedDays}</div>
              </div>
              <Divider layout='vertical' />
              <div className='stat-item'>
                <div className='label'>{t('今日')}</div>
                <div className={`value ${records[today]?'ok':'warn'}`}>{records[today]? t('已签到'): t('未签到')}</div>
              </div>
              <Divider layout='vertical' />
              <div className='stat-item'>
                <div className='label'>{t('连续签到')}</div>
                <div className='value'>{status?.streak||0}</div>
              </div>
              <Divider layout='vertical' />
              <div className='stat-item'>
                <div className='label'>{t('最佳连续')}</div>
                <div className='value'>{bestStreak}</div>
              </div>
              <Divider layout='vertical' />
              <div className='stat-item'>
                <div className='label'>{t('本月奖励累计')}</div>
                <div className='value'>{formatAmount(monthRewardSum)}</div>
              </div>
              <div className='ml-auto flex gap-2'>
                <Button size='small' onClick={prevMonth}>{t('上个月')}</Button>
                <Button size='small' onClick={nextMonth}>{t('下个月')}</Button>
                <Button type='primary' size='small' disabled={!!records[today]} loading={posting} onClick={handleCheckin}>{records[today]? t('已签到'): t('签到领取')}</Button>
              </div>
            </div>
            {/* 奖励说明 */}
            <div className='reward-info-box'>
              <div className='icon'><IconGift /></div>
              <div className='content'>
                <div className='title'>{t('签到奖励')}</div>
                <div className='desc'>
                  {t('每日签到可获得')} {formatAmount(status?.reward_min)} - {formatAmount(status?.reward_max)} {t('随机额度奖励')} {streakBonusDesc && `，${t('连续签到加成规则')}: ${streakBonusDesc}`}
                </div>
              </div>
            </div>
            {/* 日历 */}
            <div className='checkin-calendar-grid'>
              {weekHeaders.map(w=><div key={w} className='checkin-week-header'>{w}</div>)}
              {(() => { const first = days[0]; const blanks=[]; for(let i=0;i<first.day();i++) blanks.push(<div key={'b'+i}></div>); return blanks; })()}
              {days.map(d=>{
                const ds = d.format('YYYY-MM-DD');
                const r = records[ds];
                const isToday = ds===today;
                return <div key={ds} className={`checkin-cell ${r?'checked':''} ${isToday?'today':''}`}>
                  <div className='date flex items-center gap-1'>
                    <span>{d.date()}</span>
                    {isToday && <span className='today-dot'/>}
                  </div>
                  <div className='flex-1 w-full flex items-end'>
                    {r ? (
                      <div className='reward flex items-center gap-1'>
                        <IconTickCircle style={{color:'#059669'}} />
                        <span>{displayCurrency? formatAmount(r.reward): '+'+formatAmount(r.reward)}</span>
                      </div>
                    ) : (
                      <div className='not-check text-gray-400'>{t('未签到')}</div>
                    )}
                  </div>
                </div>;
              })}
            </div>
            <div className='mt-2 text-xs text-gray-500'>{t('说明')}: {t('每日完成签到可随机获得额度奖励，连续签到可获得百分比加成。')}</div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default CheckinPage;
