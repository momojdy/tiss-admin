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

function activity(range: string, transactions: typeof db.INV) {
  const days = range === '7D' ? 7 : range === '30D' ? 30 : range === '90D' ? 90 : 365;
  const count = range === '7D' ? 7 : range === '30D' ? 6 : range === '90D' ? 9 : 12;
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);
  const vals = Array.from({ length: count }, () => 0);
  const valid = transactions.filter((tx) => {
    const timestamp = tx.createdAt ? Date.parse(tx.createdAt) : NaN;
    return Number.isFinite(timestamp) && timestamp >= start.getTime() && timestamp <= now.getTime();
  });
  valid.forEach((tx) => {
    const timestamp = Date.parse(tx.createdAt!);
    const offset = Math.floor((timestamp - start.getTime()) / 86400000);
    const bucket = range === '7D' ? offset : Math.min(count - 1, Math.floor(offset / (days / count)));
    if (bucket >= 0 && bucket < count) vals[bucket] += 1;
  });
  const labels = Array.from({ length: count }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + (range === '7D' ? i : Math.floor(i * days / count)));
    return range === '7D' ? date.toLocaleDateString(undefined, { weekday: 'short' })
      : range === '1Y' ? date.toLocaleDateString(undefined, { month: 'short' })
      : range === '30D' ? 'W' + (i + 1) : 'P' + (i + 1);
  });
  const total = valid.length;
  const max = Math.max(1, ...vals) * 1.25;
  return { labels, vals, total, max, yLabels: [Math.round(max).toLocaleString(), Math.round(max / 2).toLocaleString(), '0'], available: valid.length > 0 };
}

export function OverviewScreen() {
  useDb();
  const { c } = useTheme();
  const { go } = useNav();
  const waiting = db.APPS.filter((app) => app.st < 3);
  const completed = db.INV.filter((tx) => tx.s === 'Completed');
  const pending = db.INV.filter((tx) => tx.s === 'Pending');
  const failed = db.INV.filter((tx) => tx.s === 'Failed');
  const refunds = db.INV.filter((tx) => tx.rq || tx.s === 'Refund pending');
  const overdue = waiting.filter((app) => app.age >= 2);
  const unassigned = waiting.filter((app) => app.o === 'Unassigned');
  const queue = [0, 1, 2].map((stage) => waiting.filter((app) => app.st === stage).length);
  const chart = activity(String(ui.AR || '30D'), db.INV);
  const reviewed = db.APPS.filter((app) => app.st >= 3 && app.createdAt && app.reviewedAt && Number.isFinite(Date.parse(app.createdAt)) && Number.isFinite(Date.parse(app.reviewedAt)));
  const within48 = reviewed.filter((app) => Date.parse(app.reviewedAt!) - Date.parse(app.createdAt!) <= 48 * 60 * 60 * 1000).length;
  const reviewSpeedAvailable = reviewed.length > 0;
  const reviewSpeed = reviewSpeedAvailable ? Math.round(within48 / reviewed.length * 100) : 0;
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
        { icon: '♛', value: db.ACC.filter((account) => account.type === 'Customer').length.toLocaleString('en-US'), label: 'Customer profiles', onPress: () => go('people', { ps: 'Accounts' }) },
        { icon: '▥', value: db.APPS.filter((app) => app.st === 3).length, label: 'Approved applications', onPress: () => go('operations', { ov: 'List' }) },
        { icon: '◷', value: waiting.length, label: 'Waiting for review', tag: overdue.length + ' overdue', tone: overdue.length ? 'r' : '', onPress: () => go('operations', { ov: 'List' }) },
      ]} />

      <Section title="Platform activity" right={<Pill onPress={() => go('analytics')}>↗ Analytics</Pill>}>
        <Chips options={ranges} value={ranges.includes(ui.AR as Range) ? ui.AR as Range : '30D'} onChange={setRange} />
        <Txt size={21} weight={500}>{chart.total.toLocaleString('en-US')} <Txt size={10.1} mut>transactions · all services</Txt></Txt>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, marginBottom: 2 }}>
          <Txt size={9.5} mut>Transactions in selected range</Txt>
          <Txt size={9.5} mut>{ui.AR} activity range</Txt>
        </View>
        {chart.available ? <LineChart vals={chart.vals} color={c.or} max={chart.max} labels={chart.labels} yLabels={chart.yLabels} /> : <Txt size={10.1} mut style={{ marginTop: 8 }}>Timestamped transactions are unavailable in the current authorized snapshot; no sample activity is substituted.</Txt>}
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
          <Ring pct={reviewSpeedAvailable ? reviewSpeed : 0} size={86} color={c.ye} inner={c.card} track={c.inset}>
            <View style={{ alignItems: 'center' }}>
              <Txt size={16} weight={600}>{reviewSpeedAvailable ? reviewSpeed + '%' : '—'}</Txt>
              <Txt size={8.5} mut>{reviewSpeedAvailable ? 'within 48h' : 'data unavailable'}</Txt>
            </View>
          </Ring>
          <Txt size={9.5} mut style={{ marginTop: 5 }}>{reviewSpeedAvailable ? reviewed.length + ' reviewed · target 48h' : 'Review timestamps unavailable'}</Txt>
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
