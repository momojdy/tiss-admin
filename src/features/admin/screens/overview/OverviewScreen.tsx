import { Modal, Pressable, TextInput, View } from 'react-native';
import { useState } from 'react';
import { db, ui, bump, mny, useDb, dataMode } from '../../state/db';
import { useNav } from '../../shell/Nav';
import { useTheme } from '../../theme/ThemeContext';
import { Card, CardTitle, Section } from '../../ui/Card';
import { Heading } from '../../ui/Heading';
import { LineChart, Ring } from '../../ui/Charts';
import { Chips, Pill, StatusPill } from '../../ui/Controls';
import { ListRows } from '../../ui/Lists';
import { Txt } from '../../ui/Txt';

const ranges = ['7D', '30D', '90D', '1Y', 'Custom'] as const;
type Range = typeof ranges[number];

function activity(range: string, transactions: typeof db.INV, customStart: string, customEnd: string) {
  const now = new Date();
  const start = range === 'Custom' ? new Date(customStart + 'T00:00:00') : new Date(now);
  const end = range === 'Custom' ? new Date(customEnd + 'T23:59:59.999') : now;
  const days = range === '7D' ? 7 : range === '30D' ? 30 : range === '90D' ? 90 : range === 'Custom' ? Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1) : 365;
  const count = range === '7D' ? 7 : range === '30D' ? 6 : range === '90D' ? 9 : range === 'Custom' ? Math.min(12, Math.max(3, days)) : 12;
  if (range !== 'Custom') start.setDate(now.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);
  const vals = Array.from({ length: count }, () => 0);
  const valid = transactions.filter((tx) => {
    const timestamp = tx.createdAt ? Date.parse(tx.createdAt) : NaN;
    return Number.isFinite(timestamp) && timestamp >= start.getTime() && timestamp <= end.getTime();
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
  const prototypeSnapshot = dataMode === 'prototype';
  // Never present fixture rows as live operational metrics.
  const waiting = prototypeSnapshot ? [] : db.APPS.filter((app) => app.st < 3);
  const completed = prototypeSnapshot ? [] : db.INV.filter((tx) => tx.s === 'Completed');
  const pending = prototypeSnapshot ? [] : db.INV.filter((tx) => tx.s === 'Pending');
  const failed = prototypeSnapshot ? [] : db.INV.filter((tx) => tx.s === 'Failed');
  const refunds = prototypeSnapshot ? [] : db.INV.filter((tx) => tx.rq || tx.s === 'Refund pending');
  const overdue = waiting.filter((app) => app.age >= 2);
  const unassigned = waiting.filter((app) => app.o === 'Unassigned');
  const queue = [0, 1, 2].map((stage) => waiting.filter((app) => app.st === stage).length);
  const reviewed = prototypeSnapshot ? [] : db.APPS.filter((app) => app.st >= 3 && app.createdAt && app.reviewedAt && Number.isFinite(Date.parse(app.createdAt)) && Number.isFinite(Date.parse(app.reviewedAt)) && Date.parse(app.reviewedAt) >= Date.parse(app.createdAt));
  const within48 = reviewed.filter((app) => Date.parse(app.reviewedAt!) - Date.parse(app.createdAt!) <= 48 * 60 * 60 * 1000).length;
  const reviewSpeedAvailable = reviewed.length > 0;
  const reviewSpeed = reviewSpeedAvailable ? Math.round(within48 / reviewed.length * 100) : 0;
  const [customOpen, setCustomOpen] = useState(false);
  const [expandedChart, setExpandedChart] = useState(false);
  const [customStart, setCustomStart] = useState('2026-09-20');
  const [customEnd, setCustomEnd] = useState('2026-10-17');
  const chart = activity(String(ui.AR || '30D'), prototypeSnapshot ? [] : db.INV, customStart, customEnd);
  const [rangeError, setRangeError] = useState('');
  const setRange = (range: Range) => {
    if (range === 'Custom') { setRangeError(''); setCustomOpen(true); return; }
    ui.AR = range; bump();
  };
  const applyCustomRange = () => {
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(customStart) || !/^\\d{4}-\\d{2}-\\d{2}$/.test(customEnd)) { setRangeError('Enter both dates in YYYY-MM-DD format.'); return; }
    if (customEnd < customStart) { setRangeError('End date cannot be before the start date.'); return; }
    const earliest = '2025-11-01';
    const today = new Date().toISOString().slice(0, 10);
    if (customStart < earliest || customEnd > today) { setRangeError('Choose dates between ' + earliest + ' and ' + today + '.'); return; }
    ui.AR = 'Custom'; setCustomOpen(false); bump();
  };
  const attention = [
    ...failed.slice(0, 1).map((tx) => ({ key: tx.id, title: 'Failed transaction', sub: tx.f + ' · ' + tx.u, right: mny(tx.a), action: () => go('finance', { fv: 'Transactions', fs: 'Failed' }) })),
    ...overdue.slice(0, 2).map((app) => ({ key: app.id, title: 'Application waiting ' + app.age + 'd', sub: app.n + ' · ' + app.s, right: app.o === 'Unassigned' ? 'Unassigned' : app.o, action: () => go('operations', { ov: 'List' }) })),
    ...refunds.slice(0, 1).map((tx) => ({ key: 'refund-' + tx.id, title: 'Refund needs review', sub: tx.u + ' · ' + tx.id, right: mny(tx.rq || tx.a), action: () => go('finance', { fv: 'Refunds' }) })),
    ...(prototypeSnapshot ? [] : db.CASES.filter((item) => item.st !== 'Resolved').slice(0, 1)).map((item) => ({ key: item.id, title: item.st === 'Escalated' ? 'Escalated support case' : 'Open support case', sub: item.svc + ' · ' + item.t, right: item.o || 'Unassigned', action: () => go('operations') })),
  ].slice(0, 5);

  return (
    <View>
      <Heading title="Platform\nOverview" kpis={[
        { icon: '♛', value: prototypeSnapshot ? '—' : db.ACC.filter((account) => account.type === 'Customer').length.toLocaleString('en-US'), label: 'Active customers', tag: prototypeSnapshot ? 'Not connected yet' : undefined, onPress: () => go('people', { ps: 'Accounts' }) }, 
        { icon: '▥', value: prototypeSnapshot ? '—' : db.APPS.filter((app) => app.st === 3).length, label: 'Approved businesses', onPress: () => go('operations', { ov: 'List' }) }, 
        { icon: '◷', value: prototypeSnapshot ? '—' : waiting.length, label: 'Waiting for review', tag: prototypeSnapshot ? 'Not connected yet' : overdue.length + ' overdue', tone: overdue.length ? 'r' : '', onPress: () => go('operations', { ov: 'List' }) }, 
      ]} />

      <Section title="Platform activity" right={<View style={{ flexDirection: 'row', gap: 6 }}><Pill onPress={() => setExpandedChart(true)}>↗ Expand</Pill><Pill onPress={() => go('analytics')}>Analytics ›</Pill></View>}>
        <Chips options={ranges} value={ranges.includes(ui.AR as Range) ? ui.AR as Range : '30D'} onChange={setRange} />
        <Txt size={21} weight={500}>{prototypeSnapshot ? '—' : chart.total.toLocaleString('en-US')} <Txt size={10.1} mut>transactions · all services</Txt></Txt>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, marginBottom: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.or }} />
            <Txt size={9.5} mut>Completed transactions</Txt>
          </View>
          <Txt size={9.5} mut>{ui.AR === 'Custom' ? customStart + ' – ' + customEnd : ui.AR + ' activity range'}</Txt>
        </View>
        {!prototypeSnapshot && chart.available ? <LineChart vals={chart.vals} color={c.or} max={chart.max} labels={chart.labels} yLabels={chart.yLabels} /> : <Txt size={10.1} mut style={{ marginTop: 8 }}>Live timestamped transaction data is unavailable. No prototype activity is shown.</Txt>}
      </Section>

      <Section title="Needs attention" right={<Pill onPress={() => go('operations', { ov: 'List' })}>View queue ›</Pill>}>
        {attention.length === 0 ? (
          <Txt size={10.1} mut style={{ paddingVertical: 18, textAlign: 'center' }}>
            {prototypeSnapshot ? 'Not connected yet' : 'Nothing urgent is waiting right now.'}
          </Txt>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
            {attention.map((item) => (
              <Pressable key={item.key} onPress={item.action} style={{ flexGrow: 1, flexBasis: 150, minWidth: 145, backgroundColor: c.card, borderRadius: 13, padding: 12, gap: 7 }}>
                <Txt size={10.1} weight={600}>{item.title}</Txt>
                <Txt size={9.5} mut>{item.sub}</Txt>
                <Txt size={9.5} color={item.right === 'Unassigned' ? c.or : c.ink}>{item.right}</Txt>
              </Pressable>
            ))}
          </View>
        )}
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
          <Txt size={22} weight={500}>{prototypeSnapshot ? '—' : waiting.length} <Txt size={9.5} mut>waiting</Txt></Txt>
          <View style={{ flexDirection: 'row', height: 10, gap: 2, overflow: 'hidden', borderRadius: 99, marginVertical: 12, backgroundColor: prototypeSnapshot ? c.inset : undefined }}>
            {!prototypeSnapshot && queue.map((value, i) => <View key={i} style={{ flex: Math.max(0.01, value), backgroundColor: [c.ye, c.gr, c.or][i] }} />)}
          </View>
          {['Submitted', 'In review', 'Needs info'].map((label, i) => (
            <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
              <Txt size={9.5} mut>{label}</Txt><Txt size={9.5}>{prototypeSnapshot ? '—' : queue[i]}</Txt>
            </View>
          ))}
        </Card>
      </View>

      <Section title="Money snapshot" right={<Pill onPress={() => go('finance')}>Finance ›</Pill>}>
        <ListRows rows={[
          { key: 'completed', main: 'Completed this week', right: <Txt size={10.1}>{prototypeSnapshot ? 'Not connected yet' : `${completed.length} · ${mny(completed.reduce((n, tx) => n + tx.a, 0))}`}</Txt>, onPress: () => go('finance', { fs: 'Completed' }) }, 
          { key: 'pending', main: 'Pending settlement', right: <Txt size={10.1}>{prototypeSnapshot ? 'Not connected yet' : `${pending.length} · ${mny(pending.reduce((n, tx) => n + tx.a, 0))}`}</Txt>, onPress: () => go('finance', { fs: 'Pending' }) }, 
          { key: 'failed', main: 'Failed or flagged', right: <Txt size={10.1} color={failed.length ? c.or : c.ink}>{prototypeSnapshot ? 'Not connected yet' : `${failed.length} · ${mny(failed.reduce((n, tx) => n + tx.a, 0))}`}</Txt>, onPress: () => go('finance', { fs: 'Failed' }) }, 
          { key: 'refunds', main: 'Refunds waiting', right: prototypeSnapshot ? '—' : String(refunds.length), onPress: () => go('finance', { fv: 'Refunds' }) }, 
          { key: 'payouts', main: 'Payouts due', right: prototypeSnapshot ? '—' : String(db.PAYO.filter((payout) => payout[3] !== 'Paid').length), onPress: () => go('finance', { fv: 'Payouts' }) }, 
        ]} />
      </Section>

      <Section title="Feature health" right={<Pill onPress={() => go('ecosystem')}>Ecosystem ›</Pill>}>
        <ListRows rows={['Goodies', 'Stays', 'Woulib', 'Konsoliss'].map((name) => ({
          key: name, main: name,
          sub: 'Service-health metrics are not supplied by the current authorized endpoint.',
          right: <StatusPill label="Unavailable" tone="grey" small />,
        }))} />
      </Section>

      <Section title="Content and promotions" right={<Pill onPress={() => go('content')}>Content ›</Pill>}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 8 }}>
          <Pill onPress={() => go('content', { cs: 'Banners' })}>Live —</Pill>
          <Pill onPress={() => go('content', { cs: 'Calendar' })}>Scheduled —</Pill>
          <Pill onPress={() => go('content', { cs: 'Approvals' })}>Drafts —</Pill>
          <Pill onPress={() => go('content', { cs: 'Calendar' })}>Expiring —</Pill>
        </View>
        <ListRows empty="CMS placement snapshot unavailable. No seeded banner counts or sample placements are shown." rows={[]} />
      </Section>

      <Modal transparent visible={customOpen} animationType="fade" onRequestClose={() => setCustomOpen(false)}>
        <Pressable onPress={() => setCustomOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.42)', justifyContent: 'center', padding: 20 }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: c.card, borderRadius: 16, padding: 18, gap: 10 }}>
            <Txt size={16} weight={600}>Custom range</Txt>
            <Txt size={10.1} mut>Choose a start and end date. The chart will show only timestamped authorized records within this range.</Txt>
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
              <Txt size={16} weight={600}>Platform activity</Txt>
              <Pill onPress={() => setExpandedChart(false)}>Close ×</Pill>
            </View>
            <Txt size={10.1} mut>{ui.AR === 'Custom' ? customStart + ' – ' + customEnd : ui.AR + ' selected range'}</Txt>
            <Txt size={23} weight={600}>{prototypeSnapshot ? '—' : chart.total.toLocaleString('en-US')}</Txt>
            {!prototypeSnapshot && chart.available ? <LineChart vals={chart.vals} color={c.or} max={chart.max} labels={chart.labels} yLabels={chart.yLabels} /> : <Txt size={10.1} mut style={{ paddingVertical: 24, textAlign: 'center' }}>Live timestamped transaction data is unavailable. No prototype activity is shown.</Txt>}
            <Txt size={10.1} mut>Service breakdown is unavailable until authorized live transaction data is connected.</Txt>
          </Pressable>
        </Pressable>
      </Modal>
      <Section title="Team and recent activity" right={<Pill onPress={() => go('people', { ps: 'Audit log' })}>Audit log ›</Pill>}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {!prototypeSnapshot && db.STAFF.slice(0, 4).map((staff) => <Pill key={staff.n} onPress={() => go('people', { ps: 'Staff' })}>{staff.n} · {staff.st}</Pill>)}
          {!prototypeSnapshot && <Pill onPress={() => go('operations', { ou: 1 })}>{unassigned.length} unassigned</Pill>}
        </View>
        <ListRows empty={prototypeSnapshot ? 'Not connected yet' : 'No recent activity.'} rows={(prototypeSnapshot ? [] : db.AUD.slice(0, 4)).map((event, i) => ({
          key: String(i), main: event[0], sub: event[1], right: event[2],
        }))} />
      </Section>
    </View>
  );
}
