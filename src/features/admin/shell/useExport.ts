import { useCallback } from 'react';
import { db, mny } from '../state/db';
import { shareCsv } from '../lib/csv';
import { useToast } from '../ui/Toast';
import { useNav } from './Nav';
import { ecoRows } from '../screens/ecosystem/EcosystemScreen';
import { txRows } from '../screens/finance/FinanceScreen';

/** Export of the list on the current screen, as a CSV through the share sheet. */
export function useExport() {
  const { screen } = useNav();
  const toast = useToast();
  return useCallback(async () => {
    let name = 'wantiss-export.csv';
    let rows: (string | number)[][] = [];
    if (screen === 'ecosystem') { name = 'services.csv'; rows = [['Service', 'Today', 'Pending', 'Status'], ...ecoRows().map((s) => [s[0], s[2], s[3], s[5]])]; }
    else if (screen === 'finance') { name = 'transactions.csv'; rows = [['Reference', 'Feature', 'User', 'Date', 'Amount', 'Status'], ...txRows().map((x) => [x.id, x.f, x.u, x.d, mny(x.a), x.s])]; }
    else { name = 'applications.csv'; rows = [['Reference', 'Status'], ...db.APPS.map((a: any) => [a.id ?? a[0], a.st ?? a[1]])]; }
    const ok = await shareCsv(name, rows);
    toast(ok ? 'Export ready' : 'Sharing is not available on this device');
  }, [screen, toast]);
}
