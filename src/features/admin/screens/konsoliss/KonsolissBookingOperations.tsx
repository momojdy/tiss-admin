import React,{useCallback,useEffect,useState} from 'react';
import {ScrollView,TextInput,View} from 'react-native';
import {supabase} from '../../lib/supabase';
import {Card,Section} from '../../ui/Card';
import {OutlineBtn,Pill} from '../../ui/Controls';
import {Txt} from '../../ui/Txt';

type Quote={id:string;status:string;created_at:string;country:string;region:string;shipping_mode:string;delivery:string;physical_cbm:number|null;container_count:number|null;goods_category:string;goods_description:string|null;declared_value_usd:number|null;estimated_weight_kg:number|null;base_freight_cents:number|null;weight_surcharge_cents:number|null;requested_total_cents:number|null;approved_total_cents:number|null;approved_scope:any;quote_version:number;address:string|null;review_note:string|null;customer_id:string};
type Route={code:string;country:string;region:string;shipping_mode:string;delivery:string;requests_enabled:boolean;service_verified:boolean;checkout_enabled:boolean;price_published:boolean;rate_version:number};
const field={borderWidth:1,borderColor:'#D5C8A5',backgroundColor:'#FFF9DF',borderRadius:6,padding:9,fontSize:12,color:'#2B1210',marginVertical:5} as const;
const fmt=(n:number|null)=>(n==null?'Pending':('$'+(n/100).toFixed(2)));
export function KonsolissBookingOperations(){
 const [quotes,setQuotes]=useState<Quote[]>([]),[routes,setRoutes]=useState<Route[]>([]),[selected,setSelected]=useState<string|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [amount,setAmount]=useState(''),[note,setNote]=useState(''),[reason,setReason]=useState(''),[routeCode,setRouteCode]=useState('');
 const [included,setIncluded]=useState(''),[excluded,setExcluded]=useState(''),[customs,setCustoms]=useState(''),[cargo,setCargo]=useState(''),[delivery,setDelivery]=useState(''),[profit,setProfit]=useState('');
 const [scopeConfirmed,setScopeConfirmed]=useState(false);
 const chosen=quotes.find(q=>q.id===selected);
 const refresh=useCallback(async()=>{
  const [q,r]=await Promise.all([
   supabase.from('konsoliss_booking_quotes').select('id,status,created_at,country,region,shipping_mode,delivery,physical_cbm,container_count,goods_category,goods_description,declared_value_usd,estimated_weight_kg,base_freight_cents,weight_surcharge_cents,requested_total_cents,approved_total_cents,approved_scope,quote_version,address,review_note,customer_id').order('created_at',{ascending:false}).limit(100),
   supabase.from('konsoliss_booking_routes').select('*').order('code')
  ]);
  if(q.error||r.error)setError('Could not load booking requests or route policy. Check Super Admin access.');
  else{setQuotes(q.data as Quote[]);setRoutes(r.data as Route[]);setError('')}
 },[]);
 useEffect(()=>{void refresh()},[refresh]);
 const act=async(kind:'review'|'info'|'reject'|'approve'|'expire')=>{
  if(!chosen||busy)return;
  if(note.trim().length<5){setError('Provide an audit note of at least five characters.');return}
  const dollars=Number(amount),cents=Math.round(dollars*100);
  if(kind==='approve'&&(!scopeConfirmed||!Number.isFinite(dollars)||dollars<0||![included,excluded,customs,cargo,delivery,profit].every(v=>v.trim().length>=8))){
   setError('Approval requires the itemized commercial scope, customs, cargo, exclusions, delivery commitment and margin review.');return;
  }
  const scope=kind==='approve'?{
   services_included:included.trim().split('\n').filter(Boolean),services_excluded:excluded.trim().split('\n').filter(Boolean),
   customs_treatment:customs.trim(),cargo_review:cargo.trim(),delivery_commitment:delivery.trim(),
   commercial_approval:profit.trim(),currency:'USD',pricing_basis:'Admin-reviewed quotation',checkout_ready:false
  }:null;
  setBusy(true);setError('');setNotice('');
  const {error:e}=await supabase.rpc('konsoliss_admin_quote_action',{p_id:chosen.id,p_action:kind,p_amount_cents:kind==='approve'?cents:null,p_scope:scope,p_note:note.trim()});
  if(e)setError(e.message);else{setNotice('Request '+kind+' recorded and audited. Live payment remains disabled.');setSelected(null);setNote('');setScopeConfirmed(false);await refresh()}
  setBusy(false);
 };
 const toggleRoute=async()=>{
  const r=routes.find(r=>r.code===routeCode);
  if(!r||busy||reason.trim().length<5){setError('Choose a route and enter an audit reason.');return}
  setBusy(true);const {error:e}=await supabase.rpc('konsoliss_admin_set_booking_route',{p_code:r.code,p_requests_enabled:!r.requests_enabled,p_note:reason.trim()});
  if(e)setError(e.message);else{setNotice('Route quotation intake updated. This does not enable checkout or verify a carrier.');setReason('');await refresh()}
  setBusy(false);
 };
 return <View>
  <Section title="Booking quotations · live shared Supabase">
   <Txt size={11} mut>Real customers can submit requests, including space before buying goods. A submitted request is NOT a paid reservation. No checkout is enabled until capacity, provider verification and binding policies are implemented.</Txt>
   <OutlineBtn onPress={()=>{void refresh()}} disabled={busy}>Refresh requests</OutlineBtn>
   {error?<Txt size={11} color="#A90E02">{error}</Txt>:null}
   {notice?<Txt size={11} color="#14773F">{notice}</Txt>:null}
   {quotes.length===0?<Txt size={11} mut>No quote requests have been submitted.</Txt>:null}
   {quotes.map(q=><View key={q.id} style={{borderBottomWidth:.5,borderColor:'#D5C8A5',paddingVertical:8}}>
     <Txt size={12} weight={600}>{q.shipping_mode} · {q.country} · {q.region} · {q.delivery}</Txt>
     <Txt size={10} mut>{q.status} · {q.goods_category} · {q.physical_cbm??q.container_count+' containers'} · {q.id.slice(0,8)}</Txt>
     <Txt size={10} mut>Customer {q.customer_id} · Estimate {fmt(q.requested_total_cents)} · Approved {fmt(q.approved_total_cents)}</Txt>
     <OutlineBtn disabled={busy} onPress={()=>{setSelected(q.id);setAmount(q.approved_total_cents!=null?String(q.approved_total_cents/100):'');setNote(q.review_note||'');setScopeConfirmed(false)}}>{selected===q.id?'Selected':'Open review'}</OutlineBtn>
   </View>)}
  </Section>
  {chosen?<Section title={'Quotation review · '+chosen.id.slice(0,8)}>
   <Card>
    <Txt size={11} weight={600}>Requested service</Txt>
    <Txt size={11}>Customer: {chosen.customer_id}</Txt>
    <Txt size={11}>Goods: {chosen.goods_category} · {chosen.goods_description||'Not yet described'}</Txt>
    <Txt size={11}>Weight: {chosen.estimated_weight_kg==null?'Unknown':chosen.estimated_weight_kg+' kg'}</Txt>
    <Txt size={11}>Value: {chosen.declared_value_usd==null?'Unknown':'$'+chosen.declared_value_usd}</Txt>
    <Txt size={11}>Volume: {chosen.physical_cbm??'Dedicated equipment'} CBM · Containers: {chosen.container_count??'N/A'}</Txt>
    <Txt size={11}>Delivery address: {chosen.address||'Warehouse pickup / not supplied'}</Txt>
    <Txt size={11} mut>Version {chosen.quote_version}. Manual approval is not evidence of customs or carrier coverage unless separately verified and recorded.</Txt>
   </Card>
   <Txt size={11} weight={600}>Approved total USD (commercially verified only)</Txt>
   <TextInput style={field} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} placeholder="Final amount in USD"/>
   {([
    ['Included services (one per line)',included,setIncluded],
    ['Excluded services (one per line)',excluded,setExcluded],
    ['Customs clearance, duties and taxes',customs,setCustoms],
    ['Cargo eligibility and evidence',cargo,setCargo],
    ['Delivery commitment and actual route',delivery,setDelivery],
    ['Wholesale costs, margin and risk review',profit,setProfit],
   ] as const).map(([title,value,change])=><View key={title}><Txt size={10} weight={600}>{title}</Txt><TextInput multiline style={[field,{minHeight:55}]} value={value} onChangeText={change} placeholder={title}/></View>)}
   <Txt size={10} weight={600}>Audit note / reason</Txt>
   <TextInput multiline style={[field,{minHeight:45}]} value={note} onChangeText={setNote} placeholder="Why this action is justified"/>
   <Pill on={scopeConfirmed} onPress={()=>setScopeConfirmed(x=>!x)}>{scopeConfirmed?'✓ Documentation reviewed':'Confirm commercial scope reviewed'}</Pill>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:10}}>
    <OutlineBtn disabled={busy} onPress={()=>{void act('review')}}>In review</OutlineBtn>
    <OutlineBtn disabled={busy} onPress={()=>{void act('info')}}>Needs details</OutlineBtn>
    <OutlineBtn disabled={busy} onPress={()=>{void act('reject')}}>Not available</OutlineBtn>
    <OutlineBtn primary disabled={busy||!scopeConfirmed} onPress={()=>{void act('approve')}}>Approve scoped quote</OutlineBtn>
    <OutlineBtn disabled={busy} onPress={()=>{void act('expire')}}>Expire</OutlineBtn>
    <OutlineBtn onPress={()=>setSelected(null)}>Close</OutlineBtn>
   </View>
  </Section>:null}
  <Section title="Destination service intake">
   <Txt size={11} mut>Disable quotation intake for an unsupported route. This is NOT an activation switch for paid bookings. Routes require independent carrier, customs and margin approval.</Txt>
   {routes.map(r=><View key={r.code} style={{paddingVertical:5,borderBottomWidth:.5,borderColor:'#E4DDCD'}}>
     <Txt size={11}>{r.code} · {r.requests_enabled?'Requests open':'Requests paused'} · {r.price_published?'Tariff available':'Manual quote'} · {r.checkout_enabled?'Checkout enabled':'Checkout disabled'}</Txt>
     <OutlineBtn disabled={busy} onPress={()=>setRouteCode(r.code)}>{routeCode===r.code?'Selected':'Select route'}</OutlineBtn>
   </View>)}
   <Txt size={10} weight={600}>Audit reason</Txt>
   <TextInput style={field} value={reason} onChangeText={setReason} placeholder="Route intake decision and evidence"/>
   <OutlineBtn disabled={!routeCode||busy} onPress={()=>{void toggleRoute()}}>Update selected route intake</OutlineBtn>
  </Section>
 </View>
}
