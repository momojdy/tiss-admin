import grantsSeed from '../data/grantsSeed.json';
import { DEMO_DAY, TODAY } from './db';
import { addDays, daysBetween } from '../lib/dates';
import type { AccessRequest, Grant } from '../data/types';

/* Low-level store for access requests and grants. It imports nothing from access.ts so that
 * access.ts can merge live grants into a person's effective access without an import cycle.
 * The rules (request, decide, revoke, analytics) live in grants.ts. */

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const seed = clone(grantsSeed) as unknown as { GRANTS: Grant[]; REQUESTS: AccessRequest[] };

/** The demo rows are dated around DEMO_DAY; when the real clock is on they are moved by the same number of days. */
const shift = daysBetween(DEMO_DAY, TODAY);
const mv = (s: string) => (s && shift ? addDays(s, shift) : s);
seed.GRANTS.forEach((g) => { g.start = mv(g.start); g.end = mv(g.end); g.closed = mv(g.closed); });
seed.REQUESTS.forEach((r) => { r.when = mv(r.when); r.decidedWhen = mv(r.decidedWhen); });

export const GRANTS: Grant[] = seed.GRANTS;
export const REQUESTS: AccessRequest[] = seed.REQUESTS;

/** A grant counts while it is Active, has started, and its end date (inclusive) has not passed. Permanent grants have no end. */
export const isLive = (g: Grant) => g.st === 'Active' && g.start <= TODAY && (!g.end || g.end >= TODAY);
export const liveGrantsFor = (n: string) => GRANTS.filter((g) => g.who === n && isLive(g));
