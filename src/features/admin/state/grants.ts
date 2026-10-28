import { aud, db, TODAY } from './db';
import { acs, can, LN, logStaff, needs, nm, RIGHTS, session, staffByName } from './access';
import { GRANTS, isLive, liveGrantsFor, REQUESTS } from './grantStore';
import { addDays, daysBetween, validDate } from '../lib/dates';
import type { AccessRequest, Grant } from '../data/types';

export { GRANTS, REQUESTS, isLive, liveGrantsFor, addDays, daysBetween, validDate };

/** Puts a notice in the notification centre. `to` is a staff name or '*perm' (everyone who can manage permissions). */
const notify = (to: string, t: string, d: string, v: string, crit = false) => { db.NS.unshift({ t, w: 'just now', f: (crit ? 'crit ' : '') + 'unread', d, v, to }); };


/** Managing permissions stays with the Super Admin role; it cannot be requested or granted for a period. */
export const REQUESTABLE_RIGHTS = RIGHTS.filter((r) => r !== 'Manage permissions');
export const SECTION_PREFIX = 'Section · ';
export const RIGHT_PREFIX = 'Right · ';

/** Options for the "what do you need" select: sections below Edit and rights the person does not have. */
export function requestTargets(who: string): string[] {
  const s = staffByName(who);
  if (!s) return [];
  const e = acs(s);
  return [
    ...db.SEC.filter((_x, i) => e.lv[i] < 2).map((x) => SECTION_PREFIX + x),
    ...REQUESTABLE_RIGHTS.filter((r) => !e.rights.includes(r)).map((r) => RIGHT_PREFIX + r),
  ];
}

export const grantLabel = (g: Pick<Grant, 'kind' | 'sec' | 'right' | 'level'>) => (g.kind === 'section' ? db.SEC[g.sec] + ' · ' + LN[g.level] : g.right);
export const requestLabel = (r: AccessRequest) => grantLabel(r);

const PRESETS: [string, number][] = [['1 day', 1], ['3 days', 3], ['1 week', 7], ['2 weeks', 14], ['1 month', 30]];
export const ASK_OPTIONS = ['Not sure', ...PRESETS.map((p) => p[0]), 'Permanent'];
export const PERMANENT = 'Permanent (until revoked)';
export const ON_DATE = 'A specific date (fill the date field)';
/** Options shown to the approver, with the end date each one gives. */
export const durationOptions = () => [...PRESETS.map(([l, n]) => l + ' · until ' + addDays(TODAY, n)), ON_DATE, PERMANENT];
/** The approver's default: what the person suggested, when it matches a preset. */
export const defaultDuration = (ask: string) => durationOptions().find((o) => o.startsWith(ask + ' ·')) ?? (ask === 'Permanent' ? PERMANENT : durationOptions()[2]);

export function endFromChoice(choice: string, custom: string): { end: string; error: string } {
  if (choice === PERMANENT) return { end: '', error: '' };
  if (choice === ON_DATE) {
    if (!validDate(custom)) return { end: '', error: 'Enter the end date as YYYY-MM-DD.' };
    if (custom < TODAY) return { end: '', error: 'The end date must be today or later.' };
    return { end: custom, error: '' };
  }
  const preset = PRESETS.find(([l]) => choice.startsWith(l + ' ·'));
  return preset ? { end: addDays(TODAY, preset[1]), error: '' } : { end: '', error: 'Choose how long the access lasts.' };
}

const wasExpired = (g: Grant) => g.st === 'Expired' || (g.st === 'Active' && !!g.end && g.end < TODAY);
export const grantStatus = (g: Grant): Grant['st'] => (wasExpired(g) ? 'Expired' : g.st);
export const daysLeft = (g: Grant): number | null => (g.end ? daysBetween(TODAY, g.end) : null);

/** "Permanent", "Ends today", "4 days left", "Expired", "Revoked". */
export function remainingText(g: Grant): string {
  const st = grantStatus(g);
  if (st !== 'Active') return st;
  const d = daysLeft(g);
  return d === null ? 'Permanent' : d === 0 ? 'Ends today' : d + (d === 1 ? ' day left' : ' days left');
}
/** Pill colour: grey when over, red when revoked, yellow when ending within 3 days, green otherwise. */
export function grantTone(g: Grant): string {
  const st = grantStatus(g);
  if (st === 'Revoked') return 'or';
  if (st === 'Expired') return 'grey';
  const d = daysLeft(g);
  return d !== null && d <= 3 ? 'ye' : 'gr';
}
/** How much of the period has passed, 0 to 1 (permanent grants have no bar). */
export function elapsed(g: Grant): number {
  if (!g.end) return 0;
  const span = Math.max(1, daysBetween(g.start, g.end));
  return Math.min(1, Math.max(0, daysBetween(g.start, TODAY) / span));
}
export const grantsOf = (who: string) => GRANTS.filter((g) => g.who === who).slice().reverse();
export const pendingRequests = () => REQUESTS.filter((r) => r.st === 'Pending');
export const REQ_TONE: Record<string, string> = { Pending: 'ye', Approved: 'gr', Declined: 'or', Cancelled: 'grey' };

const nextId = (prefix: string, list: { id: string }[]) => prefix + String(Math.max(0, ...list.map((x) => +x.id.slice(prefix.length) || 0)) + 1).padStart(4, '0');
const self = (n: string) => n === session.view;
const NEEDS_MP = 'This needs the “Manage permissions” right.';

/* ------------------------------------------------------------------ */
/* Requesting                                                          */
/* ------------------------------------------------------------------ */
export interface RequestInput { target: string; level: string; item: string; why: string; ask: string }

/** A staff member asks for more access to review or change something. Returns an error message, or '' when sent. */
export function requestAccess(v: RequestInput): string {
  const s = staffByName(session.view);
  if (!s || s.st !== 'Active') return 'Only active staff can request access.';
  nm(s);
  if (!v.item.trim()) return 'Say which file, record or item you need.';
  if (!v.why.trim()) return 'A reason is required.';
  const e = acs(s);
  let kind: 'section' | 'right', sec = -1, right = '', level = 1;
  if (v.target.startsWith(SECTION_PREFIX)) {
    kind = 'section'; sec = db.SEC.indexOf(v.target.slice(SECTION_PREFIX.length)); level = LN.indexOf(v.level);
    if (sec < 0 || level < 1) return 'Choose what you need access to.';
    if (e.lv[sec] >= level) return 'You already have ' + LN[e.lv[sec]] + ' access to ' + db.SEC[sec] + '.';
  } else if (v.target.startsWith(RIGHT_PREFIX)) {
    kind = 'right'; right = v.target.slice(RIGHT_PREFIX.length);
    if (!REQUESTABLE_RIGHTS.includes(right)) return 'This right cannot be requested. Ask a Super Admin to change your role.';
    if (e.rights.includes(right)) return 'You already have the “' + right + '” right.';
  } else return 'Choose what you need access to.';
  if (REQUESTS.some((r) => r.st === 'Pending' && r.by === s.n && r.kind === kind && r.sec === sec && r.right === right)) {
    return 'You already have a pending request for this. Wait for a decision or cancel it first.';
  }
  const r: AccessRequest = {
    id: nextId('AR-', REQUESTS), by: s.n, kind, sec, right, level, item: v.item.trim(), why: v.why.trim(), ask: v.ask || 'Not sure',
    when: TODAY, st: 'Pending', decidedBy: '', decidedWhen: '', note: '', grantId: '',
  };
  REQUESTS.push(r);
  logStaff(s, 'Access requested', requestLabel(r) + ' · ' + r.item, r.why);
  aud('Access requested · ' + s.n + ' · ' + requestLabel(r), s.n);
  notify('*perm', 'Access request · ' + s.n + ' · ' + requestLabel(r), 'req', r.id);
  return '';
}

export function cancelRequest(id: string): string {
  const r = REQUESTS.find((x) => x.id === id);
  if (!r || r.st !== 'Pending') return 'This request is no longer pending.';
  if (!self(r.by)) return 'Only the person who asked can cancel a request.';
  r.st = 'Cancelled'; r.decidedBy = r.by; r.decidedWhen = TODAY;
  const s = staffByName(r.by);
  if (s) logStaff(s, 'Request cancelled', requestLabel(r) + ' · ' + r.item);
  aud('Access request cancelled · ' + r.by, r.by);
  return '';
}

/* ------------------------------------------------------------------ */
/* Deciding                                                            */
/* ------------------------------------------------------------------ */
export interface DecisionInput { approve: boolean; level: string; choice: string; custom: string; note: string }

/** Approve (with a level and an end date, or permanent) or decline a pending request. Returns an error message, or ''. */
export function decideRequest(id: string, d: DecisionInput): string {
  if (!can(needs('Manage permissions'))) return NEEDS_MP;
  const r = REQUESTS.find((x) => x.id === id);
  if (!r || r.st !== 'Pending') return 'This request has already been decided.';
  if (self(r.by)) return 'You cannot decide your own request. Ask another Super Admin.';
  const s = staffByName(r.by);
  if (!d.approve) {
    if (!d.note.trim()) return 'Say why it is declined, so the person knows.';
    r.st = 'Declined'; r.decidedBy = session.view; r.decidedWhen = TODAY; r.note = d.note.trim();
    if (s) logStaff(s, 'Request declined', requestLabel(r) + ' · ' + r.item, r.note);
    aud('Access request declined · ' + r.by, session.view);
    notify(r.by, 'Access declined · ' + requestLabel(r) + (r.note ? ' · ' + r.note : ''), 'req', r.id);
    return '';
  }
  if (!s || s.st !== 'Active') return 'This person is no longer active staff. Decline the request instead.';
  nm(s);
  const level = r.kind === 'section' ? LN.indexOf(d.level) : 1;
  if (level < 1) return 'Choose View or Edit.';
  const e = acs(s);
  if (r.kind === 'section' ? e.lv[r.sec] >= level : e.rights.includes(r.right)) return 'They already have this access now. Decline the request or choose a higher level.';
  const { end, error } = endFromChoice(d.choice, d.custom.trim());
  if (error) return error;
  const g: Grant = {
    id: nextId('G-', GRANTS), who: s.n, kind: r.kind, sec: r.sec, right: r.right, level, item: r.item, why: r.why,
    start: TODAY, end, by: session.view, reqId: r.id, st: 'Active', closed: '', closedBy: '', closeNote: '',
  };
  GRANTS.push(g);
  r.st = 'Approved'; r.level = level; r.decidedBy = session.view; r.decidedWhen = TODAY; r.note = d.note.trim(); r.grantId = g.id;
  logStaff(s, end ? 'Temporary access granted' : 'Permanent access granted', grantLabel(g) + ' · ' + (end ? 'until ' + end : 'until revoked') + ' · ' + g.item, r.note);
  aud('Access granted · ' + s.n + ' · ' + grantLabel(g), session.view);
  notify(s.n, 'Access approved · ' + grantLabel(g) + ' · ' + (end ? 'until ' + end : 'no end date'), 'grant', g.id);
  return '';
}

/* ------------------------------------------------------------------ */
/* Revoking                                                            */
/* ------------------------------------------------------------------ */
/** Ends a grant now, before its end date. It applies immediately, including to active sessions. */
export function revokeGrant(id: string, note: string): string {
  if (!can(needs('Manage permissions'))) return NEEDS_MP;
  const g = GRANTS.find((x) => x.id === id);
  if (!g || grantStatus(g) !== 'Active') return 'This grant is already over.';
  if (!note.trim()) return 'A reason is required.';
  g.st = 'Revoked'; g.closed = TODAY; g.closedBy = session.view; g.closeNote = note.trim();
  const s = staffByName(g.who);
  if (s) logStaff(s, 'Grant revoked', grantLabel(g) + ' · ' + g.item + ' · was ' + (g.end ? 'until ' + g.end : 'permanent'), g.closeNote);
  aud('Grant revoked · ' + g.who + ' · ' + (g.kind === 'section' ? db.SEC[g.sec] : g.right), session.view);
  notify(g.who, 'Access ended early · ' + grantLabel(g) + ' · ' + g.closeNote, 'grant', g.id, true);
  return '';
}

/** Moves the end date of a running grant: extend, shorten, or make it permanent. The choice counts from today. */
export function changeGrantEnd(id: string, choice: string, custom: string, note: string): string {
  if (!can(needs('Manage permissions'))) return NEEDS_MP;
  const g = GRANTS.find((x) => x.id === id);
  if (!g || grantStatus(g) !== 'Active') return 'This grant is already over.';
  if (!note.trim()) return 'A reason is required.';
  const { end, error } = endFromChoice(choice, custom.trim());
  if (error) return error;
  if (end === g.end) return 'That is already the end date.';
  const was = g.end ? 'until ' + g.end : 'permanent';
  g.end = end; g.warned = false;
  const txt = 'End date: ' + was + ' → ' + (end ? 'until ' + end : 'permanent');
  (g.changes = g.changes || []).push({ when: TODAY, by: session.view, txt: txt + ' · ' + note.trim() });
  const s = staffByName(g.who);
  if (s) logStaff(s, 'Grant changed', grantLabel(g) + ' · ' + g.item + ' · ' + txt, note.trim());
  aud('Grant changed · ' + g.who + ' · ' + (g.kind === 'section' ? db.SEC[g.sec] : g.right), session.view);
  notify(g.who, 'Access period changed · ' + grantLabel(g) + ' · ' + (end ? 'now until ' + end : 'now permanent'), 'grant', g.id);
  return '';
}

/** Closes every running grant of a person (used when all their staff access is revoked). */
export function closeGrantsFor(who: string, note: string) {
  GRANTS.forEach((g) => {
    if (g.who !== who || grantStatus(g) !== 'Active') return;
    g.st = 'Revoked'; g.closed = TODAY; g.closedBy = session.view; g.closeNote = note;
  });
}

/* ------------------------------------------------------------------ */
/* Analytics for the Permissions page                                  */
/* ------------------------------------------------------------------ */
export function grantStats() {
  const live = GRANTS.filter(isLive);
  return {
    live: live.length,
    permanent: live.filter((g) => !g.end).length,
    soon: live.filter((g) => g.end && daysBetween(TODAY, g.end) <= 3).length,
    expired: GRANTS.filter((g) => grantStatus(g) === 'Expired').length,
    revoked: GRANTS.filter((g) => g.st === 'Revoked').length,
    pending: pendingRequests().length,
    approved: REQUESTS.filter((r) => r.st === 'Approved').length,
    declined: REQUESTS.filter((r) => r.st === 'Declined').length,
  };
}

export interface PersonGrants { n: string; live: number; total: number; next: string; permanent: boolean }
/** One row per staff member who ever had a grant: running count, total, and the soonest end date among running ones. */
export function grantsByPerson(): PersonGrants[] {
  const names = Array.from(new Set(GRANTS.map((g) => g.who)));
  return names.map((n) => {
    const mine = GRANTS.filter((g) => g.who === n), live = mine.filter(isLive), ends = live.filter((g) => g.end).map((g) => g.end).sort();
    return { n, live: live.length, total: mine.length, next: ends[0] ?? '', permanent: live.some((g) => !g.end) };
  }).sort((a, b) => b.live - a.live || a.n.localeCompare(b.n));
}

/** How often each section or right was granted (all time), most first. */
export function grantsByTarget(): [string, number][] {
  const m = new Map<string, number>();
  GRANTS.forEach((g) => { const k = g.kind === 'section' ? db.SEC[g.sec] : g.right; m.set(k, (m.get(k) ?? 0) + 1); });
  return Array.from(m.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
