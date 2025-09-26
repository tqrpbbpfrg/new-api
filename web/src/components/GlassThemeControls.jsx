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

import { IconClose, IconSetting } from '@douyinfe/semi-icons';
import { Button, Slider, Switch, Tooltip } from '@douyinfe/semi-ui';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'glass-theme-controls';

export default function GlassThemeControls(){
  const [open,setOpen] = useState(false);
  const [blur,setBlur] = useState(18);
  const [alpha,setAlpha] = useState(0.65);
  const [noise,setNoise] = useState(false);
  const [reduceMotion,setReduceMotion] = useState(false);

  // load
  useEffect(()=>{
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw){
        const cfg = JSON.parse(raw);
        if(cfg.blur) setBlur(cfg.blur);
        if(cfg.alpha) setAlpha(cfg.alpha);
        if(cfg.noise) setNoise(cfg.noise);
        if(cfg.reduceMotion) setReduceMotion(cfg.reduceMotion);
      }
    } catch(e){/* ignore */}
  },[]);

  // apply
  useEffect(()=>{
    const root = document.documentElement;
    root.style.setProperty('--dyn-glass-blur', blur+'px');
    // 动态改变所有以 var(--glass-bg) 生成的主透明层：这里简单利用 alpha 生成覆盖类
    const alphaClamp = Math.min(0.95, Math.max(0.05, alpha));
    root.style.setProperty('--glass-bg', `rgba(255,255,255,${alphaClamp})`);
    root.style.setProperty('--glass-bg-alt', `rgba(255,255,255,${Math.max(0,alphaClamp-0.10)})`);
    root.style.setProperty('--glass-bg-soft', `rgba(255,255,255,${Math.max(0,alphaClamp-0.20)})`);
    root.style.setProperty('--glass-bg-strong', `rgba(255,255,255,${Math.min(1,alphaClamp+0.07)})`);
    if(document.documentElement.classList.contains('dark')){
      // 暗色模式下适当降低白度，采用深色基色混合策略（可进一步细化）
      root.style.setProperty('--glass-bg', `rgba(24,24,27,${alphaClamp})`);
      root.style.setProperty('--glass-bg-alt', `rgba(36,36,40,${alphaClamp})`);
      root.style.setProperty('--glass-bg-soft', `rgba(36,36,40,${Math.max(0,alphaClamp-0.10)})`);
      root.style.setProperty('--glass-bg-strong', `rgba(28,28,32,${Math.min(1,alphaClamp+0.05)})`);
    }
    if(noise){
      document.querySelector('.info-center-layout')?.classList.add('noise-enabled');
    } else {
      document.querySelector('.info-center-layout')?.classList.remove('noise-enabled');
    }
    if(reduceMotion){
      document.body.classList.add('reduce-motion');
    } else {
      document.body.classList.remove('reduce-motion');
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({blur,alpha,noise,reduceMotion}));
  },[blur,alpha,noise,reduceMotion]);

  return <>
    {!open && <Tooltip content='主题调节'>
      <Button className='glass-theme-toggle-btn' size='small' icon={<IconSetting />} onClick={()=>setOpen(true)} />
    </Tooltip>}
    {open && <div className='glass-theme-controls'>
      <div className='head'>
        <span className='title'>玻璃主题调节</span>
        <Button size='small' theme='borderless' icon={<IconClose />} onClick={()=>setOpen(false)} />
      </div>
      <div className='row'>
        <label>Blur <span>{blur}px</span></label>
        <Slider step={1} min={4} max={40} value={blur} onChange={v=>setBlur(v)} />
      </div>
      <div className='row'>
        <label>Alpha <span>{alpha.toFixed(2)}</span></label>
        <Slider step={0.01} min={0.10} max={0.90} value={alpha} onChange={v=>setAlpha(v)} />
      </div>
      <div className='row'>
        <label>噪点纹理 <Switch size='small' checked={noise} onChange={setNoise} /></label>
      </div>
      <div className='row'>
        <label>减弱动效 <Switch size='small' checked={reduceMotion} onChange={setReduceMotion} /></label>
      </div>
      <div className='row'>
        <Button size='small' onClick={()=>{setBlur(18);setAlpha(0.65);setNoise(false);setReduceMotion(false);}}>重置</Button>
      </div>
    </div>}
  </>;
}
