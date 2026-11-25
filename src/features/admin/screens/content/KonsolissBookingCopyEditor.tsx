import React,{useEffect,useState} from 'react';
import {TextInput,View} from 'react-native';
import {supabase} from '../../lib/supabase';
import {Section} from '../../ui/Card';
import {OutlineBtn,Pill} from '../../ui/Controls';
import {Txt} from '../../ui/Txt';
export const BOOKING_COPY:Record<string,string>={
 'bookspace.heading':'Book Space',
 'bookspace.subtitle':'China warehouse → Your destination',
 'bookspace.destination':'Destination',
 'bookspace.region':'Pickup region',
 'bookspace.unpublished':'Pricing for this destination is confirmed by quotation.',
 'bookspace.method':'How would you like to reserve your space?',
 'bookspace.packages':'Packages',
 'bookspace.custom':'Custom CBM',
 'bookspace.shopLater':'Reserve now, shop later. Submit carrier-accepted tracking by Day 25.',
 'bookspace.estimatedWeight':'Estimated shipment weight',
 'bookspace.grossWeight':'Gross shipment weight',
 'bookspace.unknownWeight':"I don't know my estimated weight yet",
 'bookspace.goods':'What are you shipping?',
 'bookspace.covers':'What your shipping service covers',
 'bookspace.inspection':'Pricing after inspection',
 'bookspace.delivery':'Delivery commitment',
 'bookspace.terms':'I accept the booking terms and delivery conditions.',
 'bookspace.consentReserve':"I understand this reserves space, not a final customs-inclusive shipment price. I'll declare goods before sending.",
 'bookspace.requestQuote':'Request shipping quote',
 'bookspace.reserve':'Review space reservation',
 'bookspace.reviewHeading':'Review shipping request',
 'bookspace.reviewNext':'What happens next',
 'bookspace.requestSent':'Request received',
 'bookspace.myQuotes':'My quotes',
 'bookspace.noPayment':'No payment was taken and no space has been reserved.',
 'bookspace.pickup':'Warehouse pickup',
 'bookspace.door':'Door delivery',
 'bookspace.noGoods':'No goods yet',
 'bookspace.customs':'Customs, duties and final-mile delivery are confirmed in your reviewed quotation.',
 'bookspace.termsDetails':'Terms cover pricing, cargo eligibility, deadlines, cancellation and refund rules.',
 'bookspace.cargoChecks':'Some products need extra documents or inspection. We check your options before you send them.',
 'bookspace.quoteOnly':'A destination-specific, carrier-backed quote is needed before payment.',
 'bookspace.myRequests':'My shipment requests',
 'bookspace.requestExplanation':'Request a refund, cargo return or alternative service only for a confirmed paid booking. Requests do not automatically move funds or cargo.',
 'bookspace.createRequest':'Create service request',
 'bookspace.noPaidBookings':'No eligible paid shipping bookings yet. Quotation requests are not reservations.',
 'bookspace.refreshRequests':'Refresh requests',
 'bookspace.requestType':'Request type',
 'bookspace.requestDetails':'Explain your request',
 'bookspace.requestNotSettlement':'Admin review does not automatically issue a refund or return shipment.',
 'bookspace.submitRequest':'Submit request',
};
const field={backgroundColor:'#FFF9DF',borderColor:'#D5C8A5',borderWidth:1,borderRadius:8,padding:10,fontSize:12,minHeight:55,color:'#2B1210'} as const;
const languages=['en','fr','ht','es','zh-Hans'];
type Row={locale:string;copy_key:string;draft_text:string|null;published_text:string|null;version:number};
export default function KonsolissBookingCopyEditor({canEdit,canPublish}:{canEdit:boolean;canPublish:boolean}){
 const [locale,setLocale]=useState('en'),[records,setRecords]=useState<Row[]>([]),[selected,setSelected]=useState('bookspace.heading');
 const [value,setValue]=useState(BOOKING_COPY['bookspace.heading']),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
 const fetchData=async()=>{
  const {data,error:e}=await supabase.from('konsoliss_booking_copy').select('locale,copy_key,draft_text,published_text,version').eq('locale',locale);
  if(e)setError('Booking copy cannot be loaded; verify content editor permissions.');else{setRecords(data||[]);setError('')}
 };
 useEffect(()=>{void fetchData()},[locale]);
 const choose=(key:string)=>{setSelected(key);const item=records.find(x=>x.copy_key===key);setValue(item?.draft_text||item?.published_text||(locale==='en'?BOOKING_COPY[key]:''));setNotice('');};
 const changeLanguage=(key:string)=>{setLocale(key);setRecords([]);setSelected('bookspace.heading');setValue('');setNotice('')};
 useEffect(()=>{const item=records.find(x=>x.copy_key===selected);setValue(item?.draft_text||item?.published_text||(locale==='en'?BOOKING_COPY[selected]:''));},[records,selected,locale]);
 const save=async(publish:boolean)=>{
  if(!canEdit||busy)return;
  if(publish&&!canPublish){setError('You cannot publish content.');return}
  if(!value.trim()){setError('Enter the final text before saving.');return}
  setBusy(true);setNotice('');setError('');
  const {error:e}=await supabase.rpc('konsoliss_admin_booking_copy',{p_locale:locale,p_key:selected,p_text:value.trim(),p_publish:publish});
  if(e)setError(e.message);else{setNotice(publish?'Published booking wording. It will appear after the consumer refreshes.':'Booking copy draft saved. It is not yet live.');await fetchData()}
  setBusy(false);
 };
 return <Section title="Konsoliss · Book Space and checkout wording">
  <Txt size={11} mut>This content is customer-facing copy only. Tariff formulas, service coverage, customer information, capacity and payment policies are never editable here. Untranslated text uses the English defaults until published.</Txt>
  <View style={{flexDirection:'row',flexWrap:'wrap',marginVertical:9,gap:5}}>
   {languages.map(l=><Pill key={l} on={locale===l} onPress={()=>changeLanguage(l)}>{l}</Pill>)}
  </View>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:5,marginBottom:10}}>
   {Object.keys(BOOKING_COPY).map(k=><OutlineBtn key={k} primary={selected===k} onPress={()=>choose(k)}>{k.slice(10)}</OutlineBtn>)}
  </View>
  <Txt size={12} weight={600}>{selected}</Txt>
  <Txt size={10} mut>English default: {BOOKING_COPY[selected]}</Txt>
  <TextInput multiline style={[field,{marginVertical:10}]} value={value} onChangeText={setValue} editable={canEdit&&!busy} placeholder={locale==='en'?'English wording':'Translate the English wording'}/>
  {records.find(r=>r.copy_key===selected)?<Txt size={10} mut>{'Version '+records.find(r=>r.copy_key===selected)?.version+' · '+(records.find(r=>r.copy_key===selected)?.published_text?'Published':'Draft only')}</Txt>:null}
  {error?<Txt size={11} color="#A90E02">{error}</Txt>:null}
  {notice?<Txt size={11} color="#14773F">{notice}</Txt>:null}
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:8}}>
   <OutlineBtn disabled={busy||!canEdit} onPress={()=>{void save(false)}}>Save draft</OutlineBtn>
   <OutlineBtn disabled={busy||!canPublish} primary onPress={()=>{void save(true)}}>Publish this wording</OutlineBtn>
   <OutlineBtn disabled={busy} onPress={()=>{void fetchData()}}>Reload</OutlineBtn>
  </View>
  <Txt size={10} mut>Commercial and legal text requires an authorized review before publication. This editor does not alter the homepage or container renderer.</Txt>
 </Section>;
}
