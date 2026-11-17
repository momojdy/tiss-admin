/** Authenticated, server-verified Help Pay for live Goodies checkouts.
 * The API never accepts a QR-encoded amount as authority; it always reads
 * request state from Supabase and leaves Wallet ledger writes inside RPCs.
 */
import {previewBackend as supabase} from './previewRuntime';
// Production remains off until the paired backend and hosted acceptance are approved.
export const GOODIES_SHARED_PAYMENTS_RELEASED=process.env.EXPO_PUBLIC_GOODIES_SHARED_PAYMENTS_RELEASED==='true';

export type HelpPayMode='share'|'full';
export type HelpPayStatus='pending'|'active'|'funded'|'expired'|'cancelled'|'fulfilled'|'refund_pending';
export interface HelpPayContributor {user_id:string;name:string;amount_cents:number}
export interface HelpPaySnapshot {
 id:string; mode:HelpPayMode; service:'goodies'|'other'; status:HelpPayStatus;
 total_cents:number; initial_cents:number; contributed_cents:number;
 remaining_cents:number; expires_at:string; is_creator:boolean; my_contributed_cents:number;
 contributors?:HelpPayContributor[]; order_id?:string|null; my_refunded_cents?:number;
}
export interface HelpPayContributionResult {ok:boolean;status:HelpPayStatus;contribution_status:'paid'|'refunded'|'refund_pending';request_id:string;amount_cents:number;order_id?:string|null;refunded:boolean;already_processed?:boolean}
export class HelpPayError extends Error {constructor(public code='unavailable'){super(code==='P4001'?'Insufficient Wallet balance.':'Could not confirm this payment request. Please retry.');}}
const STATUSES:HelpPayStatus[]=['pending','active','funded','expired','cancelled','fulfilled','refund_pending'];
const amount=(value:unknown):value is number=>Number.isSafeInteger(value)&&Number(value)>=0&&Number(value)<=100000000;
async function rpc(name:string,args:Record<string,unknown>){
 let response;try{response=await supabase.rpc(name,args);}catch{throw new HelpPayError();}
 if(response.error)throw new HelpPayError(['P4001','28000','42501','55000','22023'].includes(response.error.code)?response.error.code:'unavailable');
 return response.data;
}
export const shareBillAmounts=(totalCents:number)=>{
 if(!amount(totalCents)||totalCents<=0)throw new HelpPayError('22023');
 const initialCents=Math.floor((totalCents*60+99)/100);
 return {initialCents,shareableCents:totalCents-initialCents};
};
export function helpPayContributionCents(remaining:number,requestMode:HelpPayMode,unit:'percent'|'amount',input:string):number|null{
 if(!amount(remaining)||remaining<1)return null;
 if(requestMode==='full')return remaining;
 const text=input.trim();if(!/^(?:\d+|\d*\.\d{1,2})$/.test(text)||text.length>12)return null;
 const [whole='',fraction='']=text.split('.'),scaled=BigInt(whole||'0')*100n+BigInt(fraction.padEnd(2,'0'));
 if(scaled<=0n)return null;
 const cents=unit==='amount'?scaled:(BigInt(remaining)*scaled+5000n)/10000n;
 return (unit!=='percent'||scaled<=10000n)&&cents>0n&&cents<=BigInt(remaining)?Number(cents):null;
}
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
   !STATUSES.includes(data.status)||
   typeof data.is_creator!=='boolean'||!Number.isFinite(Date.parse(data.expires_at))||
   amounts.some(key=>!amount(data[key]))||data.total_cents<=0||
   data.initial_cents!==(data.mode==='share'?shareBillAmounts(data.total_cents).initialCents:0)||
   data.initial_cents+data.contributed_cents>data.total_cents||
   data.remaining_cents!==data.total_cents-data.initial_cents-data.contributed_cents||
   (data.my_refunded_cents!=null&&!amount(data.my_refunded_cents))||
   (data.order_id!=null&&!validHelpPayId(data.order_id))||
   (data.contributors!=null&&(!Array.isArray(data.contributors)||data.contributors.some((row:any)=>!row||!validHelpPayId(row.user_id)||typeof row.name!=='string'||!amount(row.amount_cents))))){
   throw new Error('Payment request unavailable');
 }
 return data as HelpPaySnapshot;
}
export async function fetchHelpPayStatus(id:string):Promise<HelpPaySnapshot>{
 if(!validHelpPayId(id))throw new Error('Invalid Wantiss payment link');
 const data=await rpc('help_pay_status',{p_request_id:id});
 const snapshot=parseHelpPaySnapshot(data);
 if(snapshot.id!==id)throw new Error('Payment request unavailable');
 return snapshot;
}
export async function createHelpPayDraft(mode:HelpPayMode,totalCents:number,checkoutKey:string,checkoutSnapshot:Record<string,unknown>={},expectedUserId?:string):Promise<string>{
 if(!GOODIES_SHARED_PAYMENTS_RELEASED)throw new Error('Shared payments are not available yet.');
 if(!Number.isSafeInteger(totalCents)||totalCents<=0)throw new Error('Invalid bill total');
 const data=await rpc(expectedUserId?'help_pay_create_for_account':'help_pay_create_request',{p_mode:mode,p_total_cents:totalCents,p_checkout_key:checkoutKey,p_checkout_snapshot:checkoutSnapshot,...(expectedUserId?{p_expected_user_id:expectedUserId}:{})});
 if(typeof data!=='string'||!validHelpPayId(data))throw new Error('Could not create a Help Pay request');
 return data;
}
export async function shareHelpPayToFriend(requestId:string,friendId:string):Promise<string>{
 const data=await rpc('help_pay_share_to_friend',{p_request_id:requestId,p_friend_id:friendId});
 if(!data)throw new Error('Message was not sent');
 return String(data);
}
export async function cancelHelpPayRequest(requestId:string):Promise<{status:HelpPayStatus;refunded:boolean}>{
 const data=await rpc('help_pay_cancel_request',{p_request_id:requestId});
 if(!data?.ok||!['cancelled','expired','refund_pending'].includes(data.status)||typeof data.refunded!=='boolean')throw new HelpPayError();
 return{status:data.status,refunded:data.refunded};
}
export function parseHelpPayContribution(data:any,requestId:string,expectedAmount?:number):HelpPayContributionResult{
 if(!data||typeof data.ok!=='boolean'||data.request_id!==requestId||!STATUSES.includes(data.status)||!['paid','refunded','refund_pending'].includes(data.contribution_status)||!amount(data.amount_cents)||data.amount_cents<1||(expectedAmount!=null&&data.amount_cents!==expectedAmount)||(data.order_id!=null&&!validHelpPayId(data.order_id))||data.ok!==(data.contribution_status==='paid')||(data.contribution_status==='refunded'&&data.refunded!==true))throw new HelpPayError();
 return {ok:data.ok,status:data.status,contribution_status:data.contribution_status,request_id:requestId,amount_cents:data.amount_cents,order_id:data.order_id||null,refunded:data.refunded===true,already_processed:data.already_processed===true};
}
export async function contributeToHelpPay(requestId:string,amountCents:number,key:string,expectedUserId?:string):Promise<HelpPayContributionResult>{
 if(!GOODIES_SHARED_PAYMENTS_RELEASED)throw new Error('Shared payments are not available yet.');
 if(!validHelpPayId(requestId)||!Number.isSafeInteger(amountCents)||amountCents<1)throw new Error('Invalid contribution');
 return parseHelpPayContribution(await rpc(expectedUserId?'help_pay_contribute_for_account':'help_pay_contribute_wallet',{p_request_id:requestId,p_amount_cents:amountCents,p_idempotency_key:key,...(expectedUserId?{p_expected_user_id:expectedUserId}:{})}),requestId,amountCents);
}
export async function fetchHelpPayWalletEnabled():Promise<boolean>{const enabled=await rpc('help_pay_wallet_enabled',{});if(typeof enabled!=='boolean')throw new HelpPayError();return GOODIES_SHARED_PAYMENTS_RELEASED&&enabled;}
export async function findHelpPayCheckout(checkoutKey:string):Promise<HelpPaySnapshot|null>{const data=await rpc('help_pay_request_for_checkout',{p_checkout_key:checkoutKey});if(data?.found===false)return null;if(data?.found!==true)throw new HelpPayError();const snapshot=parseHelpPaySnapshot(data.request);if(!snapshot.is_creator)throw new HelpPayError();return snapshot;}
export async function findHelpPayContribution(requestId:string,key:string):Promise<HelpPayContributionResult|null>{const data=await rpc('help_pay_contribution_status',{p_request_id:requestId,p_idempotency_key:key});if(data?.found===false)return null;if(data?.found!==true)throw new HelpPayError();return parseHelpPayContribution(data,requestId);}
