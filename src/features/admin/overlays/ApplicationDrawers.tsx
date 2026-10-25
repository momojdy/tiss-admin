import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { aud, bump, db, useDb } from '../state/db';
import { can, session } from '../state/access';
import { REQ, useGuard } from '../state/requirements';
import { Card, Section } from '../ui/Card';
import { ButtonRow, OutlineBtn, Pill, StatusPill } from '../ui/Controls';
import { useForm } from '../ui/FormSheet';
import { KeyValue, ListRows } from '../ui/Lists';
import { DrawerBody, useOverlay } from '../ui/Overlay';
import { useToast } from '../ui/Toast';
import { Txt } from '../ui/Txt';
import { useTheme } from '../theme/ThemeContext';
import { shareText } from '../lib/csv';
import { reviewBusinessApplication } from '../lib/adminBackend';
import { hydrateAdminState } from '../lib/hydrateAdminState';
import { drawers, useOpen } from './registry';
import { useNav } from '../shell/Nav';
import { STATUS_TONE } from '../theme/tokens';

const NM = ['Business licence', 'Tax ID', 'Owner ID'];
export const docsText = (a: { d: [string, string][] }) => a.d.filter((x) => x[1] === 'verified').length + ' of 3 docs';
const find = (id: string) => db.APPS.find((x) => x.id === id);

/** Shared by the application and document drawers: log, audit, close drawers, refresh, confirm. */
function useFinish() {
  const { closeAll } = useOverlay();
  const toast = useToast();
  return (a: (typeof db.APPS)[number], msg: string, t?: string) => {
    a.log.push(['Today', msg]); aud(msg + ' · ' + a.n, session.view); closeAll(); bump(); toast(t || msg);
  };
}

export function ApplicationDrawer({ id, close }: { id: string; close: () => void }) {
  useDb();
  const a = find(id);
  const form = useForm();
  const open = useOpen();
  const guard = useGuard();
  const toast = useToast();
  const { closeAll } = useOverlay();
  const finish = useFinish();
  const nav = useNav();
  if (!a) return null;
  const closed = a.st >= 3;
  const status = (db.STG[a.st] || a.s || 'Pending review') + (a.hold ? ' · on hold' : '') + (a.esc ? ' · escalated' : '');

  const approve = () => {
    const bad = a.d.filter((x) => x[1] !== 'verified');
    if (a.d.length !== 3 || bad.length) { form({ title: 'Cannot approve yet', fields: [], buttons: [], sub: a.d.length !== 3 ? 'The application documents are not loaded from the server. Approval is blocked until all three required documents are available and verified.' : 'Verify these first: ' + bad.map((x) => x[0] + ' (' + x[1] + ')').join(', ') + '.' }); return; }
    form({ title: 'Approve ' + a.n, fields: [{ id: 'n', label: 'Note (optional)', type: 'textarea' }], buttons: [{ label: 'Approve', key: 's', primary: true }],
      sub: `Service: ${a.s}. Result: Approved. The business can publish listings in this service.`,
      onSubmit: async (_k, v) => { await reviewBusinessApplication(a.id, 'approved', String(v.n || '')); a.st = 3; finish(a, 'Approved by ' + session.view, 'Approved · ' + a.n); void hydrateAdminState().catch(() => undefined); } });
  };
  const reject = () => form({ title: 'Reject ' + a.n, fields: [
    { id: 'r', label: 'Reason', type: 'select', options: ['Documents invalid', 'Out of scope', 'Fraud risk', 'Other'], required: true },
    { id: 'm', label: 'Message to applicant', type: 'textarea', required: true },
    { id: 'f', label: 'Final rejection (applicant cannot resubmit)', type: 'check' }],
    buttons: [{ label: 'Reject', key: 's', primary: true }], sub: 'The applicant is notified with your message.',
    onSubmit: async (_k, v) => { await reviewBusinessApplication(a.id, 'rejected', String(v.r) + ': ' + String(v.m), !!v.f); a.st = 4; finish(a, (v.f ? 'Rejected (final) · ' : 'Rejected · ') + v.r, 'Rejected · ' + a.n); void hydrateAdminState().catch(() => undefined); } });
  const requestInfo = () => form({ title: 'Request information', fields: [
    { id: 'd', label: 'Requirement', type: 'select', options: NM, required: true, value: (a.d.find((x) => x[1] !== 'verified') ?? [NM[0]])[0] },
    { id: 'm', label: 'What needs to change', type: 'textarea', required: true }, { id: 'due', label: 'Reply by', type: 'date', required: true }],
    buttons: [{ label: 'Send request', key: 's', primary: true }], sub: 'Preview: “Please resubmit the item above by the date shown.”',
    onSubmit: (_k, v) => { const d = a.d.find((x) => x[0] === v.d); if (d) d[1] = 'missing'; a.st = 2; a.due = String(v.due); finish(a, 'Information requested · ' + v.d, 'Request sent to ' + a.n); } });
  const hold = () => { a.hold = a.hold ? 0 : 1; finish(a, a.hold ? 'Put on hold' : 'Resumed'); };
  const escalate = () => { if (a.esc) return; form({ title: 'Escalate ' + a.n, fields: [{ id: 'r', label: 'Reason', type: 'textarea', required: true }], buttons: [{ label: 'Escalate', key: 's', primary: true }],
    sub: 'Escalations appear in the notification centre.', onSubmit: (_k, v) => { a.esc = 1; db.NS.unshift({ t: 'Escalated · ' + a.n, w: 'just now', f: 'crit unread', d: 'app', v: id }); finish(a, 'Escalated · ' + v.r); } }); };
  const assign = () => form({ title: 'Assign ' + a.n, fields: [
    { id: 'o', label: 'Reviewer', type: 'select', options: db.STAFF.map((s) => s.n), required: true, value: a.o === 'Unassigned' ? 'momo' : a.o },
    { id: 'due', label: 'Due date', type: 'date' }, { id: 'n', label: 'Note', type: 'textarea' }],
    buttons: [{ label: 'Assign', key: 's', primary: true }], sub: 'Current owner: ' + a.o,
    onSubmit: (_k, v) => { a.o = String(v.o); a.due = String(v.due || a.due); finish(a, 'Assigned to ' + v.o); } });
  const addNote = () => form({ title: 'Add internal note', fields: [{ id: 'n', label: 'Note (staff only)', type: 'textarea', required: true }], buttons: [{ label: 'Save note', key: 's', primary: true }],
    onSubmit: (_k, v) => { (a.notes as unknown[][]).push([session.view, v.n]); bump(); toast('Note saved'); } });

  const edit = can(...REQ.review), approveOk = can(...REQ.approve);
  const actions = closed ? null : (
    <>
      {approveOk ? <OutlineBtn primary onPress={guard(REQ.approve, approve)}>Approve</OutlineBtn> : null}
      {edit ? <OutlineBtn onPress={guard(REQ.review, requestInfo)}>Request info</OutlineBtn> : null}
      {approveOk ? <OutlineBtn onPress={guard(REQ.approve, reject)}>Reject</OutlineBtn> : null}
      {edit ? <OutlineBtn onPress={guard(REQ.review, hold)}>{a.hold ? 'Resume' : 'Hold'}</OutlineBtn> : null}
      {edit ? <OutlineBtn onPress={guard(REQ.review, assign)}>Assign</OutlineBtn> : null}
      {edit ? <OutlineBtn onPress={guard(REQ.review, escalate)}>{a.esc ? 'Escalated' : 'Escalate'}</OutlineBtn> : null}
    </>
  );
  return (
    <DrawerBody title={a.n} onClose={close} actions={actions}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4, marginBottom: 8, flexWrap: 'wrap' }}>
        <StatusPill label={status} tone={STATUS_TONE[db.STG[a.st] || a.s] || STATUS_TONE.pending} />
        <Txt size={10.6} mut>{a.id + ' · ' + a.s}</Txt>
      </View>
      <KeyValue rows={[['Waiting', a.age + ' day' + (a.age === 1 ? '' : 's')], ['Owner', a.o], ['Due', a.due || 'Not set'], ['Documents', docsText(a) + ' verified']]} />
      <Section title="Requirements">
        <ListRows rows={a.d.map((x, i) => ({ main: x[0], right: <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><StatusPill label={x[1]} /><Txt size={10.1}>›</Txt></View>, onPress: () => open('doc', id + ':' + i) }))} />
      </Section>
      <Section title="Review timeline">
        <ListRows rows={a.log.slice().reverse().map((l) => ({ main: l[1], right: l[0] }))} />
      </Section>
      <Section title="Internal notes">
        {(a.notes as unknown[][]).length ? (a.notes as unknown[][]).map((n, i) => <Txt key={i} size={12} style={{ marginBottom: 4 }}><Txt size={12} weight={600}>{String(n[0])}</Txt>{' · ' + String(n[1])}</Txt>) : <Txt size={12} mut>No notes yet.</Txt>}
        {edit ? <ButtonRow><OutlineBtn onPress={guard(REQ.review, addNote)}>+ Add note</OutlineBtn></ButtonRow> : null}
      </Section>
      <Card style={{ marginVertical: 8 }}>
        <ListRows rows={[{ main: 'Open business profile', right: '›', onPress: () => { closeAll(); nav.go('business'); } }]} />
      </Card>
    </DrawerBody>
  );
}

export function DocumentDrawer({ id: v, close }: { id: string; close: () => void }) {
  useDb();
  const [id, i] = v.split(':');
  const a = find(id)!;
  const d = a.d[+i];
  const form = useForm();
  const open = useOpen();
  const guard = useGuard();
  const toast = useToast();
  const { c } = useTheme();
  const { closeAll } = useOverlay();
  const [zoom, setZoom] = useState(1);
  const res = (st: string, msg: string) => { d[1] = st as never; a.log.push(['Today', msg + ' · ' + d[0]]); aud(msg + ' · ' + a.n, session.view); closeAll(); bump(); open('app', id); open('doc', v); toast(msg); };
  const reject = () => form({ title: 'Reject ' + d[0], fields: [{ id: 'r', label: 'Reason', type: 'textarea', required: true }], buttons: [{ label: 'Reject document', key: 's', primary: true }], sub: 'The applicant sees this reason.', onSubmit: () => res('rejected', 'Document rejected') });
  const download = async () => {
    const ok = await shareText(`${a.id}-${d[0].replace(/ /g, '-')}.txt`, `Document: ${d[0]}\nBusiness: ${a.n}\nStatus: ${d[1]}\n`);
    toast(ok ? 'Document summary ready to share' : 'Sharing is not available on this device');
  };
  const edit = can(...REQ.review);
  const actions = (
    <>
      {edit ? <OutlineBtn primary onPress={guard(REQ.review, () => res('verified', 'Document verified'))}>Verify</OutlineBtn> : null}
      {edit ? <OutlineBtn onPress={guard(REQ.review, reject)}>Reject</OutlineBtn> : null}
      {edit ? <OutlineBtn onPress={guard(REQ.review, () => res('missing', 'Replacement requested'))}>Request replacement</OutlineBtn> : null}
      <OutlineBtn onPress={() => { closeAll(); open('app', id); }}>Open application</OutlineBtn>
    </>
  );
  return (
    <DrawerBody title={d[0] + ' · ' + a.n} onClose={close} actions={actions}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4, marginBottom: 8 }}><StatusPill label={d[1]} /><Txt size={10.6} mut>{a.id}</Txt></View>
      <View style={{ height: 150, overflow: 'hidden', borderRadius: 12, backgroundColor: c.inset, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 96, height: 128, backgroundColor: '#fff', borderRadius: 6, alignItems: 'center', justifyContent: 'center', transform: [{ scale: zoom }], shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 7, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}>
          <Txt size={10} color="#8b8d85" align="center">{d[0] + '\npreview'}</Txt>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 7, marginVertical: 8 }}>
        <Pill onPress={() => setZoom((z) => Math.max(0.5, z - 0.25))}>− Zoom</Pill>
        <Pill onPress={() => setZoom((z) => Math.min(2, z + 0.25))}>+ Zoom</Pill>
        <Pill onPress={download}>⇩ Download</Pill>
      </View>
      <KeyValue rows={[['Version', 'v1'], ['Uploaded', a.log[0][0]], ['Expiry', d[1] === 'expired' ? 'Expired Oct 1' : 'Oct 2027'], ['Reviewer notes', d[1] === 'rejected' ? 'Rejected earlier' : 'None']]} />
    </DrawerBody>
  );
}

export function CaseDrawer({ id, close }: { id: string; close: () => void }) {
  useDb();
  const cs = db.CASES.find((x) => x.id === id)!;
  const form = useForm();
  const guard = useGuard();
  const toast = useToast();
  const { closeAll } = useOverlay();
  const assignMe = () => { cs.o = session.view; aud('Case assigned · ' + id, session.view); closeAll(); bump(); toast('Case ' + id + ' assigned to you'); };
  const resolve = () => form({ title: 'Resolve ' + id, fields: [{ id: 'r', label: 'Resolution summary', type: 'textarea', required: true }], buttons: [{ label: 'Resolve', key: 's', primary: true }],
    onSubmit: () => { cs.st = 'Resolved'; aud('Case resolved · ' + id, session.view); closeAll(); bump(); toast('Case ' + id + ' resolved'); } });
  const actions = cs.st === 'Resolved' || !can(...REQ.review) ? null : (<><OutlineBtn onPress={guard(REQ.review, assignMe)}>Assign to me</OutlineBtn><OutlineBtn primary onPress={guard(REQ.review, resolve)}>Resolve</OutlineBtn></>);
  return (
    <DrawerBody title={'Case ' + cs.id + ' · ' + cs.t} onClose={close} actions={actions}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4, marginBottom: 8 }}><StatusPill label={cs.st} /><Txt size={10.6} mut>{cs.svc + ' · ' + cs.pri + ' priority'}</Txt></View>
      <KeyValue rows={[['Owner', cs.o], ['Service', cs.svc]]} />
      <Section title="Messages"><ListRows rows={cs.msgs.map((m) => ({ main: <Txt size={10.1}><Txt size={10.1} weight={600}>{m[0]}</Txt>{' · ' + m[1]}</Txt> }))} /></Section>
      <Section title="Internal notes"><Txt size={12} mut>Staff only. Not visible to the customer.</Txt></Section>
    </DrawerBody>
  );
}

/** `+ Assign` on the Operations page: pick an application and a reviewer. */
export function useAssignWork() {
  const form = useForm();
  const finish = useFinish();
  return () => {
    const waiting = db.APPS.filter((a) => a.st < 3).sort((x, y) => (x.o === 'Unassigned' ? 0 : 1) - (y.o === 'Unassigned' ? 0 : 1));
    form({ title: 'Assign work', fields: [
      { id: 'a', label: 'Application', type: 'select', options: waiting.map((a) => a.id + ' · ' + a.n), required: true },
      { id: 'o', label: 'Reviewer', type: 'select', options: db.STAFF.map((s) => s.n), required: true },
      { id: 'due', label: 'Due date', type: 'date' }],
      buttons: [{ label: 'Assign', key: 's', primary: true }], sub: 'Reassignment keeps the earlier history.',
      onSubmit: (_k, v) => { const a = find(String(v.a).split(' ')[0]); if (!a) return 'Choose an application.'; a.o = String(v.o); a.due = String(v.due || a.due); finish(a, 'Assigned to ' + v.o); } });
  };
}

drawers.app = (id, close) => <ApplicationDrawer id={id} close={close} />;
drawers.doc = (id, close) => <DocumentDrawer id={id} close={close} />;
drawers.case = (id, close) => <CaseDrawer id={id} close={close} />;
