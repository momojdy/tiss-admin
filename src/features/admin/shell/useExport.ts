import { useCallback } from 'react';
import { db, mny } from '../state/db';
import { can, secLv, SCREEN_SECTION } from '../state/access';
import { REQ } from '../state/requirements';
import { shareCsv } from '../lib/csv';
import { useToast } from '../ui/Toast';
import { useNav } from './Nav';
import { ecoRows } from '../screens/ecosystem/EcosystemScreen';
import { txRows } from '../screens/finance/FinanceScreen';

/** Screens with a CSV export; anything else has nothing to export. */
export const exportableScreen = (screen: string) => ['operations', 'finance', 'ecosystem'].includes(screen) && secLv(SCREEN_SECTION[screen]) > 0 && can(...REQ.export);

/** Exports the current screen's list as CSV via the share sheet. */
export function useExport() {
  const { screen } = useNav();
  const toast = useToast();
  return useCallback(async () => {
    if (!exportableScreen(screen)) { toast('This screen has no export.'); return; }
    let name = 'wantiss-export.csv';
    let rows: (string | number)[][] = [];
    if (screen === 'ecosystem') { name = 'services.csv'; rows = [['Service', 'Description', 'Directory status'], ...ecoRows().map((s) => [s[0], s[1], s[5]])]; }
    else if (screen === 'finance') { name = 'transactions.csv'; rows = [['Reference', 'Feature', 'User', 'Date', 'Amount', 'Status'], ...txRows().map((x) => [x.id, x.f, x.u, x.d, mny(x.a), x.s])]; }
    else { name = 'applications.csv'; rows = [['Reference', 'Status'], ...db.APPS.map((a: any) => [a.id ?? a[0], a.st ?? a[1]])]; }
    const ok = await shareCsv(name, rows);
    toast(ok ? 'Export ready' : 'Sharing is not available on this device');
  }, [screen, toast]);
}
