import React,{useEffect,useRef,useState} from 'react';
import {TextInput,View} from 'react-native';
import {supabase} from '../../lib/supabase';
import {session} from '../../state/access';
import {Section} from '../../ui/Card';
import {OutlineBtn} from '../../ui/Controls';
import {Txt} from '../../ui/Txt';
import {parseCbm} from '../content/konsolissPreview/konsolissNumbers';
type Entry={container_id:string;container_number:string;capacity_cbm:number;loaded_cbm:string;allocated_cbm:string};
type Progress={updated_at:string;reserved_cbm:number;sent_cbm:number;loaded_cbm:number;inbound_to_container_cbm:number};
export function KonsolissMeasurements({customerId}:{customerId:string}){
 const [entries,setEntries]=useState<Entry[]>([]);const [progress,setProgress]=useState<Progress|null>(null);const [reason,setReason]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');const [review,setReview]=useState(false);const [loaded,setLoaded]=useState(false);const lock=useRef(false);const generation=useRef(0);
 const actor=session.userId;const authorized=session.status==='active'&&session.role==='super_admin';
 useEffect(()=>{generation.current++;lock.current=false;setBusy(false);setEntries([]);setProgress(null);setLoaded(false);setReview(false);setError('');setNotice('');return()=>{generation.current++;};},[customerId,actor]);
 const accept=(data:any)=>{if(!data||!Array.isArray(data.assignments))throw new Error('Invalid measurements response');setEntries(data.assignments.map((item:any)=>({...item,loaded_cbm:item.loaded_cbm==null?'':String(item.loaded_cbm),allocated_cbm:item.allocated_cbm==null?'':String(item.allocated_cbm)})));setProgress(data.progress??null);setLoaded(true);setReview(false);};
 const load=async()=>{if(!authorized||lock.current||!customerId.trim())return;const request=++generation.current;lock.current=true;setBusy(true);setError('');setNotice('');try{const reconciled=await supabase.rpc('konsoliss_admin_reconcile_home_progress',{p_customer_id:customerId.trim()});if(reconciled.error)throw reconciled.error;const result=await supabase.rpc('konsoliss_admin_get_container_measurements',{p_customer_id:customerId.trim()});if(result.error)throw result.error;if(request===generation.current)accept(result.data);}catch{if(request===generation.current)setError('Measurements could not be retrieved. Check customer ID and access, then retry.');}finally{if(request===generation.current){lock.current=false;setBusy(false);}}};
 const save=async()=>{
  if(!authorized||lock.current||!progress||!entries.length||!review)return;
  const measurements=entries.map(entry=>({container_id:entry.container_id,loaded_cbm:parseCbm(entry.loaded_cbm),allocated_cbm:parseCbm(entry.allocated_cbm)}));
  if(measurements.some(row=>!Number.isFinite(row.loaded_cbm)||!Number.isFinite(row.allocated_cbm)||row.loaded_cbm>row.allocated_cbm||row.allocated_cbm>68)){setError('Enter verified values with up to three decimal places: 0 ≤ loaded ≤ allocated ≤ 68.');return;}
  if(reason.trim().length<5||reason.trim().length>500){setError('An audit reason of 5–500 characters is required.');return;}
  const request=++generation.current;lock.current=true;setBusy(true);setError('');setNotice('');
  try{const result=await supabase.rpc('konsoliss_admin_verify_container_measurements',{p_customer_id:customerId.trim(),p_measurements:measurements,p_expected_updated_at:progress.updated_at,p_reason:reason.trim()});if(result.error)throw result.error;if(request===generation.current){accept(result.data);setReason('');setNotice('Per-container measurements and customer totals committed together and read back.');}}
  catch{if(request===generation.current)setError('Update could not be confirmed. Draft values are preserved. Refresh to reconcile any concurrent change before retrying.');}finally{if(request===generation.current){lock.current=false;setBusy(false);}}
 };
 const input={borderWidth:1,borderColor:'#DDD',borderRadius:10,padding:10,marginVertical:6,color:'#2B1210'};
 return <Section title="Per-container cargo measurements">
  <Txt size={10} mut>Customer UUID above. Record each active container separately. A confirmed update atomically reconciles the customer's physically loaded and inbound totals; reserved and sent totals remain unchanged. Unknown measurements are blank.</Txt>
  <OutlineBtn disabled={!authorized||busy||!customerId.trim()} onPress={()=>{void load();}}>{busy?'Working…':'Load per-container measurements'}</OutlineBtn>
  {error?<Txt size={11} color="#A90E02">{error}</Txt>:null}{notice?<Txt size={11} color="#14773F">{notice}</Txt>:null}
  {loaded&&!entries.length?<Txt size={11}>No active container assignments for this customer.</Txt>:null}
  {loaded&&!progress?<Txt size={11}>Verified paid rights and dispatch/receipt evidence are required before recording container measurements.</Txt>:null}
  {entries.map((entry,index)=><View key={entry.container_id} style={{paddingVertical:10,borderBottomWidth:1,borderColor:'#EEE'}}><Txt size={12} weight={600}>{entry.container_number+' · 40HQ · '+entry.capacity_cbm+' CBM'}</Txt>{(['loaded_cbm','allocated_cbm'] as const).map(key=><View key={key}><Txt size={10}>{key==='loaded_cbm'?'Physically loaded CBM':'Allocated CBM (loaded + inbound)'}</Txt><TextInput accessibilityLabel={entry.container_number+' '+key} editable={!busy} keyboardType="decimal-pad" value={entry[key]} onChangeText={value=>{setReview(false);setEntries(rows=>rows.map((row,i)=>i===index?{...row,[key]:value}:row));}} style={input}/></View>)}</View>)}
  {entries.length&&progress?<><TextInput accessibilityLabel="Container measurement audit reason" editable={!busy} value={reason} onChangeText={value=>{setReason(value);setReview(false);}} maxLength={500} placeholder="Audit reason and measurement evidence" style={input}/>{review?<View style={{borderWidth:2,borderColor:'#FFD93D',padding:12,borderRadius:10}}><Txt size={11}>Confirm all displayed container measurements for {customerId}. The update is customer-visible and audited.</Txt><OutlineBtn primary disabled={busy} onPress={()=>{void save();}}>Confirm measurements</OutlineBtn><OutlineBtn disabled={busy} onPress={()=>setReview(false)}>Cancel</OutlineBtn></View>:<OutlineBtn primary disabled={busy} onPress={()=>setReview(true)}>Review container measurements</OutlineBtn>}</>:null}
 </Section>;
}
