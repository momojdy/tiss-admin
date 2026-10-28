import { View } from 'react-native';
import { db, ui, bump, useDb } from '../../state/db';
import { useNav } from '../../shell/Nav';
import { useTheme } from '../../theme/ThemeContext';
import { Card, Section } from '../../ui/Card';
import { Heading } from '../../ui/Heading';
import { AppIcon } from '../../ui/AppIcon';
import { OutlineBtn, Pill, SelectMenu } from '../../ui/Controls';
import { ListRows } from '../../ui/Lists';
import { Txt } from '../../ui/Txt';

import { POTSSY_MODULES } from './modules';
const copy: Record<string, { title: string; detail: string }> = {
  Overview: { title: 'Potssy operational overview', detail: 'Not connected yet.' },
  'Raffles and lotteries': { title: 'Raffles and lotteries', detail: 'Not connected yet.' },
  'Campaign approvals': { title: 'Campaign approvals', detail: 'Not connected yet. Campaign actions are disabled.' },
  Prizes: { title: 'Prizes', detail: 'Not connected yet.' },
  'Tickets and entries': { title: 'Tickets and entries', detail: 'Not connected yet.' },
  'Draws and results': { title: 'Draws and results', detail: 'Not connected yet. Draw actions are disabled.' },
  'Winners and claims': { title: 'Winners and claims', detail: 'Not connected yet.' },
  'Payments and refunds': { title: 'Payments and refunds', detail: 'Not connected yet. Use Finance only for transactions shown in its authorized records.' },
  'Reports and analytics': { title: 'Reports and analytics', detail: 'Not connected yet.' },
  'Complaints and settings': { title: 'Complaints and settings', detail: 'Read-only until authorized service endpoints are connected.' },
};

export function PotssyAdminScreen() {
  useDb();
  const { c } = useTheme();
  const { go } = useNav();
  const moduleName = Object.keys(db.POTMAP).find((name) => db.POTMAP[name] === String(ui.pt || 'Overview')) || 'Overview';
  const selected = copy[moduleName] || copy.Overview;
  const setModule = (name: string) => { ui.pt = db.POTMAP[name] || 'Overview'; bump(); };

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Pill onPress={() => go('ecosystem')}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><AppIcon name="arrow-left" size={12} />Ecosystem</View></Pill>
        <Txt size={10.1} mut>Potssy · Workspace</Txt>
      </View>
      <Heading title={'Potssy ' + moduleName} kpis={[
        { icon: 'chart-no-axes', value: '—', label: 'Campaigns' },
        { icon: 'clipboard-list', value: '—', label: 'Tickets and entries' },
        { icon: 'clock-alert', value: '—', label: 'Claims awaiting review' },
      ]} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        <SelectMenu label="Potssy section" options={POTSSY_MODULES} value={moduleName} onChange={setModule} />
      </View>
      <Section title={selected.title}>
        <Txt size={11.2} mut lh={1.45}>{selected.detail}</Txt>
        <Txt size={10.1} color={c.or} style={{ marginTop: 8 }}>Production workflow unavailable</Txt>
      </Section>
      {moduleName === 'Overview' ? (
        <Section title="Available platform routes">
          <ListRows rows={[
            { key: 'operations', main: 'Operations', sub: 'Review available queues and support records', right: <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>Open<AppIcon name="chevron-right" size={12} /></View>, onPress: () => go('operations') },
            { key: 'finance', main: 'Finance', sub: 'Authorized platform transaction records only', right: <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>Open<AppIcon name="chevron-right" size={12} /></View>, onPress: () => go('finance') },
            { key: 'people', main: 'People and access', sub: 'Account and staff permissions', right: <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>Open<AppIcon name="chevron-right" size={12} /></View>, onPress: () => go('people') },
          ]} />
        </Section>
      ) : null}
      <Card>
        <Txt size={10.1} weight={500}>Read-only workspace</Txt>
        <Txt size={9.5} mut lh={1.4} style={{ marginTop: 5 }}>Potssy stays read-only until its backend workflows and server-side permission checks are connected.</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          <OutlineBtn onPress={() => go('finance')}>Finance</OutlineBtn>
          <OutlineBtn onPress={() => go('operations')}>Operations</OutlineBtn>
        </View>
      </Card>
    </View>
  );
}
