import { supabase } from '../lib/supabase';
import { bump } from '../state/db';
import { session } from '../state/access';

export const AUTH_CONFIG = { idleMs: 30 * 60 * 1000 };

export const emailOk = (e: string) => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(e);
export const maskEmail = (e: string) => e.replace(/^(.).*(@.*)$/, '$1•••$2');

export const PASSWORD_RULES: [string, (p: string) => boolean][] = [
  ['At least 10 characters', (p) => p.length >= 10],
  ['Upper and lower case letters', (p) => /[a-z]/.test(p) && /[A-Z]/.test(p)],
  ['A number', (p) => /\\d/.test(p)],
  ['A symbol, like # or !', (p) => /[^A-Za-z0-9]/.test(p)],
];
export const passwordScore = (p: string) => PASSWORD_RULES.filter((r) => r[1](p)).length;
export const passwordError = (p: string, email?: string) => {
  if (!PASSWORD_RULES.every((r) => r[1](p))) return 'Password does not meet all the rules below.';
  const local = (email || '').split('@')[0].toLowerCase();
  if (local.length >= 4 && p.toLowerCase().includes(local)) return 'Password must not contain your email name.';
  return '';
};

export function leaveApp() {
  void supabase.auth.signOut();
  session.who = null;
  session.view = '';
  session.userId = null;
  session.email = null;
  session.role = null;
  session.status = null;
  session.last = Date.now();
  bump();
}

export const sessionStillValid = () => !!session.userId && session.status === 'active';
export const touch = () => { session.last = Date.now(); };
export const idleExpired = () => !!session.userId && Date.now() - session.last > AUTH_CONFIG.idleMs;
