import { Pressable, View } from 'react-native';
import { bump, db, ui, useDb } from '../../state/db';
import { can } from '../../state/access';
import { REQ } from '../../state/requirements';
import { saveCmsVersion } from '../../lib/adminBackend';
import { useNav } from '../../shell/Nav';
import { Card } from '../../ui/Card';
import { Btn, Chips, Pill, Row, SearchInput, Seg, StatusPill } from '../../ui/Controls';
import { useForm } from '../../ui/FormSheet';
import { Heading } from '../../ui/Heading';
import { Small, Table } from '../../ui/Lists';
import { Txt } from '../../ui/Txt';
import { AppIcon } from '../../ui/AppIcon';
import { useToast } from '../../ui/Toast';
import { useTheme } from '../../theme/ThemeContext';
import { useExport } from '../../shell/useExport';

const num = (x: string) => parseInt(x) || 0;

export const ecoRows = () => {
  const q = String(ui.eq).toLowerCase();
  const l = db.SVC.filter((c) => (ui.ec === 'All' || (ui.ec === 'Attention' ? false : ui.ec === 'Favorites' ? Boolean(c[6]) : c[5] === ui.ec)) && (!q || (c[0] + c[1]).toLowerCase().includes(q)));
  return l.sort((a, b) => (ui.es === 'Favorites' ? Number(Boolean(b[6])) - Number(Boolean(a[6])) || a[0].localeCompare(b[0]) : a[0].localeCompare(b[0])));
};

export function EcosystemScreen() {
  useDb();
  const { go } = useNav();
  const { c } = useTheme();
  const form = useForm();
  const toast = useToast();
  const exportCsv = useExport();
  const l = ecoRows();
  const set = (k: string, v: unknown) => { ui[k] = v; bump(); };
  const nextSort = ui.es === 'Favorites' ? 'A–Z' : 'Favorites';

  const addService = () => form({
    title: 'Propose service',
    sub: 'Saves a proposal for review; does not create a live service.',
    fields: [
      { id: 'n', label: 'Service name', type: 'text', required: true },
      { id: 'd', label: 'Short description', type: 'text' },
      { id: 'reason', label: 'Reason for proposal', type: 'textarea', required: true },
    ],
    buttons: [{ label: 'Save private proposal', key: 's', primary: true }],
    onSubmit: async (_k, v) => {
      const name = String(v.n || '').trim();
      const reason = String(v.reason || '').trim();
      if (!name) return 'Enter a service name.';
      if (!reason) return 'Enter a reason for the proposal.';
      if (db.SVC.some((row) => row[0].toLowerCase() === name.toLowerCase())) return 'That service already exists in the directory.';
      try {
        await saveCmsVersion({
          key: 'admin.service_directory.' + name.toLowerCase().replace(/[^a-z0-9]+/g, '.'),
          locale: 'en',
          payload: { name, description: String(v.d || ''), change_reason: reason, proposed_only: true },
          status: 'draft',
        });
        toast('Private service proposal saved. The live directory is unchanged.');
      } catch (error) {
        return error instanceof Error ? error.message : 'The proposal could not be saved.';
      }
    },
  });

  const grid = () => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
      {l.map((s) => {
        const pre = s[5] === 'Pre-order';
        return (
          <Pressable key={s[0]} onPress={() => go('hub', { hub: s[0] })} style={{ width: '48.4%' }} accessibilityRole="button">
            <View style={{ backgroundColor: c.card, borderColor: c.bd, borderWidth: 1, borderRadius: 20, padding: 10, shadowColor: '#3c321e', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 8 }, elevation: 2 }}>
              <Pressable onPress={() => { s[6] = s[6] ? 0 : 1; bump(); }} hitSlop={8} accessibilityLabel="Favourite" style={{ position: 'absolute', right: 10, top: 10, width: 19, height: 19, borderRadius: 10, borderWidth: s[6] ? 0 : 1, borderColor: c.bd, backgroundColor: s[6] ? c.ye : 'transparent', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                <AppIcon name={s[6] ? 'star-filled' : 'star'} size={11} color={s[6] ? '#302814' : c.ink} />
              </Pressable>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: s[7], alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}><Txt size={10.1} color={s[0] === 'Konsoliss' ? '#fff' : '#333'}>{s[0][0]}</Txt></View>
              <Txt size={12.3} weight={500}>{s[0]}</Txt>
              <Txt size={9.5} mut style={{ marginTop: 2, marginBottom: 7 }}>{s[1]}</Txt>
              <View style={{ backgroundColor: c.inset, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
                <View><Txt size={9.5} mut>Activity</Txt><Txt size={10.1} weight={500}>—</Txt></View>
                <View><Txt size={9.5} mut>Queue</Txt><Txt size={10.1} weight={500}>—</Txt></View>
              </View>
              <Txt size={9.5} mut style={{ marginTop: 8 }}>Not connected yet</Txt>
              <View style={{ flexDirection: 'row' }}><Pill>{pre ? 'Pre-order' : 'Directory status · ' + s[5]}</Pill></View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
  const table = () => (
    <Table columns={[{ title: 'Service', flex: 1.6 }, { title: 'Activity' }, { title: 'Queue' }, { title: 'Directory status', flex: 1.2 }]}
      rows={l.map((s) => ({ key: s[0], onPress: () => go('hub', { hub: s[0] }), cells: [<View key="n"><Txt size={9.5} weight={600}>{s[0]}</Txt><Small>{s[1]}</Small></View>, '—', '—', <StatusPill key="s" label={s[5] === 'Pre-order' ? 'Pre-order' : s[5] || 'Listed'} tone={s[5] === 'Pre-order' ? 'ye' : 'gr'} small />] }))} />
  );

  return (
    <View>
      <Heading title="Ecosystem Services" kpis={[
        { icon: 'building-2', value: db.SVC.length, label: 'Services in directory' },
        { icon: 'users', value: db.BIZ.length, label: 'Business records', onPress: () => go('business') },
        { icon: 'wallet', value: db.APPS.filter((app) => app.st < 3).length, label: 'Applications awaiting review', onPress: () => go('operations') },
      ]} />
      <Row><SearchInput value={ui.eq} onChangeText={(v) => set('eq', v)} placeholder="Search services" /></Row>
      <Chips options={['All', 'Active', 'Pre-order', 'Attention', 'Favorites'] as const} value={ui.ec} onChange={(v) => set('ec', v)} />
      <Row wrap>
        <Pill onPress={() => set('es', nextSort)}>{'≡ ' + (ui.es === 'A–Z' || ui.es === 'Favorites' ? ui.es : 'A–Z')}</Pill>
        <Seg options={['Grid', 'Table'] as const} value={ui.ev} onChange={(v) => set('ev', v)} />
        {can(...REQ.export) ? <Pill onPress={exportCsv}>⇩ Export</Pill> : null}
        {can(...REQ.content) ? <Btn onPress={addService}>+ Propose service</Btn> : null}
        <Pill onPress={() => go('business')}>Business records · {db.BIZ.length}</Pill>
      </Row>
      {l.length ? (ui.ev === 'Table' ? table() : grid()) : <Txt size={12} mut align="center" style={{ paddingVertical: 14 }}>{ui.ec === 'Attention' ? 'Not connected yet.' : 'No services match.'}</Txt>}
    </View>
  );
}
