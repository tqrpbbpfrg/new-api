import { useEffect, useState, useCallback } from 'react';

/**
 * useBlurGlass - 统一读取与监听毛玻璃配置的 Hook
 * 读取以下 localStorage 键：
 *  - UIBlurGlassEnabled : 'true' | 'false'
 *  - UIBlurGlassStrength : number (1-60，默认 14)
 *  - UIBlurGlassArea : 'both' | 'header' | 'sidebar' | 'none'
 */
export function useBlurGlass() {
  const read = useCallback(() => {
    const enabled = localStorage.getItem('UIBlurGlassEnabled') === 'true';
    let strength = parseInt(localStorage.getItem('UIBlurGlassStrength') || '14');
    if (isNaN(strength) || strength <= 0) strength = 14;
    if (strength > 60) strength = 60;
    let area = localStorage.getItem('UIBlurGlassArea') || 'both';
    if (!['both','header','sidebar','none'].includes(area)) area = 'both';
    return { enabled, strength, area };
  }, []);

  const [state, setState] = useState(() => read());

  useEffect(() => {
    const handler = () => setState(read());
    window.addEventListener('ui-option-update', handler);
    return () => window.removeEventListener('ui-option-update', handler);
  }, [read]);

  return state; // { enabled, strength, area }
}
