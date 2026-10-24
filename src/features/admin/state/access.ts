import { db, TODAY, aud, bump } from './db';
import { GRANTS, liveGrantsFor } from './grantStore';
import type { StaffMember } from '../data/types';

/** Who is signed in, and who the signed-in person is previewing. */
export const session = {
  /** staff name of the real signed-in person, or null when signed out */
  who: null as string | null,
  /** name the interface currently follows (differs from `who` while previewing) */
  view: 'momo',
  last: Date.now(),
  userId: null as string | null,
  email: null as string | null,
  role: null as string | null,
  status: null as string | null,
};

export const RIGHTS = db.RIGHTS;
let serverGrants: { permission_key: string; access_level: string; expires_at: string | null; revoked_at: string | null }[] = [];
export const setServerGrants = (rows: typeof serverGrants) => { serverGrants = rows; };
const levelRank = (level: string) => level === 'manage' ? 3 : level === 'edit' ? 2 : level === 'view' ? 1 : 0;
const permissionLevel = (key: string) => serverGrants.filter(g => g.permission_key === key && !g.revoked_at && (!g.expires_at || Date.parse(g.expires_at) > Date.now())).reduce((n, g) => Math.max(n, levelRank(g.access_level)), 0);
export const LN = ['None', 'View', 'Edit'];

export const nm = (s: StaffMember): StaffMember => {
  s.ov = s.ov || { sec: {}, rights: {} };
  s.scope = s.scope || []; s.hist = s.hist || []; s.until = s.until || ''; s.susEnd = s.susEnd || '';
  return s;
};
db.STAFF.forEach(nm);

export const effOf = (role: string, ov: StaffMember['ov'], st: string) => {
  if (st !== 'Active') return { lv: db.SEC.map(() => 0), rights: [] as string[] };
  const t = db.ROLES[role] || db.SEC.map(() => 0), base = db.RR[role] || [];
  return {
    lv: t.map((x, i) => (ov.sec[i] !== undefined ? ov.sec[i] : x)),
    rights: RIGHTS.filter((r) => ov.rights[r] === 1 || (ov.rights[r] !== -1 && base.includes(r))),
  };
};
/** Effective access = role template + individual overrides + every live approved grant (a grant only ever adds access). */
export const acs = (s: StaffMember) => {
  nm(s);
  const e = effOf(s.role, s.ov, s.st);
  if (s.st === 'Active') {
    liveGrantsFor(s.n).forEach((g) => {
      if (g.kind === 'section') e.lv[g.sec] = Math.max(e.lv[g.sec] ?? 0, g.level);
      else if (!e.rights.includes(g.right)) e.rights.push(g.right);
    });
  }
  return e;
};
export const staffByName = (n: string) => db.STAFF.find((s) => s.n === n);
/** The staff member the interface currently follows. */
export const me = (): StaffMember => staffByName(session.view) || db.STAFF[0];
export const realMe = (): StaffMember | undefined => (session.who ? staffByName(session.who) : undefined);
export const hasRight = (r: string) => session.userId ? session.status === 'active' && (session.role === 'super_admin' || permissionLevel(r.toLowerCase().replace(/[^a-z0-9]+/g, '.')) >= 1) : acs(me()).rights.includes(r);
export const secLv = (i: number) => {
  if (!session.userId) return acs(me()).lv[i] ?? 0;
  if (session.status !== 'active') return 0;
  if (session.role === 'super_admin') return 2;
  const key = String(db.SEC[i] || '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\\.|\\.$/g, '');
  return Math.min(2, permissionLevel(key));
};

export const lastSuperAdmin = (n: string) => {
  const sa = db.STAFF.filter((s) => s.st === 'Active' && s.role === 'Super Admin');
  return sa.length === 1 && sa[0].n === n;
};
export const logStaff = (s: StaffMember, action: string, txt: string, note?: string) =>
  s.hist.push({ when: TODAY, by: session.view, action, txt, note: note || '' });

/** Marks approved grants whose end date passed as Expired and writes it to the person's history. */
function expireGrants() {
  GRANTS.forEach((g) => {
    // tell the person once, a day before (or on the day) their access is due to end
    if (g.st === 'Active' && g.end && g.end >= TODAY && !g.warned && Date.parse(g.end + 'T00:00:00Z') - Date.parse(TODAY + 'T00:00:00Z') <= 86400000) {
      g.warned = true;
      db.NS.unshift({ t: 'Access ends ' + (g.end === TODAY ? 'today' : 'tomorrow') + ' · ' + (g.kind === 'section' ? db.SEC[g.sec] + ' · ' + LN[g.level] : g.right), w: 'just now', f: 'unread', d: 'grant', v: g.id, to: g.who });
    }
    if (g.st !== 'Active' || !g.end || g.end >= TODAY) return;
    g.st = 'Expired'; g.closed = g.end; g.closedBy = 'System'; g.closeNote = 'Reached its end date';
    const s = staffByName(g.who);
    if (s) {
      nm(s);
      s.hist.push({ when: TODAY, by: 'System', action: 'Temporary access ended', txt: (g.kind === 'section' ? db.SEC[g.sec] + ' · ' + LN[g.level] : g.right) + ' · ' + g.item, note: '' });
    }
    aud('Grant expired · ' + g.who + ' · ' + (g.kind === 'section' ? db.SEC[g.sec] : g.right), 'System');
    db.NS.unshift({ t: 'Access ended · ' + (g.kind === 'section' ? db.SEC[g.sec] + ' · ' + LN[g.level] : g.right), w: 'just now', f: 'unread', d: 'grant', v: g.id, to: g.who });
  });
}

/** Removes expired temporary grants and restores suspensions whose end date passed. */
export function expireStaff() {
  expireGrants();
  db.STAFF.forEach((s) => {
    nm(s);
    if (s.until && s.until < TODAY) {
      s.ov = { sec: {}, rights: {} }; s.until = '';
      s.hist.push({ when: TODAY, by: 'System', action: 'Temporary access ended', txt: 'Individual grants removed', note: '' });
      aud('Temporary access ended · ' + s.n, session.view);
    }
    if (s.st === 'Suspended' && s.susEnd && s.susEnd < TODAY) {
      s.st = 'Active'; s.susEnd = '';
      s.hist.push({ when: TODAY, by: 'System', action: 'Access restored', txt: 'Suspension ended automatically', note: '' });
      aud('Access restored automatically · ' + s.n, session.view);
    }
  });
}

/* ---------- gating ---------- */
/** A requirement is either [sectionIndex, minLevel] or { right }. */
export type Req = [number, number] | { right: string };
export const edit = (sec: number): Req => [sec, 2];
export const needs = (right: string): Req => ({ right });

export const reqMessage = (reqs: Req[]): string => {
  for (const r of reqs) {
    if (Array.isArray(r)) { if (secLv(r[0]) < r[1]) return `You have ${secLv(r[0]) ? 'view-only' : 'no'} access to ${db.SEC[r[0]]}.`; }
    else if (!hasRight(r.right)) return `This action needs the “${r.right}” right.`;
  }
  return '';
};
/** True when the current person may do something; used to hide buttons they cannot use. */
export const can = (...reqs: Req[]) => !reqMessage(reqs);

/** Which tab (section) each screen belongs to, for access checks. */
export const SCREEN_SECTION: Record<string, number> = { overview: 0, operations: 1, ecosystem: 2, content: 3, finance: 4, analytics: 5, people: 6, business: 1, hub: 2, editor: 3, potssy: 2, workspace: 2, goodies: 2 };

export function setView(n: string) { session.view = n; bump(); }
