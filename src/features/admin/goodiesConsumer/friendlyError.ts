import {label} from './content';
/**
 * Never render raw server errors in customer-facing UI.
 * Technical details stay in the console; callers provide the customer-safe fallback.
 */
export function friendlyError(error: any, fallback: string): string {
  const raw = String((error && (error.message ?? error.error ?? error)) ?? '').trim();
  if (raw) {
    const code = error && typeof error === 'object' && error.code ? String(error.code) : '';
    console.warn('[Goodies] Request failed:', code || 'request_unavailable');
  }

  if(error?.code==='P4210')return label('lbl.groupQuoteChanged','The group cart or total changed. Review it again before paying.');

  // Translate known actionable conditions into app-owned copy.
  if (/\binsufficient\s+(?:(?:wantiss\s+)?wallet\s+)?(?:funds?|balance)\b/i.test(raw)) {
    return label('lbl.actionWalletInsufficient', "Insufficient Wantiss wallet balance. Add funds or choose another payment method.");
  }

  // Do not pass through even apparently human-readable server messages: they can
  // contain secrets, SQL details, table/column names, tokens or other internals.
  return fallback;
}
