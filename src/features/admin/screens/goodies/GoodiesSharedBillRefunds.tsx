import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Pressable,Text,TextInput,View} from 'react-native';
import {supabase} from '../../lib/supabase';
import {useDb} from '../../state/db';
import {hasServerPermission,session} from '../../state/access';
type Refund={id:string;total_cents:number;currency:'USD';refund_attempts:number;refund_retry_at:string|null;refund_attention_required:boolean;created_at:string;order_id:string|null};
const card={backgroundColor:'#fff',borderWidth:1,borderColor:'#E1E6DE',borderRadius:14,padding:14,marginBottom:10} as const;
const button={padding:10,borderRadius:10,backgroundColor:'#E9EEE6',marginTop:8} as const;
export function parseSharedBillRefundQueue(value:unknown):Refund[]{
 if(!Array.isArray(value)||value.some(row=>!row||typeof row.id!=='string'||!Number.isSafeInteger(row.total_cents)||row.total_cents<1||row.currency!=='USD'||!Number.isSafeInteger(row.refund_attempts)||row.refund_attempts<0||typeof row.refund_attention_required!=='boolean'||(row.refund_retry_at!==null&&!Number.isFinite(Date.parse(row.refund_retry_at)))||!Number.isFinite(Date.parse(row.created_at))))throw Error('Refund queue unavailable');
 return value;
}
export function GoodiesSharedBillRefunds(){
 useDb();const canView=hasServerPermission('finance.view','view'),canManage=hasServerPermission('finance.approve','manage');
 const [rows,setRows]=useState<Refund[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState(''),[page,setPage]=useState(0),[selected,setSelected]=useState<string|null>(null),[reason,setReason]=useState(''),[busy,setBusy]=useState(false);
 const generation=useRef(0),mounted=useRef(true),lock=useRef(false);
 const load=useCallback(async()=>{const request=++generation.current,owner=session.userId;const current=()=>mounted.current&&request===generation.current&&session.userId===owner;if(!canView)return;setLoading(true);setError('');try{const response=await supabase.rpc('help_pay_admin_refund_queue',{p_offset:page*40,p_limit:40});if(response.error)throw Error('Unavailable');const next=parseSharedBillRefundQueue(response.data);if(current())setRows(next);}catch{if(current()){setRows([]);setError('Could not load Shared Bill refunds. Please retry.');}}finally{if(current())setLoading(false);}},[canView,page,session.userId]);
 useEffect(()=>{mounted.current=true;void load();const timer=setInterval(()=>{void load();},30000);return()=>{mounted.current=false;generation.current++;clearInterval(timer);};},[load]);
 useEffect(()=>{setSelected(null);setReason('');setNotice('');setRows([]);},[session.userId,canManage]);
 const retry=async()=>{if(!selected||!canManage||reason.trim().length<10||lock.current)return;const id=selected,owner=session.userId;const current=()=>mounted.current&&session.userId===owner;lock.current=true;setBusy(true);setNotice('');try{const response=await supabase.rpc('help_pay_admin_retry_refund',{p_request_id:id,p_reason:reason.trim()});if(response.error||typeof response.data?.refunded!=='boolean')throw Error('Unavailable');if(current()){setSelected(null);setReason('');setNotice(response.data.refunded?'Wallet refunds completed.':'Refunds remain pending. Review the current status.');await load();}}catch{if(current())setError('Could not confirm the refund retry. Refresh its status before trying again.');}finally{lock.current=false;if(current())setBusy(false);}};
 if(!canView)return null;
 return <View style={card}><Text style={{fontSize:16,fontWeight:'800',marginBottom:8}}>Shared Bill refund recovery</Text>
  {error?<View><Text style={{color:'#8D3932'}}>{error}</Text><Pressable style={button} disabled={busy} onPress={()=>void load()}><Text>Refresh refunds</Text></Pressable></View>:null}
  {notice?<Text>{notice}</Text>:null}{loading?<Text>Loading pending refunds…</Text>:!error&&!rows.length?<Text>No Shared Bill refunds are waiting for recovery.</Text>:rows.map(row=><View key={row.id} style={{paddingVertical:12,borderBottomWidth:1,borderColor:'#E1E6DE'}}><Text>{(row.total_cents/100).toFixed(2)} {row.currency} · {row.refund_attention_required?'Needs review':'Retry scheduled'}</Text><Text selectable>{row.id}</Text><Text>Attempts: {row.refund_attempts}{row.refund_retry_at?' · Next retry: '+new Date(row.refund_retry_at).toLocaleString():''}</Text>{canManage?<Pressable style={button} disabled={busy} onPress={()=>{setSelected(row.id);setReason('');setNotice('');}}><Text>Review refund retry</Text></Pressable>:null}</View>)}
  {selected?<View><TextInput accessibilityLabel="Shared Bill refund review reason" value={reason} onChangeText={setReason} editable={!busy&&canManage} maxLength={500} placeholder="Review reason (at least 10 characters)" style={{borderWidth:1,borderColor:'#E1E6DE',borderRadius:10,padding:12,marginTop:10}}/><Pressable style={button} disabled={busy||!canManage||reason.trim().length<10} onPress={()=>void retry()}><Text>{busy?'Confirming…':'Retry Wallet refunds'}</Text></Pressable><Pressable style={button} disabled={busy} onPress={()=>setSelected(null)}><Text>Close review</Text></Pressable></View>:null}
  <View style={{flexDirection:'row',gap:8}}>{page>0?<Pressable style={button} disabled={busy||loading} onPress={()=>setPage(value=>value-1)}><Text>Previous refunds</Text></Pressable>:null}{rows.length===40?<Pressable style={button} disabled={busy||loading} onPress={()=>setPage(value=>value+1)}><Text>Next refunds</Text></Pressable>:null}</View>
 </View>;
}
