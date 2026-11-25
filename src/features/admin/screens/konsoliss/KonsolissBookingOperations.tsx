import React,{useCallback,useEffect,useState} from 'react';
import {ScrollView,TextInput,View} from 'react-native';
import {supabase} from '../../lib/supabase';
import {Card,Section} from '../../ui/Card';
import {OutlineBtn,Pill} from '../../ui/Controls';
import {Txt} from '../../ui/Txt';

type Quote={id:string;status:string;created_at:string;route_code:string;country:string;region:string;shipping_mode:string;delivery:string;physical_cbm:number|null;container_count:number|null;goods_category:string;goods_description:string|null;declared_value_usd:number|null;estimated_weight_kg:number|null;base_freight_cents:number|null;weight_surcharge_cents:number|null;requested_total_cents:number|null;approved_total_cents:number|null;approved_scope:any;quote_version:number;address:string|null;review_note:string|null;customer_id:string};
type CargoPiece={id:string;order_id:string;customer_id:string;piece_reference:string;description:string|null;declared_category:string|null;declared_value_usd:number|null;declared_cbm:number;measured_cbm:number|null;measured_kg:number|null;received_at:string|null;receipt_identity:string|null};
type PieceCarrier={piece_id:string;order_id:string;tracking_number:string;status:string;first_carrier_scan_at:string|null;carrier_evidence:string|null};
type DeliveryCommitment={piece_id:string;basis:string;original_due_at:string|null};
type ServiceRequest={id:string;order_id:string;customer_id:string;request_kind:string;description:string;status:string;decision_note:string|null;created_at:string};
type Route={code:string;country:string;region:string;shipping_mode:string;delivery:string;requests_enabled:boolean;service_verified:boolean;checkout_enabled:boolean;price_published:boolean;rate_version:number};
const field={borderWidth:1,borderColor:'#D5C8A5',backgroundColor:'#FFF9DF',borderRadius:6,padding:9,fontSize:12,color:'#2B1210',marginVertical:5} as const;
const fmt=(n:number|null)=>(n==null?'Pending':('$'+(n/100).toFixed(2)));
export function KonsolissBookingOperations(){
 const [quotes,setQuotes]=useState<Quote[]>([]),[routes,setRoutes]=useState<Route[]>([]),[selected,setSelected]=useState<string|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [amount,setAmount]=useState(''),[note,setNote]=useState(''),[reason,setReason]=useState(''),[routeCode,setRouteCode]=useState('');
 const [included,setIncluded]=useState(''),[excluded,setExcluded]=useState(''),[customs,setCustoms]=useState(''),[cargo,setCargo]=useState(''),[delivery,setDelivery]=useState(''),[profit,setProfit]=useState('');
 const [newCountry,setNewCountry]=useState(''),[newRegion,setNewRegion]=useState('OTHER'),[newMode,setNewMode]=useState<'LCL'|'FCL'>('LCL'),[newDelivery,setNewDelivery]=useState<'pickup'|'door'>('pickup');
 const [scopeConfirmed,setScopeConfirmed]=useState(false);
 const [cargoPieces,setCargoPieces]=useState<CargoPiece[]>([]),[carriers,setCarriers]=useState<PieceCarrier[]>([]),[commitments,setCommitments]=useState<DeliveryCommitment[]>([]);
 const [selectedPiece,setSelectedPiece]=useState<string|null>(null),[carrierScanAt,setCarrierScanAt]=useState(''),[carrierEvidence,setCarrierEvidence]=useState('');
 const [receiptRef,setReceiptRef]=useState(''),[receiptVolume,setReceiptVolume]=useState(''),[receiptWeight,setReceiptWeight]=useState('');
 const [requests,setRequests]=useState<ServiceRequest[]>([]),[chosenRequest,setChosenRequest]=useState<string|null>(null),[requestNote,setRequestNote]=useState('');
 const chosen=quotes.find(q=>q.id===selected);
 const refresh=useCallback(async()=>{
  const [q,r,s,p,t,d]=await Promise.all([
   supabase.from('konsoliss_booking_quotes').select('id,status,created_at,route_code,country,region,shipping_mode,delivery,physical_cbm,container_count,goods_category,goods_description,declared_value_usd,estimated_weight_kg,base_freight_cents,weight_surcharge_cents,requested_total_cents,approved_total_cents,approved_scope,quote_version,address,review_note,customer_id').order('created_at',{ascending:false}).limit(100),
   supabase.from('konsoliss_booking_routes').select('*').order('code'),
   supabase.from('konsoliss_customer_service_requests').select('id,order_id,customer_id,request_kind,description,status,decision_note,created_at').order('created_at',{ascending:false}).limit(100),
   supabase.from('konsoliss_consignment_pieces').select('id,order_id,customer_id,piece_reference,description,declared_category,declared_value_usd,declared_cbm,measured_cbm,measured_kg,received_at,receipt_identity').order('created_at',{ascending:false}).limit(100),
   supabase.from('konsoliss_piece_carrier_records').select('piece_id,order_id,tracking_number,status,first_carrier_scan_at,carrier_evidence').limit(100),
   supabase.from('konsoliss_lot_delivery_commitments').select('piece_id,basis,original_due_at').limit(100)
  ]);
  if(q.error||r.error||s.error||p.error||t.error||d.error)setError('Could not load booked goods, requests or route policy. Check Super Admin access.');
  else{setQuotes(q.data as Quote[]);setRoutes(r.data as Route[]);setRequests((s.data||[]) as ServiceRequest[]);setCargoPieces((p.data||[]) as CargoPiece[]);setCarriers((t.data||[]) as PieceCarrier[]);setCommitments((d.data||[]) as DeliveryCommitment[]);setError('')}
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
   route_code:chosen.route_code,country:chosen.country,region:chosen.region,
   shipping_mode:chosen.shipping_mode,equipment:chosen.shipping_mode==='FCL'?chosen.container_count+' × 40HQ':'Shared LCL',
   delivery_method:chosen.delivery,destination_address:chosen.delivery==='door'?chosen.address:null,
   pickup_region:chosen.delivery==='pickup'?chosen.region:null,
   goods_category:chosen.goods_category,goods_description:chosen.goods_description,
   declared_value_usd:chosen.declared_value_usd,estimated_weight_kg:chosen.estimated_weight_kg,
   physical_cbm:chosen.physical_cbm,container_count:chosen.container_count,
   quote_version:chosen.quote_version+1,validity_days:7,
   customs_treatment:customs.trim(),cargo_review:cargo.trim(),delivery_commitment:delivery.trim(),
   commercial_approval:profit.trim(),currency:'USD',pricing_basis:'Admin-reviewed quotation',checkout_ready:false
  }:null;
  setBusy(true);setError('');setNotice('');
  const {error:e}=await supabase.rpc('konsoliss_admin_quote_action',{p_id:chosen.id,p_action:kind,p_amount_cents:kind==='approve'?cents:null,p_scope:scope,p_note:note.trim()});
  if(e)setError(e.message);else{setNotice('Request '+kind+' recorded and audited. Live payment remains disabled.');setSelected(null);setNote('');setScopeConfirmed(false);await refresh()}
  setBusy(false);
 };
 const reviewServiceRequest=async(action:'review'|'need_info'|'reject'|'approve_manual')=>{
  if(!chosenRequest||busy||requestNote.trim().length<10){setError('Choose a request and enter at least ten characters of review evidence.');return}
  setBusy(true);setError('');setNotice('');
  const {error:e}=await supabase.rpc('konsoliss_admin_review_service_request',{
   p_request_id:chosenRequest,p_action:action,p_note:requestNote.trim()
  });
  if(e)setError(e.message);else{setNotice('Service request review recorded. No refund or carrier return has been executed.');setChosenRequest(null);setRequestNote('');await refresh()}
  setBusy(false);
 };
 const verifyCarrierPiece=async()=>{
  if(busy||!selectedPiece||carrierEvidence.trim().length<10||!carrierScanAt.trim()){
   setError('Select a piece and provide documented carrier scan time and evidence.');return;
  }
  const ms=Date.parse(carrierScanAt);if(!Number.isFinite(ms)||ms>Date.now()+60000){setError('Enter a valid scan date/time not in the future.');return}
  setBusy(true);setError('');setNotice('');
  const {error:e}=await supabase.rpc('konsoliss_admin_verify_piece_tracking',{
   p_piece_id:selectedPiece,p_first_scan_at:new Date(ms).toISOString(),p_evidence:carrierEvidence.trim()
  });
  if(e)setError(e.message);else{setNotice('Real carrier first scan recorded, not a vessel departure or warehouse receipt.');setCarrierEvidence('');await refresh()}
  setBusy(false);
 };
 const receiveCargoPiece=async()=>{
  if(busy||!selectedPiece||receiptRef.trim().length<10||!Number.isFinite(Number(receiptVolume))||
    Number(receiptVolume)<=0||!Number.isFinite(Number(receiptWeight))||Number(receiptWeight)<=0){
   setError('A real scan reference, measured CBM and gross kilograms are required.');return;
  }
  setBusy(true);setError('');setNotice('');
  const {error:e}=await supabase.rpc('konsoliss_admin_receive_piece',{
   p_piece_id:selectedPiece,p_receipt_reference:receiptRef.trim(),p_measured_cbm:Number(receiptVolume),
   p_measured_kg:Number(receiptWeight),p_receipt_at:new Date().toISOString()
  });
  if(e)setError(e.message);else{setNotice('Warehouse receipt recorded; cargo is NOT customs-cleared or physically loaded.');setReceiptRef('');setReceiptVolume('');setReceiptWeight('');await refresh()}
  setBusy(false);
 };
 const createRoute=async()=>{
  const country=newCountry.trim().toUpperCase(),region=newRegion.trim().toUpperCase();
  if(busy||!/^[A-Z]{2}$/.test(country)||!/^[A-Z0-9_-]{2,40}$/.test(region)||reason.trim().length<5){setError('Enter ISO two-letter country, region code and audit reason.');return}
  setBusy(true);setError('');setNotice('');
  const {error:e}=await supabase.rpc('konsoliss_admin_add_booking_route',{p_country:country,p_region:region,p_mode:newMode,p_delivery:newDelivery,p_reason:reason.trim()});
  if(e)setError(e.message);else{setNotice('New destination is saved as quotation-only and paused. Activate request intake only after reviewing the route.');setNewCountry('');setReason('');await refresh()}
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
  <Section title="China warehouse · declared pieces and carrier evidence">
   <Txt size={11} mut>Read-only until a staff member verifies the evidence. A customer tracking label is not carrier acceptance. Receipt requires a real, unique physical scan and measured dimensions; it does not approve customs or create loaded cargo.</Txt>
   {cargoPieces.length===0?<Txt size={11} mut>No verified paid-booking piece declarations yet.</Txt>:null}
   {cargoPieces.map(p=><View key={p.id} style={{paddingVertical:7,borderBottomWidth:.5,borderColor:'#D5C8A5'}}>
     <Txt size={12} weight={600}>{p.piece_reference} · {p.declared_category||'unknown'} · {p.declared_cbm} CBM</Txt>
     <Txt size={10} mut>Booking {p.order_id.slice(0,8)} · Customer {p.customer_id.slice(0,8)} · {p.description||'No description'}</Txt>
     <Txt size={11}>{p.received_at?'Received '+p.received_at:'Not physically received'} · {p.received_at?(p.measured_cbm+' CBM / '+p.measured_kg+' kg'):'Awaiting measured receipt'}</Txt>
     {carriers.find(c=>c.piece_id===p.id)?<Txt size={11} mut>Carrier: {carriers.find(c=>c.piece_id===p.id)?.tracking_number} · {carriers.find(c=>c.piece_id===p.id)?.status}</Txt>:null}
     {commitments.find(c=>c.piece_id===p.id)?<Txt size={11} mut>Delivery: {commitments.find(c=>c.piece_id===p.id)?.basis} · {commitments.find(c=>c.piece_id===p.id)?.original_due_at||'Service-specific terms only'}</Txt>:null}
     <OutlineBtn disabled={busy} onPress={()=>{setSelectedPiece(p.id);setCarrierScanAt('');setCarrierEvidence('');setReceiptRef('');setReceiptVolume('');setReceiptWeight('')}}>{selectedPiece===p.id?'Selected piece':'Select piece for verified operation'}</OutlineBtn>
   </View>)}
   {selectedPiece?<Card>
     <Txt size={12} weight={600}>Carrier acceptance · real evidence only</Txt>
     <Txt size={10} mut>ISO date/time of the first carrier acceptance scan (UTC or with timezone), and a documented carrier proof reference.</Txt>
     <TextInput style={field} value={carrierScanAt} onChangeText={setCarrierScanAt} placeholder="2026-11-25T13:30:00+08:00"/>
     <TextInput multiline style={[field,{minHeight:50}]} value={carrierEvidence} onChangeText={setCarrierEvidence} placeholder="Carrier scan source / signed consignment reference"/>
     <OutlineBtn disabled={busy||!carrierScanAt||carrierEvidence.trim().length<10} onPress={()=>{void verifyCarrierPiece()}}>Verify carrier acceptance</OutlineBtn>
     <Txt size={12} weight={600}>China warehouse physical receipt</Txt>
     <TextInput style={field} value={receiptRef} onChangeText={setReceiptRef} placeholder="Unique warehouse intake / scan receipt reference"/>
     <TextInput style={field} keyboardType="decimal-pad" value={receiptVolume} onChangeText={setReceiptVolume} placeholder="Measured CBM"/>
     <TextInput style={field} keyboardType="decimal-pad" value={receiptWeight} onChangeText={setReceiptWeight} placeholder="Gross kg"/>
     <OutlineBtn disabled={busy||receiptRef.trim().length<10||!receiptVolume||!receiptWeight} onPress={()=>{void receiveCargoPiece()}}>Record verified warehouse receipt</OutlineBtn>
     <OutlineBtn onPress={()=>setSelectedPiece(null)}>Close intake</OutlineBtn>
   </Card>:null}
  </Section>
  <Section title="Customer refund, return and alternative-service requests">
   <Txt size={11} mut>Requests are submitted from authenticated customer bookings. Approval authorizes manual operational review only; it does not move money, return cargo or override safety and customs checks.</Txt>
   {requests.length===0?<Txt size={11} mut>No service requests recorded.</Txt>:null}
   {requests.map(req=><View key={req.id} style={{paddingVertical:8,borderBottomWidth:.5,borderColor:'#D5C8A5'}}>
     <Txt size={12} weight={600}>{req.request_kind.replace(/_/g,' ')} · {req.status.replace(/_/g,' ')}</Txt>
     <Txt size={10} mut>Booking {req.order_id.slice(0,8)} · Customer {req.customer_id.slice(0,8)}</Txt>
     <Txt size={11}>{req.description}</Txt>
     {req.decision_note?<Txt size={10} mut>Decision: {req.decision_note}</Txt>:null}
     <OutlineBtn disabled={busy} onPress={()=>{setChosenRequest(req.id);setRequestNote(req.decision_note||'')}}>{chosenRequest===req.id?'Selected':'Review request'}</OutlineBtn>
   </View>)}
   {chosenRequest?<Card>
     <Txt size={11} weight={600}>Review note · recorded with the decision</Txt>
     <TextInput multiline style={[field,{minHeight:55}]} value={requestNote} onChangeText={setRequestNote} placeholder="Reason, evidence and what the customer should know"/>
     <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
      <OutlineBtn disabled={busy} onPress={()=>{void reviewServiceRequest('review')}}>In review</OutlineBtn>
      <OutlineBtn disabled={busy} onPress={()=>{void reviewServiceRequest('need_info')}}>Need information</OutlineBtn>
      <OutlineBtn disabled={busy} onPress={()=>{void reviewServiceRequest('reject')}}>Reject</OutlineBtn>
      <OutlineBtn disabled={busy} onPress={()=>{void reviewServiceRequest('approve_manual')}}>Approve for manual processing</OutlineBtn>
      <OutlineBtn onPress={()=>setChosenRequest(null)}>Close</OutlineBtn>
     </View>
   </Card>:null}
  </Section>
  <Section title="Destination service intake">
   <Txt size={11} mut>Disable quotation intake for an unsupported route. This is NOT an activation switch for paid bookings. Routes require independent carrier, customs and margin approval.</Txt>
   {routes.map(r=><View key={r.code} style={{paddingVertical:5,borderBottomWidth:.5,borderColor:'#E4DDCD'}}>
     <Txt size={11}>{r.code} · {r.requests_enabled?'Requests open':'Requests paused'} · {r.price_published?'Tariff available':'Manual quote'} · {r.checkout_enabled?'Checkout enabled':'Checkout disabled'}</Txt>
     <OutlineBtn disabled={busy} onPress={()=>setRouteCode(r.code)}>{routeCode===r.code?'Selected':'Select route'}</OutlineBtn>
   </View>)}
   <Txt size={10} weight={600}>Audit reason</Txt>
   <TextInput style={field} value={reason} onChangeText={setReason} placeholder="Route intake decision and evidence"/>
   <OutlineBtn disabled={!routeCode||busy} onPress={()=>{void toggleRoute()}}>Update selected route intake</OutlineBtn>
   <View style={{marginTop:15,borderTopWidth:.5,borderColor:'#D5C8A5',paddingTop:11}}>
    <Txt size={12} weight={600}>Add future destination / region</Txt>
    <Txt size={10} mut>New routes begin paused, unpriced, unverified and without checkout. Additional countries appear in the customer dropdown once authorized quotation intake is opened.</Txt>
    <Txt size={10}>Country · ISO 2 letters</Txt>
    <TextInput style={field} autoCapitalize="characters" value={newCountry} onChangeText={setNewCountry} maxLength={2} placeholder="e.g. CA"/>
    <Txt size={10}>Destination service region code</Txt>
    <TextInput style={field} autoCapitalize="characters" value={newRegion} onChangeText={setNewRegion} maxLength={40} placeholder="e.g. TORONTO"/>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:6,marginVertical:8}}>
      {(['LCL','FCL'] as const).map(x=><Pill key={x} on={newMode===x} onPress={()=>setNewMode(x)}>{x}</Pill>)}
      {(['pickup','door'] as const).map(x=><Pill key={x} on={newDelivery===x} onPress={()=>setNewDelivery(x)}>{x==='pickup'?'Warehouse pickup':'Door delivery'}</Pill>)}
    </View>
    <OutlineBtn disabled={busy} onPress={()=>{void createRoute()}}>Create inactive quotation route</OutlineBtn>
   </View>
  </Section>
 </View>
}
