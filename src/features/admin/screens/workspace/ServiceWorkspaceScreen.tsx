import { useMemo } from 'react';
import { View } from 'react-native';
import { db, dataMode, ui, bump, useDb } from '../../state/db';
import { useNav } from '../../shell/Nav';
import { useOpen } from '../../overlays/registry';
import { useTheme } from '../../theme/ThemeContext';
import { Card, Section } from '../../ui/Card';
import { Heading } from '../../ui/Heading';
import { Chips, OutlineBtn, Pill, Row, SearchInput, SelectMenu, StatusPill } from '../../ui/Controls';
import { ListRows, Small } from '../../ui/Lists';
import { Txt } from '../../ui/Txt';
import { GOODIES_MODULES } from '../goodies/modules';

const num = (value: unknown) => Number.parseInt(String(value ?? 0), 10) || 0;

export function ServiceWorkspaceScreen() {
  useDb();
  const { c } = useTheme();
  const { go } = useNav();
  const open = useOpen();
  const serviceName = String(ui.wsvc || 'Goodies');
  const service = db.SVC.find((row) => row[0] === serviceName) || db.SVC[0];
  const modules = (serviceName === 'Goodies' ? GOODIES_MODULES.join('|') : db.MOD[serviceName] || 'Overview|Configuration').split('|');
  const moduleName = modules.includes(String(ui.wmod)) ? String(ui.wmod) : 'Overview';
  const setModule = (next: string) => { ui.wmod = next; ui.wf = 'All'; ui.wq = ''; bump(); };
  const serviceApps = dataMode === 'live' ? db.APPS.filter((row) => row.s === serviceName) : [];
  const serviceCases = dataMode === 'live' ? db.CASES.filter((row) => row.svc === serviceName) : [];
  const serviceTransactions = dataMode === 'live' ? db.INV.filter((row) => row.f.toLowerCase().includes(serviceName.toLowerCase()) || (serviceName === 'Top up' && /top.?up/i.test(row.f))) : [];
  const serviceAccounts = dataMode === 'live' ? db.ACC.filter((row) => row.svc.includes(serviceName)) : [];
  const serviceBanners = dataMode === 'live' ? db.BN.filter((row) => row.svc === serviceName) : [];
  const servicePromos = dataMode === 'live' ? db.PRM.filter((row) => row.svc === serviceName) : [];
  const query = String(ui.wq || '').trim().toLowerCase();

  const sourceRows = useMemo(() => {
    const lower = moduleName.toLowerCase();
    if (/support|issue|dispute|complaint|incident|problem/.test(lower)) return serviceCases.map((row) => ({ key: row.id, title: row.t, sub: row.svc + ' · ' + row.pri + ' · ' + row.st, right: row.o || 'Unassigned', action: () => open('case', row.id) }));
    if (/merchant|provider|driver|seller|owner|host|creator|supplier|business/.test(lower)) return serviceAccounts.map((row) => ({ key: row.id, title: row.n, sub: row.type + ' · ' + row.svc.join(', '), right: row.paused ? 'Restricted' : 'Open account', action: () => open('acc', row.id) }));
    if (/promotion|campaign|deal|redemption/.test(lower)) return [
      ...servicePromos.map((row) => ({ key: row.id, title: row.n, sub: row.fund + ' · ' + row.inc, right: row.st, action: () => go('content', { cs: 'Promotions' }) })),
      ...serviceBanners.map((row) => ({ key: row.id, title: row.t, sub: row.pl, right: row.st, action: () => open('ban', row.id) })),
    ];
    if (/document|approval|submission|application|listing/.test(lower)) return serviceApps.map((row) => ({ key: row.id, title: row.n, sub: row.id + ' · ' + row.age + 'd waiting', right: ['Submitted', 'In review', 'Needs info', 'Approved', 'Rejected'][row.st] || 'Pending', action: () => open('app', row.id) }));
    if (/order|booking|trip|transaction|shipment|payment|refund|top-up|rental|bid|request/.test(lower)) return serviceTransactions.map((row) => ({ key: row.id, title: row.id + ' · ' + row.f, sub: row.u + ' · $' + row.a.toFixed(2), right: row.s, action: () => open('inv', row.id) }));
    return [
      ...serviceApps.map((row) => ({ key: 'app-' + row.id, title: row.n, sub: 'Application · ' + row.age + 'd waiting', right: row.o || 'Unassigned', action: () => open('app', row.id) })),
      ...serviceCases.map((row) => ({ key: 'case-' + row.id, title: row.t, sub: row.pri + ' · ' + row.st, right: row.o || 'Unassigned', action: () => open('case', row.id) })),
      ...serviceTransactions.map((row) => ({ key: 'tx-' + row.id, title: row.id + ' · ' + row.f, sub: row.u + ' · $' + row.a.toFixed(2), right: row.s, action: () => open('inv', row.id) })),
      ...serviceBanners.map((row) => ({ key: 'banner-' + row.id, title: row.t, sub: 'Content · ' + row.pl, right: row.st, action: () => open('ban', row.id) })),
    ];
  }, [moduleName, serviceName, serviceApps, serviceCases, serviceTransactions, serviceAccounts, serviceBanners, servicePromos, go, open]);

  const queryRows = sourceRows.filter((row) => !query || (row.title + ' ' + row.sub + ' ' + row.right).toLowerCase().includes(query));
  const visibleRows = ui.wf === 'Pending' ? queryRows.filter((row) => /pending|unassigned|submitted|review|failed|needs info|open|discrepancy/i.test(row.right + ' ' + row.sub)) : queryRows;
  const pre = service[5] === 'Pre-order';
  const moduleKind = /analytics/i.test(moduleName) ? 'analytics'
    : /^Overview$/i.test(moduleName) ? 'overview'
    : /settings|configuration|pricing and rules|availability|scheduling/i.test(moduleName) ? 'config'
    : 'records';
  const analyticsRanges = ['7D', '30D', '90D', '1Y', 'Custom'] as const;
  const selectedRange = analyticsRanges.includes(String(ui.AR || '30D') as typeof analyticsRanges[number])
    ? String(ui.AR || '30D') as typeof analyticsRanges[number] : '30D';

  return (
    <View>
      <Row style={{ marginBottom: 4 }}>
        <Pill onPress={() => go('ecosystem')}>‹ Ecosystem</Pill>
        <Txt size={10.1} mut>{serviceName} · Workspace</Txt>
      </Row>
      <Heading title={serviceName + '\n' + moduleName} sub={service[1]} kpis={[
        { icon: '▥', value: dataMode === 'live' ? serviceTransactions.length : '—', label: 'Orders today', tag: pre ? 'Pre-order' : dataMode === 'live' ? 'Authorized snapshot' : 'Not connected', onPress: () => go('finance') },
        { icon: '▤', value: dataMode === 'live' ? sourceRows.filter((row) => /pending|unassigned|submitted|review|failed|needs info|open|discrepancy/i.test(row.right + ' ' + row.sub)).length : '—', label: 'Pending items', onPress: () => go('operations') },
        { icon: '◔', value: '—', label: 'Health score' },
      ]} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {modules.length > 5 ? <SelectMenu label={serviceName + ' section'} options={modules} value={moduleName} onChange={setModule} /> : <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 9 }}>{modules.map((name) => <Pill key={name} on={name === moduleName} onPress={() => setModule(name)}>{name}</Pill>)}</View>}
      </View>

      {moduleKind === 'overview' ? (
        <>
          <Section title="Modules">
            <ListRows empty="No modules are configured for this service." rows={modules.filter((name) => name !== 'Overview').map((name) => ({
              key: name, main: name, sub: 'Open ' + serviceName + ' ' + name.toLowerCase(), right: '›', onPress: () => setModule(name),
            }))} />
          </Section>
          <Section title="Recent activity" right={<Pill onPress={() => go('operations')}>Operations ›</Pill>}>
            <ListRows empty={dataMode === 'live' ? 'No matching service activity.' : 'Not connected yet'} rows={sourceRows.slice(0, 4).map((row) => ({
              key: row.key, main: row.title, sub: row.sub, right: row.right, onPress: row.action,
            }))} />
          </Section>
        </>
      ) : moduleKind === 'analytics' ? (
        <>
          <Row wrap>
            <Chips options={analyticsRanges} value={selectedRange} onChange={(value) => { ui.AR = value; bump(); }} />
          </Row>
          <Section title={serviceName + ' analytics'}>
            <Txt size={10.5} mut lh={1.4}>Not connected yet.</Txt>
            <View style={{ minHeight: 104, alignItems: 'center', justifyContent: 'center', marginTop: 8, backgroundColor: c.inset, borderRadius: 10 }}>
              <Txt size={10.1} mut>No data for this range.</Txt>
            </View>
          </Section>
        </>
      ) : moduleKind === 'config' ? (
        <Section title={moduleName}>
          <Txt size={10.5} mut lh={1.4}>Read-only until an authorized configuration endpoint is connected.</Txt>
          <ListRows rows={[
            { key: 'enabled', main: 'Enabled', sub: 'Service availability', right: '—' },
            { key: 'review', main: 'Review before publishing', sub: 'Approval requirement', right: '—' },
            { key: 'limit', main: 'Daily limit', sub: 'Service-specific limit', right: '—' },
            { key: 'notify', main: 'Notify admins', sub: 'Operational notifications', right: '—' },
          ]} />
        </Section>
      ) : (
        <>
          <Row wrap>
            <View style={{ flex: 1, minWidth: 160 }}><SearchInput value={String(ui.wq || '')} onChangeText={(value) => { ui.wq = value; bump(); }} placeholder={'Search ' + moduleName.toLowerCase()} /></View>
            <Pill onPress={() => { ui.wq = ''; bump(); }}>Clear</Pill>
          </Row>
          <Section title={moduleName + (dataMode === 'live' ? ' · ' + visibleRows.length : '')} right={<Pill onPress={() => { ui.wf = ui.wf === 'All' ? 'Pending' : 'All'; bump(); }}>{ui.wf === 'All' ? 'Filter pending' : 'Show all'}</Pill>}>
            <ListRows empty={dataMode === 'live' ? 'No records match this module.' : 'Not connected yet'} rows={visibleRows.map((row) => ({
              key: row.key, main: row.title, sub: row.sub,
              right: <View style={{ alignItems: 'flex-end', gap: 3 }}><Txt size={9.5} color={row.right === 'Unassigned' ? c.or : c.ink}>{row.right}</Txt><Small>Open ›</Small></View>,
              onPress: row.action,
            }))} />
          </Section>
          <Card>
            <Txt size={10.1} weight={500}>Workspace scope</Txt>
            <Txt size={9.5} mut lh={1.4}>Actions are disabled until authorized service endpoints are connected.</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 6 }}>
              <OutlineBtn onPress={() => go('operations')}>Operations</OutlineBtn>
              <OutlineBtn onPress={() => go('finance')}>Finance</OutlineBtn>
              <OutlineBtn onPress={() => go('people')}>People</OutlineBtn>
              <OutlineBtn onPress={() => go('content')}>Content</OutlineBtn>
            </View>
          </Card>
        </>
      )}
    </View>
  );
}
