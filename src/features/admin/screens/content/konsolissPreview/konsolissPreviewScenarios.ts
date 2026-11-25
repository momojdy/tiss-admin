/**
 * TEMPORARY DEMO / PREVIEW FIXTURES for the Konsoliss homepage 3D visualization.
 *
 * Pure data + pure functions. This module deliberately imports no Supabase client, no hooks and
 * no React: nothing here can create bookings, change inventory, write loading records or notify
 * anyone. Every number below is a frontend-only sample and must never be persisted.
 *
 * Quantity vocabulary (these are NOT interchangeable, see README section 6):
 *  purchased  = commercial entitlement (reserved CBM)
 *  sent       = valid dispatch record
 *  warehouse  = verified China-warehouse inventory (sent minus loaded minus inbound, per the live view)
 *  inbound    = allocated / staged for a physical container
 *  loaded     = scanned into a real physical container
 */
import type {KonsolissLoadProgress} from './konsolissLoadModel';
import type {KonsolissContainerOccupancy} from './konsolissOccupancyModel';

export type PreviewContainerStatus = 'filling' | 'filled' | 'departed' | 'arrived';
export type PreviewGroup = 'A' | 'B' | 'C' | 'D';

export type PreviewContainerFixture = {
  key: string;
  number: string;
  status: PreviewContainerStatus;
  /** Other customers' physically loaded cargo in this container. */
  other: number;
  /** Customer's CBM allocated to this container (physically loaded + inbound). */
  here: number;
  loaded: number;
  inbound: number;
  /** Outline-only preview of purchased space that is NOT allocated yet (never solid, never counted). */
  outlineExtra?: number;
};

export type PreviewMilestone = {label: string; state: 'done' | 'pending' | 'unknown'};

export type PreviewScenario = {
  id: string;
  code: string;
  group: PreviewGroup;
  title: string;
  note: string;
  /** Headline pill override (demo only). Falls back to the container status label. */
  pill?: string;
  purchased: number;
  sent: number;
  /** Verified at the China warehouse (demo-only annotation; the live view merges warehouse + transit). */
  warehouseVerified?: number;
  containers: PreviewContainerFixture[];
  /** Original illustrative empty-container animation (no active reservation). */
  empty?: boolean;
  /** Data could not be verified / is still loading: no fabricated zero balances. */
  data?: 'unavailable' | 'loading';
  caption2?: string;
  deadline?: string;
  /** Demo-only initial countdown; never used for real bookings. */
  deadlineRemainingMs?: number;
  milestones?: PreviewMilestone[];
  incident?: string;
  history?: string;
};

const r3 = (n: number) => Math.round(n * 1000) / 1000;
export const CONTAINER_CAPACITY_CBM = 68;

export const PREVIEW_GROUP_LABELS: Record<PreviewGroup, string> = {
  A: 'A · Purchases & reservations',
  B: 'B · Warehouse & allocation',
  C: 'C · Physical loading',
  D: 'D · Transport & exceptions',
};

const box = (
  key: string, number: string, status: PreviewContainerStatus, other: number, loaded: number, inbound = 0, outlineExtra = 0,
): PreviewContainerFixture => ({key, number, status, other, loaded, inbound, here: r3(loaded + inbound), outlineExtra});

export const PREVIEW_SCENARIOS: readonly PreviewScenario[] = [
  {id: 'a1', code: 'A1', group: 'A', title: 'New customer · nothing purchased', purchased: 0, sent: 0, containers: [], empty: true,
    note: 'Approved original empty-container animation. No purchase, no container, no cargo.'},
  {id: 'a2', code: 'A2', group: 'A', title: 'Purchased · nothing sent', purchased: 1, sent: 0, containers: [],
    note: 'Purchased 1.000 CBM · sent 0.000 · warehouse 0.000 · assigned 0.000 · loaded 0.000. The red parcel stays in the illustrative reserved space after landing; it is not physically loaded merchandise. The 80-day clock has not started (it starts at verified China warehouse receipt).',
    deadline: 'Purchase day 6 of 25 · carrier-accepted inbound tracking is due by day 25'},
  {id: 'a3', code: 'A3', group: 'A', title: 'Purchased · day-25 deadline near', purchased: 1, sent: 0, containers: [],
    note: 'Same illustrative reservation as A2; nothing is physically loaded. A red deadline reminder asks the customer to send goods and upload tracking.',
    deadline: 'Purchase day 22 of 25', deadlineRemainingMs: 3*24*60*60*1000},
  {id: 'a4', code: 'A4', group: 'A', title: 'Label created', purchased: 1, sent: 0, containers: [],
    caption2: 'Label created',
    note: 'A created label is not proof of dispatch. Goods sent stays 0.000 CBM until the carrier accepts / first-scans the parcel.',
    deadline: '5 days left',
    milestones: [{label: 'Label created', state: 'done'}]},
  {id: 'a5', code: 'A5', group: 'A', title: 'Inbound to warehouse', purchased: 1, sent: 0.7, containers: [],
    caption2: 'Inbound to warehouse · 0.700 CBM',
    note: '0.700 CBM accepted by the domestic carrier and travelling to the China warehouse. Not yet received, not in a container.',
    milestones: [{label: 'Label created', state: 'done'}, {label: 'Carrier accepted', state: 'done'}, {label: 'At China warehouse', state: 'pending'}]},

  {id: 'b1', code: 'B1', group: 'B', title: 'Part at warehouse · rest never sent', purchased: 1, sent: 0.4, warehouseVerified: 0.4, containers: [],
    caption2: 'At warehouse 0.400 CBM · Loaded 0 CBM',
    note: 'Purchased 1.000 · warehouse-verified 0.400. The other 0.600 CBM was never sent and remains an active reservation until a valid deadline or release.'},
  {id: 'b2', code: 'B2', group: 'B', title: 'All sent at warehouse · not assigned', purchased: 1, sent: 0.7, warehouseVerified: 0.7, containers: [],
    caption2: 'At warehouse 0.700 CBM · not in a container',
    note: 'Verified warehouse inventory is not the same as merchandise inside a container. 0.700 CBM waits to be assigned.'},
  {id: 'b3', code: 'B3', group: 'B', title: 'Space allocated · nothing loaded yet', purchased: 0.5, sent: 0.5, warehouseVerified: 0.5,
    containers: [box('a', 'KS-DEMO-A', 'filling', 23, 0, 0, 0.5)],
    note: 'Dashed outline = 0.500 CBM allocated in this real container but not physically loaded. Other customers\' cargo stays natural brown.'},
  {id: 'b4', code: 'B4', group: 'B', title: 'Some assigned · some waiting · some unused', purchased: 1, sent: 0.7, warehouseVerified: 0.7,
    containers: [box('a', 'KS-DEMO-A', 'filling', 30, 0, 0.3)],
    note: 'Purchased 1.000 · sent 0.700 · inbound to container 0.300 · still at warehouse 0.400 · unused 0.300. Use the container pill to see the unassigned 0.700.'},

  {id: 'c1', code: 'C1', group: 'C', title: 'Partial load', purchased: 0.5, sent: 0.3,
    containers: [box('a', 'KS-DEMO-A', 'filling', 51.2, 0.3)],
    note: 'Purchased 0.500 · loaded 0.300 (red) · not yet assigned 0.200. The unassigned view shows the remainder separately, outside any container.'},
  {id: 'c2', code: 'C2', group: 'C', title: 'Loaded + inbound + remaining', purchased: 0.5, sent: 0.5,
    containers: [box('a', 'KS-DEMO-A', 'filling', 51.2, 0.3, 0.1, 0.1)],
    note: 'Three portions: loaded 0.300 (solid red), inbound 0.100 (translucent red), remaining 0.100 not yet allocated (dashed outline). Headline counts loaded + inbound = 0.400 / 0.500.'},
  {id: 'c3', code: 'C3', group: 'C', title: 'All sent loaded · space left unused', purchased: 1, sent: 0.7,
    containers: [box('a', 'KS-DEMO-A', 'filling', 40, 0.7)],
    note: 'Sent 0.700 = loaded 0.700. 0.300 CBM of the purchase is still unused, so the reservation is NOT 100% utilized.'},
  {id: 'c4', code: 'C4', group: 'C', title: '100% of my space loaded · container filling', purchased: 0.5, sent: 0.5,
    containers: [box('a', 'KS-DEMO-A', 'filling', 51.2, 0.5)],
    note: 'Customer 100% loaded (0.500 / 0.500) while the shared 40HQ holds 51.700 of 68 CBM (about 76%). The two percentages are independent; free space remains.'},
  {id: 'c5', code: 'C5', group: 'C', title: '100% loaded · container sealed', purchased: 0.5, sent: 0.5,
    containers: [box('a', 'KS-DEMO-A', 'filled', 60.1, 0.5)],
    note: 'Same red cargo. Sealed status comes from the verified container status, not from the customer\'s loaded percentage. 60.600 of 68 CBM is loaded.'},
  {id: 'c6', code: 'C6', group: 'C', title: 'Tiny 0.020 CBM loaded', purchased: 0.02, sent: 0.02,
    containers: [box('a', 'KS-DEMO-A', 'filling', 30, 0.02)],
    note: 'Smallest supported purchase, shown as a miniature red parcel with its true tiny share of 68 CBM.'},
  {id: 'c7', code: 'C7', group: 'C', title: 'Split across two containers', purchased: 1, sent: 0.7,
    containers: [box('a', 'KS-DEMO-A', 'filled', 48, 0.4), box('b', 'KS-DEMO-B', 'filling', 22.5, 0.1, 0.1)],
    note: 'Pick a container from the pill: A holds 0.400 loaded, B holds 0.100 loaded + 0.100 inbound. 0.400 CBM remains unassigned and is a separate view. Containers are never merged.'},

  {id: 'd1', code: 'D1', group: 'D', title: 'Shipment preparation', purchased: 1, sent: 0.7, containers: [], pill: 'Preparing shipment',
    caption2: 'Cargo accepted · preparing shipment',
    note: 'Cargo accepted for shipment. Departure and arrival have not yet been confirmed.',
    milestones: [{label: 'Shipment arranged', state: 'done'}, {label: 'Cargo accepted', state: 'done'}, {label: 'Vessel departed', state: 'pending'}, {label: 'Arrived', state: 'pending'}]},
  {id: 'd2', code: 'D2', group: 'D', title: 'Container departed', purchased: 1, sent: 1,
    containers: [box('a', 'KS-DEMO-A', 'departed', 57, 1)],
    note: 'Final loading picture preserved. Departure is a confirmed container event.',
    milestones: [{label: 'Loaded', state: 'done'}, {label: 'Departed', state: 'done'}, {label: 'Arrived', state: 'pending'}]},
  {id: 'd3', code: 'D3', group: 'D', title: 'Arrived · customs · pickup readiness', purchased: 1, sent: 1,
    containers: [box('a', 'KS-DEMO-A', 'arrived', 57, 1)],
    note: 'Arrival, customs clearance and warehouse pickup readiness are three separate verified statuses. Only arrival is confirmed here.',
    milestones: [{label: 'Arrived', state: 'done'}, {label: 'Customs cleared', state: 'pending'}, {label: 'Ready for pickup', state: 'pending'}]},
  {id: 'd4', code: 'D4', group: 'D', title: 'Nothing sent · valid expiry', purchased: 0, sent: 0, containers: [], empty: true,
    history: 'History kept: 1.000 CBM paid · released after valid day-25 expiry (audited) · refund / retention reviewed separately',
    note: 'After a legally and operationally valid release event the active reservation is 0.000. The booking, its payment and its history are not erased.'},
  {id: 'd5', code: 'D5', group: 'D', title: 'Incident · damaged cargo', purchased: 1, sent: 0.7, pill: 'Incident under review',
    containers: [box('a', 'KS-DEMO-A', 'filling', 30, 0.4, 0.3)],
    incident: 'Incident reported on part of this cargo. Quantities shown are as last verified; no loading or shipment progress is fabricated. A claim is handled separately.',
    note: 'Known cargo quantities are retained while a real incident status is shown.'},
  {id: 'd6', code: 'D6', group: 'D', title: 'Data unavailable', purchased: 0, sent: 0, containers: [], data: 'unavailable',
    note: 'Could not verify your load. No zero balances, packages or container are invented.'},
  {id: 'd6l', code: 'D6b', group: 'D', title: 'Data still loading', purchased: 0, sent: 0, containers: [], data: 'loading',
    note: 'Waiting for verified records. Nothing is drawn until they arrive.'},
];

export const PREVIEW_SCENARIO_COUNT = PREVIEW_SCENARIOS.length;

const sumOf = (s: PreviewScenario, k: 'loaded' | 'inbound' | 'here' | 'outlineExtra') =>
  r3(s.containers.reduce((a, c) => a + (c[k] ?? 0), 0));

/** Same derivations as the live konsoliss_customer_load_breakdown view. */
export function previewProgress(s: PreviewScenario): KonsolissLoadProgress | null {
  if (s.data) return null;
  const loaded = sumOf(s, 'loaded'), inbound = sumOf(s, 'inbound');
  return {
    reservedCbm: s.purchased, sentCbm: s.sent, loadedCbm: loaded, inboundCbm: inbound,
    allocatedCbm: r3(loaded + inbound),
    atWarehouseOrInTransitCbm: Math.max(0, r3(s.sent - loaded - inbound)),
    sentNotLoadedCbm: Math.max(0, r3(s.sent - loaded)),
    reservedNotSentCbm: Math.max(0, r3(s.purchased - s.sent)),
    loadedPercent: s.purchased > 0 ? Math.round((loaded + inbound) * 10000 / s.purchased) / 100 : 0,
  };
}

export function previewOccupancy(c: PreviewContainerFixture): KonsolissContainerOccupancy {
  return {
    containerType: '40HQ', capacityCbm: CONTAINER_CAPACITY_CBM,
    loadedCbm: r3(c.other + c.loaded), otherCargoCbm: c.other, yourSpaceCbm: c.loaded,
    yourAllocatedCbm: c.here, freeCbm: r3(CONTAINER_CAPACITY_CBM - c.other - c.loaded),
  };
}

/** Purchased CBM that is allocated nowhere (sent or not). Never inherits another container. */
export function previewUnassignedCbm(s: PreviewScenario): number {
  if (!s.containers.length) return 0;
  return Math.max(0, r3(s.purchased - sumOf(s, 'here') - sumOf(s, 'outlineExtra')));
}

export type PreviewView = {id: string; kind: 'container' | 'unassigned' | 'none'; label: string; container?: PreviewContainerFixture; unassignedCbm?: number};

const f3 = (n: number) => n.toFixed(3);

export function previewViews(s: PreviewScenario): PreviewView[] {
  if (s.data) return [];
  const views: PreviewView[] = s.containers.map(c => ({id: c.key, kind: 'container' as const, label: c.number, container: c}));
  const un = previewUnassignedCbm(s);
  if (un > 0.0005) views.push({id: 'unassigned', kind: 'unassigned', label: 'Not assigned yet', unassignedCbm: un});
  if (!views.length) views.push({id: 'none', kind: 'none', label: 'No container yet'});
  return views;
}

export function resolvePreviewView(s: PreviewScenario, viewId: string | null): PreviewView | null {
  const views = previewViews(s);
  return views.find(v => v.id === viewId) ?? views[0] ?? null;
}

/** Customer-facing compact status; operational notes remain internal to the fixture. */
const statusVolume = (n: number) => String(r3(n));
function partialLoadStatus(s: PreviewScenario): string {
  return statusVolume(sumOf(s, 'loaded')) + ' CBM loaded • ' + statusVolume(previewUnassignedCbm(s)) + ' CBM unassigned';
}
export function previewLoadStatus(s: PreviewScenario, view: PreviewView | null): string {
  if (s.data) return s.data === 'loading' ? 'Loading…' : 'Data unavailable';
  if (s.code === 'A1') return '';
  if (s.code === 'A2') return 'Nothing sent';
  if (s.code === 'A3') return 'Nothing sent';
  if (s.code === 'A4') return 'Label created';
  if (s.code === 'A5') return 'Inbound to warehouse • ' + statusVolume(s.sent) + ' CBM';
  if (s.code === 'B1') return statusVolume(s.warehouseVerified ?? 0) + ' CBM at warehouse • ' + statusVolume(s.purchased-s.sent) + ' CBM not sent';
  if (s.code === 'B2') return statusVolume(s.warehouseVerified ?? 0) + ' CBM at warehouse';
  if (s.code === 'B3') return statusVolume(sumOf(s,'outlineExtra')) + ' CBM allocated • Not loaded';
  if (s.code === 'B4') return statusVolume(sumOf(s,'inbound')) + ' CBM inbound • ' + statusVolume(previewUnassignedCbm(s)) + ' CBM unassigned';
  if (s.code === 'C1') return '';
  if (s.code === 'C2') return '';
  if (s.code === 'C3') return '';
  if (s.code === 'C7') return 'Split into ' + s.containers.length + ' containers' + (view?.kind === 'unassigned' ? ' • ' + statusVolume(view.unassignedCbm ?? 0) + ' CBM unassigned' : '');
  if (s.code === 'D1') return 'Preparing shipment';
  if (s.code === 'D2') return 'Departed';
  if (s.code === 'D3') return 'Arrived • Awaiting customs clearance';
  if (s.code === 'D4') return 'Reservation expired';
  if (s.code === 'D5') return 'Incident under review';
  return '';
}

export type PreviewRender = {
  empty: boolean;
  /** Illustrative reservation animation in an empty illustrated container. */
  preview: boolean;
  reserved: number;
  loaded: number;
  yourLoaded: number;
  free: number | null;
  here: number;
  hereInbound: number;
  sealed: boolean;
  sent: number;
  caption: string;
  caption2: string;
  occupancy: KonsolissContainerOccupancy | null;
  container: PreviewContainerFixture | null;
};

export const isSealedStatus = (status: PreviewContainerStatus) => status !== 'filling';

/** Parameters for the 3D renderer for one scenario view. Container percentages never use purchased CBM. */
export function previewRender(s: PreviewScenario, view: PreviewView | null): PreviewRender {
  const base: PreviewRender = {empty: false, preview: false, reserved: 0, loaded: 0, yourLoaded: 0, free: null, here: 0, hereInbound: 0,
    sealed: false, sent: 0, caption: '', caption2: s.caption2 ?? '', occupancy: null, container: null};
  if (s.data || !view) return base;
  if (s.empty) return {...base, empty: true, reserved: 68};
  if (view.kind === 'container' && view.container) {
    const c = view.container, occ = previewOccupancy(c);
    return {...base, reserved: occ.capacityCbm, loaded: occ.loadedCbm, yourLoaded: c.loaded, free: occ.freeCbm,
      here: r3(c.here + (c.outlineExtra ?? 0)), hereInbound: c.inbound, sealed: isSealedStatus(c.status), occupancy: occ, container: c,
      caption: s.containers.length > 1 ? 'My current loaded space '+f3(sumOf(s,'loaded'))+' CBM' : s.code === 'C1' ? partialLoadStatus(s) : s.code === 'C2' ? statusVolume(sumOf(s,'loaded')) + ' CBM loaded • ' + statusVolume(sumOf(s,'inbound')) + ' CBM inbound • ' + statusVolume(Math.max(0,s.purchased-sumOf(s,'here'))) + ' CBM remaining' : s.code === 'C3' ? statusVolume(sumOf(s,'loaded')) + ' CBM loaded • ' + statusVolume(Math.max(0,s.purchased-s.sent)) + ' CBM unused' : ''};
  }
  if (view.kind === 'unassigned') {
    const un = view.unassignedCbm ?? 0, assigned = sumOf(s, 'here');
    const sentUnassigned = Math.max(0, Math.min(un, r3(s.sent - assigned)));
    return {...base, preview: true, reserved: un, sent: sentUnassigned,
      caption: 'Not assigned to a container yet: ' + f3(un) + ' CBM',
      caption2: sentUnassigned > 0 ? 'Sent ' + f3(sentUnassigned) + ' CBM · waiting for a container' : 'Goods sent 0 CBM'};
  }
  return {...base, preview: true, reserved: s.purchased, sent: s.sent,
    caption2: s.caption2 ?? (s.sent === 0 ? '' : 'Loaded 0 CBM')};
}

/** Autoplay: advance one scenario at a time, then STOP on the last one (never snap back to empty). */
export function nextAutoplayIndex(index: number): number | null {
  return index >= PREVIEW_SCENARIO_COUNT - 1 ? null : index + 1;
}
export const autoplayDelayMs = (index: number) => (index === 0 ? 9000 : 7000);
export const stepPreviewIndex = (index: number, delta: number) =>
  (index + delta + PREVIEW_SCENARIO_COUNT) % PREVIEW_SCENARIO_COUNT;

/** Demo is on for review builds. Production builds must set EXPO_PUBLIC_KONSOLISS_DEMO=0. */
export function konsolissDemoEnabled(): boolean {
  try { return process.env.EXPO_PUBLIC_KONSOLISS_DEMO !== '0'; } catch { return true; }
}

/** Self-check used by tests: fixtures must obey the same invariants as backend constraints. */
export function previewScenarioErrors(s: PreviewScenario): string[] {
  const errors: string[] = [];
  const loaded = sumOf(s, 'loaded'), inbound = sumOf(s, 'inbound');
  if (loaded + inbound > s.sent + 0.0005) errors.push(s.code + ': loaded+inbound exceeds sent');
  if (s.sent > s.purchased + 0.0005) errors.push(s.code + ': sent exceeds purchased');
  if (s.purchased !== 0 && s.purchased < 0.02) errors.push(s.code + ': below 0.020 CBM minimum');
  for (const c of s.containers) {
    if (c.other + c.loaded > CONTAINER_CAPACITY_CBM) errors.push(s.code + ': ' + c.number + ' over capacity');
    if (c.here < c.loaded + c.inbound - 0.0005) errors.push(s.code + ': allocated below loaded+inbound');
  }
  if (sumOf(s, 'here') + sumOf(s, 'outlineExtra') > s.purchased + 0.0005) errors.push(s.code + ': allocated exceeds purchased');
  return errors;
}
