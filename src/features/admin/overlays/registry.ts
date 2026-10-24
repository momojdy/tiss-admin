import { ReactNode, useCallback } from 'react';
import { useOverlay } from '../ui/Overlay';

export type DrawerFactory = (id: string, close: () => void) => ReactNode;
/** Detail drawers register themselves here so any screen or panel can open them by kind and id
 *  (`app`, `inv`, `doc`, `case`, `acc`, `staff`, ...) without importing each other. */
export const drawers: Record<string, DrawerFactory> = {};

export function useOpen() {
  const { openDrawer, closeAll } = useOverlay();
  return useCallback((kind: string, id: string) => {
    const f = drawers[kind];
    if (f) openDrawer((close) => f(id, close));
  }, [openDrawer]);
}
export const useCloseAll = () => useOverlay().closeAll;
