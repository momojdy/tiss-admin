import { aud, authDb, db, TODAY } from './db';
import { effOf, lastSuperAdmin, LN, logStaff, nm, RIGHTS, session, staffByName } from './access';
import { closeGrantsFor } from './grants';
import type { Account, Restriction, StaffMember } from '../data/types';

export const RID = () => 'R-' + Math.random().toString(36).slice(2, 7);
export const svcNames = () => db.SVC.map((s) => s[0]);
export const accById = (id: string) => db.ACC.find((a) => a.id === id);
export const accHist = (a: Account, by: string, action: string, txt: string, internal = '') =>
  a.hist.push({ when: TODAY, by, action, txt, internal });
export const scopeTxt = (r: Restriction) => (r.scope === 'all' ? 'Entire Wantiss account' : r.scope);

export type AccStatus = 'Active' | 'Suspended' | 'Banned' | 'In review' | 'Restricted';
export const accStatus = (a: Account): AccStatus =>
  a.r.some((r) => r.kind === 'Ban' && r.scope === 'all') ? (a.appeal ? 'In review' : 'Banned')
  : a.r.some((r) => r.kind === 'Suspension' && r.scope === 'all') ? 'Suspended'
  : a.r.length ? 'Restricted' : 'Active';
export const ACC_TONE: Record<AccStatus, string> = { Active: 'gr', Suspended: 'ye', Banned: 'or', 'In review': 'blue', Restricted: 'ye' };
export const accStatusLabel = (a: Account) => accStatus(a) + (accStatus(a) === 'In review' ? ' (ban appeal)' : '');

/** Payouts go on hold and listings pause while a restriction is in force (`cons` in the HTML). */
export function applyConsequences(a: Account) {
  const held = a.r.length > 0 && a.r.some((r) => r.scope === 'all' || a.svc.includes(r.scope));
  db.PAYO.forEach((p) => {
    if (p[1] !== a.n) return;
    if (held && p[3] === 'Pending') p[3] = 'On hold';
    else if (!held && p[3] === 'On hold') p[3] = 'Pending';
  });
  a.paused = a.type === 'Customer' ? 0 : a.r.some((r) => r.scope === 'all') ? a.listings : a.r.length ? Math.ceil(a.listings / 2) : 0;
}

/** Suspensions whose end date passed are removed and logged. */
export function expireAccounts() {
  db.ACC.forEach((a) => {
    const gone = a.r.filter((r) => r.kind === 'Suspension' && r.end && r.end < TODAY);
    if (gone.length) {
      a.r = a.r.filter((r) => !gone.includes(r));
      gone.forEach((r) => {
        accHist(a, 'System', 'Expired', 'Suspension ended on ' + r.end + ' (' + (r.scope === 'all' ? 'entire account' : r.scope) + ')');
        aud('Suspension expired · ' + a.n, 'System');
      });
    }
    applyConsequences(a);
  });
}

export const RESTRICT_REASONS = ['Suspected fraud under investigation', 'Repeated policy violations', 'Missing verification documents', 'Serious abuse', 'Other'];

export interface RestrictInput { reason: string; notes: string; scope: string; start: string; end: string; notify: boolean; confirm: string }

/** Pause (Suspension) or ban an account. Returns an error message, or '' when done. */
export function restrictAccount(a: Account, kind: 'Suspension' | 'Ban', v: RestrictInput, can: { susp: boolean; ban: boolean }): string {
  const ban = kind === 'Ban';
  if (!(ban ? can.ban : can.susp)) return 'You do not have permission for this action.';
  if (ban && v.confirm !== 'BAN') return 'Type BAN in capitals to confirm.';
  const scope = v.scope === 'Entire Wantiss account' ? 'all' : v.scope;
  if (!ban && v.end && v.end < v.start) return 'The end date cannot be before the start date.';
  if (!ban && v.end && v.end < TODAY) return 'The end date must be today or later.';
  if (ban) {
    if (a.r.some((r) => r.kind === 'Ban' && (r.scope === scope || r.scope === 'all'))) return 'This account is already banned for that scope.';
    const sup = a.r.filter((r) => r.kind === 'Suspension' && (r.scope === scope || scope === 'all'));
    a.r = a.r.filter((r) => !sup.includes(r));
    sup.forEach((r) => accHist(a, 'momo', 'Superseded', 'Suspension replaced by a ban (' + scopeTxt(r) + ')'));
  } else {
    if (a.r.some((r) => r.kind === 'Ban' && r.scope === 'all')) return 'This account is already banned.';
    if (a.r.some((r) => r.kind === 'Suspension' && r.scope === scope)) return 'Already suspended for that scope. Edit the existing suspension instead.';
    if (a.r.some((r) => r.kind === 'Suspension' && r.scope === 'all')) return 'The entire account is already suspended.';
  }
  const by = session.view;
  a.r.push({ id: RID(), kind, scope, reason: v.reason, notes: v.notes, start: v.start, end: ban ? '' : v.end, by, notified: v.notify ? 1 : 0 });
  accHist(a, by, ban ? 'Banned' : 'Suspended', v.reason + ' · ' + (scope === 'all' ? 'entire account' : scope) + (ban || !v.end ? ' · until lifted' : ' · until ' + v.end), v.notes);
  if (v.notify) accHist(a, 'System', 'Customer notified', 'Your Wantiss account ' + (ban ? 'has been banned' : 'has been paused') + '. Reason: ' + v.reason + '.');
  applyConsequences(a);
  aud((ban ? 'Account banned · ' : 'Account paused · ') + a.n, by);
  return '';
}

export function liftRestriction(a: Account, r: Restriction, note: string, notify: boolean) {
  a.r = a.r.filter((y) => y !== r);
  if (r.kind === 'Ban') a.appeal = 0;
  accHist(a, session.view, 'Reinstated', (r.kind === 'Ban' ? 'Ban lifted' : 'Suspension lifted') + ' · ' + scopeTxt(r), note);
  if (notify) accHist(a, 'System', 'Customer notified', 'Your Wantiss account access has been restored.');
  applyConsequences(a);
  aud('Account reinstated · ' + a.n, session.view);
}

export function editSuspension(a: Account, r: Restriction, end: string, note: string): string {
  if (end && end < r.start) return 'The end date cannot be before the start date.';
  if (end && end < TODAY) return 'The end date must be today or later.';
  r.end = end;
  accHist(a, session.view, 'Suspension changed', 'End date: ' + (end || 'until lifted'), note);
  aud('Suspension changed · ' + a.n, session.view);
  return '';
}
export function markAppeal(a: Account) {
  a.appeal = 1; accHist(a, 'Staff', 'Appeal received', 'Appeal logged for review'); aud('Appeal received · ' + a.n, session.view);
}
export function upholdBan(a: Account, note: string) {
  a.appeal = 0; accHist(a, 'momo', 'Upheld', 'Ban upheld after review', note); aud('Ban upheld · ' + a.n, session.view);
}

export const openItems = (n: string) => db.APPS.filter((a) => a.o === n && a.st < 3).length + (staffByName(n)?.x ?? 0);
export const STAFF_TONE: Record<string, string> = { Active: 'gr', Suspended: 'ye', Revoked: 'or', Invited: 'blue', Cancelled: 'grey' };
export const levelFill = (lv: number, c: { inset: string; gr: string }) => (lv === 0 ? c.inset : lv === 1 ? '#d6e6d9' : c.gr);

const self = (n: string) => n === session.view;

export type RightChoice = 'role' | 'grant' | 'remove';
export interface AccessEdit {
  role: string; resetOverrides: boolean; sec: Record<number, number>; rights: Record<string, RightChoice>; allServices: boolean; services: string[]; until: string; why: string;
}

/** Edit access: role, per-section levels, special rights, service scope and a temporary end date. */
export function saveStaffAccess(n: string, e: AccessEdit): string {
  const s = staffByName(n);
  if (!s) return 'Staff member not found.';
  nm(s);
  if (self(n)) return 'You cannot change your own access.';
  if (!e.why.trim()) return 'A reason is required.';
  if (e.until && e.until < TODAY) return 'The end date must be today or later.';
  if (s.role === 'Super Admin' && e.role !== 'Super Admin' && lastSuperAdmin(n)) return 'There must be at least one active Super Admin.';
  const t = db.ROLES[e.role] || db.SEC.map(() => 0);
  const reset = e.resetOverrides && e.role !== s.role;
  const nov: StaffMember['ov'] = { sec: {}, rights: {} };
  if (!reset) {
    db.SEC.forEach((_x, i) => { if (e.sec[i] !== t[i]) nov.sec[i] = e.sec[i]; });
    RIGHTS.forEach((r) => { const v = e.rights[r]; if (v === 'grant') nov.rights[r] = 1; else if (v === 'remove') nov.rights[r] = -1; });
  }
  const all = svcNames();
  const scope = e.allServices || !e.services.length || e.services.length === all.length ? [] : e.services;
  // compare role + overrides only: approved grants are managed on their own and are not part of this edit
  const before = effOf(s.role, s.ov, 'Active'), after = effOf(e.role, nov, 'Active'), ch: string[] = [];
  if (e.role !== s.role) ch.push('Role: ' + s.role + ' → ' + e.role);
  db.SEC.forEach((x, i) => { if (after.lv[i] !== before.lv[i]) ch.push(x + ': ' + LN[before.lv[i]] + ' → ' + LN[after.lv[i]]); });
  RIGHTS.forEach((r) => { const x = after.rights.includes(r), y = before.rights.includes(r); if (x !== y) ch.push(r + ': ' + (y ? 'on' : 'off') + ' → ' + (x ? 'on' : 'off')); });
  if (scope.join() !== s.scope.join()) ch.push('Service scope: ' + (scope.length ? scope.join(', ') : 'all services'));
  if (e.until !== s.until) ch.push('Temporary grants until ' + (e.until || 'none'));
  s.role = e.role; s.ov = nov; s.scope = scope; s.until = e.until;
  logStaff(s, 'Access changed', ch.join('; ') || 'No effective change', e.why.trim());
  aud('Access changed · ' + n, session.view);
  return '';
}

export function suspendStaff(n: string, reason: string, note: string, end: string): string {
  const s = staffByName(n)!;
  if (self(n)) return 'You cannot suspend yourself.';
  if (lastSuperAdmin(n)) return 'There must be at least one active Super Admin.';
  if (end && end < TODAY) return 'The end date must be today or later.';
  s.st = 'Suspended'; s.susEnd = end;
  logStaff(s, 'Access suspended', reason + (end ? ' · until ' + end : ' · until restored'), note);
  aud('Staff access suspended · ' + n, session.view);
  return '';
}
export function restoreStaff(n: string, note: string) {
  const s = staffByName(n)!;
  s.st = 'Active'; s.susEnd = '';
  logStaff(s, 'Access restored', 'Suspension lifted', note);
  aud('Staff access restored · ' + n, session.view);
}
export function revokeStaff(n: string, reason: string, note: string, confirm: string): string {
  const s = staffByName(n)!;
  if (self(n)) return 'You cannot revoke yourself.';
  if (lastSuperAdmin(n)) return 'There must be at least one active Super Admin.';
  if (confirm !== 'REVOKE') return 'Type REVOKE in capitals to confirm.';
  const prev = s.role;
  db.APPS.forEach((a) => { if (a.o === n && a.st < 3) a.o = 'Unassigned'; });
  closeGrantsFor(n, 'All staff access was revoked');
  s.st = 'Revoked'; s.prevRole = prev; s.role = '—'; s.ov = { sec: {}, rights: {} }; s.scope = []; s.until = ''; s.susEnd = '';
  logStaff(s, 'Revoked all access', 'Role ' + prev + ' and individual grants removed · ' + reason, note);
  aud('Staff access revoked · ' + n, session.view);
  return '';
}
export function reinstateStaff(n: string, role: string, note: string) {
  const s = staffByName(n)!;
  s.role = role; s.st = 'Active';
  logStaff(s, 'Reinstated', 'Role: ' + role, note);
  aud('Staff reinstated · ' + n, session.view);
}
const emailShape = /^\S+@\S+\.\S+$/;
const makeCode = () => 'WNT-' + Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
export const inviteEmail = (n: string) => authDb[n]?.email;
export const inviteCode = (n: string) => authDb[n]?.code;

/** Creates an invitation (no email is sent in the prototype). The sign-in screen's "Create your account" accepts the code. */
export function inviteStaff(nameRaw: string, emailRaw: string, role: string): { ok: false; error: string } | { ok: true; email: string; name: string } {
  const name = nameRaw.trim(), email = emailRaw.trim().toLowerCase();
  if (!emailShape.test(email)) return { ok: false, error: 'Enter a valid email address.' };
  if (db.STAFF.some((s) => s.n.toLowerCase() === name.toLowerCase())) return { ok: false, error: 'A staff member with this name already exists.' };
  if (db.STAFF.some((s) => authDb[s.n]?.email === email && s.st !== 'Cancelled')) return { ok: false, error: 'This email already has an account or invitation.' };
  const s: StaffMember = { n: name, role, last: 'Not yet', st: 'Invited', x: 0, ov: { sec: {}, rights: {} }, scope: [], hist: [], until: '', susEnd: '' };
  nm(s);
  db.STAFF.push(s);
  authDb[name] = { email, code: makeCode() };
  aud('Invitation sent · ' + name, session.view);
  return { ok: true, email, name };
}
export function resendInvite(n: string) { aud('Invitation resent · ' + n, session.view); }
export function cancelInvite(n: string) {
  const s = staffByName(n)!;
  s.st = 'Cancelled';
  aud('Invitation cancelled · ' + n, session.view);
}
export function saveRoleTemplate(role: string, levels: number[], rights: string[]) {
  if (role === 'Super Admin') return;
  levels.forEach((l, i) => { db.ROLES[role][i] = l; });
  db.RR[role] = RIGHTS.filter((r) => rights.includes(r));
  aud('Role template changed · ' + role, session.view);
}
export function createRole(name: string, base: string): string {
  const n = name.trim();
  if (db.ROLES[n]) return 'That role already exists.';
  db.ROLES[n] = [...db.ROLES[base]];
  db.RR[n] = [...(db.RR[base] || [])];
  aud('Role template created · ' + n, session.view);
  return '';
}
