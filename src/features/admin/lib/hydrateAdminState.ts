import { loadAdminDomain, listStaff, listAccountRestrictions } from './adminBackend';
import { supabase } from './supabase';
import { db, bump } from '../state/db';
import { GRANTS, REQUESTS } from '../state/grants';
import type { Account, Application, ServiceRow, StaffMember, SupportCase, Transaction } from '../data/types';

const str = (v: unknown) => v == null ? '' : String(v);
const date = (v: unknown) => v ? new Date(String(v)).toLocaleDateString() : '';
const num = (v: unknown) => Number(v || 0);
const normalizedStatus = (value: unknown) => {
  const raw = str(value).trim().toLowerCase().replace(/[_-]+/g, ' ');
  const known: Record<string, string> = {
    completed: 'Completed', succeeded: 'Completed', success: 'Completed',
    pending: 'Pending', processing: 'Pending', failed: 'Failed', refunded: 'Refunded',
    'refund pending': 'Refund pending', paid: 'Paid', cancelled: 'Cancelled', canceled: 'Cancelled',
    'pending provider': 'Pending provider', 'pending settlement': 'Pending settlement',
  };
  return known[raw] || raw.replace(/\b\w/g, (letter) => letter.toUpperCase());
};
const applicationStage = (value: unknown) => {
  const raw = str(value).trim().toLowerCase().replace(/[_-]+/g, ' ');
  if (raw === 'approved') return 3;
  if (raw === 'rejected' || raw === 'declined') return 4;
  if (raw.includes('needs info') || raw.includes('need information')) return 2;
  if (raw.includes('review')) return 1;
  if (raw === 'submitted' || raw === 'pending' || raw === 'new') return 0;
  return 1;
};

function clearDemoRecords() {
  db.APPS = []; db.INV = []; db.BIZ = []; db.STAFF = []; db.CASES = []; db.NS = [];
  db.ROLES = {}; db.RR = {}; GRANTS.splice(0, GRANTS.length); REQUESTS.splice(0, REQUESTS.length);
  db.CUST = []; db.BN = []; db.PRM = []; db.ANN = []; db.MEDIA = []; db.CH = []; db.AUD = [];
  db.SET = []; db.PAYO = []; db.RECO = []; db.ACC = []; db.PCS = []; db.PZS = []; db.WINS = [];
  db.PSUB = []; db.CSUBS = []; db.GM = []; db.GD = []; db.GN = [];
}

export async function hydrateAdminState() {
  clearDemoRecords();
  const [applications, businesses, transactions, profiles, support, staff, audit, restrictions] = await Promise.all([
    loadAdminDomain('operations').catch(() => []),
    loadAdminDomain('ecosystem').catch(() => []),
    loadAdminDomain('finance').catch(() => []),
    loadAdminDomain('people').catch(() => []),
    loadAdminDomain('support').catch(() => []),
    listStaff().catch(() => []),
    supabase.rpc('wantiss_admin_audit_read').then(({ data, error }) => error ? [] : (data || [])),
    listAccountRestrictions().catch(() => []),
  ]);

  db.APPS = applications.map((x): Application => ({
    id: str(x.id), n: str(x.business_name), s: normalizedStatus(x.status), st: applicationStage(x.status),
    age: Math.max(0, Math.floor((Date.now() - Date.parse(str(x.created_at))) / 86400000)),
    createdAt: str(x.created_at), reviewedAt: str(x.reviewed_at || ''),
    o: str(x.reviewed_by || 'Unassigned'), d: [], hold: 0, esc: 0, due: '',
    notes: x.review_note ? [{ by: 'Reviewer', when: date(x.reviewed_at), txt: str(x.review_note) }] : [],
    log: [],
  }));

  db.BIZ = businesses.map((x) => ({
    id: str(x.id),
    name: str(x.name),
    verification: str(x.verification || 'pending'),
    is_live: Boolean(x.is_live),
    city: str(x.city),
    country: str(x.country),
    payout_ready: Boolean(x.payout_ready),
  }));

  db.INV = transactions.map((x): Transaction => ({
    id: str(x.id), f: str(x.feature_name || x.activity_type || 'Wallet'), u: str(x.user_id),
    d: date(x.created_at), createdAt: str(x.created_at), n: str(x.description), a: num(x.amount), s: normalizedStatus(x.status),
    ref: 0, rq: 0, log: [],
  }));

  db.ACC = profiles.map((x): Account => ({
    id: str(x.id), n: str(x.full_name || x.email || 'Account'), type: x.role === 'vendor' ? 'Vendor' : x.role === 'seller' ? 'Seller' : 'Customer',
    svc: [], orders: 0, wallet: 0, listings: 0, r: [], hist: [], appeal: 0, paused: 0,
  }));

  db.ACC.forEach(account => {
    account.r = restrictions.filter(r => r.target_user_id === account.id && (!r.ends_at || Date.parse(r.ends_at) > Date.now())).map(r => ({
      id: r.id, kind: r.kind, scope: r.scope, reason: r.reason, notes: r.notes,
      start: r.starts_at.slice(0, 10), end: r.ends_at ? r.ends_at.slice(0, 10) : '',
      by: r.created_by, notified: r.notify_user ? 1 : 0,
    }));
    account.paused = account.r.some(r => r.kind === 'Suspension' && (r.scope === 'all' || r.scope === 'Entire Wantiss account')) ? 1 : 0;
  });

  db.CASES = support.map((x): SupportCase => ({
    id: str(x.id), t: str(x.subject), svc: 'Support', pri: 'Normal', o: str(x.email), st: str(x.status), msgs: [[str(x.created_at), str(x.message)]],
  }));

  db.STAFF = staff.map((x): StaffMember => ({
    userId: str(x.user_id), n: str(x.display_name), role: x.role === 'super_admin' ? 'Super Admin' : 'Staff',
    last: '', st: x.status === 'active' ? 'Active' : x.status === 'suspended' ? 'Suspended' : 'Revoked',
    x: 0, ov: { sec: {}, rights: {} }, scope: [], hist: [], until: '', susEnd: '',
  }));

  db.AUD = (audit as Record<string, unknown>[]).map(x => [
    str(x.action) + ' · ' + str(x.resource_type), str(x.actor_user_id || 'System'), date(x.created_at),
  ] as [string, string, string]);

  bump();
}
