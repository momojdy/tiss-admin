/** Authenticated, server-verified Help Pay for live Goodies checkouts.
 * The API never accepts a QR-encoded amount as authority; it always reads
 * request state from Supabase and leaves Wallet ledger writes inside RPCs.
 */
import {previewBackend as supabase} from './previewRuntime';
export const GOODIES_SHARED_PAYMENTS_RELEASED=false;

export type HelpPayMode='share'|'full';
export type HelpPayStatus='pending'|'active'|'funded'|'expired'|'cancelled'|'fulfilled'|'refund_pending';
export interface HelpPayContributor {user_id:string;name:string;amount_cents:number}
export interface HelpPaySnapshot {
 id:string; mode:HelpPayMode; service:'goodies'|'other'; status:HelpPayStatus;
 total_cents:number; initial_cents:number; contributed_cents:number;
 remaining_cents:number; expires_at:string; is_creator:boolean; my_contributed_cents:number;
 contributors?:HelpPayContributor[]; order_id?:string|null;
}
export const shareBillAmounts=(totalCents:number)=>{
 if(!Number.isSafeInteger(totalCents)||totalCents<=0)throw new Error('Invalid bill total');
 const initialCents=Math.ceil(totalCents*0.6);
 return {initialCents,shareableCents:totalCents-initialCents};
};
const REQUEST_ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const validHelpPayId=(id:string)=>REQUEST_ID.test(id);
export const helpPayQRValue=(requestId:string)=>'wantiss://help-pay/'+encodeURIComponent(requestId);
export const helpPayIdFromLink=(value:string)=>{
 const match=value.trim().match(/^wantiss:\/\/help-pay\/([0-9a-f-]{36})(?:[?#].*)?$/i);
 return match&&validHelpPayId(match[1])?match[1]:null;
};
export function parseHelpPaySnapshot(data:any):HelpPaySnapshot {
 const amounts=['total_cents','initial_cents','contributed_cents','remaining_cents','my_contributed_cents'];
 if(!data||typeof data!=='object'||!validHelpPayId(data.id)||
   !['share','full'].includes(data.mode)||data.service!=='goodies'||
   !['pending','active','funded','expired','cancelled','fulfilled','refund_pending'].includes(data.status)||
   typeof data.is_creator!=='boolean'||!Number.isFinite(Date.parse(data.expires_at))||
   amounts.some(key=>!Number.isSafeInteger(data[key])||data[key]<0)||data.total_cents<=0||
   data.initial_cents+data.contributed_cents>data.total_cents||
   data.remaining_cents!==data.total_cents-data.initial_cents-data.contributed_cents){
   throw new Error('Payment request unavailable');
 }
 return data as HelpPaySnapshot;
}
export async function fetchHelpPayStatus(id:string):Promise<HelpPaySnapshot>{
 if(!validHelpPayId(id))throw new Error('Invalid Wantiss payment link');
 const {data,error}=await supabase.rpc('help_pay_status',{p_request_id:id});
 if(error)throw error;
 const snapshot=parseHelpPaySnapshot(data);
 if(snapshot.id!==id)throw new Error('Payment request unavailable');
 return snapshot;
}
export async function createHelpPayDraft(mode:HelpPayMode,totalCents:number,checkoutKey:string,checkoutSnapshot:Record<string,unknown>={}):Promise<string>{
 if(!GOODIES_SHARED_PAYMENTS_RELEASED)throw new Error('Shared payments are not available yet.');
 if(!Number.isSafeInteger(totalCents)||totalCents<=0)throw new Error('Invalid bill total');
 const {data,error}=await supabase.rpc('help_pay_create_request',{p_mode:mode,p_total_cents:totalCents,p_checkout_key:checkoutKey,p_checkout_snapshot:checkoutSnapshot});
 if(error)throw error;
 if(typeof data!=='string'||!validHelpPayId(data))throw new Error('Could not create a Help Pay request');
 return data;
}
export async function shareHelpPayToFriend(requestId:string,friendId:string):Promise<string>{
 const {data,error}=await supabase.rpc('help_pay_share_to_friend',{p_request_id:requestId,p_friend_id:friendId});
 if(error)throw error;
 if(!data)throw new Error('Message was not sent');
 return String(data);
}
export async function cancelHelpPayRequest(requestId:string):Promise<void>{
 const {data,error}=await supabase.rpc('help_pay_cancel_request',{p_request_id:requestId});
 if(error)throw error;
 if(!data?.ok)throw new Error('Could not cancel this request');
}
export async function contributeToHelpPay(requestId:string,amountCents:number,key:string):Promise<{ok:boolean;status:string;order_id?:string;message?:string;refunded?:boolean}>{
 if(!GOODIES_SHARED_PAYMENTS_RELEASED)throw new Error('Shared payments are not available yet.');
 if(!validHelpPayId(requestId)||!Number.isSafeInteger(amountCents)||amountCents<1)throw new Error('Invalid contribution');
 const {data,error}=await supabase.rpc('help_pay_contribute_wallet',{p_request_id:requestId,p_amount_cents:amountCents,p_idempotency_key:key});
 if(error)throw error;
 if(!data||typeof data!=='object')throw new Error('Payment confirmation unavailable');
 return data as any;
}
