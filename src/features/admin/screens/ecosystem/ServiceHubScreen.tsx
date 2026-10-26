import { View } from 'react-native';
import { db, ui, useDb } from '../../state/db';
import { useNav } from '../../shell/Nav';
import { useOpen } from '../../overlays/registry';
import { Section, Card } from '../../ui/Card';
import { Heading } from '../../ui/Heading';
import { Pill, Row, StatusPill } from '../../ui/Controls';
import { ListRows } from '../../ui/Lists';
import { Txt } from '../../ui/Txt';
import { useOpenModule } from './useOpenModule';

export function ServiceHubScreen() {
  useDb();
  const { go } = useNav();
  const open = useOpen();
  const openModule = useOpenModule();
  const selectedHub = db.SVC.find((row) => row[0] === ui.hub);
  const service = selectedHub ?? db.SVC[0];
  const serviceName = service[0];
  const modules = (serviceName === 'Goodies'
    ? 'Overview|Products and catalog|Categories|Merchants|Product review|Orders|Promotions|Support|Analytics|Settings'
    : db.MOD[serviceName] || 'Overview|Configuration').split('|');
  const isPreOrder = service[5] === 'Pre-order';
  const serviceTransactions = db.INV.filter((tx) =>
    tx.f.toLowerCase().includes(serviceName.toLowerCase()) ||
    (serviceName === 'Top up' && /top.?up/i.test(tx.f)),
  );
  const banners = db.BN.filter((banner) => banner.svc === serviceName);

  return (
    <View>
      <Row style={{ marginBottom: 4 }}>
        <Pill onPress={() => go('ecosystem')}>‹ Back</Pill>
        <Txt size={10.6} mut>{'Ecosystem › ' + serviceName}</Txt>
      </Row>
      <Heading title={serviceName + '\nService hub'} sub={service[1]} kpis={[
        { icon: '▥', value: serviceTransactions.length, label: 'Transactions matched', onPress: () => go('finance') },
        { icon: '▤', value: '—', label: 'Applications by service', onPress: () => go('operations') },
        { icon: '◔', value: '—', label: 'Service health' },
      ]} />
      {isPreOrder ? <Card><Txt size={11.5} mut>Pre-order is directory metadata. Launch readiness and activity metrics are not reported as live until an authorized service-health endpoint is connected.</Txt></Card> : null}
      <Section title="Modules">
        <ListRows rows={modules.map((module) => ({
          key: module,
          main: module,
          right: '›',
          onPress: () => openModule(serviceName, module),
        }))} />
      </Section>
      <Section title="Content for this service">
        <ListRows
          empty="Live content placements are not loaded into the current authorized service snapshot."
          rows={banners.map((banner) => ({
            key: banner.id,
            main: banner.t,
            right: <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><StatusPill label={banner.st} /><Txt size={10.1}>›</Txt></View>,
            onPress: () => open('ban', banner.id),
          }))}
        />
      </Section>
      <Card>
        <Txt size={10.1} weight={500}>Workspace boundary</Txt>
        <Txt size={9.5} mut lh={1.4} style={{ marginTop: 5 }}>The module directory follows the uploaded HTML. Only actions connected to authorized server endpoints may change production data; this hub does not turn demo HTML interactions into live operations.</Txt>
      </Card>
    </View>
  );
}
