import { View } from 'react-native';
import { db, ui, bump, useDb } from '../../state/db';
import { useNav } from '../../shell/Nav';
import { useTheme } from '../../theme/ThemeContext';
import { Section } from '../../ui/Card';
import { Heading } from '../../ui/Heading';
import { LineChart } from '../../ui/Charts';
import { Chips, Pill, StatusPill } from '../../ui/Controls';
import { ListRows, Table, Small } from '../../ui/Lists';
import { Txt } from '../../ui/Txt';

const ranges = ['7D', '30D', '90D', '1Y'] as const;
type Range = typeof ranges[number];
function seriesFor(range: Range, serviceName: string, transactions: typeof db.INV) {
  const days = range === '7D' ? 7 : range === '30D' ? 30 : range === '90D' ? 90 : 365;
  const count = range === '7D' ? 7 : range === '30D' ? 6 : range === '90D' ? 9 : 12;
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);
  const matching = transactions.filter((tx) => {
    const timestamp = tx.createdAt ? Date.parse(tx.createdAt) : NaN;
    return (serviceName === 'All' || tx.f === serviceName) && Number.isFinite(timestamp) && timestamp >= start.getTime() && timestamp <= now.getTime();
  });
  const vals = Array.from({ length: count }, () => 0);
  matching.forEach((tx) => {
    const offset = Math.floor((Date.parse(tx.createdAt!) - start.getTime()) / 86400000);
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
  const total = matching.length;
  const max = Math.max(1, ...vals) * 1.25;
  return { labels, vals, total, max, yLabels: [Math.round(max).toLocaleString(), Math.round(max / 2).toLocaleString(), '0'], available: matching.length > 0 };
}

export function AnalyticsScreen() {
  useDb();
  const { c } = useTheme();
  const { go } = useNav();
  const range: Range = ranges.includes(ui.AR as Range) ? ui.AR as Range : '30D';
  const serviceOptions = Array.from(new Set(db.INV.map((tx) => tx.f).filter(Boolean))).sort();
  const serviceFilter = serviceOptions.includes(String(ui.EC)) ? String(ui.EC) : 'All';
  const chart = seriesFor(range, serviceFilter, db.INV);
  const decided = db.APPS.filter((app) => app.st >= 3);
  const approved = decided.filter((app) => app.st === 3).length;
  const approvalRate = decided.length ? Math.round((approved / decided.length) * 100) : 0;
  const reviewedWithTimes = decided.filter((app) => app.createdAt && app.reviewedAt && Number.isFinite(Date.parse(app.createdAt)) && Number.isFinite(Date.parse(app.reviewedAt)));
  const averageReview = reviewedWithTimes.length ? (reviewedWithTimes.reduce((sum, app) => sum + Math.max(0, Date.parse(app.reviewedAt!) - Date.parse(app.createdAt!)), 0) / reviewedWithTimes.length / 86400000).toFixed(1) : '—';
  const byService = serviceOptions.map((name) => {
    const data = seriesFor(range, name, db.INV);
    return { name, total: data.total, share: chart.total ? Math.round(data.total / chart.total * 100) : 0 };
  }).sort((a, b) => b.total - a.total);
  const updateRange = (next: Range) => { ui.AR = next; bump(); };
  const updateService = (next: string) => { ui.EC = next; bump(); };

  return (
    <View>
      <Heading title="Platform\nAnalytics" sub="Activity, service mix and review performance." kpis={[
        { icon: '☺', value: chart.available ? chart.total.toLocaleString('en-US') : '—', label: 'Transactions', tag: serviceFilter === 'All' ? 'All services' : serviceFilter },
        { icon: '♛', value: approvalRate + '%', label: 'Approval rate', tag: approved + ' of ' + decided.length + ' decided' },
        { icon: '◷', value: averageReview === '—' ? '—' : averageReview + ' d', label: 'Average review time' },
      ]} />

      <Section title="Activity" right={<Pill onPress={() => go('finance')}>Open finance ›</Pill>}>
        <Chips options={ranges} value={range} onChange={updateRange} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          <Pill on={serviceFilter === 'All'} onPress={() => updateService('All')}>All services</Pill>
          {serviceOptions.map((service) => <Pill key={service} on={serviceFilter === service} onPress={() => updateService(service)}>{service}</Pill>)}
        </View>
        <Txt size={21} weight={500}>{chart.available ? chart.total.toLocaleString('en-US') : '—'} <Txt size={10.1} mut>transactions · {serviceFilter === 'All' ? 'all services' : serviceFilter}</Txt></Txt>
        <Txt size={9.5} mut style={{ marginTop: 4 }}>{range} range · authorized transaction timestamps only</Txt>
        {chart.available ? <LineChart vals={chart.vals} color={c.or} max={chart.max} labels={chart.labels} yLabels={chart.yLabels} /> : <Txt size={10.1} mut style={{ marginTop: 8 }}>No timestamped transactions are available in the authorized snapshot. No sample series is substituted.</Txt>}
      </Section>

      <Section title="By feature" right={<Pill onPress={() => go('ecosystem')}>Ecosystem ›</Pill>}>
        <Table columns={[{ title: 'Service', flex: 1.4 }, { title: 'Transactions', align: 'right' }, { title: 'Share', align: 'right' }]}
          rows={byService.map((item) => ({
            key: item.name,
            cells: [item.name, item.total.toLocaleString('en-US'), item.share + '%'],
            onPress: () => { ui.hub = item.name; go('hub'); },
          }))} />
      </Section>

      <Section title="Approval turnaround">
        <ListRows rows={['Submitted', 'In review', 'Needs info', 'Approved', 'Rejected'].map((stage, index) => {
          const stageApps = db.APPS.filter((app) => app.st === index);
          const average = stageApps.length ? (stageApps.reduce((sum, app) => sum + app.age, 0) / stageApps.length).toFixed(1) : '0';
          return { key: stage, main: stage, sub: 'Average age: ' + average + ' days', right: String(stageApps.length), onPress: () => go('operations', { ov: 'List' }) };
        })} />
      </Section>

      <Section title="Content performance">
        <ListRows empty="No live banners are available." rows={db.BN.filter((banner) => banner.st === 'Live').map((banner) => ({
          key: banner.id, main: banner.t, sub: banner.svc + ' · ' + banner.pl,
          right: <StatusPill label={banner.st} tone="gr" small />,
          onPress: () => go('content', { cs: 'Banners' }),
        }))} />
        <Small>HTML source defines these as demo view counts; the RN version does not invent real impressions.</Small>
      </Section>

      <Section title="Operational snapshot">
        <ListRows rows={[
          { key: 'applications', main: 'Applications waiting', right: String(db.APPS.filter((app) => app.st < 3).length), onPress: () => go('operations') },
          { key: 'refunds', main: 'Refunds requiring attention', right: String(db.INV.filter((tx) => tx.rq || tx.s === 'Refund pending').length), onPress: () => go('finance', { fv: 'Refunds' }) },
          { key: 'payouts', main: 'Payouts not paid', right: String(db.PAYO.filter((payout) => payout[3] !== 'Paid').length), onPress: () => go('finance', { fv: 'Payouts' }) },
        ]} />
      </Section>
    </View>
  );
}
