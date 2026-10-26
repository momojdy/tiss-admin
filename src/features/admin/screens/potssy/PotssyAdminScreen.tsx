import { View } from 'react-native';
import { db, ui, bump, useDb } from '../../state/db';
import { useNav } from '../../shell/Nav';
import { useTheme } from '../../theme/ThemeContext';
import { Card, Section } from '../../ui/Card';
import { Heading } from '../../ui/Heading';
import { Chips, OutlineBtn, Pill } from '../../ui/Controls';
import { ListRows } from '../../ui/Lists';
import { Txt } from '../../ui/Txt';

const modules = [
  'Overview', 'Raffles and lotteries', 'Campaign approvals', 'Prizes',
  'Tickets and entries', 'Draws and results', 'Winners and claims',
  'Payments and refunds', 'Reports and analytics', 'Complaints and settings',
];
const copy: Record<string, { title: string; detail: string }> = {
  Overview: { title: 'Potssy operational overview', detail: 'Campaign, ticket, draw and claims summaries must come from an authorized Potssy backend snapshot.' },
  'Raffles and lotteries': { title: 'Raffles and lotteries', detail: 'Campaign records are not loaded from a verified server endpoint. The HTML raffle records are demo data and are not shown as live campaigns.' },
  'Campaign approvals': { title: 'Campaign approvals', detail: 'No authorized Potssy campaign-approval queue is connected. Do not approve or publish campaigns from the HTML prototype state.' },
  Prizes: { title: 'Prizes', detail: 'Prize inventory and eligibility need an authorized server query before they can be managed here.' },
  'Tickets and entries': { title: 'Tickets and entries', detail: 'Ticket purchases and entries are not available in the current authorized snapshot.' },
  'Draws and results': { title: 'Draws and results', detail: 'The HTML uses a demo draw. This screen deliberately does not select winners or create draw results without a server-authorized draw workflow.' },
  'Winners and claims': { title: 'Winners and claims', detail: 'Winner identity, verification and claim status need server-backed records and audited actions.' },
  'Payments and refunds': { title: 'Payments and refunds', detail: 'No Potssy-specific payment or refund endpoint is connected here. Use Finance only for transactions that are actually present in its authorized snapshot.' },
  'Reports and analytics': { title: 'Reports and analytics', detail: 'Live campaign, ticket and claim analytics are unavailable; no demo totals are substituted.' },
  'Complaints and settings': { title: 'Complaints and settings', detail: 'Complaint records and Potssy configuration require authorized service endpoints. Settings are read-only until those endpoints exist.' },
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
        <Pill onPress={() => go('ecosystem')}>‹ Ecosystem</Pill>
        <Txt size={10.1} mut>Potssy · Workspace</Txt>
      </View>
      <Heading title={'Potssy\n' + moduleName} sub="Dedicated workspace · server-backed actions only" kpis={[
        { icon: '▥', value: '—', label: 'Campaigns' },
        { icon: '▤', value: '—', label: 'Tickets and entries' },
        { icon: '◷', value: '—', label: 'Claims awaiting review' },
      ]} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {modules.map((name) => <Pill key={name} on={name === moduleName} onPress={() => setModule(name)}>{name}</Pill>)}
      </View>
      <Section title={selected.title}>
        <Txt size={11.2} mut lh={1.45}>{selected.detail}</Txt>
        <Txt size={10.1} color={c.or} style={{ marginTop: 8 }}>Production workflow unavailable</Txt>
      </Section>
      {moduleName === 'Overview' ? (
        <Section title="Available platform routes">
          <ListRows rows={[
            { key: 'operations', main: 'Operations', sub: 'Review queues and support records available in the authorized snapshot', right: 'Open ›', onPress: () => go('operations') },
            { key: 'finance', main: 'Finance', sub: 'Authorized platform transaction records only', right: 'Open ›', onPress: () => go('finance') },
            { key: 'people', main: 'People and access', sub: 'Account and staff permissions', right: 'Open ›', onPress: () => go('people') },
          ]} />
        </Section>
      ) : null}
      <Card>
        <Txt size={10.1} weight={500}>Safety boundary</Txt>
        <Txt size={9.5} mut lh={1.4} style={{ marginTop: 5 }}>No campaign mutation, winner selection, ticket issuance, payment, refund or setting change is performed here. Those require verified database contracts, permission checks and server-authorized functions.</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          <OutlineBtn onPress={() => go('finance')}>Finance</OutlineBtn>
          <OutlineBtn onPress={() => go('operations')}>Operations</OutlineBtn>
        </View>
      </Card>
    </View>
  );
}
