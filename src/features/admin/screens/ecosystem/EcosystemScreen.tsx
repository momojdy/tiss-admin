import { Pressable, View } from 'react-native';
import { bump, db, ui, useDb } from '../../state/db';
import { can } from '../../state/access';
import { REQ, useGuard } from '../../state/requirements';
import { useNav } from '../../shell/Nav';
import { Card } from '../../ui/Card';
import { Btn, Chips, Pill, Row, SearchInput, Seg, StatusPill } from '../../ui/Controls';
import { useForm } from '../../ui/FormSheet';
import { Heading } from '../../ui/Heading';
import { Small, Table } from '../../ui/Lists';
import { ProgressBar } from '../../ui/Bits';
import { Txt } from '../../ui/Txt';
import { useToast } from '../../ui/Toast';
import { useTheme } from '../../theme/ThemeContext';
import { useExport } from '../../shell/useExport';

const num = (x: string) => parseInt(x) || 0;

export const ecoRows = () => {
  const q = String(ui.eq).toLowerCase();
  const l = db.SVC.filter((c) => (ui.ec === 'All' || (ui.ec === 'Attention' ? num(c[3]) >= 4 : ui.ec === 'Favorites' ? c[6] : c[5] === ui.ec)) && (!q || (c[0] + c[1]).toLowerCase().includes(q)));
  return l.sort((a, b) => (ui.es === 'A–Z' ? a[0].localeCompare(b[0]) : ui.es === 'Pending' ? num(b[3]) - num(a[3]) : num(b[2]) - num(a[2])));
};

export function EcosystemScreen() {
  useDb();
  const { go } = useNav();
  const { c } = useTheme();
  const form = useForm();
  const guard = useGuard();
  const toast = useToast();
  const exportCsv = useExport();
  const l = ecoRows();
  const pend = db.SVC.reduce((n, s) => n + num(s[3]), 0), act = db.SVC.reduce((n, s) => n + num(s[2]), 0);
  const set = (k: string, v: unknown) => { ui[k] = v; bump(); };
  const nextSort = ({ 'Most active': 'A–Z', 'A–Z': 'Pending', Pending: 'Most active' } as Record<string, string>)[ui.es];

  const addService = () => form({ title: 'Add service', fields: [{ id: 'n', label: 'Service name', type: 'text', required: true }, { id: 'd', label: 'Short description', type: 'text' }],
    buttons: [{ label: 'Add to directory', key: 's', primary: true }], sub: 'This adds a directory entry only. Building the service itself is separate product work.',
    onSubmit: (_k, v) => {
      if (db.SVC.find((s) => s[0].toLowerCase() === String(v.n).toLowerCase())) return 'That service already exists.';
      db.SVC.push([String(v.n), String(v.d || 'New service'), '–', 'Setup', 0, 'Pre-order', 0, '#f6cfc2']); db.MOD[String(v.n)] = 'Overview|Configuration';
      bump(); toast(v.n + ' added as pre-order');
    } });

  const grid = () => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
      {l.map((s) => {
        const pre = s[5] === 'Pre-order';
        return (
          <Pressable key={s[0]} onPress={() => go('hub', { hub: s[0] })} style={{ width: '48.4%' }} accessibilityRole="button">
            <View style={{ backgroundColor: c.card, borderColor: c.bd, borderWidth: 1, borderRadius: 20, padding: 10, shadowColor: '#3c321e', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 8 }, elevation: 2 }}>
              <Pressable onPress={() => { s[6] = s[6] ? 0 : 1; bump(); }} hitSlop={8} accessibilityLabel="Favourite" style={{ position: 'absolute', right: 10, top: 10, width: 19, height: 19, borderRadius: 10, borderWidth: s[6] ? 0 : 1, borderColor: c.bd, backgroundColor: s[6] ? c.ye : 'transparent', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                <Txt size={10.1}>{s[6] ? '★' : '☆'}</Txt>
              </Pressable>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: s[7], alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}><Txt size={10.1} color={s[0] === 'Konsoliss' ? '#fff' : '#333'}>{s[0][0]}</Txt></View>
              <Txt size={12.3} weight={500}>{s[0]}</Txt>
              <Txt size={9.5} mut style={{ marginTop: 2, marginBottom: 7 }}>{s[1]}</Txt>
              <View style={{ backgroundColor: c.inset, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
                <View><Txt size={9.5} mut>{pre ? 'Status' : 'Today'}</Txt><Txt size={10.1} weight={500}>{s[2]}</Txt></View>
                <View><Txt size={9.5} mut>{pre ? 'Phase' : 'Pending'}</Txt><Txt size={10.1} weight={500}>{s[3]}</Txt></View>
              </View>
              <ProgressBar pct={s[4]} color={s[4] > 80 ? c.gr : c.or} />
              <View style={{ flexDirection: 'row' }}><Pill>{pre ? 'Pre-order · readiness ' + s[4] + '%' : s[5]}</Pill></View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
  const table = () => (
    <Table columns={[{ title: 'Service', flex: 1.6 }, { title: 'Today' }, { title: 'Pending' }, { title: 'Status', flex: 1.2 }]}
      rows={l.map((s) => ({ key: s[0], onPress: () => go('hub', { hub: s[0] }), cells: [<View key="n"><Txt size={9.5} weight={600}>{s[0]}</Txt><Small>{s[1]}</Small></View>, s[2], s[3], <StatusPill key="s" label={s[5] === 'Pre-order' ? 'Pre-order' : 'Active'} tone={s[5] === 'Pre-order' ? 'ye' : 'gr'} small />] }))} />
  );

  return (
    <View>
      <Heading title={'Ecosystem\nServices'} kpis={[
        { icon: '▥', value: db.SVC.filter((s) => s[5] === 'Active').length, label: 'Active services', tag: '+ Prezo pre-order', onPress: () => go('ecosystem', { ec: 'Active' }) },
        { icon: '☺', value: act.toLocaleString('en-US'), label: 'Orders and bookings today', onPress: () => go('ecosystem', { es: 'Most active' }) },
        { icon: '▤', value: pend, label: 'Items pending across services', onPress: () => go('ecosystem', { es: 'Pending' }) },
      ]} />
      <Row><SearchInput value={ui.eq} onChangeText={(v) => set('eq', v)} placeholder="Search services" /></Row>
      <Chips options={['All', 'Active', 'Pre-order', 'Attention', 'Favorites'] as const} value={ui.ec} onChange={(v) => set('ec', v)} />
      <Row wrap>
        <Pill onPress={() => set('es', nextSort)}>{'≡ ' + ui.es}</Pill>
        <Seg options={['Grid', 'Table'] as const} value={ui.ev} onChange={(v) => set('ev', v)} />
        {can(...REQ.export) ? <Pill onPress={exportCsv}>⇩ Export</Pill> : null}
        {can(...REQ.ecosystem) ? <Btn onPress={guard(REQ.ecosystem, addService)}>+ Add service</Btn> : null}
      </Row>
      {l.length ? (ui.ev === 'Table' ? table() : grid()) : <Txt size={12} mut align="center" style={{ paddingVertical: 14 }}>No services match.</Txt>}
    </View>
  );
}
