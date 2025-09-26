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
import { Button, Card, Col, Form, Modal, Row, Space, Table, Tag, Toast, Tooltip, Typography } from '@douyinfe/semi-ui';
import { useEffect, useState } from 'react';
import Fireworks from 'react-fireworks';
import { useTranslation } from 'react-i18next';
import { API } from '../../helpers';

// 简易动画占位：后续可替换为更精致的 canvas / lottie
const DrawAnimation = ({ spinning }) => {
  return (
    <div style={{height:160, display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div className={`lottery-wheel ${spinning?'spin':''}`}></div>
      <style>{`
        .lottery-wheel { width:120px; height:120px; border-radius:50%; border:6px solid var(--semi-color-primary); position:relative; }
        .lottery-wheel.spin { animation:spin 1.2s cubic-bezier(.4,.1,.2,1) forwards; }
        @keyframes spin { 0%{transform:rotate(0deg);} 100%{transform:rotate(${Math.random()*720+720}deg);} }
      `}</style>
    </div>
  );
};

export default function Entertainment(){
  const { t } = useTranslation();
  const [status,setStatus] = useState(null);
  const [loading,setLoading] = useState(false);
  const [drawing,setDrawing] = useState(false);
  const [redeemForm] = Form.useForm();
  const [multiLoading,setMultiLoading] = useState(false);
  const [showFire,setShowFire] = useState(false);
  const [multiResult,setMultiResult] = useState([]);
  const [pool,setPool] = useState([]);
  const [now,setNow] = useState(Date.now()/1000|0);
  // 轮询当前时间以刷新倒计时
  useEffect(()=>{ const timer = setInterval(()=> setNow(Date.now()/1000|0), 1000); return ()=>clearInterval(timer); },[]);
  const loadStatus = async()=>{
    setLoading(true);
    try { const res = await API.get('/api/lottery/status'); if(res.data.success) setStatus(res.data.data); } catch(e){ Toast.error(t('加载失败')); } finally{ setLoading(false);} }
  const loadPool = async()=>{ try { const res = await API.get('/api/lottery/pool'); if(res.data.success) setPool(res.data.data); } catch(e){} };
  useEffect(()=>{ loadStatus(); loadPool(); },[]);
  const doDraw = async()=>{
    setDrawing(true);
    try { const res = await API.post('/api/lottery/draw',{cost:1}); if(res.data.success){
      // 立即合并窗口信息
      if(res.data.windows){ setStatus(s=> ({...(s||{}), ...res.data.windows, tickets: (s?.tickets||0)-1, records: [res.data.data, ...(s?.records||[])] })); }
      Toast.success(res.data.message || t('抽奖成功'));
      setShowFire(true); setTimeout(()=>setShowFire(false),1500);
      await loadStatus();
    } else Toast.error(res.data.message||t('抽奖失败')); } finally { setDrawing(false);} };
  const doMulti = async(times=10)=>{
    setMultiLoading(true);
    try { const res = await API.post('/api/lottery/draw/multi',{times,cost:1}); if(res.data.success){ setMultiResult(res.data.data||[]); setShowFire(true); setTimeout(()=>setShowFire(false),2000); Toast.success(t('抽奖成功')); await loadStatus(); } else Toast.error(res.data.message||t('抽奖失败')); } finally { setMultiLoading(false);} };
  const redeem = async(values)=>{ try { const res = await API.post('/api/lottery/redeem',values); if(res.data.success){ Toast.success(t('兑换成功')); redeemForm.resetFields(); await loadStatus(); } else Toast.error(res.data.message||t('兑换失败')); } catch(e){ Toast.error(t('兑换失败')); } };
  return (
    <div className='p-4' style={{ background:'#f6f7f9', minHeight:'100vh' }}>
      <Typography.Title heading={3}>{t('娱乐中心')}</Typography.Title>
      <Row gutter={16}>
        <Col span={12} xs={24}>
          <Card title={t('抽奖')} loading={loading} extra={<Space>{t('当前抽奖券')}: {status?.tickets||0}</Space>}>
            <DrawAnimation spinning={drawing} />
            {status && (status.free_quota_until>now || status.double_cost_until>now) && (
              <div style={{marginBottom:12}}>
                {status.free_quota_until>now && <Tooltip content={t('免费调用期内调用不扣额度')}><Tag color='green'>{t('免费期剩余')}: {formatRemain(status.free_quota_until-now)}</Tag></Tooltip>}
                {status.double_cost_until>now && <Tooltip content={t('双倍消耗期内调用扣费翻倍')}><Tag color='red'>{t('双倍期剩余')}: {formatRemain(status.double_cost_until-now)}</Tag></Tooltip>}
              </div>
            )}
            <Space wrap>
              <Button type='primary' loading={drawing} onClick={doDraw} disabled={(status?.tickets||0)<1}>{t('抽一次')}</Button>
              <Button loading={multiLoading} onClick={()=>doMulti(10)} disabled={(status?.tickets||0)<10}>{t('十连抽')}</Button>
              <Form layout='horizontal' form={redeemForm} onSubmit={redeem} style={{display:'flex',gap:8}}>
                <Form.Input field='code' placeholder={t('输入兑换码')} style={{width:160}}/>
                <Button htmlType='submit'>{t('兑换')}</Button>
              </Form>
            </Space>
          </Card>
        </Col>
        <Col span={12} xs={24}>
          <Card title={t('最近抽奖记录')} loading={loading}>
            <Table dataSource={status?.records||[]} size='small' pagination={false} columns={[
              {title:t('时间'), dataIndex:'created_at', render:v=> v? new Date(v).toLocaleString():''},
              {title:t('奖品'), dataIndex:'prize_name'},
              {title:t('类型'), dataIndex:'prize_type'},
              {title:t('数值'), dataIndex:'value'},
            ]} />
          </Card>
        </Col>
        <Col span={24}>
          <Card title={t('奖池预览')} loading={loading}>
            <Table size='small' dataSource={pool} pagination={false} columns={[
              {title:t('奖品'), dataIndex:'name'},
              {title:t('类型'), dataIndex:'type'},
              {title:t('稀有度'), dataIndex:'rarity', render:v=>{ const map={normal:'purple',rare:'cyan',epic:'orange',legend:'red'}; const labelMap={normal:t('普通'),rare:t('稀有'),epic:t('史诗'),legend:t('传说')}; return <Tag color={map[v]||'blue'} size='small'>{labelMap[v]||v}</Tag>; }},
              {title:t('概率(相对)'), dataIndex:'weight_pct', render:v=> (v*100).toFixed(2)+'%'},
              {title:t('库存'), dataIndex:'stock', render:v=> v===-1? t('无限'):v},
              {title:t('数值'), dataIndex:'value'}
            ]} />
          </Card>
        </Col>
      </Row>
      {showFire && <div style={{position:'fixed',left:0,top:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:99}}><Fireworks /></div>}
      <Modal visible={multiResult.length>0} onCancel={()=>setMultiResult([])} title={t('本次结果')} footer={<Button onClick={()=>setMultiResult([])}>{t('关闭')}</Button>}>
        <Table size='small' dataSource={multiResult} pagination={false} columns={[
          {title:t('奖品'),dataIndex:'prize_name'},
          {title:t('类型'),dataIndex:'prize_type'},
          {title:t('数值'),dataIndex:'value'}
        ]} />
      </Modal>
    </div>
  );
}

// 辅助函数：格式化剩余秒数 -> H:MM:SS
function formatRemain(sec){
  if(sec<=0) return '0s';
  const h = Math.floor(sec/3600); const m = Math.floor((sec%3600)/60); const s = sec%60;
  if(h>0) return `${h}h${m.toString().padStart(2,'0')}m${s.toString().padStart(2,'0')}s`;
  if(m>0) return `${m}m${s.toString().padStart(2,'0')}s`;
  return `${s}s`;
}
