import React, {useCallback, useEffect, useState} from 'react';
import {Pressable, TextInput, View} from 'react-native';
import {supabase} from '../../lib/supabase';
import {session} from '../../state/access';
import {ui, useDb} from '../../state/db';
import {useNav} from '../../shell/Nav';
import {Card, Section} from '../../ui/Card';
import {OutlineBtn, Pill} from '../../ui/Controls';
import {Txt} from '../../ui/Txt';

type Container={id:string;container_number:string;status:'filling'|'filled'|'departed'|'arrived';updated_at:string;assigned_customers:number};
const NEXT:Record<Container['status'],Container['status']|null>={filling:'filled',filled:'departed',departed:'arrived',arrived:null};
const MODULES=['Overview','Requests and shipments','Container records','Providers','Documents','Quotes and bookings','Shipment status','Issues','Analytics'];
const fieldStyle={borderWidth:1,borderColor:'#E5DCD0',backgroundColor:'#FFFDF8',borderRadius:12,padding:10,fontSize:13,color:'#2B1210',marginTop:6,marginBottom:10} as const;
export function KonsolissAdminScreen(){
 useDb();
 const {go}=useNav();
 const [module,setModule]=useState('Overview');
 const [containers,setContainers]=useState<Container[]>([]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [success,setSuccess]=useState('');
 const [busy,setBusy]=useState(false);
 const [number,setNumber]=useState('');
 const [reason,setReason]=useState('');
 const [customerId,setCustomerId]=useState('');
 const [chosen,setChosen]=useState('');
 const [confirm,setConfirm]=useState<{id:string;next:Container['status']}|null>(null);
 const authorized=session.role==='super_admin'&&session.status==='active';
 const refresh=useCallback(async()=>{
   if(!authorized)return;
   setLoading(true);setError('');
   const {data,error:e}=await supabase.rpc('konsoliss_admin_list_containers');
   if(e)setError('Unable to load container records. Verify your access and connection.');
   else setContainers(Array.isArray(data)?data as Container[]:[]);
   setLoading(false);
 },[authorized]);
 useEffect(()=>{void refresh();},[refresh]);
 useEffect(()=>{if(MODULES.includes(String(ui.wmod)))setModule(String(ui.wmod));},[ui.wmod]);
 const action=async(kind:'create'|'advance'|'assign',values:{containerId?:string;status?:string;customer?:string})=>{
   if(!authorized||busy)return;
   if(reason.trim().length<5){setError('Provide an audit reason of at least five characters.');return;}
   setBusy(true);setError('');setSuccess('');
   const {error:e}=await supabase.rpc('konsoliss_admin_manage_container',{
     p_action:kind,p_container_id:values.containerId||null,p_container_number:kind==='create'?number.trim():null,
     p_status:values.status||null,p_customer_id:values.customer||null,p_reason:reason.trim()
   });
   if(e)setError(e.code==='42501'?'Only an active Super Admin may operate Konsoliss.':'Action was rejected. Check the container, customer, lifecycle stage and audit reason.');
   else{setSuccess('Konsoliss container action saved and audited.');setReason('');setConfirm(null);if(kind==='create')setNumber('');if(kind==='assign')setCustomerId('');await refresh();}
   setBusy(false);
 };
 if(!authorized)return <Card><Txt size={14} weight={600}>Super Admin only</Txt><Txt size={11} mut>Konsoliss operational records and actions are not available to other staff. Authorized content editors may use Content Studio.</Txt></Card>;
 return <View>
  <View style={{flexDirection:'row',alignItems:'center',gap:10,marginBottom:12}}>
    <OutlineBtn onPress={()=>go('hub',{hub:'Konsoliss'})}>Back to hub</OutlineBtn>
    <Txt size={14} weight={600}>Konsoliss Operations</Txt>
  </View>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:5,marginBottom:12}}>
    {MODULES.map(name=><Pill key={name} on={module===name} onPress={()=>setModule(name)}>{name}</Pill>)}
  </View>
  {error?<Card><Txt size={11} color="#A90E02">{error}</Txt><OutlineBtn onPress={()=>{void refresh();}}>Retry</OutlineBtn></Card>:null}
  {success?<Card><Txt size={11} color="#14773F">{success}</Txt></Card>:null}
  {(module==='Overview'||module==='Container records'||module==='Shipment status')?<>
   <Section title={module==='Overview'?'Container overview':module}>
     <View style={{flexDirection:'row',gap:12,flexWrap:'wrap'}}>
       <View><Txt size={25} weight={600}>{containers.length}</Txt><Txt size={10} mut>Containers</Txt></View>
       <View><Txt size={25} weight={600}>{containers.filter(c=>c.status==='filling').length}</Txt><Txt size={10} mut>Filling</Txt></View>
       <View><Txt size={25} weight={600}>{containers.filter(c=>c.status==='departed').length}</Txt><Txt size={10} mut>Departed</Txt></View>
       <View><Txt size={25} weight={600}>{containers.filter(c=>c.status==='arrived').length}</Txt><Txt size={10} mut>Arrived</Txt></View>
     </View>
     <View style={{marginTop:10}}><OutlineBtn onPress={()=>{void refresh();}} disabled={loading}>{loading?'Loading…':'Refresh'}</OutlineBtn></View>
     {containers.length===0?<Txt size={11} mut>{loading?'Loading container records…':'No containers have been created yet.'}</Txt>:null}
     {containers.map(c=><View key={c.id} style={{borderTopWidth:1,borderColor:'#E4DDCD',paddingVertical:12,gap:5}}>
       <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
         <Txt size={13} weight={600}>{c.container_number}</Txt><Pill>{c.status.toUpperCase()}</Pill>
       </View>
       <Txt size={10} mut>{c.assigned_customers} assigned customer(s) · {c.id}</Txt>
       <View style={{flexDirection:'row',flexWrap:'wrap'}}>
         {NEXT[c.status]?<OutlineBtn onPress={()=>{setConfirm({id:c.id,next:NEXT[c.status]!});setChosen(c.id);}}>Advance to {NEXT[c.status]}</OutlineBtn>:<Txt size={10}>Destination arrival confirmed</Txt>}
         <OutlineBtn onPress={()=>{setChosen(c.id);setModule('Container records');}}>Assign customer</OutlineBtn>
       </View>
       {confirm?.id===c.id?<View style={{borderColor:'#FFD93D',borderWidth:2,borderStyle:'dashed',borderRadius:12,padding:10}}>
         <Txt size={11}>Confirm {c.container_number}: {c.status} → {confirm.next}. This is a real shipment status change.</Txt>
         <TextInput value={reason} onChangeText={setReason} placeholder="Audit reason (required)" placeholderTextColor="#8D817A" style={fieldStyle}/>
         <View style={{flexDirection:'row',flexWrap:'wrap'}}><OutlineBtn primary disabled={busy} onPress={()=>{void action('advance',{containerId:c.id,status:confirm.next});}}>Confirm status</OutlineBtn><OutlineBtn onPress={()=>setConfirm(null)}>Cancel</OutlineBtn></View>
       </View>:null}
     </View>)}
   </Section>
   {module==='Container records'?<>
    <Section title="Create container">
      <Txt size={10} mut>A new container starts in Filling. Only Super Admin can advance its status.</Txt>
      <TextInput accessibilityLabel="Container number" value={number} onChangeText={setNumber} placeholder="Container number, e.g. KS-2049" placeholderTextColor="#8D817A" autoCapitalize="characters" style={fieldStyle}/>
      <TextInput accessibilityLabel="Reason to create" value={reason} onChangeText={setReason} placeholder="Audit reason" placeholderTextColor="#8D817A" style={fieldStyle}/>
      <OutlineBtn primary disabled={busy} onPress={()=>{void action('create',{});}}>Create container</OutlineBtn>
    </Section>
    <Section title="Assign customer to container">
      <Txt size={10} mut>Use a verified Wantiss customer UUID. The customer will see this container number and state on their homepage. This replaces their previous current-container assignment.</Txt>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:5,marginTop:8}}>{containers.map(c=><Pill key={c.id} on={chosen===c.id} onPress={()=>setChosen(c.id)}>{c.container_number}</Pill>)}</View>
      <TextInput accessibilityLabel="Customer user UUID" value={customerId} onChangeText={setCustomerId} placeholder="Customer UUID" placeholderTextColor="#8D817A" autoCapitalize="none" style={fieldStyle}/>
      <TextInput accessibilityLabel="Reason to assign" value={reason} onChangeText={setReason} placeholder="Audit reason" placeholderTextColor="#8D817A" style={fieldStyle}/>
      <OutlineBtn primary disabled={!chosen||!customerId||busy} onPress={()=>{void action('assign',{containerId:chosen,customer:customerId.trim()});}}>Assign current container</OutlineBtn>
    </Section>
   </>:null}
  </>:<Card><Txt size={12} weight={600}>{module}</Txt><Txt size={11} mut>Operational module reserved for a dedicated authorized Konsoliss workflow. No demo transactions or fake shipment records are displayed.</Txt></Card>}
  <Card><Txt size={10} mut>Only Super Admin can create containers, assign customers and advance Filling → Filled → Departed → Arrived. Actions are validated on the server and written to the Wantiss admin audit log. Customer content changes remain in Content Studio.</Txt><OutlineBtn onPress={()=>go('editor',{editorFeature:'Konsoliss'})}>Open Konsoliss Content Editor</OutlineBtn></Card>
 </View>;
}
