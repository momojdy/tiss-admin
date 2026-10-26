import { useMemo } from 'react';
import { View } from 'react-native';
import { db, ui, bump, mny, useDb } from '../../state/db';
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
function seedOf(value: string) { return [...value].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7); }

function seriesFor(range: Range, serviceName: string, services: typeof db.SVC) {
  const count = range === '7D' ? 7 : range === '30D' ? 6 : range === '90D' ? 9 : 12;
  const labels = range === '7D' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : range === '30D' ? ['W1', 'W2', 'W3', 'W4', 'W5', 'W6']
    : 'Nov Dec Jan Feb Mar Apr May Jun Jul Aug Sep Oct'.split(' ').slice(12 - count);
  const selected = serviceName === 'All' ? services.filter((service) => service[5] === 'Active') : services.filter((service) => service[0] === serviceName);
  const vals = Array.from({ length: count }, (_, i) => selected.reduce((sum, service) => {
    const base = Math.max(0, Number.parseInt(service[2], 10) || 0);
    return sum + Math.round((base + 4) * (0.7 + (((i * 37 + seedOf(service[0] + range)) % 60) / 100)));
  }, 0));
  const total = vals.reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...vals) * 1.25;
  return { labels, vals, total, max, yLabels: [Math.round(max).toLocaleString(), Math.round(max / 2).toLocaleString(), '0'] };
}

export function AnalyticsScreen() {
  useDb();
  const { c } = useTheme();
  const { go } = useNav();
  const range: Range = ranges.includes(ui.AR as Range) ? ui.AR as Range : '30D';
  const serviceFilter = String(ui.EC || 'All');
  const activeServices = db.SVC.filter((service) => service[5] === 'Active');
  const chart = useMemo(() => seriesFor(range, serviceFilter, db.SVC), [range, serviceFilter, db.SVC]);
  const decided = db.APPS.filter((app) => app.st >= 3);
  const approved = decided.filter((app) => app.st === 3).length;
  const approvalRate = decided.length ? Math.round((approved / decided.length) * 100) : 0;
  const averageReview = decided.length ? (decided.reduce((sum, app) => sum + app.age, 0) / decided.length).toFixed(1) : '0';
  const byService = activeServices.map((service) => {
    const data = seriesFor(range, service[0], db.SVC);
    return { name: service[0], total: data.total, share: chart.total ? Math.round(data.total / chart.total * 100) : 0 };
  }).sort((a, b) => b.total - a.total);
  const updateRange = (next: Range) => { ui.AR = next; bump(); };
  const updateService = (next: string) => { ui.EC = next; bump(); };

  return (
    <View>
      <Heading title="Platform\nAnalytics" sub="Activity, service mix and review performance." kpis={[
        { icon: '☺', value: chart.total.toLocaleString('en-US'), label: 'Transactions', tag: serviceFilter === 'All' ? 'All services' : serviceFilter },
        { icon: '♛', value: approvalRate + '%', label: 'Approval rate', tag: approved + ' of ' + decided.length + ' decided' },
        { icon: '◷', value: averageReview + ' d', label: 'Average review time' },
      ]} />

      <Section title="Activity" right={<Pill onPress={() => go('finance')}>Open finance ›</Pill>}>
        <Chips options={ranges} value={range} onChange={updateRange} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          <Pill on={serviceFilter === 'All'} onPress={() => updateService('All')}>All services</Pill>
          {activeServices.map((service) => <Pill key={service[0]} on={serviceFilter === service[0]} onPress={() => updateService(service[0])}>{service[0]}</Pill>)}
        </View>
        <Txt size={21} weight={500}>{chart.total.toLocaleString('en-US')} <Txt size={10.1} mut>transactions · {serviceFilter === 'All' ? 'all services' : serviceFilter}</Txt></Txt>
        <Txt size={9.5} mut style={{ marginTop: 4 }}>{range} range · illustrative activity derived from the current service summary data</Txt>
        <LineChart vals={chart.vals} color={c.or} max={chart.max} labels={chart.labels} yLabels={chart.yLabels} />
      </Section>

      <Section title="By service" right={<Pill onPress={() => go('ecosystem')}>Ecosystem ›</Pill>}>
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
