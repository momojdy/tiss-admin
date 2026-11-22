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
    // The dedicated Goodies screen consumes ui.goodiesModule and its own exact module names.
    // Never route a Goodies module into the generic workspace's prototype records.
    const goodiesState: Record<string, string> = {
      Overview: 'Overview', 'Goodies assets': 'Goodies assets',
      'Products and catalog': 'Product review', Library: 'Product review',
      Categories: 'Content editor', Merchants: 'Merchants',
      'Product review': 'Product review', 'Customer reviews': 'Customer reviews',
      Orders: 'Orders', Promotions: 'Content editor', Promos: 'Content editor',
      Support: 'Support', 'Delivery reports': 'Delivery reports',
      Couriers: 'Couriers', Settlement: 'Settlement', Analytics: 'Analytics',
      Settings: 'Fees', Fees: 'Fees', 'Delivery surcharge': 'Delivery surcharge',
      'Content editor': 'Content editor',
    };
    if (svc === 'Goodies') {
      const target = goodiesState[m] || goodiesState[db.GMAP[m]] || 'Overview';
      ui.goodiesModule = target;
      ui.gz = target; // Keep existing legacy route state in sync.
      ui.wsvc = 'Goodies';
      nav.go('goodies');
      return;
    }
    ui.wsvc = svc; ui.wmod = m; ui.wf = 'All'; ui.wq = '';
    nav.go('workspace');
  }, [nav, closeAll]);
}
