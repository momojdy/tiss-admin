import { useEffect, useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { bump, db, mny, TODAY, useDb } from '../state/db';
import { acs, can, effOf, expireStaff, LN, needs, nm, RIGHTS, session, staffByName } from '../state/access';
import { liveGrantsFor } from '../state/grants';
import { REQ, useGuard } from '../state/requirements';
import {
  ACC_TONE, accById, accStatus, accStatusLabel, cancelInvite, createRole, editSuspension, expireAccounts, inviteCode, inviteEmail, liftRestriction, markAppeal,
  openItems, reinstateStaff, resendInvite, restoreStaff, restrictAccount, RESTRICT_REASONS, revokeStaff, saveRoleTemplate, saveStaffAccess, scopeTxt, STAFF_TONE, suspendStaff,
  svcNames, upholdBan, type AccessEdit, type RightChoice,
} from '../state/people';
import { Section } from '../ui/Card';
import { OutlineBtn, Pill, StatusPill } from '../ui/Controls';
import { Field, useForm } from '../ui/FormSheet';
import { KeyValue, ListRows } from '../ui/Lists';
import { DialogCard, DrawerBody, useOverlay } from '../ui/Overlay';
import { useToast } from '../ui/Toast';
import { Txt } from '../ui/Txt';
import { useTheme } from '../theme/ThemeContext';
import { useNav } from '../shell/Nav';
import { inviteStaff as inviteStaffBackend, setStaffStatus as setStaffStatusBackend, grantStaffPermission as grantStaffPermissionBackend, revokeStaffPermission as revokeStaffPermissionBackend, listPermissionGrants, applyAccountRestriction as applyAccountRestrictionBackend, liftAccountRestriction as liftAccountRestrictionBackend, updateAccountRestriction as updateAccountRestrictionBackend } from '../lib/adminBackend';
import { hydrateAdminState } from '../lib/hydrateAdminState';
import { StaffGrants } from './GrantDrawers';
import { drawers, useReopen } from './registry';
import type { Restriction } from '../data/types';

const secTone = (lv: number) => (lv === 0 ? 'grey' : lv === 1 ? '#d6e6d9' : 'gr');
const Muted = ({ children }: { children: string }) => <Txt size={10.1} mut style={{ marginTop: 6 }}>{children}</Txt>;

/** Closes every overlay, refreshes the screens, then opens a drawer again (the HTML's `reopen`). */

/* ================================================================== */

export function StaffDrawer({ id, close }: { id: string; close: () => void }) {
  useDb();
  expireStaff();
  const s = staffByName(id);
  const form = useForm();
  const guard = useGuard();
  const toast = useToast();
  const reopen = useReopen();
  const { openDialog } = useOverlay();
  const { c } = useTheme();
  if (!s) return null;
  nm(s);
  const e = acs(s), mp = can(...REQ.permissions), isSelf = id === session.view;
  // what role + personal overrides give, so we can tell which access only comes from an approved grant
  const base = effOf(s.role, s.ov, s.st), liveG = liveGrantsFor(s.n);

  const edit = () => openDialog((done) => <EditAccessSheet name={id} onClose={done} onSaved={() => { reopen('staff', id); toast('Access updated. It applies immediately, including to active sessions.'); }} />);
  const suspend = () => form({ title: 'Suspend access · ' + id, sub: 'Their role and permissions are kept; active sessions end now.',
    fields: [{ id: 'r', label: 'Reason', type: 'select', options: ['Security concern', 'Under investigation', 'Leave of absence', 'Other'], required: true }, { id: 'nt', label: 'Internal note', type: 'textarea' }, { id: 'en', label: 'Restore automatically on (optional, YYYY-MM-DD)', type: 'date' }],
    buttons: [{ label: 'Suspend access', key: 's', primary: true }],
    onSubmit: async (_k, v) => { if (!s.userId) return 'This staff record is not linked to Supabase Auth.'; await setStaffStatusBackend(s.userId, 'suspended', [String(v.r), String(v.nt)].filter(Boolean).join(': ')); await hydrateAdminState(); reopen('staff', id); toast('Access suspended. Active sessions ended.'); } });
  const restore = () => form({ title: 'Restore access · ' + id, sub: 'Their previous role and permissions return.',
    fields: [{ id: 'nt', label: 'Reason', type: 'textarea', required: true }], buttons: [{ label: 'Restore access', key: 's', primary: true }],
    onSubmit: async (_k, v) => { if (!s.userId) return 'This staff record is not linked to Supabase Auth.'; await setStaffStatusBackend(s.userId, 'active', String(v.nt)); await hydrateAdminState(); reopen('staff', id); toast('Access restored'); } });
  const revoke = () => form({ title: 'Revoke all access · ' + id,
    sub: 'Removes the role and all grants, ends active sessions, and unassigns open applications. Customer records and audit history remain.',
    fields: [{ id: 'r', label: 'Reason', type: 'select', options: ['Left the company', 'Security breach', 'Role ended', 'Other'], required: true }, { id: 'nt', label: 'Internal note', type: 'textarea', required: true }, { id: 'cf', label: 'Type REVOKE to confirm', type: 'text', required: true }],
    buttons: [{ label: 'Revoke all access', key: 's', primary: true }],
    onSubmit: async (_k, v) => { if (String(v.cf) !== 'REVOKE') return 'Type REVOKE to confirm.'; if (!s.userId) return 'This staff record is not linked to Supabase Auth.'; await setStaffStatusBackend(s.userId, 'revoked', [String(v.r), String(v.nt)].join(': ')); await hydrateAdminState(); reopen('staff', id); toast('All staff access revoked. Records kept.'); } });
  const reinstate = () => form({ title: 'Reinstate · ' + id, sub: 'Starts with the role template only; old individual grants do not return.',
    fields: [{ id: 'ro', label: 'Role template', type: 'select', options: Object.keys(db.ROLES), required: true }, { id: 'nt', label: 'Reason', type: 'textarea', required: true }],
    buttons: [{ label: 'Reinstate staff', key: 's', primary: true }],
    onSubmit: async (_k, v) => { if (!s.userId) return 'This staff record is not linked to Supabase Auth.'; await setStaffStatusBackend(s.userId, 'active', String(v.nt) + ' · role remains server-assigned'); await hydrateAdminState(); reopen('staff', id); toast('Staff access restored.'); } });
  const resend = () => toast('Ask a Super Admin to resend the invitation after verifying the email address.');
  const cancel = () => form({ title: 'Cancel invitation', sub: id + ' will no longer be able to join.', fields: [], buttons: [{ label: 'Cancel invitation', key: 's', primary: true }],
    onSubmit: async () => { if (!s.userId) return 'This invitation is not linked to Supabase Auth.'; await setStaffStatusBackend(s.userId, 'revoked', 'Invitation cancelled by Super Admin'); await hydrateAdminState(); reopen('staff', id); toast('Invitation cancelled'); } });

  const P = REQ.permissions;
  let actions: React.ReactNode = null;
  if (mp && !isSelf) {
    actions = s.st === 'Active' ? (<><OutlineBtn primary onPress={guard(P, edit)}>Edit access</OutlineBtn><OutlineBtn onPress={guard(P, suspend)}>Suspend access</OutlineBtn><OutlineBtn onPress={guard(P, revoke)}>Revoke all access</OutlineBtn></>)
      : s.st === 'Suspended' ? (<><OutlineBtn primary onPress={guard(P, restore)}>Restore access</OutlineBtn><OutlineBtn onPress={guard(P, revoke)}>Revoke all access</OutlineBtn></>)
      : s.st === 'Revoked' ? <OutlineBtn primary onPress={guard(P, reinstate)}>Reinstate staff</OutlineBtn>
      : s.st === 'Invited' ? (<><OutlineBtn onPress={guard(P, resend)}>Resend invitation</OutlineBtn><OutlineBtn onPress={guard(P, cancel)}>Cancel invitation</OutlineBtn></>) : null;
  }
  const foot = !mp ? 'Changing access needs the “Manage permissions” right.' : isSelf ? 'You cannot change your own access. Ask another Super Admin.' : '';

  const rows: [string, React.ReactNode][] = [
    ['Role template', s.role], ['Service scope', s.scope.length ? s.scope.join(', ') : 'All services'], ['Temporary grants', s.until ? 'Until ' + s.until : 'None'], ['Approved grants', liveG.length ? liveG.length + ' running' : 'None running'],
    ['Sign-in', 'Same Wantiss login · MFA required'],
    ...((s.st === 'Invited' && mp ? [['Invited email', inviteEmail(id) ?? '—'], ['Invitation code', inviteCode(id) ?? '—']] : []) as [string, string][]),
    ['Last active', s.last], ['Open items', String(s.st === 'Active' ? openItems(id) : 0)],
  ];

  return (
    <DrawerBody title={s.n} onClose={close} actions={actions}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4, marginBottom: 8 }}>
        <StatusPill label={s.st} tone={STAFF_TONE[s.st]} /><Txt size={10.6} mut>{s.role + (isSelf ? ' · you' : '')}</Txt>
      </View>
      <KeyValue rows={rows} />
      <Section title="Effective access">
        <ListRows rows={db.SEC.map((x, i) => ({ key: x, main: <Txt size={10.1}>{x}{s.ov.sec[i] !== undefined && s.st === 'Active' ? <Txt size={9.5} color={c.or}>{'  custom'}</Txt> : null}{s.st === 'Active' && e.lv[i] > base.lv[i] ? <Txt size={9.5} color={c.or}>{'  from grant'}</Txt> : null}</Txt>, right: <StatusPill label={LN[e.lv[i]]} tone={secTone(e.lv[i])} small /> }))} />
      </Section>
      <Section title="Special rights">
        <ListRows rows={RIGHTS.map((r) => {
          const on = e.rights.includes(r), src = on && !base.rights.includes(r) && s.st === 'Active' && liveG.some((g) => g.kind === 'right' && g.right === r) ? 'from grant' : s.ov.rights[r] === 1 ? 'granted' : s.ov.rights[r] === -1 ? 'removed' : 'role';
          return { key: r, main: r, right: <Txt size={10.1}>{on ? 'On' : 'Off'}<Txt size={9.5} mut>{s.st === 'Active' ? '  ' + src : ''}</Txt></Txt> };
        })} />
      </Section>
      <Section title="Approved grants (requested, time-boxed)">
        <StaffGrants who={s.n} />
      </Section>
      <Section title="Access history (append only)">
        <ListRows empty="No changes yet." rows={s.hist.slice().reverse().map((h, i) => ({ key: String(i), main: h.action, sub: h.txt + ' · ' + h.by + (h.note ? ' · ' + h.note : ''), right: h.when }))} />
      </Section>
      {foot ? <Muted>{foot}</Muted> : null}
    </DrawerBody>
  );
}

const RIGHT_OPTS = (on: boolean) => ['From role (' + (on ? 'on' : 'off') + ')', 'Grant', 'Remove'];
const RIGHT_KEYS: RightChoice[] = ['role', 'grant', 'remove'];

function EditAccessSheet({ name, onClose, onSaved }: { name: string; onClose: () => void; onSaved: () => void }) {
  const { c } = useTheme();
  const staff = staffByName(name);
  const [grants, setGrants] = useState<Awaited<ReturnType<typeof listPermissionGrants>>>([]);
  const [permission, setPermission] = useState(db.SEC[1] || 'operations');
  const [level, setLevel] = useState('view');
  const [until, setUntil] = useState('');
  const [why, setWhy] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const permissionOptions = [...new Set([...db.SEC, ...RIGHTS])];
  const permissionKey = (label: string) => {
    const known: Record<string, string> = {
      'Manage permissions': 'staff.manage',
      'Manage content': 'content.manage',
      'Publish content': 'content.publish',
      'Archive content': 'content.archive',
      'Manage assets': 'content.assets',
      'Read audit log': 'audit.read',
    };
    return known[label] || label.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\\.|\\.$/g, '');
  };

  const refresh = async () => {
    if (!staff?.userId) return;
    try { setGrants(await listPermissionGrants(staff.userId)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load grants.'); }
  };
  useEffect(() => { void refresh(); }, [staff?.userId]);

  const save = async () => {
    if (!staff?.userId) return setError('This staff record is not linked to Supabase Auth.');
    if (why.trim().length < 3) return setError('Enter a reason for this grant.');
    setBusy(true); setError('');
    try {
      await grantStaffPermissionBackend({
        userId: staff.userId, permissionKey: permissionKey(permission),
        level: level as 'view' | 'edit' | 'manage', reason: why.trim(),
        expiresAt: until.trim() ? new Date(until + 'T23:59:59').toISOString() : null,
      });
      setWhy(''); setUntil('');
      await refresh();
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not grant access.');
    } finally { setBusy(false); }
  };

  const revoke = async (grantId: string) => {
    setBusy(true); setError('');
    try {
      await revokeStaffPermissionBackend(grantId, 'Revoked by Super Admin from staff access editor');
      await refresh();
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not revoke access.'); }
    finally { setBusy(false); }
  };

  return (
    <DialogCard title={'Individual access · ' + name} onClose={onClose} maxHeight="94%">
      <Txt size={12} mut lh={1.4}>Supabase enforces grants on protected requests; expired or revoked grants stop authorizing access.</Txt>
      <Field spec={{ id: 'permission', label: 'Feature or permission', type: 'select', options: permissionOptions }} value={permission} onChange={(v) => setPermission(String(v))} />
      <Field spec={{ id: 'level', label: 'Access level', type: 'select', options: ['view', 'edit', 'manage'] }} value={level} onChange={(v) => setLevel(String(v))} />
      <Field spec={{ id: 'until', label: 'Expires on (optional, YYYY-MM-DD)', type: 'date' }} value={until} onChange={(v) => setUntil(String(v))} />
      <Field spec={{ id: 'why', label: 'Reason', type: 'textarea', required: true }} value={why} onChange={(v) => { setWhy(String(v)); setError(''); }} />
      {error ? <Txt size={12} color={c.or} style={{ marginVertical: 8 }}>{error}</Txt> : null}
      <OutlineBtn primary onPress={() => { void save(); }}>Grant access</OutlineBtn>
      <Txt size={13} weight={500} style={{ marginTop: 16, marginBottom: 6 }}>Existing grants</Txt>
      <ListRows empty="No individual grants." rows={grants.map(g => ({
        key: g.id,
        main: g.permission_key + ' · ' + g.access_level,
        sub: (g.revoked_at ? 'Revoked' : g.expires_at && Date.parse(g.expires_at) <= Date.now() ? 'Expired' : 'Active') + (g.expires_at ? ' · until ' + new Date(g.expires_at).toLocaleDateString() : ' · no expiry') + ' · ' + g.reason,
        right: !g.revoked_at && (!g.expires_at || Date.parse(g.expires_at) > Date.now()) ? <OutlineBtn onPress={() => { void revoke(g.id); }} disabled={busy}>Revoke</OutlineBtn> : null,
      }))} />
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <OutlineBtn onPress={onClose}>Close</OutlineBtn>
      </View>
    </DialogCard>
  );
}

/* ================================================================== */
/* ================================================================== */

export function useInvite() {
  const form = useForm();
  const toast = useToast();
  const { closeAll } = useOverlay();
  return () => form({
    title: 'Invite staff',
    sub: 'A real invitation email will be sent through Supabase Auth. Staff access remains subject to backend permissions.',
    fields: [
      { id: 'n', label: 'Name', type: 'text', required: true },
      { id: 'e', label: 'Work email', type: 'email', required: true },
      { id: 'r', label: 'Reason for access', type: 'textarea', required: true },
    ],
    buttons: [{ label: 'Send invitation', key: 's', primary: true }],
    onSubmit: async (_k, v) => {
      if (session.role !== 'super_admin' && !can(needs('staff.manage'))) return 'This requires staff management permission.';
      await inviteStaffBackend(String(v.e), String(v.n), String(v.r));
      await hydrateAdminState();
      closeAll();
      toast('Invitation email sent to ' + String(v.e).trim().toLowerCase());
    },
  });
}

export function useRoleEditor() {
  const form = useForm();
  const toast = useToast();
  const { closeAll } = useOverlay();
  return (role: string) => {
    const p = db.ROLES[role], rg = db.RR[role] || [];
    form({ title: 'Role template · ' + role, sub: role === 'Super Admin' ? 'Super Admin always keeps full access.' : 'Everyone with this role (and no personal override) gets these changes immediately.',
      fields: [...db.SEC.map((s, i) => ({ id: 'p' + i, label: s, type: 'select' as const, options: db.LV, value: db.LV[p[i]] })), ...RIGHTS.map((x, i) => ({ id: 'x' + i, label: x, type: 'check' as const, value: rg.includes(x) }))],
      buttons: [{ label: 'Save template', key: 's', primary: true }],
      onSubmit: (_k, v) => {
        if (!can(needs('Manage permissions'))) return 'This needs the “Manage permissions” right.';
        saveRoleTemplate(role, db.SEC.map((_s, i) => db.LV.indexOf(String(v['p' + i]))), RIGHTS.filter((_x, i) => !!v['x' + i]));
        closeAll(); bump(); toast('Template saved');
      } });
  };
}

export function useNewRole() {
  const form = useForm();
  const toast = useToast();
  const { closeAll } = useOverlay();
  return () => form({ title: 'New role template',
    fields: [{ id: 'n', label: 'Role name', type: 'text', required: true }, { id: 'b', label: 'Start from', type: 'select', options: Object.keys(db.ROLES), required: true }],
    buttons: [{ label: 'Create', key: 's', primary: true }],
    onSubmit: (_k, v) => { if (!can(needs('Manage permissions'))) return 'This needs the “Manage permissions” right.'; const er = createRole(String(v.n), String(v.b)); if (er) return er; closeAll(); bump(); toast('Role created. Edit its access next.'); } });
}

/* ================================================================== */
/* ================================================================== */

export function AccountDrawer({ id, close }: { id: string; close: () => void }) {
  useDb();
  expireAccounts();
  const a = accById(id);
  const form = useForm();
  const toast = useToast();
  const nav = useNav();
  const reopen = useReopen();
  const { closeAll } = useOverlay();
  const { c } = useTheme();
  if (!a) return null;
  const s = accStatus(a);
  const canSusp = can(...REQ.pause), canBan = can(...REQ.ban);
  const pend = db.PAYO.filter((p) => p[1] === a.n).reduce((n, p) => n + p[2], 0);
  const tx = db.INV.filter((x) => x.u === a.n);
  const done = (msg: string) => { reopen('acc', id); toast(msg); };

  const restrict = (kind: 'Suspension' | 'Ban', only: boolean) => {
    const ban = kind === 'Ban';
    const scopes = only ? (a.svc.length ? a.svc : svcNames()) : ['Entire Wantiss account', ...(a.svc.length ? a.svc : svcNames())];
    form({
      title: ban ? 'Ban ' + a.n : (only ? 'Restrict one service · ' : 'Pause ') + a.n,
      sub: ban ? 'This is a severe action. The account loses access for the scope you choose. Orders, history and wallet balance are kept. It is recorded in the audit history.'
        : 'A pause is temporary. Your Wantiss account has been paused. Reason: the reason you choose.',
      fields: [
        { id: 'rs', label: 'Reason', type: 'select', options: RESTRICT_REASONS, required: true },
        { id: 'nt', label: ban ? 'Evidence and internal notes' : 'Internal notes (not shown to the account holder)', type: 'textarea', required: ban },
        { id: 'sc', label: 'Scope', type: 'select', options: scopes, required: true, value: scopes[0] },
        { id: 'st', label: 'Start date (YYYY-MM-DD)', type: 'date', required: true, value: TODAY },
        ...(ban ? [] : [{ id: 'en', label: 'End date (leave empty to keep it until lifted)', type: 'date' as const }]),
        { id: 'nf', label: 'Notify the account holder', type: 'check', value: true },
        ...(ban ? [{ id: 'cf', label: 'Type BAN to confirm', type: 'text' as const, required: true }] : []),
      ],
      buttons: [{ label: ban ? 'Ban account' : 'Apply', key: 's', primary: true }],
      onSubmit: async (_k, v) => {
        if (!(ban ? canBan : canSusp)) return 'You do not have permission for this action.';
        if (ban && String(v.cf ?? '') !== 'BAN') return 'Type BAN in capitals to confirm.';
        if (!a.id) return 'This account is not linked to a Supabase user.';
        const start = String(v.st || '');
        const end = String(v.en ?? '');
        if (!start || (!ban && end && end < start)) return 'The restriction dates are invalid.';
        try {
          await applyAccountRestrictionBackend({
            userId: a.id, kind, scope: v.sc === 'Entire Wantiss account' ? 'all' : String(v.sc),
            reason: String(v.rs), notes: String(v.nt ?? ''),
            startsAt: new Date(start + 'T00:00:00.000Z').toISOString(),
            endsAt: !ban && end ? new Date(end + 'T23:59:59.999Z').toISOString() : null,
            notifyUser: !!v.nf,
          });
          await hydrateAdminState();
          done((ban ? 'Banned · ' : 'Paused · ') + a.n);
        } catch (e) { return e instanceof Error ? e.message : 'The restriction could not be saved.'; }
      },
    });
  };
  const pause = () => { if (s === 'Banned') { toast('This account is already banned'); return; } restrict('Suspension', false); };
  const ban = () => { if (s === 'Banned') { toast('This account is already banned'); return; } restrict('Ban', false); };

  const lift = (r: Restriction) => {
    if (r.kind === 'Ban' ? !canBan : !canSusp) { toast('You do not have permission to do this'); return; }
    form({ title: (r.kind === 'Ban' ? 'Reinstate ' : 'Lift suspension · ') + a.n, sub: r.kind === 'Ban' ? 'Reinstating a banned account is recorded and needs Super Admin approval.' : 'Access returns for: ' + scopeTxt(r) + '.',
      fields: [{ id: 'nt', label: 'Reason for reinstating', type: 'textarea', required: true }, { id: 'nf', label: 'Notify the account holder', type: 'check', value: true }],
      buttons: [{ label: r.kind === 'Ban' ? 'Reinstate account' : 'Lift suspension', key: 's', primary: true }],
      onSubmit: async (_k, x) => {
        try {
          await liftAccountRestrictionBackend(r.id, String(x.nt));
          await hydrateAdminState();
          done('Reinstated · ' + a.n);
        } catch (e) { return e instanceof Error ? e.message : 'The restriction could not be lifted.'; }
      } });
  };
  const editSusp = (r: Restriction) => form({ title: 'Edit suspension · ' + a.n, sub: 'Scope: ' + scopeTxt(r) + '. Started ' + r.start + '.',
    fields: [{ id: 'en', label: 'New end date (empty keeps it until lifted)', type: 'date', value: r.end }, { id: 'nt', label: 'Reason for the change', type: 'textarea', required: true }],
    buttons: [{ label: 'Save changes', key: 's', primary: true }],
    onSubmit: async (_k, x) => {
      const end = String(x.en || '');
      if (end && end < r.start) return 'The end date cannot be before the start date.';
      try {
        await updateAccountRestrictionBackend(r.id, end ? new Date(end + 'T23:59:59.999Z').toISOString() : null, String(x.nt));
        await hydrateAdminState();
        done('Suspension updated');
      } catch (e) { return e instanceof Error ? e.message : 'The suspension could not be updated.'; }
    } });
  const uphold = () => form({ title: 'Uphold ban · ' + a.n, sub: 'The ban stays in force and the appeal is closed.', fields: [{ id: 'nt', label: 'Decision note', type: 'textarea', required: true }],
    buttons: [{ label: 'Uphold ban', key: 's', primary: true }], onSubmit: (_k, x) => { upholdBan(a, String(x.nt)); done('Ban upheld'); } });

  const what = a.type === 'Customer'
    ? (s === 'Active' ? 'No restrictions.' : 'New purchases and bookings are blocked for the scope shown. Sessions are revoked for a full-account restriction. Wallet funds and order history are kept.')
    : (s === 'Active' ? 'No restrictions.' : 'Publishing listings and accepting new orders or bookings is blocked for the scope shown. ' + (a.paused || 0) + ' of ' + a.listings + ' listings are paused. Existing orders (' + a.orders + ') are kept for staff to resolve. Payouts (' + mny(pend) + ') are on hold, not confiscated.');

  const actions = (
    <>
      {canSusp ? <OutlineBtn primary onPress={pause}>Pause account</OutlineBtn> : <Txt size={9.5} mut style={{ marginBottom: 6 }}>Pause: needs Customer support, Review staff or Super Admin</Txt>}
      {a.type !== 'Customer' && canSusp ? <OutlineBtn onPress={() => restrict('Suspension', true)}>Restrict one service</OutlineBtn> : null}
      {canBan ? <OutlineBtn onPress={ban}>Ban account</OutlineBtn> : <Txt size={9.5} mut style={{ marginBottom: 6 }}>Ban: Super Admin only</Txt>}
      {s === 'Banned' && canBan ? <OutlineBtn onPress={() => { markAppeal(a); done('Appeal logged. Status: In review'); }}>Mark appeal received</OutlineBtn> : null}
      {s === 'In review' && canBan ? <OutlineBtn onPress={uphold}>Uphold ban</OutlineBtn> : null}
    </>
  );

  return (
    <DrawerBody title={a.n} onClose={close} actions={actions}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4, marginBottom: 8, flexWrap: 'wrap' }}>
        <StatusPill label={accStatusLabel(a)} tone={ACC_TONE[s]} /><Txt size={10.6} mut>{a.type + ' · ' + a.id}</Txt>
      </View>
      <KeyValue rows={[['Services', a.svc.length ? a.svc.join(', ') : 'All Wantiss services'], ['Open orders', String(a.orders)], ['Wallet balance', mny(a.wallet)],
        ...((a.type === 'Customer' ? [] : [['Pending payouts', mny(pend)], ['Listings', a.listings + ' (' + (a.paused || 0) + ' paused)']]) as [string, string][])]} />
      <Section title="Restrictions in force">
        <ListRows empty="None." rows={a.r.map((r) => ({
          key: r.id, main: r.kind + ' · ' + scopeTxt(r), sub: r.reason + ' · ' + r.start + ' to ' + (r.end || 'until lifted') + ' · by ' + r.by,
          right: r.kind === 'Suspension'
            ? (canSusp ? <View style={{ flexDirection: 'row' }}><OutlineBtn onPress={() => editSusp(r)} style={{ marginRight: 4, marginBottom: 0 }}>Edit</OutlineBtn><OutlineBtn primary onPress={() => lift(r)} style={{ marginRight: 0, marginBottom: 0 }}>Lift</OutlineBtn></View> : undefined)
            : (canBan ? <OutlineBtn primary onPress={() => lift(r)} style={{ marginRight: 0, marginBottom: 0 }}>Reinstate</OutlineBtn> : <Txt size={9.5} mut>Super Admin only</Txt>),
        }))} />
      </Section>
      <Section title="What this means"><Txt size={12} lh={1.4}>{what}</Txt></Section>
      <Section title="Activity">
        <ListRows rows={[{ main: tx.length + ' transactions', right: 'Open in Finance ›', onPress: () => { closeAll(); nav.go('finance', { fv: 'Transactions', fs: 'All', fq: a.n }); } }]} />
      </Section>
      <Section title="Status history (append only)">
        <ListRows empty="No history yet." rows={a.hist.slice().reverse().map((h, i) => ({ key: String(i), main: h.action, sub: h.txt + ' · ' + h.by + (h.internal && canSusp ? ' · internal note: ' + h.internal : ''), right: h.when }))} />
      </Section>
    </DrawerBody>
  );
}

export function CustomerDrawer({ id, close }: { id: string; close: () => void }) {
  const a = db.ACC.find((x) => x.n === id);
  return a ? <AccountDrawer id={a.id} close={close} /> : null;
}

export function AuditDrawer({ id, close }: { id: string; close: () => void }) {
  const a = db.AUD[+id];
  if (!a) return null;
  return (
    <DrawerBody title="Audit event" onClose={close}>
      <View style={{ marginVertical: 4 }}><StatusPill label="Completed" /></View>
      <KeyValue rows={[['Action', a[0]], ['Actor', a[1]], ['When', a[2]], ['Result', 'Success']]} />
    </DrawerBody>
  );
}

drawers.staff = (id, close) => <StaffDrawer id={id} close={close} />;
drawers.acc = (id, close) => <AccountDrawer id={id} close={close} />;
drawers.cust = (id, close) => <CustomerDrawer id={id} close={close} />;
drawers.aud = (id, close) => <AuditDrawer id={id} close={close} />;
