import {label} from './content';
/**
 * Never render raw server errors in customer-facing UI.
 * Technical details stay in the console; callers provide the customer-safe fallback.
 */
export function friendlyError(error: any, fallback: string): string {
  const raw = String((error && (error.message ?? error.error ?? error)) ?? '').trim();
  if (raw) {
    const code = error && typeof error === 'object' && error.code ? String(error.code) : '';
    console.warn('[Goodies] Request failed:', fallback, code ? '(' + code + ')' : '', raw);
  }

  // Translate the one known actionable server condition into app-owned copy.
  if (/insufficient(?:\s+funds?|\s+balance)?/i.test(raw)) {
    return label('lbl.actionWalletInsufficient','Insufficient Wantiss wallet balance. Add funds or choose another payment method.');
  }

  // Do not pass through even apparently human-readable server messages: they can
  // contain secrets, SQL details, table/column names, tokens or other internals.
  return fallback;
}
