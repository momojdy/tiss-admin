import {previewStorage as AsyncStorage} from './previewRuntime';
import {previewBackend as supabase} from './previewRuntime';
import {createHelpPayDraft,contributeToHelpPay,findHelpPayCheckout,findHelpPayContribution,HelpPayError,validHelpPayId} from './helpPayApi';
import type {HelpPayMode,HelpPayContributionResult} from './helpPayApi';

type Intent={v:1;userId:string;key:string;requestId?:string;amountCents?:number;confirmed?:boolean};
const running=new Map<string,Promise<any>>();
const storageKey=(user:string,request?:string)=>'goodies-help-pay-v1:'+user+':'+(request?'payment:'+request:'checkout');
export const helpPayPaymentKey=()=> 'help-pay-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);
export async function helpPayAccount():Promise<string>{const {data,error}=await supabase.auth.getUser();if(error||!data.user)throw new HelpPayError('28000');return data.user.id;}
async function sameAccount(user:string){if(await helpPayAccount()!==user)throw new HelpPayError('28000');}
async function read(user:string,request?:string):Promise<Intent|null>{
 const raw=await AsyncStorage.getItem(storageKey(user,request));if(!raw)return null;
 let value;try{value=JSON.parse(raw);}catch{throw new HelpPayError();}
 if(value?.v!==1||value.userId!==user||typeof value.key!=='string'||value.key.length<8||value.key.length>180||(request&&(value.requestId!==request||!Number.isSafeInteger(value.amountCents)||value.amountCents<1||value.amountCents>100000000)))throw new HelpPayError();
 return value;
}
async function once<T>(key:string,operation:()=>Promise<T>):Promise<T>{
 const existing=running.get(key);if(existing)return existing;
 const pending=operation();running.set(key,pending);try{return await pending;}finally{if(running.get(key)===pending)running.delete(key);}
}
export async function recoverHelpPayCreation(){
 const user=await helpPayAccount(),intent=await read(user);if(!intent)return null;
 const request=await findHelpPayCheckout(intent.key);await sameAccount(user);return request;
}
export async function createRecoverableHelpPay(mode:HelpPayMode,totalCents:number,key:string,snapshot:Record<string,unknown>,expectedUserId:string){
 const user=await helpPayAccount();
 if(user!==expectedUserId)throw new HelpPayError('28000');
 return once(storageKey(user),async()=>{
  let intent=await read(user);
  if(intent){const existing=await findHelpPayCheckout(intent.key);await sameAccount(user);if(existing)return existing.id;}
  // Reuse an uncertain earlier key: a late response can never create a second reservation.
  intent=intent||{v:1,userId:user,key};
  await AsyncStorage.setItem(storageKey(user),JSON.stringify(intent));await sameAccount(user);
  const requestId=await createHelpPayDraft(mode,totalCents,intent.key,snapshot,user);await sameAccount(user);return requestId;
 });
}
export async function finishHelpPayCreation(requestId:string){
 const user=await helpPayAccount(),intent=await read(user);if(!intent)return;
 const request=await findHelpPayCheckout(intent.key);await sameAccount(user);
 if(request?.id!==requestId||!['fulfilled','expired','cancelled'].includes(request.status))throw new HelpPayError();
 await AsyncStorage.removeItem(storageKey(user));
}
export async function recoverHelpPayPayment(requestId:string):Promise<{pending:Intent|null;result:HelpPayContributionResult|null}>{
 if(!validHelpPayId(requestId))throw new HelpPayError('22023');
 const user=await helpPayAccount(),intent=await read(user,requestId);if(!intent)return{pending:null,result:null};
 const result=await findHelpPayContribution(requestId,intent.key);await sameAccount(user);
 if(result&&result.amount_cents!==intent.amountCents)throw new HelpPayError();
 if(result){await AsyncStorage.setItem(storageKey(user,requestId),JSON.stringify({...intent,confirmed:true}));}
 return {pending:result?null:intent,result};
}
export async function payRecoverableHelpPay(requestId:string,amountCents:number,confirmationKey:string,expectedUserId:string):Promise<HelpPayContributionResult>{
 const user=await helpPayAccount();
 if(user!==expectedUserId)throw new HelpPayError('28000');
 return once(storageKey(user,requestId),async()=>{
  let intent=await read(user,requestId);
  if(intent&&!intent.confirmed){
   const recovered=await findHelpPayContribution(requestId,intent.key);await sameAccount(user);
   if(recovered){await AsyncStorage.setItem(storageKey(user,requestId),JSON.stringify({...intent,confirmed:true}));return recovered;}
   if(intent.amountCents!==amountCents)throw new HelpPayError();
  }else if(intent?.key===confirmationKey){
   const recovered=await findHelpPayContribution(requestId,intent.key);await sameAccount(user);if(recovered)return recovered;throw new HelpPayError();
  }else intent={v:1,userId:user,key:confirmationKey,requestId,amountCents};
  await AsyncStorage.setItem(storageKey(user,requestId),JSON.stringify(intent));await sameAccount(user);
  let result;
  try{result=await contributeToHelpPay(requestId,amountCents,intent.key,user);}catch(error){
   if(error instanceof HelpPayError&&['P4001','22023'].includes(error.code)){await sameAccount(user);await AsyncStorage.removeItem(storageKey(user,requestId));}
   throw error;
  }
  await sameAccount(user);
  await AsyncStorage.setItem(storageKey(user,requestId),JSON.stringify({...intent,confirmed:true}));return result;
 });
}
