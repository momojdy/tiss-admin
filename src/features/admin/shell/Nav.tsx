import { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { ui, bump } from '../state/db';

export type ScreenId =
  | 'overview' | 'operations' | 'ecosystem' | 'content' | 'finance' | 'analytics' | 'people'
  | 'business' | 'hub' | 'editor' | 'potssy' | 'workspace' | 'goodies' | 'branding';

export const TAB_SCREENS: ScreenId[] = ['overview', 'operations', 'ecosystem', 'content', 'finance', 'analytics', 'people'];
/** Which top tab a screen belongs to (also the section used for access checks). */
export const TAB_OF: Record<ScreenId, number> = {
  overview: 0, operations: 1, ecosystem: 2, content: 3, finance: 4, analytics: 5, people: 6,
  business: 1, hub: 2, editor: 3, potssy: 2, workspace: 2, goodies: 2, branding: 3,
};

interface NavApi {
  screen: ScreenId;
  /** Navigate to a screen; optional state sets filters and keepScroll preserves scroll position. */
  go: (s: ScreenId, state?: Record<string, unknown>, keepScroll?: boolean) => void;
  back: () => void;
  /** increments on every navigation so the shell can reset scroll */
  navKey: number;
  keepScroll: boolean;
}
const Ctx = createContext<NavApi>({ screen: 'overview', go: () => {}, back: () => {}, navKey: 0, keepScroll: false });
export const useNav = () => useContext(Ctx);

export function NavProvider({ children, initial = 'overview' as ScreenId }: { children: ReactNode; initial?: ScreenId }) {
  const [screen, setScreen] = useState<ScreenId>(initial);
  const [navKey, setNavKey] = useState(0);
  const [keepScroll, setKeep] = useState(false);
  const stack = useRef<ScreenId[]>([]);

  const go = useCallback((s: ScreenId, state?: Record<string, unknown>, keep?: boolean) => {
    if (state) Object.assign(ui, state);
    setScreen((cur) => {
      if (s === 'business' && cur !== 'business') stack.current = [cur];
      return s;
    });
    setKeep(!!keep);
    setNavKey((k) => k + 1);
    bump();
  }, []);
  const back = useCallback(() => {
    const prev = stack.current.pop() ?? 'operations';
    setScreen(prev); setKeep(false); setNavKey((k) => k + 1);
  }, []);
  const value = useMemo(() => ({ screen, go, back, navKey, keepScroll }), [screen, go, back, navKey, keepScroll]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
