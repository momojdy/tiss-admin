import { useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { db, useDb } from '../state/db';
import { secLv } from '../state/access';
import { useNav } from './Nav';
import { useOpen } from '../overlays/registry';
import { useOverlay } from '../ui/Overlay';
import { DrawerBody } from '../ui/Overlay';
import { ListRows } from '../ui/Lists';
import { Txt } from '../ui/Txt';
import { useTheme } from '../theme/ThemeContext';

type Result = { key: string; group: string; title: string; detail: string; open: () => void };

export function SearchSheet({ onClose }: { onClose: () => void }) {
  useDb();
  const [query, setQuery] = useState('');
  const { c } = useTheme();
  const { go } = useNav();
  const { closeAll } = useOverlay();
  const open = useOpen();
  const results = useMemo<Result[]>(() => {
    const all: Result[] = [];
    if (secLv(1) > 0) db.APPS.forEach((row) => all.push({ key: 'app-' + row.id, group: 'Applications', title: row.n, detail: row.id + ' · ' + row.s, open: () => { closeAll(); go('operations', { ov: 'List' }); open('app', row.id); } }));
    if (secLv(4) > 0) db.INV.forEach((row) => all.push({ key: 'inv-' + row.id, group: 'Transactions', title: row.id + ' · ' + row.f, detail: row.u + ' · ' + row.s, open: () => { closeAll(); go('finance', { fv: 'Transactions' }); open('inv', row.id); } }));
    if (secLv(2) > 0) db.SVC.forEach((row) => all.push({ key: 'svc-' + row[0], group: 'Services', title: row[0], detail: row[1], open: () => { closeAll(); go('hub', { hub: row[0] }); } }));
    if (secLv(6) > 0) {
      db.STAFF.forEach((row) => all.push({ key: 'staff-' + row.n, group: 'Staff', title: row.n, detail: row.role + ' · ' + row.st, open: () => { closeAll(); go('people', { ps: 'Staff' }); open('staff', row.n); } }));
      db.CUST.forEach((row) => all.push({ key: 'cust-' + row[0], group: 'Customers', title: row[0], detail: row[1] + ' · ' + row[2], open: () => { closeAll(); go('people', { ps: 'Customers' }); open('cust', row[0]); } }));
      db.ACC.forEach((row) => all.push({ key: 'acc-' + row.id, group: 'Accounts', title: row.n, detail: row.type + ' · ' + row.id, open: () => { closeAll(); go('people', { ps: 'Accounts' }); open('acc', row.id); } }));
    }
    if (secLv(3) > 0) db.BN.forEach((row) => all.push({ key: 'ban-' + row.id, group: 'Content', title: row.t, detail: row.svc + ' · ' + row.st, open: () => { closeAll(); go('content', { cs: 'Banners' }); open('ban', row.id); } }));
    return all;
  }, [closeAll, go, open]);
  const q = query.trim().toLowerCase();
  const filtered = q ? results.filter((row) => (row.title + ' ' + row.detail + ' ' + row.group).toLowerCase().includes(q)).slice(0, 30) : [];
  const grouped = filtered.reduce<Record<string, Result[]>>((acc, row) => { (acc[row.group] ||= []).push(row); return acc; }, {});
  return (
    <DrawerBody title="Search" onClose={onClose}>
      <TextInput value={query} onChangeText={setQuery} placeholder="Applications, payments, services, staff, content…" placeholderTextColor={c.mut} autoCapitalize="none" autoCorrect={false} returnKeyType="search" style={{ backgroundColor: c.card, borderColor: c.bd, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, color: c.ink, fontSize: 14, marginBottom: 12 }} />
      {!q ? <Txt size={11} mut>Search names, IDs and references. Results only include records you have permission to access.</Txt> : null}
      {q && !filtered.length ? <Txt size={11} mut>No results for “{query}”.</Txt> : null}
      {Object.entries(grouped).map(([group, rows]) => (
        <View key={group} style={{ marginBottom: 12 }}>
          <Txt size={10.1} mut style={{ marginBottom: 4 }}>{group}</Txt>
          <ListRows rows={rows.map((row) => ({ key: row.key, main: row.title, sub: row.detail, right: '›', onPress: row.open }))} />
        </View>
      ))}
    </DrawerBody>
  );
}
