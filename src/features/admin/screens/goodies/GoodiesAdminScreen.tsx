import {GoodiesSettlementAdmin} from './GoodiesSettlementAdmin';
import {GoodiesSharedBillRefunds} from './GoodiesSharedBillRefunds';
import {ui as adminUi,useDb} from '../../state/db';
import {hasServerPermission,session} from '../../state/access';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert, Image, Pressable, ScrollView, Text, TextInput, View} from 'react-native';
import {supabase} from '../../lib/supabase';
import {useNav} from '../../shell/Nav';
import {useToast} from '../../ui/Toast';
import {useTheme} from '../../theme/ThemeContext';
import {GoodiesAssetLibrary} from './GoodiesAssetLibrary';
import {resolveGoodiesDeliveryProof} from '../../lib/goodiesDeliveryProof';

type Dashboard = {stats:any;merchants:any[];products:any[];orders:any[]};
const MODULES=['Overview','Merchants','Product review','Customer reviews','Orders','Delivery reports','Couriers','Support','Settlement','Fees','Delivery surcharge','Analytics','Goodies assets','Content editor'];
const money=(v:any)=>{
  const amount=typeof v==='number'?v:typeof v==='string'&&v.trim()?Number(v):NaN;
  return Number.isFinite(amount)&&amount>=0?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(amount):'Unavailable';
};
const cardStyle={backgroundColor:'#fff',borderWidth:1,borderColor:'#E1E6DE',borderRadius:14,padding:14,marginBottom:10} as const;
const btn=(bg:string)=>({paddingVertical:10,paddingHorizontal:12,borderRadius:10,backgroundColor:bg,alignItems:'center' as const});
const labelStyle={fontSize:12,color:'#687365',marginBottom:4} as const;
const valueStyle={fontSize:14,fontWeight:'700' as const,color:'#1B2619'};

async function goodiesRequest(name:string,args?:Record<string,unknown>) {
  try {return await supabase.rpc(name,args);}
  catch {return {data:null,error:{code:'',message:'The request could not be completed.'}};}
}

export function GoodiesAdminScreen() {
  useDb();
  const {go,navKey}=useNav(); const toast=useToast(); const {c}=useTheme();
  const [module,setModule]=useState('Overview');
  useEffect(()=>{const target=String(adminUi.goodiesModule||'');if(MODULES.includes(target)){setModule(target);delete adminUi.goodiesModule;}},[navKey]);
  const [dashboard,setDashboard]=useState<Dashboard>({stats:{},merchants:[],products:[],orders:[]});
  const [analytics,setAnalytics]=useState<any>(null);
  const [couriersLoaded,setCouriersLoaded]=useState(false),[reportsLoaded,setReportsLoaded]=useState(false),[analyticsLoaded,setAnalyticsLoaded]=useState(false);
  const [courierCandidates,setCourierCandidates]=useState<any[]>([]);
  const [orderPage,setOrderPage]=useState(0);
  const [courierPage,setCourierPage]=useState(0);
  const [reviewsPage,setReviewsPage]=useState(0);
  const [customerReviews,setCustomerReviews]=useState<any[]>([]);
  const [reviewsLoading,setReviewsLoading]=useState(true);
  const [reviewsError,setReviewsError]=useState(false);
  const [reviewsAttempt,setReviewsAttempt]=useState(0);
  const [reviewRejectId,setReviewRejectId]=useState<string|null>(null),[reviewRejectNote,setReviewRejectNote]=useState('');
  const reviewLock=useRef(false);const canOperate=hasServerPermission('goodies.ops','manage'),canFinance=hasServerPermission('finance.approve','manage');const canReview=canOperate;
  const [orderRows,setOrderRows]=useState<any[]>([]);
  const [supportRows,setSupportRows]=useState<any[]>([]);
  const [supportPage,setSupportPage]=useState(0);
  const [supportLoaded,setSupportLoaded]=useState(false);
  const [supportError,setSupportError]=useState('');
  const supportCanRead=hasServerPermission('operations','view');
  const supportCanEdit=hasServerPermission('operations','edit');
  const [reports,setReports]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState('');
  const [sectionErrors,setSectionErrors]=useState<Record<string,string>>({});
  const [loadError,setLoadError]=useState('');
  const [feesLoaded,setFeesLoaded]=useState(false);
  const [rejection,setRejection]=useState<{item:any;reason:string}|null>(null);
  const [fee,setFee]=useState('0');
  const [firstFree,setFirstFree]=useState(false);
  const [wallet,setWallet]=useState(true);
  const [card,setCard]=useState(true);
  const [cash,setCash]=useState(true);
  const [tips,setTips]=useState('0,1,2,3');
  const [additionalStoreSurchargeEnabled,setAdditionalStoreSurchargeEnabled]=useState(false);
  const [additionalStoreFee,setAdditionalStoreFee]=useState('0');
  const [extraDistancePerKm,setExtraDistancePerKm]=useState('0');
  const [maxStops,setMaxStops]=useState('3');
  const reads=useRef<Record<string,number>>({}),mounted=useRef(true),mutationLock=useRef(false);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const beginRead=(scope:string)=>{
    const request=(reads.current[scope]||0)+1,owner=session.userId;reads.current[scope]=request;
    return()=>mounted.current&&reads.current[scope]===request&&session.userId===owner;
  };
  const runMutation=async(key:string,work:(current:()=>boolean)=>Promise<void>)=>{
    if(!mounted.current||mutationLock.current)return;
    const owner=session.userId;mutationLock.current=true;setBusy(key);
    const current=()=>mounted.current&&session.userId===owner;
    try{await work(current);}
    finally{mutationLock.current=false;if(current())setBusy('');}
  };

  const reload=useCallback(async()=>{
    const current=beginRead('dashboard');
    setLoading(true);setFeesLoaded(false);setLoadError('');
    try {
      const [{data,error},cms]=await Promise.all([
        goodiesRequest('goodies_admin_dashboard'),
        supabase.from('wantiss_cms_content').select('payload').eq('content_key','goodies.content').eq('locale','en').eq('status','published').order('version',{ascending:false}).limit(1).maybeSingle()
      ]);
      if(!current())return;
      if(error)throw error;
      if(cms.error)throw cms.error;
      if(!cms.data?.payload?.fees)throw new Error('Fee configuration unavailable');
      const d=(data||{}) as Dashboard;
      if(!d.stats||['stores','live_stores','products','pending_products','orders','open_orders'].some(key=>!Number.isSafeInteger(d.stats[key])||d.stats[key]<0)||money(d.stats.gross_total)==='Unavailable'||!Array.isArray(d.merchants)||!Array.isArray(d.products)||!Array.isArray(d.orders))throw new Error('Administration unavailable');
      setDashboard({stats:d.stats||{},merchants:d.merchants||[],products:d.products||[],orders:d.orders||[]});
      const f=cms.data.payload.fees;
      if(typeof f!=='object'||Array.isArray(f)||typeof f.svc!=='number'||!Number.isFinite(f.svc)||f.svc<0||f.svc>1000||typeof f.tips!=='string'||!f.pay||['Wallet','Card','Cash'].some(k=>![true,false,0,1].includes(f.pay[k])))throw new Error('Invalid fee policy');
      setFee(String(f.svc??0));setFirstFree(!!f.first);
      setWallet(!!(f.pay?.Wallet??true));setCard(!!(f.pay?.Card??true));setCash(!!(f.pay?.Cash??true));
      setTips(String(f.tips??'0,1,2,3'));
      setAdditionalStoreSurchargeEnabled(!!f.additionalStoreSurchargeEnabled);
      setAdditionalStoreFee(String(f.additionalStoreFee??0));
      setExtraDistancePerKm(String(f.extraDistancePerKm??0));
      setMaxStops(String(f.maxStops??3));setFeesLoaded(true);
    } catch {if(current()){setLoadError('Could not load Goodies administration. Please refresh to try again.');toast('Could not load Goodies administration.');}}
    finally{if(current())setLoading(false);}
  },[toast]);
  useEffect(()=>{void reload();},[reload]);
  const loadCouriers=async()=>{
    const current=beginRead('couriers');setCourierCandidates([]);
    setCouriersLoaded(false);setBusy('couriers');setSectionErrors(e=>({...e,Couriers:''}));
    const {data,error}=await goodiesRequest('goodies_admin_courier_candidates_page',{p_offset:courierPage*100,p_limit:100});
    if(!current())return;
    if(error||!Array.isArray(data)){setSectionErrors(e=>({...e,Couriers:'Could not load couriers. Please try again.'}));}else setCourierCandidates(data||[]);
    setCouriersLoaded(true);setBusy(value=>value==='couriers'?'':value);
  };
  useEffect(()=>{if(module==='Couriers')void loadCouriers();},[module,courierPage]);
  const loadOrderPage=async()=>{
    const current=beginRead('orders');setOrderRows([]);
    setBusy('orders');setSectionErrors(e=>({...e,Orders:''}));
    try {const {data,error}=await goodiesRequest('goodies_admin_orders_page',{p_offset:orderPage*100,p_limit:100});if(!current())return;if(error||!Array.isArray(data))throw Error('Unavailable');setOrderRows(data);}
    catch {if(current())setSectionErrors(e=>({...e,Orders:'Could not load orders. Please try again.'}));}
    finally {if(current())setBusy(value=>value==='orders'?'':value);}
  };
  useEffect(()=>{if(module==='Orders')void loadOrderPage();},[module,orderPage]);
  const loadSupportTickets=async()=>{
    const current=beginRead('support');setSupportRows([]);setSupportLoaded(false);setSupportError('');
    if(!supportCanRead){
      setSupportRows([]);setSupportError('Operations view permission is required to read customer support tickets.');
      setSupportLoaded(true);return;
    }
    try{
      const {data,error}=await supabase.from('settings_support_requests')
        .select('id,ticket_code,email,subject,message,status,created_at')
        .ilike('subject','Goodies · %')
        .order('created_at',{ascending:false})
        .range(supportPage*50,supportPage*50+49);
      if(!current())return;
      if(error||!Array.isArray(data))throw Error('Support tickets unavailable');
      setSupportRows(data);
    }catch{if(current()){setSupportRows([]);setSupportError('Could not load Goodies support tickets. Please retry.');}}
    finally{if(current())setSupportLoaded(true);}
  };
  useEffect(()=>{if(module==='Support')void loadSupportTickets();},[module,supportPage,supportCanRead,session.userId]);
  const updateSupportTicket=async(ticketId:string,status:'in_progress'|'resolved'|'open')=>{
    if(!supportCanEdit){toast('Operations edit permission is required.');return;}
    await runMutation(ticketId,async current=>{try{
      const {data,error}=await supabase.from('settings_support_requests')
        .update({status}).eq('id',ticketId).ilike('subject','Goodies · %')
        .select('id').single();
      if(!current())return;
      if(error||data?.id!==ticketId)throw Error('Ticket update unconfirmed');
      toast(status==='in_progress'?'Ticket marked in progress':status==='resolved'?'Ticket marked resolved':'Ticket reopened');
      await loadSupportTickets();
    }catch{if(current())toast('Could not confirm ticket status. Refresh before trying again.');}});
  };
  const loadReports=async()=>{
    const current=beginRead('reports');setReports([]);
    setReportsLoaded(false);setBusy('reports');setSectionErrors(e=>({...e,'Delivery reports':''}));
    const {data,error}=await goodiesRequest('goodies_admin_list_delivery_reports');
    if(!current())return [];
    if(error||!Array.isArray(data)){setSectionErrors(e=>({...e,'Delivery reports':'Could not load delivery reports. Please try again.'}));toast('Could not load delivery reports.');setReportsLoaded(true);setBusy(value=>value==='reports'?'':value);return [];}
    const rows=await Promise.all((data||[]).map(async (row:any)=>{
      try {return {...row,proof_url:await resolveGoodiesDeliveryProof(row.proof_url||''),proof_unavailable:false};}
      catch {return {...row,proof_url:'',proof_unavailable:true};}
    }));
    if(!current())return [];
    setReports(rows);setReportsLoaded(true);
    setBusy(value=>value==='reports'?'':value);
    return rows;
  };
  useEffect(()=>{if(module==='Delivery reports')void loadReports();},[module]);
  const reviewCustomerRating=async(row:any,status:'approved'|'rejected',note:string|null=null)=>{
    if(!canReview||reviewLock.current)return;
    if(status==='rejected'&&!note?.trim()){toast('Enter a review rejection reason.');return;}
    reviewLock.current=true;setBusy(row.id);
    try{const {error}=await goodiesRequest('goodies_admin_review_order_review',{p_review_id:row.id,p_status:status,p_note:status==='rejected'?note?.trim()||null:null});if(error)throw error;
      setReviewRejectId(null);setReviewRejectNote('');toast(status==='approved'?'Customer review published':'Customer review rejected');setReviewsAttempt(n=>n+1);
    }catch{toast('Could not confirm this review decision. Refresh its status and retry.');}
    finally{reviewLock.current=false;setBusy('');}
  };
  const resolveReport=(item:any,resolution:'release'|'refund')=>{
    if(!canOperate||!canFinance)return;
    if(money(item.total)==='Unavailable'){toast('Reload this delivery report before recording a decision.');return;}
    const owner=session.userId;
    Alert.alert(resolution==='refund'?'Refund the customer':'Confirm delivery',
      resolution==='refund'?'Cancel '+item.order_code+' and refund '+money(item.total)+' to the customer?':'Mark '+item.order_code+' as delivered and release it to the store?',[
      {text:'Back',style:'cancel'},
      {text:resolution==='refund'?'Refund':'Confirm',style:resolution==='refund'?'destructive':'default',onPress:()=>{if(session.userId!==owner)return;void runMutation(item.order_id,async current=>{
        const {error}=await goodiesRequest('goodies_admin_resolve_delivery_dispute',{p_order_id:item.order_id,p_resolution:resolution});
        if(!current())return;
        if(error){toast('Could not save this decision. Please try again.');}
        else{
          const updated=await loadReports();
          if(!current())return;
          if(resolution==='release')toast('Order marked as delivered.');
          else{
            const latest=updated.find((r:any)=>r.order_id===item.order_id);
            if(item.payment_method==='wallet')toast(latest?.payment_status==='refunded'?'Wallet refund completed.':'Refund decision saved. Check payment status.');
            else if(item.payment_method==='card'){
              if(latest?.payment_status==='refund_pending')toast('Card refund queued for processing.');
              else if(latest?.payment_status==='refund_manual_review')toast('Card refund needs manual review.');
              else if(latest?.payment_status==='refunded')toast('Card refund completed.');
              else toast('Refund decision saved. Check payment status.');
            }else toast('Refund decision saved.');
          }
        }
      });}}
    ]);
  };
  const setCourierAccess=async(item:any,enabled:boolean)=>{
    if(!canOperate)return;
    await runMutation(item.courier_id,async current=>{
      const {error}=await goodiesRequest(enabled?'goodies_admin_add_courier':'goodies_admin_remove_courier',{p_courier_id:item.courier_id});
      if(!current())return;
      if(error)toast(error.code==='P4213'?'Resolve the courier delivery before removing access.':'Could not complete this request. Please try again.');else{toast(enabled?'Courier access approved':'Courier access removed');await loadCouriers();}
    });
  };
  const loadAnalytics=async()=>{
    const current=beginRead('analytics');setAnalytics(null);
    setAnalyticsLoaded(false);setBusy('analytics');setSectionErrors(e=>({...e,Analytics:''}));
    const {data,error}=await goodiesRequest('goodies_admin_analytics');
    if(!current())return;
    if(error||!data||typeof data!=='object'){setSectionErrors(e=>({...e,Analytics:'Could not load analytics. Please try again.'}));}else setAnalytics(data);
    setAnalyticsLoaded(true);setBusy(value=>value==='analytics'?'':value);
  };
  useEffect(()=>{if(module==='Analytics')void loadAnalytics();},[module]);
  const loadCustomerReviews=async()=>{
    const current=beginRead('reviews');setCustomerReviews([]);setReviewsLoading(true);setReviewsError(false);
    const {data,error}=await goodiesRequest('goodies_admin_list_reviews',{p_offset:reviewsPage*50,p_limit:50});
    if(!current())return;
    if(error||!Array.isArray(data))setReviewsError(true);else setCustomerReviews(data);
    setReviewsLoading(false);
  };
  useEffect(()=>{if(module==='Customer reviews')void loadCustomerReviews();},[module,reviewsPage,reviewsAttempt]);
  const setMerchant=async(item:any)=>{
    if(!canOperate)return;
    await runMutation(item.business_id,async current=>{
      const {error}=await goodiesRequest('goodies_admin_set_merchant_status',{p_business_id:item.business_id,p_live:!item.is_live});
      if(!current())return;
      if(error)toast('Could not complete this request. Please try again.');else{toast(item.is_live?'Store taken offline':'Store is live');await reload();}
    });
  };
  const cancelOrder=(item:any)=>{
    if(!canOperate)return;
    const owner=session.userId;
    Alert.alert('Cancel Goodies order', 'Cancel '+item.order_code+'? Stock will be restored and eligible payments will be refunded.',[
      {text:'Keep order',style:'cancel'},
      {text:'Cancel order',style:'destructive',onPress:()=>{if(session.userId!==owner)return;void runMutation(item.id,async current=>{
        const {error}=await goodiesRequest('goodies_admin_cancel_order',{p_order_id:item.id,p_reason:'The order was cancelled by Wantiss support.'});
        if(!current())return;
        if(error)toast('Could not complete this request. Please try again.');else{toast('Order cancelled; refund processing was triggered where applicable.');await reload();await loadOrderPage();}
      });}}
    ]);
  };
  const reviewProduct=async(item:any,status:'approved'|'rejected',reason='')=>{
    if(!canOperate)return;
    if(status==='rejected'&&!reason.trim()){toast('Enter a rejection reason.');return;}
    if(busy)return;
    await runMutation(item.id,async current=>{
      const {error}=await goodiesRequest('goodies_admin_review_product',{p_product_id:item.id,p_status:status,p_note:status==='rejected'?reason.trim():null});
      if(!current())return;
      if(error)toast('Could not complete this request. Please try again.');else{setRejection(null);toast(status==='approved'?'Product approved':'Product rejected');await reload();}
    });
  };
  const saveFees=async()=>{
    if(!canOperate||!canFinance)return;
    if(!feesLoaded||loading||busy){toast('Wait for fee settings to load before saving.');return;}
    const amount=Number(fee);
    const tipParts=tips.split(',').map(x=>x.trim());
    const tipValues=tipParts.map(Number);
    if(!fee.trim()||!Number.isFinite(amount)||amount<0||amount>1000){toast('Enter a valid service fee.');return;}
    if(tipParts.some(x=>!x)||!tipValues.length||tipValues.some(x=>!Number.isFinite(x)||x<0||x>1000)){toast('Enter valid comma-separated tip amounts.');return;}
    await runMutation('fees',async current=>{
      const {error}=await goodiesRequest('goodies_admin_update_fee_policy',{p_service_fee:amount,p_first_order_free:firstFree,p_wallet_enabled:wallet,p_card_enabled:card,p_cash_enabled:cash,p_tips:tipValues});
      if(!current())return;
      if(error)toast('Could not complete this request. Please try again.');else toast('Goodies payment and fee policy updated.');
    });
  };
  const saveDeliverySurcharge=async()=>{
    if(!canOperate||!canFinance)return;
    if(!feesLoaded||loading||busy){toast('Wait for delivery settings to load before saving.');return;}
    const flat=Number(additionalStoreFee), perKm=Number(extraDistancePerKm), stops=Number(maxStops);
    if(!Number.isInteger(stops)||stops<1||stops>8){toast('Enter a number of stores from 1 to 8.');return;}
    if(!additionalStoreFee.trim()||!extraDistancePerKm.trim()||!Number.isFinite(flat)||flat<0||flat>1000||!Number.isFinite(perKm)||perKm<0||perKm>1000){
      toast('Enter valid non-negative delivery surcharge amounts (maximum 1000).');return;
    }
    await runMutation('delivery-surcharge',async current=>{
      const {error}=await goodiesRequest('goodies_admin_update_multi_store_policy',{
      p_enabled:additionalStoreSurchargeEnabled,
      p_additional_store_fee:flat,
      p_extra_distance_per_km:perKm,
      p_max_stops:stops
      });
      if(!current())return;
      if(error)toast('Could not save the delivery settings. Please try again.');else toast('Delivery settings saved and published.');
      if(!error)await reload();
    });
  };
  const switchRow=(title:string,sub:string,on:boolean,set:(v:boolean)=>void)=><Pressable disabled={!canOperate||!canFinance||!feesLoaded||loading||!!busy} onPress={()=>{if(canOperate&&canFinance)set(!on);}} style={{...cardStyle,flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8}}><View style={{flex:1,paddingRight:10}}><Text style={valueStyle}>{title}</Text><Text style={{fontSize:11,color:'#697466',marginTop:3}}>{sub}</Text></View><Text style={{fontWeight:'800',color:on?'#286A35':'#8B554B'}}>{on?'ON':'OFF'}</Text></Pressable>;

  return <ScrollView style={{flex:1,backgroundColor:c?.inset||'#F6F7F4'}} contentContainerStyle={{padding:16,paddingBottom:36}}>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
      <View><Text style={{fontSize:20,fontWeight:'800',color:'#172316'}}>Goodies Admin</Text><Text style={{fontSize:11,color:'#697466'}}>Live merchant, catalogue, order and payment controls</Text></View>
      <Pressable onPress={()=>void reload()} style={btn('#E9EEE6')}><Text style={{fontSize:12,fontWeight:'700',color:'#344531'}}>Refresh</Text></Pressable>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:14}}>
      <View style={{flexDirection:'row',gap:7}}>{MODULES.map(x=><Pressable key={x} onPress={()=>setModule(x)} style={{paddingHorizontal:12,paddingVertical:9,borderRadius:20,backgroundColor:module===x?'#294E2C':'#E8ECE5'}}><Text style={{fontSize:12,fontWeight:'700',color:module===x?'#fff':'#344531'}}>{x}</Text></Pressable>)}</View>
    </ScrollView>
    {sectionErrors[module]?<View style={cardStyle}><Text style={{color:'#8D3932'}}>{sectionErrors[module]}</Text><Pressable onPress={()=>void (module==='Analytics'?loadAnalytics():module==='Couriers'?loadCouriers():module==='Orders'?loadOrderPage():loadReports())} style={btn('#E9EEE6')}><Text>Try again</Text></Pressable></View>:null}
    {loadError?<View style={cardStyle}><Text style={{color:'#8D3932'}}>{loadError}</Text></View>:null}
    {rejection?<View style={cardStyle}><Text style={valueStyle}>Reject {rejection.item.name}</Text><TextInput accessibilityLabel="Rejection reason" placeholder="Explain what the vendor needs to change" value={rejection.reason} maxLength={500} multiline onChangeText={reason=>setRejection({...rejection,reason})} style={{borderWidth:1,borderColor:'#E1E6DE',padding:12,marginVertical:10,borderRadius:10}} /><View style={{flexDirection:'row',gap:8}}><Pressable disabled={!canOperate||!!busy} onPress={()=>setRejection(null)} style={btn('#E9EEE6')}><Text>Back</Text></Pressable><Pressable disabled={!canOperate||!!busy||!rejection.reason.trim()} onPress={()=>void reviewProduct(rejection.item,'rejected',rejection.reason)} style={btn('#F7EAE8')}><Text>{busy?'Saving…':'Confirm rejection'}</Text></Pressable></View></View>:null}
    {loading?<Text style={{padding:20,color:'#697466'}}>Loading live Goodies data…</Text>:null}
    {module==='Settlement'?<GoodiesSettlementAdmin/>:null}
    {module==='Orders'||module==='Settlement'?<GoodiesSharedBillRefunds/>:null}
    {module==='Overview'&&!loading&&!loadError?<>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
        {Object.entries({Stores:dashboard.stats.stores??0,'Live stores':dashboard.stats.live_stores??0,Products:dashboard.stats.products??0,'Awaiting review':dashboard.stats.pending_products??0,Orders:dashboard.stats.orders??0,'Open orders':dashboard.stats.open_orders??0}).map(([k,v])=><View key={k} style={{...cardStyle,width:'48%',marginBottom:0}}><Text style={labelStyle}>{k}</Text><Text style={{fontSize:24,fontWeight:'800',color:'#1B2619'}}>{String(v)}</Text></View>)}
      </View>
      <View style={{...cardStyle,marginTop:10}}><Text style={valueStyle}>Gross order value</Text><Text style={{fontSize:23,fontWeight:'800',marginTop:5,color:'#1B2619'}}>{money(dashboard.stats.gross_total)}</Text><Text style={{fontSize:11,color:'#697466',marginTop:4}}>Includes paid and pay-on-receipt orders.</Text></View>
      <Pressable onPress={()=>go('editor',{editorFeature:'Goodies'})} style={btn('#294E2C')}><Text style={{color:'#fff',fontWeight:'800'}}>Open Goodies Content Editor</Text></Pressable>
    </>:null}
    {module==='Merchants'&&!loading&&!loadError?<>
      <Text style={{fontSize:12,color:'#687365',marginBottom:10}}>Live records from Goodies store schedules.</Text>
      {!dashboard.merchants.length?<Text style={labelStyle}>No Goodies merchants registered yet.</Text>:dashboard.merchants.map(m=><View key={m.business_id} style={cardStyle}>
        <Text style={valueStyle}>{m.name||'Unnamed store'}</Text><Text style={labelStyle}>{m.category||'Uncategorised'} · {m.city||'City not set'} · {m.is_live?'Live':'Not live'}</Text>
        <Text style={{fontSize:12,color:'#596554',marginBottom:8}}>Delivery: {m.delivery_pricing_mode==='distance'?'Distance-based':'Fixed'} · {money(m.delivery_fee)} · COD {m.accept_cash_on_delivery?'enabled':'disabled'}</Text>
        {m.is_live?<Pressable disabled={!canOperate||busy===m.business_id} onPress={()=>void setMerchant(m)} style={btn('#F7EAE8')}><Text style={{fontWeight:'800',color:'#8D3932'}}>{busy===m.business_id?'Saving…':'Take store offline'}</Text></Pressable>:<Text style={labelStyle}>The vendor can publish this store from Business Space.</Text>}
      </View>)}
    </>:null}
    {module==='Product review'&&!loading&&!loadError?<>
      <Text style={{fontSize:12,color:'#687365',marginBottom:10}}>New vendor products remain hidden from customers until approved.</Text>
      {!dashboard.products.length?<Text style={labelStyle}>No products submitted yet.</Text>:dashboard.products.map(p=><View key={p.id} style={cardStyle}>
        <View style={{flexDirection:'row',justifyContent:'space-between'}}><Text style={valueStyle}>{p.name}</Text><Text style={{fontSize:11,fontWeight:'800',color:p.review_status==='pending'?'#9B5A27':p.review_status==='approved'?'#286A35':'#9B4036'}}>{p.review_status}</Text></View>
        <Text style={labelStyle}>{p.store_name||'Store'} · {money(p.price)} · Stock {p.stock}</Text>
        {p.description?<Text style={{fontSize:12,color:'#5F6B5A',marginBottom:8}}>{p.description}</Text>:null}
        {p.review_status==='pending'?<View style={{flexDirection:'row',gap:8}}><Pressable disabled={!canOperate||!!busy} onPress={()=>void reviewProduct(p,'approved')} style={{...btn('#E8F2E5'),flex:1}}><Text style={{fontWeight:'800',color:'#28552B'}}>Approve</Text></Pressable><Pressable disabled={!canOperate||!!busy} onPress={()=>setRejection({item:p,reason:''})} style={{...btn('#F7EAE8'),flex:1}}><Text style={{fontWeight:'800',color:'#8D3932'}}>Reject</Text></Pressable></View>:null}
      </View>)}
    </>:null}
    {module==='Customer reviews'?<>
      {reviewsLoading?<Text style={labelStyle}>Loading reviews…</Text>:reviewsError?<View style={cardStyle}><Text>Could not load reviews.</Text><Pressable onPress={()=>setReviewsAttempt(n=>n+1)} style={btn('#E9EEE6')}><Text>Try again</Text></Pressable></View>:customerReviews.length?customerReviews.map(r=><View key={r.id} style={cardStyle}><Text style={valueStyle}>{r.rating} / 5 · {r.review_target==='courier'?'Delivery':'Store'} · {r.review_status}</Text><Text style={labelStyle}>{r.order_id} · {dateText(r.created_at)}</Text><Text>{r.comment||'No comment'}</Text>{r.review_note?<Text style={labelStyle}>Review reason: {r.review_note}</Text>:null}
      {r.review_status==='pending'&&canReview?<View style={{flexDirection:'row',gap:8,marginTop:10}}><Pressable disabled={!!busy} onPress={()=>void reviewCustomerRating(r,'approved')} style={btn('#E8F2E5')}><Text>Publish</Text></Pressable><Pressable disabled={!!busy} onPress={()=>{setReviewRejectId(r.id);setReviewRejectNote('');}} style={btn('#F7EAE8')}><Text>Reject</Text></Pressable></View>:null}
      {r.review_status==='pending'&&reviewRejectId===r.id&&canReview?<View><TextInput accessibilityLabel="Review rejection reason" value={reviewRejectNote} onChangeText={setReviewRejectNote} maxLength={500} multiline placeholder="Why cannot this review be published?" style={{borderWidth:1,borderColor:'#D5DAD2',padding:10,borderRadius:10,marginTop:10}}/><View style={{flexDirection:'row',gap:8,marginTop:8}}><Pressable disabled={!!busy||!reviewRejectNote.trim()} onPress={()=>void reviewCustomerRating(r,'rejected',reviewRejectNote)} style={btn('#F7EAE8')}><Text>Confirm rejection</Text></Pressable><Pressable disabled={!!busy} onPress={()=>setReviewRejectId(null)} style={btn('#EDF0EA')}><Text>Cancel</Text></Pressable></View></View>:null}</View>):<Text style={labelStyle}>No reviews yet.</Text>}
      <View style={{flexDirection:'row',gap:8}}><Pressable disabled={reviewsPage===0||reviewsLoading} onPress={()=>setReviewsPage(n=>n-1)} style={btn('#E9EEE6')}><Text>Previous page</Text></Pressable><Pressable disabled={customerReviews.length<50||reviewsLoading} onPress={()=>setReviewsPage(n=>n+1)} style={btn('#E9EEE6')}><Text>Next page</Text></Pressable></View>
    </>:null}
    {module==='Support'?<>
      <Text style={{fontSize:12,color:'#687365',marginBottom:10}}>Goodies customer tickets recorded in the shared Wantiss support inbox. Changing status does not send a message to the customer.</Text>
      {!supportLoaded?<Text style={labelStyle}>Loading support tickets…</Text>:supportError?<View style={cardStyle}><Text style={{fontSize:13,color:'#8D3932',marginBottom:8}}>{supportError}</Text><Pressable onPress={()=>void loadSupportTickets()} style={btn('#E9EEE6')}><Text>Retry</Text></Pressable></View>:supportRows.length===0?<Text style={labelStyle}>No Goodies support tickets on this page.</Text>:supportRows.map(ticket=><View key={ticket.id} style={cardStyle}>
        <View style={{flexDirection:'row',justifyContent:'space-between',gap:8}}><Text style={valueStyle}>{ticket.ticket_code||'Support ticket'}</Text><Text style={{fontSize:12,color:'#596554'}}>{ticket.status}</Text></View>
        <Text style={labelStyle}>{ticket.subject} · {dateText(ticket.created_at)}</Text>
        <Text style={{fontSize:12,color:'#596554',marginBottom:8}}>{ticket.email||'Email unavailable'}</Text>
        <Text style={{fontSize:13,color:'#1B2619'}}>{ticket.message}</Text>
        {supportCanEdit?<View style={{flexDirection:'row',gap:8,marginTop:10}}>
          {ticket.status!=='in_progress'?<Pressable disabled={!!busy} onPress={()=>void updateSupportTicket(ticket.id,'in_progress')} style={{...btn('#E9EEE6'),flex:1}}><Text style={{fontWeight:'700',color:'#344531'}}>In progress</Text></Pressable>:null}
          {ticket.status!=='resolved'?<Pressable disabled={!!busy} onPress={()=>void updateSupportTicket(ticket.id,'resolved')} style={{...btn('#E8F2E5'),flex:1}}><Text style={{fontWeight:'700',color:'#28552B'}}>Resolve</Text></Pressable>:<Pressable disabled={!!busy} onPress={()=>void updateSupportTicket(ticket.id,'open')} style={{...btn('#E9EEE6'),flex:1}}><Text style={{fontWeight:'700',color:'#344531'}}>Reopen</Text></Pressable>}
        </View>:null}
      </View>)}
      <View style={{flexDirection:'row',gap:8,marginTop:8}}>
        <Pressable disabled={supportPage===0||!supportLoaded||!!busy} onPress={()=>setSupportPage(n=>Math.max(0,n-1))} style={btn('#E9EEE6')}><Text>Previous page</Text></Pressable>
        <Pressable disabled={!supportLoaded||supportRows.length<50||!!busy} onPress={()=>setSupportPage(n=>n+1)} style={btn('#E9EEE6')}><Text>Next page</Text></Pressable>
      </View>
    </>:null}
    {module==='Orders'?<>
      {busy==='orders'?<Text style={labelStyle}>Loading orders…</Text>:null}
      {busy!=='orders'&&!sectionErrors.Orders&&!orderRows.length?<Text style={labelStyle}>No Goodies orders recorded yet.</Text>:orderRows.map(o=><View key={o.id} style={cardStyle}>
        <View style={{flexDirection:'row',justifyContent:'space-between'}}><Text style={valueStyle}>{o.order_code}</Text><Text style={{fontSize:11,fontWeight:'800',color:'#48653F'}}>{o.status}</Text></View>
        <Text style={labelStyle}>{o.store_name||o.store_id} · {dateText(o.created_at)}</Text>
        <Text style={{fontSize:12,color:'#596554'}}>{o.payment_method} · {o.payment_status} · {money(o.total)}</Text>
        {o.scheduled_for?<Text style={{fontSize:12,color:'#596554'}}>Scheduled: {dateText(o.scheduled_for)}</Text>:null}
        {o.courier_id?<Text style={{fontSize:12,color:'#596554'}}>Courier assigned</Text>:null}
        {!['completed','cancelled','declined','expired'].includes(o.status)?<Pressable disabled={!canOperate||busy===o.id} onPress={()=>cancelOrder(o)} style={{...btn('#F7EAE8'),marginTop:8}}><Text style={{fontWeight:'800',color:'#8D3932'}}>Cancel order</Text></Pressable>:null}
      </View>)}
    </>:null}
    {module==='Orders'?<View style={{flexDirection:'row',gap:8,marginBottom:12}}><Pressable disabled={orderPage===0||!!busy} onPress={()=>setOrderPage(p=>p-1)} style={btn('#E9EEE6')}><Text>Previous page</Text></Pressable><Pressable disabled={orderRows.length<100||!!busy} onPress={()=>setOrderPage(p=>p+1)} style={btn('#E9EEE6')}><Text>Next page</Text></Pressable></View>:null}
    {module==='Couriers'?<View style={{flexDirection:'row',gap:8,marginBottom:12}}><Pressable disabled={courierPage===0||!!busy} onPress={()=>setCourierPage(p=>p-1)} style={btn('#E9EEE6')}><Text>Previous page</Text></Pressable><Pressable disabled={courierCandidates.length<100||!!busy} onPress={()=>setCourierPage(p=>p+1)} style={btn('#E9EEE6')}><Text>Next page</Text></Pressable></View>:null}
    {module==='Delivery reports'?<>
      <Text style={{fontSize:12,color:'#687365',marginBottom:10}}>Problems reported by customers on orders the store delivered with its own driver. Open reports pause the order until you decide.</Text>
      {(busy==='reports'||!reportsLoaded)&&!reports.length?<Text style={labelStyle}>Loading…</Text>:null}
      {reportsLoaded&&busy!=='reports'&&!sectionErrors['Delivery reports']&&!reports.length?<Text style={labelStyle}>No delivery reports.</Text>:null}
      {reports.map(r=><View key={r.order_id} style={cardStyle}>
        <View style={{flexDirection:'row',justifyContent:'space-between'}}><Text style={valueStyle}>{r.order_code}</Text><Text style={{fontSize:11,fontWeight:'800',color:r.report_status==='open'?'#9B5A27':r.report_status==='resolved_refund'?'#9B4036':'#286A35'}}>{r.report_status==='open'?'Open':r.report_status==='resolved_release'?'Delivery confirmed':r.payment_status==='refunded'?'Refunded':r.payment_status==='refund_pending'?'Refund pending':r.payment_status==='refund_manual_review'?'Refund review':'Decision recorded'}</Text></View>
        <Text style={labelStyle}>{r.store_name} · {money(r.total)} · {r.payment_method} · {r.payment_status}</Text>
        <Text style={{fontSize:12,color:'#596554'}}>Customer: {r.customer_name}{r.customer_phone?' · '+r.customer_phone:''}</Text>
        <Text style={{fontSize:12,color:'#596554'}}>Driver: {r.driver_name||'—'}{r.driver_phone?' · '+r.driver_phone:''}</Text>
        <Text style={{fontSize:12,color:'#596554',marginBottom:6}}>Delivered {dateText(r.delivered_at)} · Reported {dateText(r.opened_at)}</Text>
        <Text style={{fontSize:13,color:'#1B2619',marginBottom:8}}>“{r.reason}”</Text>
        {r.proof_url?<Image source={{uri:r.proof_url}} style={{width:'100%',height:200,borderRadius:10,backgroundColor:'#EEF1EB',marginBottom:8}} resizeMode="cover"/>:<Text style={labelStyle}>{r.proof_unavailable?'Delivery photo unavailable. Reload the reports to retry.':'No delivery photo.'}</Text>}
        {r.report_status==='open'?<View style={{flexDirection:'row',gap:8}}>
          <Pressable disabled={!canOperate||!canFinance||!!busy} onPress={()=>resolveReport(r,'release')} style={{...btn('#E8F2E5'),flex:1}}><Text style={{fontWeight:'800',color:'#28552B'}}>Delivery confirmed</Text></Pressable>
          <Pressable disabled={!canOperate||!canFinance||!!busy} onPress={()=>resolveReport(r,'refund')} style={{...btn('#F7EAE8'),flex:1}}><Text style={{fontWeight:'800',color:'#8D3932'}}>Refund customer</Text></Pressable>
        </View>:null}
      </View>)}
    </>:null}
    {module==='Couriers'?<>
      <Text style={{fontSize:12,color:'#687365',marginBottom:10}}>Approve existing Wantiss accounts for Goodies courier work. Only approved couriers can go online, receive assignments, share GPS or accept COD.</Text>
      {busy==='couriers'||!couriersLoaded?<Text style={labelStyle}>Loading couriers…</Text>:!sectionErrors.Couriers&&!courierCandidates.length?<Text style={labelStyle}>No accounts found.</Text>:courierCandidates.map(person=><View key={person.courier_id} style={cardStyle}>
        <Text style={valueStyle}>{person.full_name||'Wantiss account'}</Text><Text style={labelStyle}>{person.phone_number||'No phone number'} · {person.courier_id}</Text>
        <Pressable disabled={!canOperate||!!busy} onPress={()=>void setCourierAccess(person,!person.already_added)} style={btn(person.already_added?'#F7EAE8':'#E8F2E5')}><Text style={{fontWeight:'800',color:person.already_added?'#8D3932':'#28552B'}}>{busy===person.courier_id?'Saving…':person.already_added?'Remove courier access':'Approve as Goodies courier'}</Text></Pressable>
      </View>)}
    </>:null}
    {module==='Delivery surcharge'?<>
      <View style={cardStyle}>
        <Text style={valueStyle}>Additional-store delivery fee (USD)</Text>
        <Text style={{fontSize:11,color:'#697466',marginTop:4}}>One flat fee for each additional store in a multi-store order. This amount is included in the final delivery price.</Text>
        <TextInput editable={canOperate&&canFinance&&feesLoaded&&!loading&&!busy} value={additionalStoreFee} onChangeText={setAdditionalStoreFee} keyboardType="decimal-pad" style={{borderWidth:1,borderColor:'#DCE4D7',borderRadius:10,padding:11,marginTop:8,color:'#1B2619'}}/>
        <Text style={{...valueStyle,marginTop:14}}>Extra-distance rate per kilometre (USD)</Text>
        <TextInput editable={canOperate&&canFinance&&feesLoaded&&!loading&&!busy} value={extraDistancePerKm} onChangeText={setExtraDistancePerKm} keyboardType="decimal-pad" style={{borderWidth:1,borderColor:'#DCE4D7',borderRadius:10,padding:11,marginTop:8,color:'#1B2619'}}/>
        <Text style={{...valueStyle,marginTop:14}}>Maximum stores in one order</Text>
        <Text style={{fontSize:11,color:'#697466',marginTop:4}}>How many different stores a customer can combine in one order (1 to 8).</Text>
        <TextInput editable={canOperate&&canFinance&&feesLoaded&&!loading&&!busy} value={maxStops} onChangeText={setMaxStops} keyboardType="number-pad" style={{borderWidth:1,borderColor:'#DCE4D7',borderRadius:10,padding:11,marginTop:8,color:'#1B2619'}}/>
      </View>
      {switchRow('Enable additional-store surcharge','Apply the configured additional-store fee and extra-distance rate to eligible multi-store quotes.',additionalStoreSurchargeEnabled,setAdditionalStoreSurchargeEnabled)}
      <Pressable disabled={!canOperate||!canFinance||!feesLoaded||loading||!!busy} onPress={()=>void saveDeliverySurcharge()} style={btn('#294E2C')}><Text style={{color:'#fff',fontWeight:'800'}}>{busy==='delivery-surcharge'?'Saving…':'Save and publish delivery surcharge'}</Text></Pressable>
      <Text style={{fontSize:11,color:'#697466',marginTop:8}}>Saving publishes these delivery settings for new quotes.</Text>
    </>:null}
    {module==='Fees'?<>
      <View style={cardStyle}>
        <Text style={valueStyle}>Service fee (USD)</Text><TextInput editable={canOperate&&canFinance&&feesLoaded&&!loading&&!busy} value={fee} onChangeText={setFee} keyboardType="decimal-pad" style={{borderWidth:1,borderColor:'#DCE4D7',borderRadius:10,padding:11,marginTop:8,color:'#1B2619'}}/>
        <Text style={{...labelStyle,marginTop:12}}>Courier tip presets (comma-separated USD amounts)</Text><TextInput editable={canOperate&&canFinance&&feesLoaded&&!loading&&!busy} value={tips} onChangeText={setTips} style={{borderWidth:1,borderColor:'#DCE4D7',borderRadius:10,padding:11,color:'#1B2619'}}/>
      </View>
      {switchRow('First order free delivery','Waive the delivery fee on the customer’s first Goodies order.',firstFree,setFirstFree)}
      {switchRow('Wantiss Wallet','Default Goodies payment method.',wallet,setWallet)}
      {switchRow('Credit / debit card','Enable saved-card checkout.',card,setCard)}
      {switchRow('Cash on delivery','Global switch only. Checkout also requires merchant and courier consent.',cash,setCash)}
      <Pressable disabled={!canOperate||!canFinance||!feesLoaded||loading||!!busy} onPress={()=>void saveFees()} style={btn('#294E2C')}><Text style={{color:'#fff',fontWeight:'800'}}>{busy==='fees'?'Saving…':'Save live fee and payment policy'}</Text></Pressable>
      <Text style={{fontSize:11,color:'#697466',marginTop:8}}>MonCash checkout is currently unavailable. Cash orders require the merchant to accept cash payments.</Text>
    </>:null}
    {module==='Analytics'?<>
      <Pressable onPress={()=>void loadAnalytics()} style={{...btn('#E9EEE6'),marginBottom:10}}><Text style={{fontWeight:'700',color:'#344531'}}>Refresh analytics</Text></Pressable>
      {analytics?<View style={cardStyle}>
        {Object.entries({'Orders (30 days)':analytics.orders_30d,'Gross value (30 days)':money(analytics.gross_30d),'Average order':money(analytics.average_order)}).map(([k,v])=><View key={k} style={{paddingVertical:8,borderBottomWidth:1,borderBottomColor:'#EEF0EC'}}><Text style={labelStyle}>{k}</Text><Text style={valueStyle}>{String(v)}</Text></View>)}
        <Text style={{...valueStyle,marginTop:12}}>By order status</Text>{Object.entries(analytics.by_status||{}).map(([k,v])=><Text key={k} style={{fontSize:12,color:'#596554',marginTop:5}}>{k}: {String(v)}</Text>)}
        <Text style={{...valueStyle,marginTop:12}}>By payment method</Text>{Object.entries(analytics.by_payment||{}).map(([k,v])=><Text key={k} style={{fontSize:12,color:'#596554',marginTop:5}}>{k}: {String(v)}</Text>)}
      </View>:<Text style={labelStyle}>{busy==='analytics'||!analyticsLoaded?'Loading analytics…':sectionErrors.Analytics?'Analytics unavailable.':'No analytics available.'}</Text>}
    </>:null}
    {module==='Goodies assets'?<GoodiesAssetLibrary/>:null}
    {module==='Content editor'?<Pressable onPress={()=>go('editor',{editorFeature:'Goodies'})} style={btn('#294E2C')}><Text style={{color:'#fff',fontWeight:'800'}}>Open Goodies Content Editor</Text></Pressable>:null}
  </ScrollView>;
}

const dateText=(v:string|null)=>v?new Date(v).toLocaleString():'—';
