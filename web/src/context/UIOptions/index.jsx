import { createContext, useContext, useMemo } from 'react';
import { useBlurGlass } from '../../hooks/ui/useBlurGlass';

const UIOptionsContext = createContext(null);

export function UIOptionsProvider({ children }) {
  const blur = useBlurGlass();
  const value = useMemo(()=>({ blur }), [blur]);
  return <UIOptionsContext.Provider value={value}>{children}</UIOptionsContext.Provider>;
}

export function useUIOptions(){
  const ctx = useContext(UIOptionsContext);
  if(!ctx) return { blur: { enabled:false, strength:14, area:'both' } };
  return ctx;
}
