import { useSyncExternalStore } from 'react';
import seed from '../data/seed.json';
import { realToday } from '../lib/dates';
import type {
  Account, Announcement, Application, AuthRecord, Banner, Notice, Payout, Promotion, Reco, ServiceRow, Settlement, StaffMember, SupportCase, Transaction,
} from '../data/types';

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

/** The in-memory data of the prototype (the `APPS`, `INV`, ... arrays of the HTML). Screens mutate it and call `bump()`. */
export const db = clone(seed) as unknown as {
  APPS: Application[]; INV: Transaction[]; SVC: ServiceRow[]; MOD: Record<string, string>; STAFF: StaffMember[];
  ROLES: Record<string, number[]>; RR: Record<string, string[]>; SEC: string[]; LV: string[];
  CASES: SupportCase[]; NS: Notice[]; CUST: string[][]; BN: Banner[]; PRM: Promotion[]; ANN: Announcement[];
  MEDIA: [string, string[]][]; CH: [string, string][]; AUD: [string, string, string][];
  SET: Settlement[]; PAYO: Payout[]; RECO: Reco[]; ACC: Account[];
  PCS: any[]; PZS: any[]; WINS: any[]; PSUB: string[]; POTMAP: Record<string, string>;
  SETD: Record<string, [string, string, string, any, number, any][]>; CSUBS: string[]; WST: Record<string, string[]>; PRVP: string[];
  STG: string[]; DW: Record<string, string>; GM: string[]; GD: number[][]; GN: number[]; AD: Record<string, any>;
  SPAL: Record<string, string>; TPL: Record<string, [string, string, string[]][]>; CTA: Record<string, string>; FLOWT: Record<string, string>;
  GK: string[]; VOC: Record<string, string[]>; GMAP: Record<string, string>; CATIDS: [string, string, string][]; RIGHTS: string[]; reasons: string[];
};

/** Demo credentials for the sign-in prototype. Replace with Supabase Auth later. */
export const authDb: Record<string, AuthRecord> = {};

/** The clock. The prototype's other demo data (applications, restrictions...) is dated around 2026-10-17, so the demo keeps that
 *  day. Set USE_REAL_CLOCK = true when you connect the backend: every date rule then follows the device's local date
 *  (read once at app start) and the demo grants and requests move with it. */
export const USE_REAL_CLOCK = true;
export const DEMO_DAY = '2026-10-17';
export const TODAY = USE_REAL_CLOCK ? realToday() : DEMO_DAY;
export const TABS = ['Overview', 'Operations', 'Ecosystem', 'Content', 'Finance', 'Analytics', 'People'] as const;

/** Screen-level UI state (`U` in the HTML): filters, selected sub-tabs, search text. */
export const ui = {
  fs: 'All', fq: '', fv: 'Transactions', fm: '6M', ov: 'Board', oq: '', o48: 0, ou: 0, ec: 'All', eq: '', es: 'Most active', ev: 'Grid',
  cs: 'Overview', ps: 'Staff', pr: 'All', pq: '', hub: 'Goodies', sst: 'All', at: 'All', ast: 'All', rf: 'All',
  wsvc: 'Goodies', wmod: 'Overview', wf: 'All', wq: '', pt: 'Overview', gz: 'Overview', gb: 'burger', gf: 'All', gro: 'All', gq: 'All',
  /** activity range (7D/30D/90D/1Y), analytics range in months and $/% mode */
  AR: '30D', R: 12, PCT: 0, EC: 'All',
  /** People > Requests filter, People > Permissions grant history filter */
  rqf: 'Pending', grf: 'All',
} as Record<string, any>;

let version = 0;
const subs = new Set<() => void>();
/** Notify every mounted screen that data or UI state changed (the HTML's `rr()`). */
export const bump = () => { version++; subs.forEach((f) => f()); };
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
/** Subscribe a component to data changes. */
export const useDb = () => useSyncExternalStore(subscribe, () => version);

export const aud = (text: string, who: string) => { db.AUD.unshift([text, who, 'just now']); };
export const mny = (n: number) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
/** Raw unread count over every notice; the header uses `unreadCount()` in notices.ts, which only counts the viewer's own. */
export const unread = () => db.NS.filter((n) => n.f.includes('unread') && !n.read).length;
