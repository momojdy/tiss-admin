import { View } from 'react-native';
import { db, ui, useDb } from '../../state/db';
import { useNav } from '../../shell/Nav';
import { useOpen } from '../../overlays/registry';
import { Section } from '../../ui/Card';
import { Card } from '../../ui/Card';
import { Pill, Row, StatusPill } from '../../ui/Controls';
import { Heading } from '../../ui/Heading';
import { ListRows } from '../../ui/Lists';
import { Txt } from '../../ui/Txt';
import { useOpenModule } from './useOpenModule';

export function ServiceHubScreen() {
  useDb();
  const { go } = useNav();
  const open = useOpen();
  const openModule = useOpenModule();
  const c = db.SVC.find((x) => x[0] === ui.hub) ?? db.SVC[0];
  const mods = (db.MOD[c[0]] || 'Overview').split('|');
  const pre = c[5] === 'Pre-order';
  const banners = db.BN.filter((b) => b.svc === c[0]);
  return (
    <View>
      <Row style={{ marginBottom: 4 }}>
        <Pill onPress={() => go('ecosystem')}>‹ Back</Pill>
        <Txt size={10.6} mut>{'Ecosystem › ' + c[0]}</Txt>
      </Row>
      <Heading title={c[0] + '\nService hub'} kpis={[
        { icon: '▥', value: c[2], label: pre ? 'Status' : 'Orders today', onPress: () => openModule(c[0], 'Overview') },
        { icon: '▤', value: c[3], label: pre ? 'Phase' : 'Pending items', onPress: () => openModule(c[0], 'Overview') },
        { icon: '◔', value: c[4] + '%', label: pre ? 'Launch readiness' : 'Health score', onPress: () => openModule(c[0], 'Overview') },
      ]} />
      {pre ? <Card><Txt size={12} mut>Prezo is in pre-order. It stays separate from active services until its launch state changes.</Txt></Card> : null}
      <Section title="Modules"><ListRows rows={mods.map((m) => ({ key: m, main: m, right: '›', onPress: () => openModule(c[0], m) }))} /></Section>
      <Section title="Content for this service">
        <ListRows empty="No content assigned." rows={banners.map((b) => ({ key: b.id, main: b.t, right: <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><StatusPill label={b.st} /><Txt size={10.1}>›</Txt></View>, onPress: () => open('ban', b.id) }))} />
      </Section>
    </View>
  );
}
