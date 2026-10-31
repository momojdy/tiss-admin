import React, {useCallback, useEffect, useState} from 'react';
import {Alert, Pressable, ScrollView, Text, TextInput, View} from 'react-native';
import {supabase} from '../../lib/supabase';
import {useNav} from '../../shell/Nav';
import {useToast} from '../../ui/Toast';
import {useTheme} from '../../theme/ThemeContext';
import {GoodiesAssetLibrary} from './GoodiesAssetLibrary';

type Dashboard = {stats:any;merchants:any[];products:any[];orders:any[]};
const MODULES=['Overview','Merchants','Product review','Orders','Fees','Analytics','Goodies assets','Content editor'];
const money=(v:any)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(v)||0);
const card={backgroundColor:'#fff',borderWidth:1,borderColor:'#E1E6DE',borderRadius:14,padding:14,marginBottom:10} as const;
const btn=(bg:string)=>({paddingVertical:10,paddingHorizontal:12,borderRadius:10,backgroundColor:bg,alignItems:'center' as const});
const labelStyle={fontSize:12,color:'#687365',marginBottom:4} as const;
const valueStyle={fontSize:14,fontWeight:'700' as const,color:'#1B2619'};

export function GoodiesAdminScreen() {
  const {go}=useNav(); const toast=useToast(); const {c}=useTheme();
  const [module,setModule]=useState('Overview');
  const [dashboard,setDashboard]=useState<Dashboard>({stats:{},merchants:[],products:[],orders:[]});
  const [analytics,setAnalytics]=useState<any>(null);
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState('');
  const [fee,setFee]=useState('0');
  const [firstFree,setFirstFree]=useState(false);
  const [wallet,setWallet]=useState(true);
  const [card,setCard]=useState(true);
  const [cash,setCash]=useState(true);
  const [tips,setTips]=useState('0,1,2,3');

  const reload=useCallback(async()=>{
    setLoading(true);
    try {
      const [{data,error},cms]=await Promise.all([
        supabase.rpc('goodies_admin_dashboard'),
        supabase.from('wantiss_cms_content').select('payload').eq('content_key','goodies.content').eq('locale','en').eq('status','published').order('version',{ascending:false}).limit(1).maybeSingle()
      ]);
      if(error)throw error;
      const d=(data||{}) as Dashboard;
      setDashboard({stats:d.stats||{},merchants:d.merchants||[],products:d.products||[],orders:d.orders||[]});
      const f=cms.data?.payload?.fees||{};
      setFee(String(f.svc??0));setFirstFree(!!f.first);
      setWallet(!!(f.pay?.Wallet??true));setCard(!!(f.pay?.Card??true));setCash(!!(f.pay?.Cash??true));
      setTips(String(f.tips??'0,1,2,3'));
    } catch(e:any){toast(e?.message||'Could not load Goodies administration.');}
    finally{setLoading(false);}
  },[toast]);
  useEffect(()=>{void reload();},[reload]);
  const loadAnalytics=async()=>{
    setBusy('analytics');
    const {data,error}=await supabase.rpc('goodies_admin_analytics');
    if(error)toast(error.message);else setAnalytics(data);
    setBusy('');
  };
  useEffect(()=>{if(module==='Analytics')void loadAnalytics();},[module]);
  const setMerchant=async(item:any)=>{
    setBusy(item.business_id);
    const {error}=await supabase.rpc('goodies_admin_set_merchant_status',{p_business_id:item.business_id,p_live:!item.is_live});
    if(error)toast(error.message);else{toast(item.is_live?'Store taken offline':'Store is live');await reload();}
    setBusy('');
  };
  const verifyMerchant=async(item:any,status:'verified'|'rejected')=>{
    setBusy(item.business_id);
    const {error}=await supabase.rpc('goodies_admin_set_merchant_verification',{p_business_id:item.business_id,p_status:status});
    if(error)toast(error.message);else{toast(status==='verified'?'Merchant verified':'Merchant rejected');await reload();}
    setBusy('');
  };
  const cancelOrder=(item:any)=>{
    Alert.alert('Cancel Goodies order', 'Cancel '+item.order_code+'? Stock will be restored and eligible payments will be refunded.',[
      {text:'Keep order',style:'cancel'},
      {text:'Cancel order',style:'destructive',onPress:()=>{void (async()=>{
        setBusy(item.id);
        const {error}=await supabase.rpc('goodies_admin_cancel_order',{p_order_id:item.id,p_reason:'The order was cancelled by Wantiss support.'});
        if(error)toast(error.message);else{toast('Order cancelled; refund processing was triggered where applicable.');await reload();}
        setBusy('');
      })();}}
    ]);
  };
  const reviewProduct=async(item:any,status:'approved'|'rejected')=>{
    setBusy(item.id);
    const {error}=await supabase.rpc('goodies_admin_review_product',{p_product_id:item.id,p_status:status,p_note:null});
    if(error)toast(error.message);else{toast(status==='approved'?'Product approved':'Product rejected');await reload();}
    setBusy('');
  };
  const saveFees=async()=>{
    const amount=Number(fee);
    const tipValues=tips.split(',').map(x=>Number(x.trim())).filter(x=>Number.isFinite(x));
    if(!Number.isFinite(amount)||amount<0||amount>1000){toast('Enter a valid service fee.');return;}
    if(!tipValues.length||tipValues.some(x=>x<0||x>1000)){toast('Enter valid comma-separated tip amounts.');return;}
    setBusy('fees');
    const {error}=await supabase.rpc('goodies_admin_update_fee_policy',{p_service_fee:amount,p_first_order_free:firstFree,p_wallet_enabled:wallet,p_card_enabled:card,p_cash_enabled:cash,p_tips:tipValues});
    if(error)toast(error.message);else toast('Goodies payment and fee policy updated.');
    setBusy('');
  };
  const switchRow=(title:string,sub:string,on:boolean,set:(v:boolean)=>void)=><Pressable onPress={()=>set(!on)} style={{...card,flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8}}><View style={{flex:1,paddingRight:10}}><Text style={valueStyle}>{title}</Text><Text style={{fontSize:11,color:'#697466',marginTop:3}}>{sub}</Text></View><Text style={{fontWeight:'800',color:on?'#286A35':'#8B554B'}}>{on?'ON':'OFF'}</Text></Pressable>;

  return <ScrollView style={{flex:1,backgroundColor:c?.bg||'#F6F7F4'}} contentContainerStyle={{padding:16,paddingBottom:36}}>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
      <View><Text style={{fontSize:20,fontWeight:'800',color:'#172316'}}>Goodies Admin</Text><Text style={{fontSize:11,color:'#697466'}}>Live merchant, catalogue, order and payment controls</Text></View>
      <Pressable onPress={()=>void reload()} style={btn('#E9EEE6')}><Text style={{fontSize:12,fontWeight:'700',color:'#344531'}}>Refresh</Text></Pressable>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:14}}>
      <View style={{flexDirection:'row',gap:7}}>{MODULES.map(x=><Pressable key={x} onPress={()=>setModule(x)} style={{paddingHorizontal:12,paddingVertical:9,borderRadius:20,backgroundColor:module===x?'#294E2C':'#E8ECE5'}}><Text style={{fontSize:12,fontWeight:'700',color:module===x?'#fff':'#344531'}}>{x}</Text></Pressable>)}</View>
    </ScrollView>
    {loading?<Text style={{padding:20,color:'#697466'}}>Loading live Goodies data…</Text>:null}
    {module==='Overview'?<>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
        {Object.entries({Stores:dashboard.stats.stores??0,'Live stores':dashboard.stats.live_stores??0,Products:dashboard.stats.products??0,'Awaiting review':dashboard.stats.pending_products??0,Orders:dashboard.stats.orders??0,'Open orders':dashboard.stats.open_orders??0}).map(([k,v])=><View key={k} style={{...card,width:'48%',marginBottom:0}}><Text style={labelStyle}>{k}</Text><Text style={{fontSize:24,fontWeight:'800',color:'#1B2619'}}>{String(v)}</Text></View>)}
      </View>
      <View style={{...card,marginTop:10}}><Text style={valueStyle}>Gross order value</Text><Text style={{fontSize:23,fontWeight:'800',marginTop:5,color:'#1B2619'}}>{money(dashboard.stats.gross_total)}</Text><Text style={{fontSize:11,color:'#697466',marginTop:4}}>Includes paid and pay-on-receipt orders.</Text></View>
      <Pressable onPress={()=>go('content')} style={btn('#294E2C')}><Text style={{color:'#fff',fontWeight:'800'}}>Open Goodies Content Editor</Text></Pressable>
    </>:null}
    {module==='Merchants'?<>
      <Text style={{fontSize:12,color:'#687365',marginBottom:10}}>Live records from Goodies store schedules and business verification.</Text>
      {!dashboard.merchants.length?<Text style={labelStyle}>No Goodies merchants registered yet.</Text>:dashboard.merchants.map(m=><View key={m.business_id} style={card}>
        <Text style={valueStyle}>{m.name||'Unnamed store'}</Text><Text style={labelStyle}>{m.category||'Uncategorised'} · {m.city||'City not set'} · Verification: {m.verification}</Text>
        <Text style={{fontSize:12,color:'#596554',marginBottom:8}}>Delivery: {m.delivery_pricing_mode==='distance'?'Distance-based':'Fixed'} · {money(m.delivery_fee)} · COD {m.accept_cash_on_delivery?'enabled':'disabled'}</Text>
        {m.verification!=='verified'?<Pressable disabled={busy===m.business_id} onPress={()=>void verifyMerchant(m,'verified')} style={{...btn('#E8F2E5'),marginBottom:7}}><Text style={{fontWeight:'800',color:'#28552B'}}>Verify merchant</Text></Pressable>:null}
        <View style={{flexDirection:'row',gap:8}}>
          <Pressable disabled={busy===m.business_id||(!m.is_live&&m.verification!=='verified')} onPress={()=>void setMerchant(m)} style={{...btn(m.is_live?'#F7EAE8':'#E8F2E5'),flex:1}}><Text style={{fontWeight:'800',color:m.is_live?'#8D3932':'#28552B'}}>{busy===m.business_id?'Saving…':m.is_live?'Take store offline':'Publish store live'}</Text></Pressable>
          {m.verification==='verified'?<Pressable disabled={busy===m.business_id} onPress={()=>void verifyMerchant(m,'rejected')} style={btn('#F7EAE8')}><Text style={{fontWeight:'800',color:'#8D3932'}}>Revoke</Text></Pressable>:null}
        </View>
      </View>)}
    </>:null}
    {module==='Product review'?<>
      <Text style={{fontSize:12,color:'#687365',marginBottom:10}}>New vendor products remain hidden from customers until approved.</Text>
      {!dashboard.products.length?<Text style={labelStyle}>No products submitted yet.</Text>:dashboard.products.map(p=><View key={p.id} style={card}>
        <View style={{flexDirection:'row',justifyContent:'space-between'}}><Text style={valueStyle}>{p.name}</Text><Text style={{fontSize:11,fontWeight:'800',color:p.review_status==='pending'?'#9B5A27':p.review_status==='approved'?'#286A35':'#9B4036'}}>{p.review_status}</Text></View>
        <Text style={labelStyle}>{p.store_name||'Store'} · {money(p.price)} · Stock {p.stock}</Text>
        {p.description?<Text style={{fontSize:12,color:'#5F6B5A',marginBottom:8}}>{p.description}</Text>:null}
        {p.review_status==='pending'?<View style={{flexDirection:'row',gap:8}}><Pressable disabled={!!busy} onPress={()=>void reviewProduct(p,'approved')} style={{...btn('#E8F2E5'),flex:1}}><Text style={{fontWeight:'800',color:'#28552B'}}>Approve</Text></Pressable><Pressable disabled={!!busy} onPress={()=>void reviewProduct(p,'rejected')} style={{...btn('#F7EAE8'),flex:1}}><Text style={{fontWeight:'800',color:'#8D3932'}}>Reject</Text></Pressable></View>:null}
      </View>)}
    </>:null}
    {module==='Orders'?<>
      {!dashboard.orders.length?<Text style={labelStyle}>No Goodies orders recorded yet.</Text>:dashboard.orders.map(o=><View key={o.id} style={card}>
        <View style={{flexDirection:'row',justifyContent:'space-between'}}><Text style={valueStyle}>{o.order_code}</Text><Text style={{fontSize:11,fontWeight:'800',color:'#48653F'}}>{o.status}</Text></View>
        <Text style={labelStyle}>{o.store_name||o.store_id} · {dateText(o.created_at)}</Text>
        <Text style={{fontSize:12,color:'#596554'}}>{o.payment_method} · {o.payment_status} · {money(o.total)}</Text>
        {o.scheduled_for?<Text style={{fontSize:12,color:'#596554'}}>Scheduled: {dateText(o.scheduled_for)}</Text>:null}
        {o.courier_id?<Text style={{fontSize:12,color:'#596554'}}>Courier assigned</Text>:null}
        {!['completed','cancelled','declined','expired'].includes(o.status)?<Pressable disabled={busy===o.id} onPress={()=>cancelOrder(o)} style={{...btn('#F7EAE8'),marginTop:8}}><Text style={{fontWeight:'800',color:'#8D3932'}}>Cancel order</Text></Pressable>:null}
      </View>)}
    </>:null}
    {module==='Fees'?<>
      <View style={card}>
        <Text style={valueStyle}>Service fee (USD)</Text><TextInput value={fee} onChangeText={setFee} keyboardType="decimal-pad" style={{borderWidth:1,borderColor:'#DCE4D7',borderRadius:10,padding:11,marginTop:8,color:'#1B2619'}}/>
        <Text style={{...labelStyle,marginTop:12}}>Courier tip presets (comma-separated USD amounts)</Text><TextInput value={tips} onChangeText={setTips} style={{borderWidth:1,borderColor:'#DCE4D7',borderRadius:10,padding:11,color:'#1B2619'}}/>
      </View>
      {switchRow('First order free delivery','Waive the delivery fee on the customer’s first Goodies order.',firstFree,setFirstFree)}
      {switchRow('Wantiss Wallet','Default Goodies payment method.',wallet,setWallet)}
      {switchRow('Credit / debit card','Enable saved-card checkout.',card,setCard)}
      {switchRow('Cash on delivery','Global switch only. Checkout also requires merchant and courier consent.',cash,setCash)}
      <Pressable disabled={busy==='fees'} onPress={()=>void saveFees()} style={btn('#294E2C')}><Text style={{color:'#fff',fontWeight:'800'}}>{busy==='fees'?'Saving…':'Save live fee and payment policy'}</Text></Pressable>
      <Text style={{fontSize:11,color:'#697466',marginTop:8}}>MonCash remains disabled until its Goodies payment integration is available. Store and courier COD permissions remain separate and are checked server-side.</Text>
    </>:null}
    {module==='Analytics'?<>
      <Pressable onPress={()=>void loadAnalytics()} style={{...btn('#E9EEE6'),marginBottom:10}}><Text style={{fontWeight:'700',color:'#344531'}}>Refresh analytics</Text></Pressable>
      {analytics?<View style={card}>
        {Object.entries({'Orders (30 days)':analytics.orders_30d,'Gross value (30 days)':money(analytics.gross_30d),'Average order':money(analytics.average_order)}).map(([k,v])=><View key={k} style={{paddingVertical:8,borderBottomWidth:1,borderBottomColor:'#EEF0EC'}}><Text style={labelStyle}>{k}</Text><Text style={valueStyle}>{String(v)}</Text></View>)}
        <Text style={{...valueStyle,marginTop:12}}>By order status</Text>{Object.entries(analytics.by_status||{}).map(([k,v])=><Text key={k} style={{fontSize:12,color:'#596554',marginTop:5}}>{k}: {String(v)}</Text>)}
        <Text style={{...valueStyle,marginTop:12}}>By payment method</Text>{Object.entries(analytics.by_payment||{}).map(([k,v])=><Text key={k} style={{fontSize:12,color:'#596554',marginTop:5}}>{k}: {String(v)}</Text>)}
      </View>:<Text style={labelStyle}>Loading analytics…</Text>}
    </>:null}
    {module==='Goodies assets'?<GoodiesAssetLibrary/>:null}
    {module==='Content editor'?<Pressable onPress={()=>go('content')} style={btn('#294E2C')}><Text style={{color:'#fff',fontWeight:'800'}}>Open Goodies Content Editor</Text></Pressable>:null}
  </ScrollView>;
}

const dateText=(v:string|null)=>v?new Date(v).toLocaleString():'—';
