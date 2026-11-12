import type {SupabaseClient} from '@supabase/supabase-js';
/** Local preview transport. This module deliberately has no network/client import. */
export type PreviewScenario = 'default'|'loading'|'error'|'host'|'guest'|'saving'|'success';
let scenario: PreviewScenario = 'default';
const listeners = new Set<() => void>();
export const previewUserId = '__cms_preview_user__';
export const previewGroupId = '__cms_preview_group__';
export const previewRequests: {kind:string;name:string;blocked:boolean}[] = [];
export const getPreviewScenario = () => scenario;
export const subscribePreview = (fn:()=>void) => {listeners.add(fn);return()=>{listeners.delete(fn);};};
export function setPreviewScenario(value:PreviewScenario) {scenario=value;previewRequests.length=0;listeners.forEach(fn=>fn());}
const failure = () => ({data:null,error:{code:'PREVIEW_ONLY',message:'This action is disabled in the CMS preview.'}});
function group() {return {group_id:previewGroupId,id:previewGroupId,invite_code:'PREVIEW-ONLY',store_id:'__admin_goodies_checkout_preview__',status:'open',expires_at:new Date(Date.now()+3600000).toISOString()};}
async function response<T>(read:()=>T):Promise<{data:T|null;error:null|{code:string;message:string}}> {
 if(scenario==='loading')return new Promise(()=>{});
 if(scenario==='error')return failure();
 return {data:read(),error:null};
}
export function previewRows(table:string):any[] {
 if(table==='goodies_group_order_items')return [{id:'__preview_line__',user_id:previewUserId,line_key:'__preview_item__',quantity:1,options:{},note:'',product:{name:'Preview item',price:5,emoji:'🥭',photo_url:null}}];
 return [];
}
function query(table:string) {
 let single=false, blocked=false;
 const chain:any={};
 for(const method of ['select','eq','neq','in','or','not','order','range','limit','gt','lt','gte','lte','is','ilike'])chain[method]=()=>chain;
 for(const method of ['insert','update','upsert','delete'])chain[method]=()=>{blocked=true;return chain;};
 chain.single=chain.maybeSingle=()=>{single=true;return chain;};
 chain.then=(ok:any,bad:any)=>{
  previewRequests.push({kind:'table',name:table,blocked});
  return (blocked ? Promise.resolve(failure()) : response(()=>single ? previewRows(table)[0]||null : previewRows(table))).then(ok,bad);
 };
 return chain;
}
export const previewBackend = {
 from:query,
 auth:{getUser:async()=>({data:{user:{id:previewUserId}},error:null}),getSession:async()=>({data:{session:null},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
 rpc:async(name:string,_args?:any)=>{
  const permitted=['goodies_group_order_create','goodies_group_order_join','goodies_group_order_get_status','goodies_group_order_list_members','goodies_group_order_my_invites','goodies_group_order_list_friends','goodies_group_order_checkout_preview','goodies_group_order_checkout_estimate','goodies_group_order_end'];
  const blocked=!permitted.includes(name);previewRequests.push({kind:'rpc',name,blocked});
  if(blocked)return failure();
  return response(()=>{
   if(/create|join|get_status/.test(name))return group();
   if(name==='goodies_group_order_list_members')return [{user_id:previewUserId,role:scenario==='guest'?'member':'host',full_name:'Preview customer',display_name:'Preview customer',is_host:scenario!=='guest'}];
   if(name==='goodies_group_order_checkout_preview')return {group_id:previewGroupId,store_id:group().store_id,items:[{name:'Preview item',quantity:1,unit_price:5,line_total:5}],subtotal:5,total:5};
   if(name==='goodies_group_order_checkout_estimate')return {group_id:previewGroupId,order_type:'pickup',estimated_total:5,subtotal:5,delivery_fee:0,service_fee:0,tip:0,discount:0};
   if(name==='goodies_group_order_end')return true;
   return [];
  });
 },
 functions:{invoke:async(name:string)=>{
  const blocked=name!=='create-card-setup-intent';previewRequests.push({kind:'edge',name,blocked});
  if(blocked)return failure();
  return response(()=>({client_secret:'__preview_only_not_a_secret__',publishable_key:'__preview_only_not_a_key__'}));
 }},
 storage:{from:()=>({createSignedUrl:async()=>failure(),createSignedUrls:async()=>failure(),upload:async()=>failure(),remove:async()=>failure(),getPublicUrl:()=>({data:{publicUrl:''}})})},
 channel:()=>{const channel:any={on:()=>channel,subscribe:()=>channel,unsubscribe(){}};return channel;},removeChannel:async()=>{},
} as unknown as SupabaseClient;
const memory = new Map<string,string>();
export const previewStorage={getItem:async(key:string)=>memory.get(key)||null,setItem:async(key:string,value:string)=>{memory.set(key,value);},removeItem:async(key:string)=>{memory.delete(key);},multiRemove:async(keys:string[])=>{keys.forEach(key=>memory.delete(key));}};
export const previewShare={share:async(_value?:unknown)=>({action:'dismissedAction'})};
export const previewFriendlyError=(error:unknown,fallback:string)=>error?fallback:'';
export const previewFunctionError=async(_error:unknown,fallback:string)=>fallback;

export const previewPublishedContent=async(_locale?:string):Promise<{content:{content_key:string;payload:any}[];assets:{asset_key:string;url:string}[]}>=>({content:[],assets:[]});
