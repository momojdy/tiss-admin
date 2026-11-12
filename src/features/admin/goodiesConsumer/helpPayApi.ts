/** Help Pay backend contract. Real money operations are disabled until
 * escrow, refund, and Goodies order-finalization are deployed and verified.
 * Do not call wallet contribution RPC from a client before that release.
 */
import {previewBackend as supabase} from './previewRuntime';

export type HelpPayMode = 'share' | 'full';
export type HelpPayStatus = 'pending' | 'active' | 'funded' | 'expired' | 'cancelled' | 'fulfilled' | 'refund_pending';
export interface HelpPaySnapshot {
  id: string;
  mode: HelpPayMode;
  service: 'goodies' | 'other';
  status: HelpPayStatus;
  total_cents: number;
  initial_cents: number;
  contributed_cents: number;
  remaining_cents: number;
  expires_at: string;
  is_creator: boolean;
  my_contributed_cents: number;
}
export const shareBillAmounts = (totalCents: number) => {
  if (!Number.isSafeInteger(totalCents) || totalCents <= 0) throw new Error('Invalid bill total');
  const initialCents = Math.ceil(totalCents * 0.6);
  return {initialCents, shareableCents: totalCents - initialCents};
};
export async function fetchHelpPayStatus(id: string): Promise<HelpPaySnapshot> {
  const {data, error} = await supabase.rpc('help_pay_status', {p_request_id: id});
  if (error) throw error;
  if (!data || typeof data !== 'object') throw new Error('Help Pay request unavailable');
  return data as HelpPaySnapshot;
}
export const HELP_PAY_PAYMENTS_ENABLED = false as const;
