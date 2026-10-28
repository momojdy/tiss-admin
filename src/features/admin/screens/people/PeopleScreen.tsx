import { Pressable, ScrollView, View } from 'react-native';
import { bump, db, ui, useDb } from '../../state/db';
import { acs, can, expireStaff, needs } from '../../state/access';
import {
  ACC_TONE, accStatus, accStatusLabel, expireAccounts, levelFill, STAFF_TONE,
} from '../../state/people';
import { grantStats } from '../../state/grants';
import { useNav } from '../../shell/Nav';
import { useOpen } from '../../overlays/registry';
import { useInvite, useNewRole, useRoleEditor } from '../../overlays/PeopleDrawers';
import { Section } from '../../ui/Card';
import { Btn, Chips, Row, SearchInput, SelectMenu, StatusPill } from '../../ui/Controls';
import { Heading } from '../../ui/Heading';
import { ListRows } from '../../ui/Lists';
import { Txt } from '../../ui/Txt';
import { PermissionsBody, RequestsBody } from './PermissionsPanels';
import { useTheme } from '../../theme/ThemeContext';
import type { StaffMember } from '../../data/types';

/** Requests and Permissions are for people who can manage permissions (Super Admin); everyone else asks from Account. */
export const PEOPLE_SUBS = ['Staff', 'Requests', 'Permissions', 'Accounts', 'Restrictions', 'Customers', 'Businesses', 'Roles', 'Invitations', 'Audit log'] as const;
const STAFF_STATUS = ['All', 'Active', 'Suspended', 'Revoked', 'Invited'] as const;
const ACCOUNT_TYPES = ['All', 'Customer', 'Seller', 'Vendor'] as const;
const ACCOUNT_STATUS = ['All', 'Active', 'Suspended', 'Restricted', 'Banned', 'In review'] as const;
const RESTRICTION_FILTERS = ['All', 'Suspended', 'Banned', 'Reinstated', 'Expired', 'Appeals'] as const;
const RESTRICTION_TEST: Record<string, (action: string) => boolean> = {
  All: () => true, Suspended: (a) => /Suspen/.test(a), Banned: (a) => /Ban/.test(a), Reinstated: (a) => /Reinstat|Lifted/.test(a), Expired: (a) => /Expired/.test(a), Appeals: (a) => /Appeal|Upheld/.test(a),
};
/** Short column heads for the access matrix: Overview -> Ov, Operations -> Op ... */
const abbr = (s: string) => s.slice(0, 2);

const Chev = () => <Txt size={10.1}>›</Txt>;
const Right = ({ children }: { children: React.ReactNode }) => <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>{children}<Chev /></View>;

export function PeopleScreen() {
  useDb();
  expireStaff();
  expireAccounts();
  const { go } = useNav();
  const open = useOpen();
  const invite = useInvite();
  const newRole = useNewRole();
  const editRole = useRoleEditor();
  const { c } = useTheme();
  const set = (k: string, v: unknown) => { ui[k] = v; bump(); };
  const mp = can(needs('Manage permissions'));
  const grantSubs = ['Requests', 'Permissions'];
  const sub: string = !mp && grantSubs.includes(ui.ps) ? 'Staff' : ui.ps;
  const subs = PEOPLE_SUBS.filter((x) => mp || !grantSubs.includes(x));
  const q = String(ui.pq).toLowerCase();

  const count = (st: string) => db.STAFF.filter((s) => s.st === st).length;
  const header = () => {
    if (sub === 'Staff') {
      return <Heading title={'Employees &\nPermissions'} kpis={[
        { icon: 'users', value: count('Active'), label: 'Active staff', onPress: () => go('people', { ps: 'Staff', sst: 'Active' }) },
        { icon: '◐', value: count('Suspended'), label: 'Suspended', onPress: () => go('people', { ps: 'Staff', sst: 'Suspended' }) },
        { icon: 'shield-alert', value: count('Revoked'), label: 'Revoked', tone: 'r', onPress: () => go('people', { ps: 'Staff', sst: 'Revoked' }) },
      ]} />;
    }
    if (sub === 'Requests' || sub === 'Permissions') {
      const g = grantStats();
      return <Heading title={sub === 'Requests' ? 'Access\nrequests' : 'Permissions\nanalytics'} kpis={[
        { icon: 'file-pen', value: g.pending, label: 'Waiting requests', tone: 'r', onPress: () => go('people', { ps: 'Requests', rqf: 'Pending' }) },
        { icon: 'users', value: g.live, label: 'Running grants', onPress: () => go('people', { ps: 'Permissions', grf: 'Active' }) },
        { icon: '◔', value: g.soon, label: 'Ending in 3 days', tone: 'r', onPress: () => go('people', { ps: 'Permissions', grf: 'Active' }) },
      ]} />;
    }
    if (sub === 'Accounts' || sub === 'Restrictions') {
      return <Heading title="People" kpis={[
        { icon: 'shield-alert', value: db.ACC.filter((a) => accStatus(a) !== 'Active').length, label: 'Restricted accounts', tone: 'r', onPress: () => go('people', { ps: 'Accounts', ast: 'All', at: 'All' }) },
        { icon: 'users', value: db.ACC.filter((a) => accStatus(a) === 'Suspended').length, label: 'Suspended', onPress: () => go('people', { ps: 'Accounts', ast: 'Suspended' }) },
        { icon: 'shield-alert', value: db.ACC.filter((a) => ['Banned', 'In review'].includes(accStatus(a))).length, label: 'Banned', tone: 'r', onPress: () => go('people', { ps: 'Accounts', ast: 'Banned' }) },
      ]} />;
    }
    const unassigned = db.APPS.filter((a) => a.o === 'Unassigned' && a.st < 3).length;
    return <Heading title="People" kpis={[
      { icon: 'users', value: count('Active'), label: 'Active staff', onPress: () => go('people', { ps: 'Staff' }) },
      { icon: '▤', value: db.APPS.filter((a) => a.st < 3).length + db.CASES.filter((x) => x.st !== 'Resolved').length, label: 'Open assignments', tag: unassigned + ' unassigned', tone: 'r', onPress: () => go('operations', { ov: 'List', ou: 1 }) },
      { icon: 'settings', value: Object.keys(db.ROLES).length, label: 'Roles', onPress: () => go('people', { ps: 'Roles' }) },
    ]} />;
  };

  const staffRows = (): StaffMember[] => db.STAFF.filter((s) => s.st !== 'Cancelled' && (ui.sst === 'All' || s.st === ui.sst) && (ui.pr === 'All' || s.role === ui.pr) && (!q || s.n.toLowerCase().includes(q)));

  const matrix = (l: StaffMember[]) => (
    <Section title="Access matrix">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ width: 118, paddingVertical: 4 }}><Txt size={9.5} mut>Staff</Txt></View>
            {db.SEC.map((x) => <View key={x} style={{ width: 30, alignItems: 'center', paddingVertical: 4 }} accessibilityLabel={x}><Txt size={9.5} mut>{abbr(x)}</Txt></View>)}
          </View>
          {l.map((s) => {
            const e = acs(s);
            return (
              <Pressable2 key={s.n} onPress={() => open('staff', s.n)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: c.bd, paddingVertical: 5 }}>
                  <View style={{ width: 118 }}>
                    <Txt size={9.5} weight={600}>{s.n}</Txt>
                    <Txt size={9} mut numberOfLines={1}>{s.role + (s.st !== 'Active' ? ' · ' + s.st : '')}</Txt>
                  </View>
                  {e.lv.map((lv, i) => (
                    <View key={i} style={{ width: 30, alignItems: 'center' }}>
                      <View style={{ minWidth: 16, borderRadius: 5, backgroundColor: levelFill(lv, c), paddingVertical: 1, paddingHorizontal: 3, alignItems: 'center' }}>
                        <Txt size={9.5} color={lv === 2 ? '#fff' : c.ink}>{['–', 'V', 'E'][lv]}</Txt>
                      </View>
                    </View>
                  ))}
                </View>
              </Pressable2>
            );
          })}
        </View>
      </ScrollView>
      <Txt size={9.5} mut style={{ marginTop: 6 }}>{'V view · E edit · – none. Columns: ' + db.SEC.join(', ') + '.'}</Txt>
    </Section>
  );

  const staffBody = () => {
    const l = staffRows();
    const waiting = grantStats().pending;
    return (
      <View>
        {mp && waiting ? (
          <Pressable onPress={() => set('ps', 'Requests')} accessibilityRole="button" style={{ backgroundColor: c.card, borderColor: c.bd, borderWidth: 1, borderRadius: 16, padding: 10, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Txt size={10.6}>{waiting + (waiting === 1 ? ' access request is' : ' access requests are') + ' waiting for a decision'}</Txt><Chev />
          </Pressable>
        ) : null}
        {matrix(l)}
        <Section title="Employees">
          <ListRows empty="No staff match." rows={l.map((s) => ({
            key: s.n, main: s.n, sub: s.role + ' · ' + (s.scope.length ? s.scope.length + ' services' : 'All services') + (s.until ? ' · grants until ' + s.until : ''),
            right: <Right><StatusPill label={s.st} tone={STAFF_TONE[s.st]} small /></Right>, onPress: () => open('staff', s.n),
          }))} />
        </Section>
      </View>
    );
  };

  const accountsBody = () => {
    const l = db.ACC.filter((a) => (ui.at === 'All' || a.type === ui.at) && (ui.ast === 'All' || accStatus(a) === ui.ast) && (!q || (a.n + a.id + a.svc.join()).toLowerCase().includes(q)));
    return (
      <View>
        <Txt size={11} mut style={{ marginBottom: 6 }}>{l.length + ' of ' + db.ACC.length + ' accounts. Staff access is managed under Staff and Roles.'}</Txt>
        <ListRows empty="No accounts match." rows={l.map((a) => ({
          key: a.id, main: a.n, sub: a.type + (a.svc.length ? ' · ' + a.svc.join(', ') : '') + ' · ' + a.orders + ' open orders',
          right: <Right><StatusPill label={accStatusLabel(a)} tone={ACC_TONE[accStatus(a)]} small /></Right>, onPress: () => open('acc', a.id),
        }))} />
      </View>
    );
  };

  const restrictionsBody = () => {
    const test = RESTRICTION_TEST[ui.rf || 'All'];
    const ev: [(typeof db.ACC)[number], (typeof db.ACC)[number]['hist'][number]][] = [];
    db.ACC.forEach((a) => a.hist.forEach((h) => ev.push([a, h])));
    const l = ev.filter(([a, h]) => test(h.action) && (!q || (a.n + h.action + h.txt).toLowerCase().includes(q))).reverse();
    return <ListRows empty="No events match." rows={l.map(([a, h], i) => ({ key: a.id + i, main: a.n + ' · ' + h.action, sub: h.txt + ' · ' + h.by, right: <Right>{<Txt size={10.1}>{h.when}</Txt>}</Right>, onPress: () => open('acc', a.id) }))} />;
  };

  const customersBody = () => (
    <ListRows empty="No customers match." rows={db.CUST.filter((x) => !q || x[0].toLowerCase().includes(q)).map((x) => ({
      key: x[0], main: x[0], sub: 'Joined ' + x[2],
      right: <Right><StatusPill label={x[1] === 'Suspended' ? 'Cancelled' : 'Active'} tone={x[1] === 'Suspended' ? 'or' : 'gr'} small /></Right>, onPress: () => open('cust', x[0]),
    }))} />
  );

  const businessesBody = () => (
    <ListRows empty="No businesses match." rows={db.APPS.filter((a) => !q || a.n.toLowerCase().includes(q)).map((a) => ({
      key: a.id, main: a.n, sub: a.s, right: <Right><StatusPill label={db.STG[a.st]} small /></Right>, onPress: () => go('business'),
    }))} />
  );

  const rolesBody = () => (
    <View>
      {mp ? <Row><Btn onPress={newRole}>+ New role template</Btn></Row> : null}
      <ListRows rows={Object.keys(db.ROLES).map((r) => ({ key: r, main: r, sub: db.STAFF.filter((s) => s.role === r).length + ' staff', right: <Chev />, onPress: () => editRole(r) }))} />
    </View>
  );

  const invitationsBody = () => (
    <ListRows empty="No pending invitations." rows={db.STAFF.filter((s) => s.st === 'Invited' || s.st === 'Cancelled').map((s) => ({
      key: s.n, main: s.n, sub: s.role, right: <Right><StatusPill label={s.st} tone={STAFF_TONE[s.st]} small /></Right>, onPress: () => open('staff', s.n),
    }))} />
  );

  const auditBody = () => (
    <ListRows empty="No events match." rows={db.AUD.map((a, i) => ({ a, i })).filter(({ a }) => !q || a[0].toLowerCase().includes(q)).map(({ a, i }) => ({
      key: String(i), main: a[0], right: <Right><Txt size={10.1}>{a[2]}</Txt></Right>, onPress: () => open('aud', String(i)),
    }))} />
  );

  const body = () => {
    switch (sub) {
      case 'Staff': return staffBody();
      case 'Requests': return <RequestsBody />;
      case 'Permissions': return <PermissionsBody />;
      case 'Accounts': return accountsBody();
      case 'Restrictions': return restrictionsBody();
      case 'Customers': return customersBody();
      case 'Businesses': return businessesBody();
      case 'Roles': return rolesBody();
      case 'Invitations': return invitationsBody();
      default: return auditBody();
    }
  };

  const searchHint = sub === 'Requests' ? 'Search requests' : sub === 'Permissions' ? 'Search grants by person, access or file' : sub === 'Accounts' ? 'Search accounts' : sub === 'Restrictions' ? 'Search restriction history' : sub === 'Staff' ? 'Search staff' : 'Search this list';
  const showSearch = sub !== 'Roles';
  const canInvite = (sub === 'Staff' || sub === 'Invitations') && mp;

  return (
    <View>
      {header()}
      <SelectMenu label="People section" options={subs} value={sub as (typeof PEOPLE_SUBS)[number]} onChange={(v) => set('ps', v)} />
      {sub === 'Staff' ? (
        <>
          <Chips options={STAFF_STATUS} value={ui.sst} onChange={(v) => set('sst', v)} />
          <SelectMenu label="Role" options={['All', ...Object.keys(db.ROLES)]} value={ui.pr} onChange={(v) => set('pr', v)} />
        </>
      ) : null}
      {sub === 'Accounts' ? (
        <>
          <Chips options={ACCOUNT_TYPES} value={ui.at} onChange={(v) => set('at', v)} />
          <Chips options={ACCOUNT_STATUS} value={ui.ast} onChange={(v) => set('ast', v)} />
        </>
      ) : null}
      {sub === 'Restrictions' ? <Chips options={RESTRICTION_FILTERS} value={ui.rf || 'All'} onChange={(v) => set('rf', v)} /> : null}
      {showSearch || canInvite ? (
        <Row>
          {showSearch ? <SearchInput value={ui.pq} onChangeText={(v) => set('pq', v)} placeholder={searchHint} /> : null}
          {canInvite ? <Btn onPress={invite}>+ Invite</Btn> : null}
        </Row>
      ) : null}
      {body()}
    </View>
  );
}

function Pressable2({ children, onPress }: { children: React.ReactNode; onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="button">{children}</Pressable>;
}
