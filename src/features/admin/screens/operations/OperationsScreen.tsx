import { ScrollView, View } from 'react-native';
import { bump, db, ui, useDb } from '../../state/db';
import { can } from '../../state/access';
import { REQ, useGuard } from '../../state/requirements';
import { useNav } from '../../shell/Nav';
import { useOpen } from '../../overlays/registry';
import { docsText, useAssignWork } from '../../overlays/ApplicationDrawers';
import { Section } from '../../ui/Card';
import { Btn, Chips, CountTag, Dot, Pill, Row, SearchInput, StatusPill } from '../../ui/Controls';
import { Deal } from '../../ui/Deal';
import { Heading } from '../../ui/Heading';
import { AppIcon } from '../../ui/AppIcon';
import { ListRows, Small, Table } from '../../ui/Lists';
import { Card } from '../../ui/Card';
import { Txt } from '../../ui/Txt';
import { useTheme } from '../../theme/ThemeContext';
import { STATUS_TONE } from '../../theme/tokens';

const waiting = () => db.APPS.filter((a) => a.st < 3);
const over48 = () => waiting().filter((a) => a.age >= 2);
const pendingDocs = () => waiting().reduce((n, a) => n + a.d.filter((x) => x[1] === 'pending').length, 0);

const rows = () => {
  const q = String(ui.oq).toLowerCase();
  return db.APPS.filter((a) => (!q || (a.n + a.id + a.s + a.o).toLowerCase().includes(q)) && (ui.o48 !== 1 || (a.st < 3 && a.age >= 2)) && (ui.ou !== 1 || (a.o === 'Unassigned' && a.st < 3)));
};

export function OperationsScreen() {
  useDb();
  const { go } = useNav();
  const open = useOpen();
  const guard = useGuard();
  const assignWork = useAssignWork();
  const { c } = useTheme();
  const w = waiting();
  const list = rows();
  const set = (k: string, v: unknown) => { ui[k] = v; bump(); };

  const board = () => {
    const col = (i: number, tone: string, title: string, sub: string, deal: 'y' | 'g' | 'o') => {
      const l = list.filter((a) => a.st === i);
      return (
        <View key={i} style={{ width: 168, backgroundColor: c.card, borderRadius: 22, padding: 10, paddingHorizontal: 8, borderWidth: 1, borderColor: c.bd, minHeight: 420 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><Dot color={tone} /><Txt size={11.2} weight={500}>{title}</Txt><CountTag n={l.length} /></View>
          <Txt size={9.5} mut style={{ marginLeft: 11, marginTop: 1, marginBottom: 7 }}>{sub}</Txt>
          <View style={{ gap: 7 }}>
            {l.length ? l.map((a) => (
              <Deal key={a.id} tone={deal} top={(a.hold ? 'On hold · ' : '') + (a.esc ? 'Escalated · ' : '') + 'Waiting ' + a.age + 'd'} title={a.n} sub={a.s} value={docsText(a)} meta={a.o} onPress={() => open('app', a.id)} />
            )) : <Txt size={12} mut style={{ padding: 8 }}>Nothing here.</Txt>}
          </View>
        </View>
      );
    };
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginRight: -10 }}>
        {col(0, 'ye', 'Submitted', 'oldest first', 'y')}{col(1, 'gr', 'In review', 'owner assigned', 'g')}{col(2, 'or', 'Needs info', 'waiting on applicant', 'o')}
      </ScrollView>
    );
  };

  const body = () => {
    if (ui.ov === 'Board') return board();
    if (ui.ov === 'List') {
      const l = list.filter((a) => a.st < 3).sort((a, b) => b.age - a.age);
      return l.length ? (
        <Table columns={[{ title: 'Business', flex: 1.6 }, { title: 'Stage', flex: 1.2 }, { title: 'Age', flex: 0.6 }, { title: 'Owner', flex: 1 }]}
          rows={l.map((a) => ({ key: a.id, onPress: () => open('app', a.id), cells: [<View key="b"><Txt size={9.5} weight={600}>{a.n}</Txt><Small>{a.id + ' · ' + a.s}</Small></View>, <StatusPill key="s" label={db.STG[a.st]} small />, a.age + 'd', a.o] }))} />
      ) : <Txt size={12} mut align="center" style={{ paddingVertical: 14 }}>No applications match.</Txt>;
    }
    if (ui.ov === 'Documents') {
      const l: [(typeof db.APPS)[number], [string, string], number][] = [];
      list.filter((a) => a.st < 3).forEach((a) => a.d.forEach((d, i) => { if (d[1] !== 'verified') l.push([a, d, i]); }));
      return l.length ? <ListRows rows={l.map((x) => ({ key: x[0].id + x[2], main: x[0].n, sub: x[1][0], right: <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><StatusPill label={x[1][1]} /><AppIcon name="chevron-right" size={12} /></View>, onPress: () => open('doc', x[0].id + ':' + x[2]) }))} /> : <Txt size={12} mut>All documents are verified.</Txt>;
    }
    const closed = list.filter((a) => a.st >= 3);
    return closed.length ? <ListRows rows={closed.map((a) => ({ key: a.id, main: a.n, sub: a.id + ' · ' + a.s, right: <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><StatusPill label={db.STG[a.st]} tone={STATUS_TONE[db.STG[a.st]]} /><Txt size={10.1}>›</Txt></View>, onPress: () => open('app', a.id) }))} /> : <Txt size={12} mut>No closed applications.</Txt>;
  };

  return (
    <View>
      <Heading title="Operations Queue" kpis={[
        { icon: 'clock-alert', value: w.length, label: 'Waiting for review', onPress: () => go('operations', { ov: 'Board', o48: 0, ou: 0 }) },
        { icon: 'file-pen', value: pendingDocs(), label: 'Documents to verify', onPress: () => go('operations', { ov: 'Documents' }) },
        { icon: 'clipboard-list', value: over48().length, label: 'Over 48 hours', tag: 'oldest ' + Math.max(0, ...w.map((a) => a.age)) + 'd', tone: 'r', onPress: () => go('operations', { ov: 'List', o48: 1 }) },
      ]} />
      <Row><SearchInput value={ui.oq} onChangeText={(v) => set('oq', v)} placeholder="Search business, reviewer, service" /></Row>
      <Chips options={['Board', 'List', 'Documents', 'Closed'] as const} value={ui.ov} onChange={(v) => set('ov', v)} />
      <Row wrap>
        {can(...REQ.review) ? <Btn onPress={guard(REQ.review, assignWork)}>+ Assign</Btn> : null}
        {ui.o48 === 1 ? <Pill on onPress={() => set('o48', 0)}>Clear over-48h filter</Pill> : null}
        {ui.ou === 1 ? <Pill on onPress={() => set('ou', 0)}>Clear unassigned filter</Pill> : null}
      </Row>
      {body()}
    </View>
  );
}
