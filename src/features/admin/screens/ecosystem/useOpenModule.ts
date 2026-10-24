import { useCallback } from 'react';
import { ui, db } from '../../state/db';
import { useNav } from '../../shell/Nav';
import { useOverlay } from '../../ui/Overlay';

/** Opens a service module: Potssy and Goodies have their own workspaces, the rest share the generic workspace. */
export function useOpenModule() {
  const nav = useNav();
  const { closeAll } = useOverlay();
  return useCallback((svc: string, m: string) => {
    closeAll();
    if (svc === 'Potssy' && db.POTMAP[m]) { ui.pt = db.POTMAP[m]; nav.go('potssy'); return; }
    if (svc === 'Goodies' && db.GMAP[m]) { ui.gz = db.GMAP[m]; ui.wsvc = 'Goodies'; nav.go('goodies'); return; }
    ui.wsvc = svc; ui.wmod = m; ui.wf = 'All'; ui.wq = '';
    nav.go('workspace');
  }, [nav, closeAll]);
}
