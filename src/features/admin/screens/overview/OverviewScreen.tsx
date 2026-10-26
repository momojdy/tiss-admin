import { View } from 'react-native';
import { db, ui, bump, mny, useDb } from '../../state/db';
import { useNav } from '../../shell/Nav';
import { useTheme } from '../../theme/ThemeContext';
import { Card, CardTitle, Section } from '../../ui/Card';
import { Heading } from '../../ui/Heading';
import { LineChart, Ring } from '../../ui/Charts';
import { Chips, Pill, StatusPill } from '../../ui/Controls';
import { ListRows } from '../../ui/Lists';
import { Txt } from '../../ui/Txt';

const ranges = ['7D', '30D', '90D', '1Y'] as const;
type Range = typeof ranges[number];

function activity(range: string, activeServices: typeof db.SVC) {
  const count = range === '7D' ? 7 : range === '30D' ? 6 : range === '90D' ? 9 : 12;
  const labels = range === '7D'
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : range === '30D' ? ['W1', 'W2', 'W3', 'W4', 'W5', 'W6']
    : 'Nov Dec Jan Feb Mar Apr May Jun Jul Aug Sep Oct'.split(' ').slice(12 - count);
  const vals = Array.from({ length: count }, (_, i) => activeServices.reduce((sum, service) => {
    const base = Math.max(0, Number.parseInt(service[2], 10) || 0);
    const seed = [...(service[0] + range)].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7);
    return sum + Math.round((base + 4) * (0.62 + (((seed + i * 37) % 60) / 100)));
  }, 0));
  const total = vals.reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...vals) * 1.25;
  return { labels, vals, total, max, yLabels: [Math.round(max).toLocaleString(), Math.round(max / 2).toLocaleString(), '0'] };
}

export function OverviewScreen() {
  useDb();
  const { c } = useTheme();
  const { go } = useNav();
  const activeServices = db.SVC.filter((service) => service[5] === 'Active');
  const waiting = db.APPS.filter((app) => app.st < 3);
  const completed = db.INV.filter((tx) => tx.s === 'Completed');
  const pending = db.INV.filter((tx) => tx.s === 'Pending');
  const failed = db.INV.filter((tx) => tx.s === 'Failed');
  const refunds = db.INV.filter((tx) => tx.rq || tx.s === 'Refund pending');
  const overdue = waiting.filter((app) => app.age >= 2);
  const unassigned = waiting.filter((app) => app.o === 'Unassigned');
  const queue = [0, 1, 2].map((stage) => waiting.filter((app) => app.st === stage).length);
  const chart = activity(String(ui.AR || '30D'), activeServices);
  const liveBanners = db.BN.filter((banner) => banner.st === 'Live');
  const setRange = (range: Range) => { ui.AR = range; bump(); };
  const attention = [
    ...failed.slice(0, 1).map((tx) => ({ key: tx.id, title: 'Failed transaction', sub: tx.f + ' · ' + tx.u, right: mny(tx.a), action: () => go('finance', { fv: 'Transactions', fs: 'Failed' }) })),
    ...overdue.slice(0, 2).map((app) => ({ key: app.id, title: 'Application waiting ' + app.age + 'd', sub: app.n + ' · ' + app.s, right: app.o === 'Unassigned' ? 'Unassigned' : app.o, action: () => go('operations', { ov: 'List' }) })),
    ...refunds.slice(0, 1).map((tx) => ({ key: 'refund-' + tx.id, title: 'Refund needs review', sub: tx.u + ' · ' + tx.id, right: mny(tx.rq || tx.a), action: () => go('finance', { fv: 'Refunds' }) })),
    ...db.CASES.filter((item) => item.st !== 'Resolved').slice(0, 1).map((item) => ({ key: item.id, title: item.st === 'Escalated' ? 'Escalated support case' : 'Open support case', sub: item.svc + ' · ' + item.t, right: item.o || 'Unassigned', action: () => go('operations') })),
  ].slice(0, 5);

  return (
    <View>
      <Heading title="Platform\nOverview" sub="A live operational snapshot of Wantiss." kpis={[
        { icon: '♛', value: '1,284', label: 'Active customers', tag: '+5% vs last month', tone: 'g', onPress: () => go('people', { ps: 'Customers' }) },
        { icon: '▥', value: '86', label: 'Approved businesses', onPress: () => go('people', { ps: 'Businesses' }) },
        { icon: '◷', value: waiting.length, label: 'Waiting for review', tag: overdue.length + ' overdue', tone: overdue.length ? 'r' : '', onPress: () => go('operations', { ov: 'List' }) },
      ]} />

      <Section title="Platform activity" right={<Pill onPress={() => go('analytics')}>↗ Analytics</Pill>}>
        <Chips options={ranges} value={ranges.includes(ui.AR as Range) ? ui.AR as Range : '30D'} onChange={setRange} />
        <Txt size={21} weight={500}>{chart.total.toLocaleString('en-US')} <Txt size={10.1} mut>transactions · all services</Txt></Txt>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, marginBottom: 2 }}>
          <Txt size={9.5} mut>Completed transactions</Txt>
          <Txt size={9.5} mut>{ui.AR} activity range</Txt>
        </View>
        <LineChart vals={chart.vals} color={c.or} max={chart.max} labels={chart.labels} yLabels={chart.yLabels} />
      </Section>

      <Section title="Needs attention" right={<Pill onPress={() => go('operations', { ov: 'List' })}>View queue ›</Pill>}>
        <ListRows empty="Nothing urgent is waiting right now." rows={attention.map((item) => ({
          key: item.key,
          main: item.title,
          sub: item.sub,
          right: <Txt size={9.5} color={item.right === 'Unassigned' ? c.or : c.ink}>{item.right}</Txt>,
          onPress: item.action,
        }))} />
      </Section>

      <View style={{ flexDirection: 'row', gap: 9, alignItems: 'stretch' }}>
        <Card style={{ flex: 0.82, justifyContent: 'center', alignItems: 'center', minHeight: 152 }}>
          <CardTitle title="Review speed" />
          <Ring pct={82} size={86} color={c.ye} inner={c.card} track={c.inset}>
            <View style={{ alignItems: 'center' }}>
              <Txt size={16} weight={600}>82%</Txt>
              <Txt size={8.5} mut>within 48h</Txt>
            </View>
          </Ring>
          <Txt size={9.5} mut style={{ marginTop: 5 }}>{overdue.length} overdue · target 48h</Txt>
        </Card>
        <Card style={{ flex: 1.4, minHeight: 152 }}>
          <CardTitle title="Queue mix" right={<Pill onPress={() => go('operations')}>↗</Pill>} />
          <Txt size={22} weight={500}>{waiting.length} <Txt size={9.5} mut>waiting</Txt></Txt>
          <View style={{ flexDirection: 'row', height: 10, gap: 2, overflow: 'hidden', borderRadius: 99, marginVertical: 12 }}>
            {queue.map((value, i) => <View key={i} style={{ flex: Math.max(0.01, value), backgroundColor: [c.ye, c.gr, c.or][i] }} />)}
          </View>
          {['Submitted', 'In review', 'Needs info'].map((label, i) => (
            <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
              <Txt size={9.5} mut>{label}</Txt><Txt size={9.5}>{queue[i]}</Txt>
            </View>
          ))}
        </Card>
      </View>

      <Section title="Money snapshot" right={<Pill onPress={() => go('finance')}>Finance ›</Pill>}>
        <ListRows rows={[
          { key: 'completed', main: 'Completed', sub: 'Transactions settled or completed', right: <Txt size={10.1}>{completed.length} · {mny(completed.reduce((n, tx) => n + tx.a, 0))}</Txt>, onPress: () => go('finance', { fs: 'Completed' }) },
          { key: 'pending', main: 'Pending settlement', sub: 'Transactions awaiting completion', right: <Txt size={10.1}>{pending.length} · {mny(pending.reduce((n, tx) => n + tx.a, 0))}</Txt>, onPress: () => go('finance', { fs: 'Pending' }) },
          { key: 'failed', main: 'Failed or flagged', sub: 'Transactions needing investigation', right: <Txt size={10.1} color={failed.length ? c.or : c.ink}>{failed.length} · {mny(failed.reduce((n, tx) => n + tx.a, 0))}</Txt>, onPress: () => go('finance', { fs: 'Failed' }) },
          { key: 'refunds', main: 'Refunds waiting', right: String(refunds.length), onPress: () => go('finance', { fv: 'Refunds' }) },
          { key: 'payouts', main: 'Payouts to check', right: String(db.PAYO.filter((payout) => payout[3] !== 'Paid').length), onPress: () => go('finance', { fv: 'Payouts' }) },
        ]} />
      </Section>

      <Section title="Feature health" right={<Pill onPress={() => go('ecosystem')}>Ecosystem ›</Pill>}>
        <ListRows rows={['Goodies', 'Stays', 'Woulib', 'Konsoliss'].map((name) => {
          const service = db.SVC.find((item) => item[0] === name);
          const pendingCount = Number.parseInt(service?.[3] || '0', 10) || 0;
          const status = service?.[5] || 'Unknown';
          return {
            key: name,
            main: name,
            sub: status === 'Pre-order' ? 'Launch readiness ' + (service?.[4] ?? 0) + '%' : (service?.[2] ?? '0') + ' today · ' + pendingCount + ' pending',
            right: <StatusPill label={pendingCount >= 5 ? 'Check' : status === 'Active' ? 'OK' : status} tone={pendingCount >= 5 ? 'or' : status === 'Active' ? 'gr' : 'ye'} small />,
            onPress: () => go('hub', { hub: name }),
          };
        })} />
      </Section>

      <Section title="Content and promotions" right={<Pill onPress={() => go('content')}>Content ›</Pill>}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 8 }}>
          <Pill onPress={() => go('content', { cs: 'Banners' })}>{liveBanners.length} live</Pill>
          <Pill onPress={() => go('content', { cs: 'Calendar' })}>{db.BN.filter((banner) => banner.st === 'Scheduled').length} scheduled</Pill>
          <Pill onPress={() => go('content', { cs: 'Approvals' })}>{db.BN.filter((banner) => banner.st === 'In review' || banner.st === 'Draft').length} drafts / review</Pill>
        </View>
        <ListRows empty="No live banners." rows={liveBanners.slice(0, 3).map((banner) => ({
          key: banner.id, main: banner.t, sub: banner.svc, right: banner.to ? 'Ends ' + banner.to : 'No end date',
        }))} />
      </Section>

      <Section title="Team and recent activity" right={<Pill onPress={() => go('people', { ps: 'Audit log' })}>Audit log ›</Pill>}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {db.STAFF.slice(0, 4).map((staff) => <Pill key={staff.n} onPress={() => go('people', { ps: 'Staff' })}>{staff.n} · {staff.st}</Pill>)}
          <Pill onPress={() => go('operations', { ou: 1 })}>{unassigned.length} unassigned</Pill>
        </View>
        <ListRows empty="No recent activity." rows={db.AUD.slice(0, 4).map((event, i) => ({
          key: String(i), main: event[0], sub: event[1], right: event[2],
        }))} />
      </Section>
    </View>
  );
}
