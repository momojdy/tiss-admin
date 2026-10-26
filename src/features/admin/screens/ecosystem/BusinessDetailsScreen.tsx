import { View } from 'react-native';
import { db, ui, useDb } from '../../state/db';
import { useNav } from '../../shell/Nav';
import { can } from '../../state/access';
import { REQ } from '../../state/requirements';
import { useTheme } from '../../theme/ThemeContext';
import { Card, Section } from '../../ui/Card';
import { Heading } from '../../ui/Heading';
import { OutlineBtn, Pill, StatusPill } from '../../ui/Controls';
import { ListRows } from '../../ui/Lists';
import { Txt } from '../../ui/Txt';

/** Business details intentionally render only fields supplied by the authorized ecosystem snapshot. */
export function BusinessDetailsScreen() {
  useDb();
  const { c } = useTheme();
  const { go } = useNav();
  const id = String(ui.businessId || '');
  const business = db.SVC.find((row) => String(row[7]) === id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(row[7])));
  const applications = business ? db.APPS.filter((row) => row.n === business[0]) : [];
  const hasEdit = can(...REQ.ecosystem);

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <OutlineBtn onPress={() => go('ecosystem')}>‹ Ecosystem</OutlineBtn>
        <Pill>Business details</Pill>
      </View>
      {!business ? (
        <Card>
          <Txt size={13} weight={500}>Business record unavailable</Txt>
          <Txt size={11} mut lh={1.4} style={{ marginTop: 6 }}>Open this screen from a business record loaded by the authorized ecosystem endpoint. Seed-only service tiles are not treated as production businesses.</Txt>
        </Card>
      ) : (
        <>
          <Heading title={business[0]} sub="Business record · authorized ecosystem snapshot" kpis={[
            { icon: '▥', value: business[2] === '1' ? 'Live' : 'Not live', label: 'Customer visibility' },
            { icon: '✓', value: business[1] || 'Unknown', label: 'Verification status' },
            { icon: '◔', value: business[6] ? 'Ready' : 'Not ready', label: 'Payout readiness' },
          ]} />
          <Section title="Business profile" right={<StatusPill label={business[1] || 'Unknown'} small />}>
            <ListRows rows={[
              { key: 'id', main: 'Business ID', sub: id, right: 'Record' },
              { key: 'location', main: 'Location', sub: business[5] || 'Not supplied by the current endpoint', right: 'Snapshot' },
              { key: 'visibility', main: 'Live status', sub: business[2] === '1' ? 'Marked live by the authorized snapshot' : 'Not marked live', right: 'Snapshot' },
              { key: 'payout', main: 'Payout readiness', sub: business[6] ? 'Ready in the authorized snapshot' : 'Not ready or not reported', right: 'Snapshot' },
            ]} />
          </Section>
          <Section title="Applications and review history">
            <ListRows empty="No matching application records are available in the current authorized snapshot." rows={applications.map((row) => ({
              key: row.id,
              main: row.id,
              sub: row.s + ' · ' + row.age + ' days waiting',
              right: row.o || 'Unassigned',
              onPress: () => go('operations', { oq: row.n }),
            }))} />
          </Section>
          <Card>
            <Txt size={11} weight={500}>Protected actions</Txt>
            <Txt size={10.1} mut lh={1.4} style={{ marginTop: 5 }}>Verification changes and business restrictions must continue through the existing server-authorized workflow. This details screen does not perform direct status changes.</Txt>
            {!hasEdit ? <Txt size={10.1} color={c.or} style={{ marginTop: 6 }}>You have view-only or no ecosystem edit access.</Txt> : null}
          </Card>
        </>
      )}
    </View>
  );
}
