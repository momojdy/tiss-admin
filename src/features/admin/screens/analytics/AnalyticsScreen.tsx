import { Alert, Modal, Pressable, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { db, ui, bump, useDb, dataMode } from '../../state/db';
import { useNav } from '../../shell/Nav';
import { useTheme } from '../../theme/ThemeContext';
import { Section } from '../../ui/Card';
import { Heading } from '../../ui/Heading';
import { LineChart } from '../../ui/Charts';
import { Chips, Pill, StatusPill } from '../../ui/Controls';
import { ListRows, Table, Small } from '../../ui/Lists';
import { Txt } from '../../ui/Txt';

const ranges = ['7D', '30D', '90D', '1Y', 'Custom'] as const;
type Range = typeof ranges[number];
function seriesFor(range: Range, serviceName: string, transactions: typeof db.INV, customStart: string, customEnd: string) {
  const now = new Date();
  const start = range === 'Custom' ? new Date(customStart + 'T00:00:00') : new Date(now);
  const end = range === 'Custom' ? new Date(customEnd + 'T23:59:59.999') : now;
  const days = range === '7D' ? 7 : range === '30D' ? 30 : range === '90D' ? 90 : range === 'Custom' ? Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1) : 365;
  const count = range === '7D' ? 7 : range === '30D' ? 6 : range === '90D' ? 9 : range === 'Custom' ? Math.min(12, Math.max(3, days)) : 12;
  if (range !== 'Custom') start.setDate(now.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);
  const matching = transactions.filter((tx) => {
    const timestamp = tx.createdAt ? Date.parse(tx.createdAt) : NaN;
    return (serviceName === 'All' || tx.f === serviceName) && Number.isFinite(timestamp) && timestamp >= start.getTime() && timestamp <= end.getTime();
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
  const [customOpen, setCustomOpen] = useState(false);
  const [expandedChart, setExpandedChart] = useState(false);
  const [customStart, setCustomStart] = useState('2026-09-20');
  const [customEnd, setCustomEnd] = useState('2026-10-17');
  const [rangeError, setRangeError] = useState('');
  const prototypeSnapshot = dataMode === 'prototype';
  const range: Range = ranges.includes(ui.AR as Range) ? ui.AR as Range : '30D';
  const liveTransactions = prototypeSnapshot ? [] : db.INV;
  const liveApplications = prototypeSnapshot ? [] : db.APPS;
  const liveBanners = prototypeSnapshot ? [] : db.BN;
  const serviceOptions = Array.from(new Set(liveTransactions.map((tx) => tx.f).filter(Boolean))).sort();
  const serviceFilter = serviceOptions.includes(String(ui.EC)) ? String(ui.EC) : 'All';
  const chart = seriesFor(range, serviceFilter, liveTransactions, customStart, customEnd);
  const decided = liveApplications.filter((app) => app.st >= 3);
  const approved = decided.filter((app) => app.st === 3).length;
  const approvalRate = decided.length ? Math.round((approved / decided.length) * 100) : 0;
  const reviewedWithTimes = decided.filter((app) => app.createdAt && app.reviewedAt && Number.isFinite(Date.parse(app.createdAt)) && Number.isFinite(Date.parse(app.reviewedAt)) && Date.parse(app.reviewedAt) >= Date.parse(app.createdAt));
  const averageReview = reviewedWithTimes.length ? (reviewedWithTimes.reduce((sum, app) => sum + Math.max(0, Date.parse(app.reviewedAt!) - Date.parse(app.createdAt!)), 0) / reviewedWithTimes.length / 86400000).toFixed(1) : '—';
  const byService = serviceOptions.map((name) => {
    const data = seriesFor(range, name, liveTransactions, customStart, customEnd);
    return { name, total: data.total, share: chart.total ? Math.round(data.total / chart.total * 100) : 0 };
  }).sort((a, b) => b.total - a.total);
  const updateRange = (next: Range) => { if (next === 'Custom') { setRangeError(''); setCustomOpen(true); return; } ui.AR = next; bump(); };
  const applyCustomRange = () => {
    if (customStart.length !== 10 || customEnd.length !== 10 || customStart[4] !== '-' || customEnd[4] !== '-' || customStart[7] !== '-' || customEnd[7] !== '-') { setRangeError('Enter both dates in YYYY-MM-DD format.'); return; }
    if (customEnd < customStart) { setRangeError('End date cannot be before the start date.'); return; }
    const today = new Date().toISOString().slice(0, 10);
    if (customEnd > today) { setRangeError('End date cannot be in the future.'); return; }
    ui.AR = 'Custom'; setCustomOpen(false); bump();
  };
  const updateService = (next: string) => { ui.EC = next; bump(); };
  const exportCsv = async () => {
    if (prototypeSnapshot) {
      Alert.alert('Export unavailable', 'Live analytics data is not connected. No prototype records were exported.');
      return;
    }
    const rows = liveTransactions.filter((tx) => {
      const timestamp = tx.createdAt ? Date.parse(tx.createdAt) : NaN;
      const start = range === 'Custom' ? new Date(customStart + 'T00:00:00').getTime() : Date.now() - (range === '7D' ? 7 : range === '30D' ? 30 : range === '90D' ? 90 : 365) * 86400000;
      const end = range === 'Custom' ? new Date(customEnd + 'T23:59:59.999').getTime() : Date.now();
      return Number.isFinite(timestamp) && timestamp >= start && timestamp <= end && (serviceFilter === 'All' || tx.f === serviceFilter);
    });
    const csv = [
      ['id', 'service', 'status', 'amount', 'created_at'].join(','),
      ...rows.map((tx) => [tx.id, tx.f, tx.s, tx.a, tx.createdAt || ''].map((value) => '"' + String(value ?? '').replace(/"/g, '""') + '"').join(',')),
    ].join('\n');
    await Clipboard.setStringAsync(csv);
    Alert.alert('CSV copied', 'The authorized analytics CSV was copied to your clipboard.');
  };

  return (
    <View>
      <Heading title="Platform\nAnalytics" sub="Activity, service mix and review performance." kpis={[
        { icon: '☺', value: !prototypeSnapshot && chart.available ? chart.total.toLocaleString('en-US') : '—', label: 'Transactions', tag: serviceFilter === 'All' ? 'All services' : serviceFilter },
        { icon: '♛', value: prototypeSnapshot || !decided.length ? '—' : approvalRate + '%', label: 'Approval rate', tag: prototypeSnapshot || !decided.length ? 'Live data unavailable' : approved + ' of ' + decided.length + ' decided' },
        { icon: '◷', value: averageReview === '—' ? '—' : averageReview + ' d', label: 'Average review time', tag: prototypeSnapshot ? 'Live data unavailable' : undefined },
      ]} />

      <Section title="Activity" right={<View style={{ flexDirection: 'row', gap: 6 }}><Pill onPress={() => setExpandedChart(true)}>↗ Expand</Pill><Pill onPress={() => go('finance')}>Open finance ›</Pill></View>}>
        <Chips options={ranges} value={range} onChange={updateRange} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8, alignItems: 'center' }}>
          <Pill on={serviceFilter === 'All'} onPress={() => updateService('All')}>All services</Pill>
          {serviceOptions.map((service) => <Pill key={service} on={serviceFilter === service} onPress={() => updateService(service)}>{service}</Pill>)}
          <Pill onPress={() => { void exportCsv(); }}>⇩ Export CSV</Pill>
        </View>
        <Txt size={21} weight={500}>{!prototypeSnapshot && chart.available ? chart.total.toLocaleString('en-US') : '—'} <Txt size={10.1} mut>transactions · {serviceFilter === 'All' ? 'all services' : serviceFilter}</Txt></Txt>
        <Txt size={9.5} mut style={{ marginTop: 4 }}>{range === 'Custom' ? customStart + ' – ' + customEnd : range + ' range'} · authorized transaction timestamps only</Txt>
        {!prototypeSnapshot && chart.available ? <LineChart vals={chart.vals} color={c.or} max={chart.max} labels={chart.labels} yLabels={chart.yLabels} /> : <Txt size={10.1} mut style={{ marginTop: 8 }}>{prototypeSnapshot ? 'Live transaction data is not connected. No prototype series is shown.' : 'No timestamped transactions are available in the authorized snapshot.'}</Txt>}
      </Section>

      <Section title="By service (same dataset)" right={<Pill onPress={() => go('ecosystem')}>Ecosystem ›</Pill>}>
        <Table columns={[{ title: 'Service', flex: 1.4 }, { title: 'Transactions', align: 'right' }, { title: 'Share', align: 'right' }]}
          rows={prototypeSnapshot ? [] : byService.map((item) => ({
            key: item.name,
            cells: [item.name, item.total.toLocaleString('en-US'), item.share + '%'],
            onPress: () => { ui.hub = item.name; go('hub'); },
          }))} />
        {prototypeSnapshot || !byService.length ? <Txt size={10.1} mut style={{ marginTop: 8 }}>Live service transaction breakdown is unavailable.</Txt> : null}
      </Section>

      <Section title="Approval turnaround">
        <ListRows empty={prototypeSnapshot ? 'Live application review data is unavailable. No prototype stage counts are shown.' : 'No application review records are available.'} rows={['Submitted', 'In review', 'Needs info', 'Approved', 'Rejected'].map((stage, index) => {
          const stageApps = liveApplications.filter((app) => app.st === index);
          const average = stageApps.length ? (stageApps.reduce((sum, app) => sum + app.age, 0) / stageApps.length).toFixed(1) : '—';
          return { key: stage, main: stage, sub: 'Average age: ' + (prototypeSnapshot ? 'unavailable' : average + ' days'), right: prototypeSnapshot ? '—' : String(stageApps.length), onPress: () => go('operations', { ov: 'List' }) };
        })} />
      </Section>

      <Section title="Content performance">
        <ListRows empty={prototypeSnapshot ? 'Live banner performance data is unavailable. No prototype view counts are shown.' : 'No live banner performance records are available.'} rows={(prototypeSnapshot ? [] : liveBanners.filter((banner) => banner.st === 'Live')).map((banner) => ({
          key: banner.id, main: banner.t, sub: banner.svc + ' · ' + banner.pl,
          right: <StatusPill label={banner.st} tone="gr" small />,
          onPress: () => go('content', { cs: 'Banners' }),
        }))} />
        <Small>HTML source defines these as demo view counts; the RN version does not invent real impressions.</Small>
      </Section>

      <Modal transparent visible={customOpen} animationType="fade" onRequestClose={() => setCustomOpen(false)}>
        <Pressable onPress={() => setCustomOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.42)', justifyContent: 'center', padding: 20 }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: c.card, borderRadius: 16, padding: 18, gap: 10 }}>
            <Txt size={16} weight={600}>Custom analytics range</Txt>
            <Txt size={10.1} mut>Choose dates for the transaction and service charts.</Txt>
            <Txt size={10.1} mut>Start date (YYYY-MM-DD)</Txt>
            <TextInput value={customStart} onChangeText={setCustomStart} placeholder="2026-09-20" placeholderTextColor={c.mut} autoCapitalize="none" style={{ color: c.ink, borderWidth: 1, borderColor: c.bd, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 10, fontSize: 13 }} />
            <Txt size={10.1} mut>End date (YYYY-MM-DD)</Txt>
            <TextInput value={customEnd} onChangeText={setCustomEnd} placeholder="2026-10-17" placeholderTextColor={c.mut} autoCapitalize="none" style={{ color: c.ink, borderWidth: 1, borderColor: c.bd, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 10, fontSize: 13 }} />
            {rangeError ? <Txt size={10.1} color={c.or}>{rangeError}</Txt> : null}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <Pill onPress={() => setCustomOpen(false)}>Cancel</Pill>
              <Pill onPress={applyCustomRange}>Apply range</Pill>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal transparent visible={expandedChart} animationType="fade" onRequestClose={() => setExpandedChart(false)}>
        <Pressable onPress={() => setExpandedChart(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.48)', justifyContent: 'center', padding: 14 }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: c.card, borderRadius: 16, padding: 18, gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Txt size={16} weight={600}>Platform analytics</Txt>
              <Pill onPress={() => setExpandedChart(false)}>Close ×</Pill>
            </View>
            <Txt size={10.1} mut>{range === 'Custom' ? customStart + ' – ' + customEnd : range + ' selected range'}</Txt>
            <Txt size={23} weight={600}>{prototypeSnapshot ? '—' : chart.total.toLocaleString('en-US')}</Txt>
            {!prototypeSnapshot && chart.available ? <LineChart vals={chart.vals} color={c.or} max={chart.max} labels={chart.labels} yLabels={chart.yLabels} /> : <Txt size={10.1} mut style={{ paddingVertical: 24, textAlign: 'center' }}>Live timestamped transaction data is unavailable. No prototype activity is shown.</Txt>}
          </Pressable>
        </Pressable>
      </Modal>
      <Section title="Operational snapshot">
        <ListRows empty="Live operational metrics are unavailable." rows={prototypeSnapshot ? [] : [
          { key: 'applications', main: 'Applications waiting', right: String(db.APPS.filter((app) => app.st < 3).length), onPress: () => go('operations') },
          { key: 'refunds', main: 'Refunds requiring attention', right: String(db.INV.filter((tx) => tx.rq || tx.s === 'Refund pending').length), onPress: () => go('finance', { fv: 'Refunds' }) },
          { key: 'payouts', main: 'Payouts not paid', right: String(db.PAYO.filter((payout) => payout[3] !== 'Paid').length), onPress: () => go('finance', { fv: 'Payouts' }) },
        ]} />
      </Section>
    </View>
  );
}
