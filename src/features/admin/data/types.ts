/** Data shapes of the admin prototype. They mirror the in-memory data of the HTML prototype
 *  and are the proposed contracts for the real backend, not an existing schema. */
export type DocStatus = 'verified' | 'pending' | 'rejected' | 'missing' | 'expired';

export interface Application {
  id: string; n: string; s: string; st: number; age: number; o: string;
  d: [string, DocStatus][]; hold: number; esc: number; due: string;
  notes: { by: string; when: string; txt: string }[] | string[][] | unknown[];
  log: [string, string][];
  /** Exact timestamps are populated only by the authorized backend snapshot. */
  createdAt?: string; reviewedAt?: string;
}
export interface Transaction {
  id: string; f: string; u: string; d: string; n: string; a: number; s: string; ref: number; rq: number; log: [string, string][];
  /** Exact timestamp from the authorized backend; absent on prototype seed rows. */
  createdAt?: string;
}
export type ServiceRow = [string, string, string, string, number, string, number, string];

/** Business fields returned by the authorized ecosystem domain query. Kept separate from service-directory metadata. */
export interface BusinessSnapshot {
  id: string; name: string; verification: string; is_live: boolean;
  city: string; country: string; payout_ready: boolean;
}

export interface SupportCase { id: string; t: string; svc: string; pri: string; o: string; st: string; msgs: [string, string][] }
/** `to` limits who sees it: a staff name, or '*perm' for everyone who can manage permissions. Empty = everyone. */
export interface Notice { t: string; w: string; f: string; d: string; v: string; read?: number; to?: string }
export interface Banner { id: string; t: string; svc: string; pl: string; st: string; from: string; to: string }
export interface Promotion { id: string; n: string; svc: string; fund: string; inc: string; st: string; from: string; to: string; terms?: string; budget?: string }
export interface Announcement { id: string; t: string; aud: string; st: string; when: string }

export interface HistoryEntry { when: string; by: string; action: string; txt: string; note: string; internal?: string }
export interface StaffMember {
  userId?: string; n: string; role: string; last: string; st: 'Active' | 'Suspended' | 'Revoked' | 'Invited' | 'Cancelled';
  x: number; ov: { sec: Record<number, number>; rights: Record<string, number> }; scope: string[]; hist: HistoryEntry[];
  until: string; susEnd: string; prevRole?: string;
}

export interface Restriction { id: string; kind: 'Suspension' | 'Ban'; scope: string; reason: string; notes: string; start: string; end: string; by: string; notified: number }
export interface AccountHist { when: string; by: string; action: string; txt: string; internal: string }
export interface Account {
  id: string; n: string; type: 'Customer' | 'Seller' | 'Vendor'; svc: string[]; orders: number; wallet: number; listings: number;
  r: Restriction[]; hist: AccountHist[]; appeal: number; paused: number;
}
export type Payout = [string, string, number, string];
export type Settlement = [string, string, string, number, string];
export interface Reco { id: string; t: string; a: number; b: number; st: string }

export interface AuthRecord { email?: string; pw?: string; code?: string }

/** Time-boxed access given to one staff member after they asked for it (or permanent when `end` is empty).
 *  Proposed backend contract, not an existing schema. */
export type GrantStatus = 'Active' | 'Expired' | 'Revoked';
export interface Grant {
  id: string; who: string;
  /** 'section' grants a level (1 view, 2 edit) on `sec`; 'right' grants the special right named in `right` */
  kind: 'section' | 'right'; sec: number; right: string; level: number;
  /** the file, record or item the person needed access for */
  item: string; why: string;
  start: string; /** empty = permanent, until revoked */ end: string;
  by: string; reqId: string; st: GrantStatus;
  /** end-date changes after approval (extend, shorten, make permanent) */
  changes?: { when: string; by: string; txt: string }[];
  /** the person was already told it is about to end */
  warned?: boolean;
  /** set when the grant stopped before or at its end date */
  closed: string; closedBy: string; closeNote: string;
}
export type RequestStatus = 'Pending' | 'Approved' | 'Declined' | 'Cancelled';
export interface AccessRequest {
  id: string; by: string; kind: 'section' | 'right'; sec: number; right: string; level: number;
  item: string; why: string;
  /** how long the requester suggested ("Not sure", "1 week", "Permanent" ...); the approver decides */
  ask: string; when: string; st: RequestStatus;
  decidedBy: string; decidedWhen: string; note: string; grantId: string;
}
