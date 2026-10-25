import { supabase } from '../lib/supabase';
import { authDb, aud, bump, db, TODAY } from '../state/db';
import { acs, nm, session, staffByName } from '../state/access';
import type { StaffMember } from '../data/types';

export const AUTH_CONFIG = { idleMs: 30 * 60 * 1000, lockMs: 30000, maxAttempts: 5, linkMs: 30 * 60 * 1000 };

export const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
export const maskEmail = (e: string) => e.replace(/^(.).*(@.*)$/, '$1•••$2');

export const PASSWORD_RULES: [string, (p: string) => boolean][] = [
  ['At least 10 characters', (p) => p.length >= 10],
  ['Upper and lower case letters', (p) => /[a-z]/.test(p) && /[A-Z]/.test(p)],
  ['A number', (p) => /\d/.test(p)],
  ['A symbol, like # or !', (p) => /[^A-Za-z0-9]/.test(p)],
];
export const passwordScore = (p: string) => PASSWORD_RULES.filter((r) => r[1](p)).length;
export const passwordError = (p: string, email?: string) => {
  if (!PASSWORD_RULES.every((r) => r[1](p))) return 'Password does not meet all the rules below.';
  const local = (email || '').split('@')[0].toLowerCase();
  if (local.length >= 4 && p.toLowerCase().includes(local)) return 'Password must not contain your email name.';
  return '';
};

const emailOf = (name: string) => authDb[name]?.email;
export const staffByEmail = (email: string): StaffMember | undefined => db.STAFF.find((s) => emailOf(s.n) === email);
export const staffByCode = (code: string): StaffMember | undefined => db.STAFF.find((s) => authDb[s.n]?.code && authDb[s.n].code === code);

const fails: Record<string, { n: number; until: number }> = {};

export type SignInResult =
  | { kind: 'error'; message: string }
  | { kind: 'mfa'; staff: StaffMember }
  | { kind: 'blocked'; title: string; message: string };

/** Checks email and password. Errors never reveal whether the email exists. */
export function checkCredentials(emailRaw: string, pw: string): SignInResult {
  const email = emailRaw.trim().toLowerCase();
  const f = fails[email] || (fails[email] = { n: 0, until: 0 });
  if (f.until > Date.now()) return { kind: 'error', message: `Too many attempts. Try again in ${Math.ceil((f.until - Date.now()) / 1000)} seconds, or reset your password.` };
  const s = staffByEmail(email);
  const ok = !!s && !!authDb[s.n]?.pw && authDb[s.n].pw === pw;
  if (!ok) {
    f.n++;
    if (f.n >= AUTH_CONFIG.maxAttempts) { f.until = Date.now() + AUTH_CONFIG.lockMs; f.n = 0; return { kind: 'error', message: 'Too many attempts. Try again in 30 seconds, or reset your password.' }; }
    const left = AUTH_CONFIG.maxAttempts - f.n;
    return { kind: 'error', message: `Email or password is incorrect. ${left} attempt${left === 1 ? '' : 's'} left.` };
  }
  f.n = 0;
  if (s!.st === 'Suspended') return { kind: 'blocked', title: 'Access suspended', message: `Your staff access is suspended${s!.susEnd ? ' until ' + s!.susEnd : ''}. Your role is kept. Ask a Super Admin to restore it.` };
  if (s!.st === 'Revoked') return { kind: 'blocked', title: 'No staff access', message: 'This account no longer has staff access. If you think this is a mistake, contact a Super Admin.' };
  if (s!.st !== 'Active') return { kind: 'error', message: 'Email or password is incorrect.' };
  return { kind: 'mfa', staff: s! };
}

export const codeOk = (_code: string) => false;

/** Finishes sign in: the interface now follows this person. */
export function enterApp(s: StaffMember) {
  session.who = s.n; session.view = s.n; session.last = Date.now();
  s.last = 'Now';
  aud('Signed in · ' + s.n, s.n);
  bump();
}
export function leaveApp() {
  const w = session.who;
  void supabase.auth.signOut();
  session.who = null; session.view = 'momo'; session.userId = null; session.email = null; session.role = null; session.status = null;
  if (w) aud('Signed out · ' + w, w);
  bump();
}
/** Signed-in person lost access (suspended or revoked) while using the app. */
export const sessionStillValid = () => !!session.userId && session.status === 'active';
export const touch = () => { session.last = Date.now(); };
export const idleExpired = () => !!session.who && Date.now() - session.last > AUTH_CONFIG.idleMs;

export type RegisterResult = { ok: false; field?: string; message: string } | { ok: true; staff: StaffMember };
/** Accept an invitation: code, matching email and a valid password. */
export function registerFromInvite(codeRaw: string, emailRaw: string, pw: string, pw2: string, accepted: boolean): RegisterResult {
  const code = codeRaw.trim().toUpperCase(), email = emailRaw.trim().toLowerCase();
  if (!code) return { ok: false, field: 'ic', message: 'Enter your invitation code.' };
  if (!email) return { ok: false, field: 'em', message: 'Enter the email the invitation was sent to.' };
  if (!emailOk(email)) return { ok: false, field: 'em', message: 'Enter a valid email address.' };
  if (!pw) return { ok: false, field: 'pw', message: 'Create a password.' };
  const pe = passwordError(pw, email);
  if (pe) return { ok: false, field: 'pw', message: pe };
  if (pw !== pw2) return { ok: false, field: 'pw2', message: pw2 ? 'Passwords do not match.' : 'Confirm your password.' };
  if (!accepted) return { ok: false, field: 'tm', message: 'Accept the policy to continue.' };
  const s = staffByCode(code);
  if (!s) return { ok: false, message: 'This invitation code is not valid.' };
  if (s.st === 'Cancelled') return { ok: false, message: 'This invitation was cancelled. Ask a Super Admin to send a new one.' };
  if (s.st !== 'Invited') return { ok: false, message: 'This invitation was already used. Sign in instead.' };
  if (authDb[s.n].email !== email) return { ok: false, field: 'em', message: 'This email does not match the invitation.' };
  return { ok: true, staff: s };
}
export function activateInvitation(s: StaffMember, pw: string) {
  nm(s);
  s.st = 'Active'; authDb[s.n].pw = pw; s.last = 'Now';
  s.hist.push({ when: TODAY, by: s.n, action: 'Accepted invitation', txt: 'Account created with role ' + s.role, note: '' });
  aud('Invitation accepted · ' + s.n, s.n);
  bump();
}

export interface ResetToken { email: string; t: number; used: boolean }
export function requestReset(emailRaw: string): ResetToken | null {
  const email = emailRaw.trim().toLowerCase();
  const s = staffByEmail(email);
  if (s && authDb[s.n]?.pw) { aud('Password reset requested · ' + s.n, s.n); return { email, t: Date.now(), used: false }; }
  return null;
}
export const tokenValid = (t: ResetToken | null) => !!t && !t.used && Date.now() - t.t <= AUTH_CONFIG.linkMs;
export function applyReset(t: ResetToken, pw: string, pw2: string): { ok: boolean; field?: string; message?: string; expired?: boolean } {
  if (!pw) return { ok: false, field: 'pw', message: 'Enter a new password.' };
  const pe = passwordError(pw, t.email);
  if (pe) return { ok: false, field: 'pw', message: pe };
  if (pw !== pw2) return { ok: false, field: 'pw2', message: 'Passwords do not match.' };
  const s = staffByEmail(t.email)!;
  if (authDb[s.n].pw === pw) return { ok: false, field: 'pw', message: 'Choose a password you have not used before.' };
  if (!tokenValid(t)) return { ok: false, expired: true };
  authDb[s.n].pw = pw; t.used = true; delete fails[t.email];
  s.hist.push({ when: TODAY, by: s.n, action: 'Password reset', txt: 'Other sessions ended', note: '' });
  aud('Password reset · ' + s.n, s.n);
  return { ok: true };
}

export const demoAccounts = () => [] as { name: string; role: string; status: string; email: string; pw: string }[];
export const effectiveAccess = acs;
