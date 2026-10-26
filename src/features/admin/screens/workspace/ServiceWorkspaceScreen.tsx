import { useMemo } from 'react';
import { View } from 'react-native';
import { db, ui, bump, useDb } from '../../state/db';
import { useNav } from '../../shell/Nav';
import { useOpen } from '../../overlays/registry';
import { useTheme } from '../../theme/ThemeContext';
import { Card, Section } from '../../ui/Card';
import { Heading } from '../../ui/Heading';
import { Chips, OutlineBtn, Pill, Row, SearchInput, StatusPill } from '../../ui/Controls';
import { ListRows, Small } from '../../ui/Lists';
import { Txt } from '../../ui/Txt';

const num = (value: unknown) => Number.parseInt(String(value ?? 0), 10) || 0;

export function ServiceWorkspaceScreen() {
  useDb();
  const { c } = useTheme();
  const { go } = useNav();
  const open = useOpen();
  const serviceName = String(ui.wsvc || 'Goodies');
  const service = db.SVC.find((row) => row[0] === serviceName) || db.SVC[0];
  const modules = (serviceName === 'Goodies' ? 'Overview|Products and catalog|Categories|Merchants|Product review|Orders|Promotions|Support|Analytics|Settings' : db.MOD[serviceName] || 'Overview|Configuration').split('|');
  const moduleName = modules.includes(String(ui.wmod)) ? String(ui.wmod) : 'Overview';
  const setModule = (next: string) => { ui.wmod = next; ui.wf = 'All'; ui.wq = ''; bump(); };
  const serviceApps = db.APPS.filter((row) => row.s === serviceName);
  const serviceCases = db.CASES.filter((row) => row.svc === serviceName);
  const serviceTransactions = db.INV.filter((row) => row.f.toLowerCase().includes(serviceName.toLowerCase()) || (serviceName === 'Top up' && /top.?up/i.test(row.f)));
  const serviceAccounts = db.ACC.filter((row) => row.svc.includes(serviceName));
  const serviceBanners = db.BN.filter((row) => row.svc === serviceName);
  const servicePromos = db.PRM.filter((row) => row.svc === serviceName);
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

  return (
    <View>
      <Row style={{ marginBottom: 4 }}>
        <Pill onPress={() => go('ecosystem')}>‹ Ecosystem</Pill>
        <Txt size={10.1} mut>{serviceName} · Workspace</Txt>
      </Row>
      <Heading title={serviceName + '\n' + moduleName} sub={service[1]} kpis={[
        { icon: '▥', value: service[2], label: pre ? 'Status' : 'Today', tag: service[5], onPress: () => go('finance') },
        { icon: '◷', value: service[3], label: pre ? 'Launch phase' : 'Pending', tone: num(service[3]) >= 5 ? 'r' : '', onPress: () => go('operations') },
        { icon: '♛', value: service[4] + '%', label: pre ? 'Launch readiness' : 'Health score' },
      ]} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {modules.map((name) => <Pill key={name} on={name === moduleName} onPress={() => setModule(name)}>{name}</Pill>)}
      </View>

      {moduleName === 'Overview' ? (
        <>
          {pre ? <Card><Txt size={11} mut>{serviceName} is marked Pre-order. Do not treat its demo activity as a live service.</Txt></Card> : null}
          <Section title="Service health">
            <ListRows rows={[
              { key: 'applications', main: 'Applications and submissions', sub: 'Review and onboarding queue', right: String(serviceApps.length), onPress: () => setModule(modules.find((m) => /approval|submission|application|listing/i.test(m)) || 'Overview') },
              { key: 'transactions', main: 'Transactions and bookings', sub: 'Seeded records associated with this service', right: String(serviceTransactions.length), onPress: () => setModule(modules.find((m) => /order|booking|trip|transaction|shipment|payment|rental|bid/i.test(m)) || 'Overview') },
              { key: 'support', main: 'Support cases and issues', sub: 'Unresolved service cases', right: String(serviceCases.filter((row) => row.st !== 'Resolved').length), onPress: () => setModule(modules.find((m) => /support|issue|dispute|complaint|incident/i.test(m)) || 'Overview') },
              { key: 'content', main: 'Banners and promotions', sub: 'Content linked to this service', right: String(serviceBanners.length + servicePromos.length), onPress: () => setModule(modules.find((m) => /promotion|campaign|deal/i.test(m)) || 'Overview') },
            ]} />
          </Section>
          <Section title="Recent activity" right={<Pill onPress={() => go('operations')}>Operations ›</Pill>}>
            <ListRows empty="No matching service records are in the current snapshot." rows={sourceRows.slice(0, 6).map((row) => ({ key: row.key, main: row.title, sub: row.sub, right: row.right, onPress: row.action }))} />
          </Section>
        </>
      ) : (
        <>
          <Row wrap>
            <View style={{ flex: 1, minWidth: 160 }}><SearchInput value={String(ui.wq || '')} onChangeText={(value) => { ui.wq = value; bump(); }} placeholder={'Search ' + moduleName.toLowerCase()} /></View>
            <Pill onPress={() => { ui.wq = ''; bump(); }}>Clear</Pill>
          </Row>
          <Section title={moduleName + ' · ' + visibleRows.length} right={<Pill onPress={() => { ui.wf = ui.wf === 'All' ? 'Pending' : 'All'; bump(); }}>{ui.wf === 'All' ? 'Filter pending' : 'Show all'}</Pill>}>
            <ListRows empty="No records match this module in the current dataset." rows={visibleRows.map((row) => ({
              key: row.key, main: row.title, sub: row.sub,
              right: <View style={{ alignItems: 'flex-end', gap: 3 }}><Txt size={9.5} color={row.right === 'Unassigned' ? c.or : c.ink}>{row.right}</Txt><Small>Open ›</Small></View>,
              onPress: row.action,
            }))} />
          </Section>
          <Card>
            <Txt size={10.1} weight={500}>Workspace scope</Txt>
            <Txt size={9.5} mut lh={1.4}>This module view is based on the current admin snapshot and links to the existing authorized record drawers. Service-specific create, approve, refund and publish actions must use the corresponding server endpoint; this shared view does not invent them.</Txt>
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
