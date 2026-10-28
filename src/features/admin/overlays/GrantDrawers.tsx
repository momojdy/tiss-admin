import { Pressable, View } from 'react-native';
import { bump, db, useDb } from '../state/db';
import { acs, can, expireStaff, LN, me, session, staffByName } from '../state/access';
import { REQ, useGuard } from '../state/requirements';
import {
  ASK_OPTIONS, cancelRequest, decideRequest, defaultDuration, durationOptions, elapsed, GRANTS, grantLabel, grantsOf, grantStatus, grantTone, REQ_TONE,
  remainingText, changeGrantEnd, requestAccess, requestLabel, requestTargets, REQUESTS, revokeGrant, RIGHT_PREFIX, SECTION_PREFIX, liveGrantsFor,
} from '../state/grants';
import { Card, CardTitle, Section } from '../ui/Card';
import { OutlineBtn, StatusPill } from '../ui/Controls';
import { FieldSpec, useForm } from '../ui/FormSheet';
import { KeyValue, ListRows } from '../ui/Lists';
import { DrawerBody, useOverlay } from '../ui/Overlay';
import { useToast } from '../ui/Toast';
import { Txt } from '../ui/Txt';
import { useTheme } from '../theme/ThemeContext';
import { toneColor } from '../theme/tokens';
import { drawers, useOpen, useReopen } from './registry';
import type { AccessRequest, Grant } from '../data/types';

/** Closes every overlay, refreshes the screens, then opens a drawer again. */

/** Remaining-time bar: full at the start of the grant, empty at its end date. Permanent and finished grants have none. */
export function GrantBar({ g }: { g: Grant }) {
  const { c } = useTheme();
  if (!g.end || grantStatus(g) !== 'Active') return null;
  const left = Math.round((1 - elapsed(g)) * 100);
  return (
    <View style={{ height: 4, borderRadius: 2, backgroundColor: c.inset, marginTop: 6, overflow: 'hidden' }} accessibilityLabel={left + ' percent of the period remaining'}>
      <View style={{ width: `${left}%`, height: 4, backgroundColor: toneColor(c, grantTone(g)) }} />
    </View>
  );
}

export function GrantRow({ g, showWho, onPress, last }: { g: Grant; showWho?: boolean; onPress?: () => void; last?: boolean }) {
  const { c } = useTheme();
  const body = (
    <View style={{ paddingVertical: 7, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.bd }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Txt size={10.1} weight={600}>{(showWho ? g.who + ' · ' : '') + grantLabel(g)}</Txt>
          <Txt size={9.5} mut numberOfLines={2}>{g.item + ' · given by ' + g.by + ' on ' + g.start}</Txt>
        </View>
        <StatusPill label={remainingText(g)} tone={grantTone(g)} small />
      </View>
      <GrantBar g={g} />
    </View>
  );
  return onPress ? <Pressable onPress={onPress} accessibilityRole="button">{body}</Pressable> : body;
}

export function GrantList({ grants, showWho, empty, onPress }: { grants: Grant[]; showWho?: boolean; empty: string; onPress?: (g: Grant) => void }) {
  if (!grants.length) return <Txt size={12} mut>{empty}</Txt>;
  return <View>{grants.map((g, i) => <GrantRow key={g.id} g={g} showWho={showWho} last={i === grants.length - 1} onPress={onPress ? () => onPress(g) : undefined} />)}</View>;
}

/** Opens the request form for the person the interface follows. `preset` pre-selects a section or right. */
export function useRequestAccess() {
  const form = useForm();
  const toast = useToast();
  return (preset?: { sec?: number; right?: string }) => {
    const who = me();
    if (who.st !== 'Active') { toast('Only active staff can request access.'); return; }
    const targets = requestTargets(who.n);
    if (!targets.length) { toast('You already have every section and right that can be requested.'); return; }
    const wanted = preset?.sec !== undefined ? SECTION_PREFIX + db.SEC[preset.sec] : preset?.right ? RIGHT_PREFIX + preset.right : '';
    const first = targets.includes(wanted) ? wanted : targets[0];
    const cur = first.startsWith(SECTION_PREFIX) ? acs(who).lv[db.SEC.indexOf(first.slice(SECTION_PREFIX.length))] : 0;
    form({
      title: 'Request access',
      sub: 'Adds access without changing your role; a Super Admin can revoke it.',
      fields: [
        { id: 'tg', label: 'What do you need access to?', type: 'select', options: targets, value: first, required: true },
        { id: 'lv', label: 'Level (for sections; rights are on or off)', type: 'select', options: ['View', 'Edit'], value: cur >= 1 ? 'Edit' : 'View' },
        { id: 'it', label: 'Which file, record or item?', type: 'text', required: true, placeholder: 'e.g. Q3 refund report' },
        { id: 'wy', label: 'Why do you need it?', type: 'textarea', required: true },
        { id: 'ak', label: 'How long do you think you need it? (a suggestion)', type: 'select', options: ASK_OPTIONS, value: 'Not sure' },
      ] as FieldSpec[],
      buttons: [{ label: 'Send request', key: 's', primary: true }],
      onSubmit: (_k, v) => {
        const er = requestAccess({ target: String(v.tg), level: String(v.lv), item: String(v.it), why: String(v.wy), ask: String(v.ak) });
        if (er) return er;
        bump(); toast('Request sent. You will see the decision under Account.');
      },
    });
  };
}

export function MyAccessCard() {
  useDb();
  expireStaff();
  const request = useRequestAccess();
  const open = useOpen();
  const who = me();
  const live = liveGrantsFor(who.n);
  const mine = REQUESTS.filter((r) => r.by === who.n).slice().reverse().slice(0, 5);
  return (
    <Card>
      <CardTitle title="My access" right={who.st === 'Active' ? <OutlineBtn primary onPress={() => request()} style={{ marginRight: 0, marginBottom: 0 }}>Request access</OutlineBtn> : undefined} />
      <Txt size={10.1} mut style={{ marginBottom: 6 }}>Extra access you were given for a period</Txt>
      <GrantList grants={live} empty="None right now." onPress={(g) => open('grant', g.id)} />
      <Txt size={10.1} mut style={{ marginTop: 10, marginBottom: 4 }}>My requests</Txt>
      <ListRows empty="No requests yet." rows={mine.map((r) => ({
        key: r.id, main: requestLabel(r), sub: r.item + ' · ' + r.when + (r.st === 'Declined' && r.note ? ' · ' + r.note : ''),
        right: <StatusPill label={r.st} tone={REQ_TONE[r.st]} small />, onPress: () => open('req', r.id),
      }))} />
    </Card>
  );
}

export function RequestDrawer({ id, close }: { id: string; close: () => void }) {
  useDb();
  expireStaff();
  const r: AccessRequest | undefined = REQUESTS.find((x) => x.id === id);
  const form = useForm();
  const guard = useGuard();
  const toast = useToast();
  const reopen = useReopen();
  const open = useOpen();
  if (!r) return null;
  const mp = can(...REQ.permissions), mine = r.by === session.view, pending = r.st === 'Pending';
  const g = r.grantId ? GRANTS.find((x) => x.id === r.grantId) : undefined;
  const who = staffByName(r.by);
  const now = who ? acs(who) : undefined;

  const approve = () => form({
    title: 'Approve · ' + r.by,
    sub: 'Adds access without changing their role. It expires on the selected date or remains until revoked.',
    fields: [
      ...(r.kind === 'section' ? [{ id: 'lv', label: 'Access level', type: 'select', options: ['View', 'Edit'], value: LN[r.level], required: true } as FieldSpec] : []),
      { id: 'du', label: 'How long', type: 'select', options: durationOptions(), value: defaultDuration(r.ask), required: true },
      { id: 'cu', label: 'End date, only for “A specific date” (YYYY-MM-DD)', type: 'date' },
      { id: 'nt', label: 'Note to ' + r.by + ' (optional)', type: 'textarea' },
    ],
    buttons: [{ label: 'Approve', key: 's', primary: true }],
    onSubmit: (_k, v) => {
      const er = decideRequest(r.id, { approve: true, level: String(v.lv ?? ''), choice: String(v.du), custom: String(v.cu), note: String(v.nt) });
      if (er) return er;
      reopen('req', r.id); toast('Approved. The access is active now.');
    },
  });
  const decline = () => form({
    title: 'Decline · ' + r.by, sub: 'They will see your reason under Account.',
    fields: [{ id: 'nt', label: 'Reason', type: 'textarea', required: true }],
    buttons: [{ label: 'Decline request', key: 's', primary: true }],
    onSubmit: (_k, v) => { const er = decideRequest(r.id, { approve: false, level: '', choice: '', custom: '', note: String(v.nt) }); if (er) return er; reopen('req', r.id); toast('Request declined'); },
  });
  const cancel = () => { const er = cancelRequest(r.id); if (er) { toast(er); return; } reopen('req', r.id); toast('Request cancelled'); };

  const P = REQ.permissions;
  const actions = pending
    ? (mp && !mine ? (<><OutlineBtn primary onPress={guard(P, approve)}>Approve…</OutlineBtn><OutlineBtn onPress={guard(P, decline)}>Decline…</OutlineBtn></>)
      : mine ? <OutlineBtn onPress={cancel}>Cancel request</OutlineBtn> : null)
    : null;

  const rows: [string, React.ReactNode][] = [
    ['Requested by', r.by], ['Access', requestLabel(r)], ['File or item', r.item], ['Reason', r.why], ['Suggested duration', r.ask], ['Asked on', r.when],
    ...((pending && who && now ? [['Their access today', r.kind === 'section' ? who.role + ' · ' + LN[now.lv[r.sec]] : 'Right is off']] : []) as [string, string][]),
    ...((!pending ? [['Decided by', r.decidedBy || '—'], ['Decided on', r.decidedWhen || '—'], ['Note', r.note || '—']] : []) as [string, string][]),
  ];
  return (
    <DrawerBody title={'Access request · ' + r.id} onClose={close} actions={actions}>
      <View style={{ marginTop: 4, marginBottom: 4, alignSelf: 'flex-start' }}><StatusPill label={r.st} tone={REQ_TONE[r.st]} /></View>
      <KeyValue rows={rows} />
      {g ? <Section title="Grant"><GrantRow g={g} showWho last onPress={() => open('grant', g.id)} /></Section> : null}
      {pending && mp && mine ? <Txt size={10.1} mut style={{ marginTop: 6 }}>You cannot decide your own request. Ask another Super Admin.</Txt> : null}
      {pending && !mp && mine ? <Txt size={10.1} mut style={{ marginTop: 6 }}>A Super Admin will decide. You can cancel until then.</Txt> : null}
    </DrawerBody>
  );
}

export function GrantDrawer({ id, close }: { id: string; close: () => void }) {
  useDb();
  expireStaff();
  const g = GRANTS.find((x) => x.id === id);
  const form = useForm();
  const guard = useGuard();
  const toast = useToast();
  const reopen = useReopen();
  const open = useOpen();
  if (!g) return null;
  const mp = can(...REQ.permissions), st = grantStatus(g);
  const revoke = () => form({
    title: 'Revoke now · ' + g.who,
    sub: grantLabel(g) + ' ends immediately, including active sessions. Their role and other grants stay unchanged.',
    fields: [{ id: 'nt', label: 'Reason', type: 'textarea', required: true }],
    buttons: [{ label: 'Revoke grant', key: 's', primary: true }],
    onSubmit: (_k, v) => { const er = revokeGrant(g.id, String(v.nt)); if (er) return er; reopen('grant', g.id); toast('Grant revoked. Access ended now.'); },
  });
  const changeEnd = () => form({
    title: 'Change end date · ' + g.who,
    sub: grantLabel(g) + (g.end ? ' currently ends on ' + g.end + '.' : ' is permanent.') + ' The new end date is calculated from today.',
    fields: [
      { id: 'du', label: 'New period', type: 'select', options: durationOptions(), value: durationOptions()[2], required: true },
      { id: 'cu', label: 'End date, only for “A specific date” (YYYY-MM-DD)', type: 'date' },
      { id: 'nt', label: 'Reason', type: 'textarea', required: true },
    ],
    buttons: [{ label: 'Save', key: 's', primary: true }],
    onSubmit: (_k, v) => { const er = changeGrantEnd(g.id, String(v.du), String(v.cu), String(v.nt)); if (er) return er; reopen('grant', g.id); toast('End date updated. They were notified.'); },
  });
  const P = REQ.permissions;
  const actions = (
    <>
      {st === 'Active' && mp ? <OutlineBtn primary onPress={guard(P, revoke)}>Revoke now</OutlineBtn> : null}
      {st === 'Active' && mp ? <OutlineBtn onPress={guard(P, changeEnd)}>Change end date…</OutlineBtn> : null}
      {mp ? <OutlineBtn onPress={() => open('staff', g.who)}>Open person</OutlineBtn> : null}
      {mp ? <OutlineBtn onPress={() => open('req', g.reqId)}>See request</OutlineBtn> : null}
    </>
  );
  const rows: [string, React.ReactNode][] = [
    ['Person', g.who], ['Access', grantLabel(g)], ['File or item', g.item], ['Reason', g.why], ['Given by', g.by], ['Started', g.start], ['Ends', g.end || 'Permanent, until revoked'], ['Time left', remainingText(g)],
    ...((st !== 'Active' ? [['Ended on', g.closed || g.end || '—'], ['Ended by', g.closedBy || '—'], ['Why', g.closeNote || '—']] : []) as [string, string][]),
  ];
  return (
    <DrawerBody title={'Grant · ' + g.id} onClose={close} actions={actions}>
      <View style={{ marginTop: 4, marginBottom: 4, alignSelf: 'flex-start' }}><StatusPill label={remainingText(g)} tone={grantTone(g)} /></View>
      <GrantBar g={g} />
      <KeyValue rows={rows} />
      {g.changes?.length ? <Section title="End-date changes"><ListRows rows={g.changes.map((x, i) => ({ key: String(i), main: x.txt, sub: x.by, right: x.when }))} /></Section> : null}
      {st === 'Active' && !mp ? <Txt size={10.1} mut>Only a Super Admin can end this grant early.</Txt> : null}
    </DrawerBody>
  );
}

export function StaffGrants({ who }: { who: string }) {
  const open = useOpen();
  return <GrantList grants={grantsOf(who)} empty="No approved grants yet." onPress={(g) => open('grant', g.id)} />;
}

drawers.req = (id, close) => <RequestDrawer id={id} close={close} />;
drawers.grant = (id, close) => <GrantDrawer id={id} close={close} />;
