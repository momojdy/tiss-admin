import {EditableNativeText as Text} from '../EditableNativeText';
import {money} from '../store';
import {label} from '../content';
import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Alert,Pressable,ScrollView,StyleSheet,Text as UnusedNativeText,TextInput,View} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {previewBackend as supabase} from '../previewRuntime';
import {GOODIES_SHARED_PAYMENTS_RELEASED,fetchHelpPayStatus,validHelpPayId,fetchHelpPayWalletEnabled,helpPayContributionCents} from '../helpPayApi';
import {helpPayAccount,helpPayPaymentKey,payRecoverableHelpPay,recoverHelpPayPayment} from '../helpPayRecovery';
import type {HelpPaySnapshot} from '../helpPayApi';

type Props={requestId:string;onBack:()=>void};
const GREEN='#438C53',INK='#1A2517',MUTED='#63745E',BG='#F6FAF5';
const price=(cents:number)=>money(cents/100);

export default function WalletHelpPayScreen({requestId,onBack}:Props){
 const [request,setRequest]=useState<HelpPaySnapshot|null>(null),[loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[walletBalance,setWalletBalance]=useState<number|null>(null);
 const [mode,setMode]=useState<'percent'|'amount'>('percent'),[percent,setPercent]=useState('100'),[enteredAmount,setEnteredAmount]=useState('');
 const [receipt,setReceipt]=useState<string|null>(null),[now,setNow]=useState(Date.now());
 const [walletEnabled,setWalletEnabled]=useState(false);
 const owner=useRef<string|null>(null),sequence=useRef(0),mounted=useRef(true),scope=useRef(requestId),submitting=useRef(false),confirmation=useRef<string|null>(null),lifecycle=useRef(0);scope.current=requestId;
 const receiptText=(result:any)=>result.refunded?label('lbl.helpPayRefunded','This request could not be finalized. Your Wallet has been refunded.'):result.contribution_status==='refund_pending'?label('lbl.helpPayRefundPending','Your Wallet refund is being processed. Check Wallet activity for confirmation.'):result.status==='fulfilled'?label("lbl.sharedPay.adb5f4392989", "Your contribution completed the order."):label("lbl.sharedPay.1d5556f0ae86", "Your contribution was reserved. The order will be placed when fully funded.");
 const load=async()=>{
   const current=++sequence.current;
   if(!validHelpPayId(requestId)){setError(label("lbl.sharedPay.19ca27bcb4cf", "Invalid Wantiss payment link"));setLoading(false);return;}
   try{
     const user=await helpPayAccount();if(!mounted.current||current!==sequence.current||scope.current!==requestId)return;owner.current=user;
     const [snapshot,wallet,enabled,recovery]=await Promise.all([
       fetchHelpPayStatus(requestId),supabase.from('wallets').select('balance').eq('user_id',user).maybeSingle(),
       GOODIES_SHARED_PAYMENTS_RELEASED?fetchHelpPayWalletEnabled():Promise.resolve(false),recoverHelpPayPayment(requestId)
     ]);
     const balance=wallet.data?.balance,numericBalance=typeof balance==='number'||typeof balance==='string'&&/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(balance.trim());
     if(wallet.error||wallet.data!=null&&(typeof wallet.data!=='object'||Array.isArray(wallet.data)||!numericBalance||!Number.isFinite(Number(balance))||Number(balance)<0))throw new Error('Wallet unavailable');
     const currentUser=await helpPayAccount();if(!mounted.current||current!==sequence.current||scope.current!==requestId||currentUser!==user)return;
     setWalletBalance(wallet.data?Number(wallet.data.balance):null);setRequest(snapshot);setWalletEnabled(enabled);setError('');
     if(recovery.result)setReceipt(receiptText(recovery.result));
     if(recovery.pending){setMode('amount');setEnteredAmount((recovery.pending.amountCents!/100).toFixed(2));}
   }catch{if(mounted.current&&current===sequence.current){setWalletBalance(null);setWalletEnabled(false);setRequest(null);setError(label('lbl.helpPayLoadError','Could not load this payment request. Please retry.'));}}
   finally{if(mounted.current&&current===sequence.current)setLoading(false);}
 };
 useEffect(()=>{mounted.current=true;lifecycle.current++;setBusy(false);setLoading(true);setRequest(null);setReceipt(null);setWalletBalance(null);setWalletEnabled(false);confirmation.current=null;submitting.current=false;void load();
  const timer=setInterval(()=>{void load();},5000);
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{if((session?.user.id||null)!==owner.current){owner.current=session?.user.id||null;sequence.current++;lifecycle.current++;submitting.current=false;setBusy(false);setRequest(null);setWalletBalance(null);setReceipt(null);setWalletEnabled(false);confirmation.current=null;setTimeout(()=>{if(mounted.current)void load();},0);}});
  return()=>{mounted.current=false;sequence.current++;lifecycle.current++;clearInterval(timer);subscription.unsubscribe();};
 },[requestId]);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 const remaining=request?.remaining_cents??0;
 const funded=request&&!['expired','cancelled','refund_pending'].includes(request.status)?request.total_cents-remaining:0;
 const calculated=request?helpPayContributionCents(remaining,request.mode,mode,mode==='amount'?enteredAmount:percent):null;
 const value=calculated??0;
 const valid=walletEnabled&&!error&&request&&request.status==='active'&&new Date(request.expires_at).getTime()>now&&calculated!==null;
 const seconds=request?Math.max(0,Math.ceil((new Date(request.expires_at).getTime()-now)/1000)):0;
 const confirm=()=>{
   if(!valid||busy||submitting.current||!request||!owner.current)return;
   if(walletBalance===null)return Alert.alert(label("lbl.sharedPay.ee77216dac18", "Wallet required"),label("lbl.sharedPay.3908875a8ecd", "Create a Wantiss Wallet before paying this request."));
   if(walletBalance*100+0.0001<value)return Alert.alert(label("lbl.sharedPay.595478e89b6c", "Insufficient Wallet balance"),label("lbl.sharedPay.d7cbce64a0d2", "Add money to your Wantiss Wallet before contributing."));
   const actor=owner.current,epoch=lifecycle.current,key=helpPayPaymentKey();confirmation.current=key;submitting.current=true;
   const active=()=>mounted.current&&scope.current===requestId&&owner.current===actor&&lifecycle.current===epoch;
   Alert.alert(label("lbl.sharedPay.460ed0499c69", "Confirm Help Pay contribution"),
    label("lbl.sharedPay.761d0751f5d4", "Pay ")+price(value)+label("lbl.sharedPay.9ddec70577a7", " from your Wantiss Wallet for this Goodies order? This payment is reserved until the order is fully funded or refunded."),
    [{text:label("lbl.sharedPay.a0e63d7c7125", "Not now"),style:'cancel',onPress:()=>{if(confirmation.current===key){confirmation.current=null;submitting.current=false;}}},{
      text:label("lbl.sharedPay.761d0751f5d4", "Pay ")+price(value),onPress:()=>{
       if(confirmation.current!==key||!active())return;confirmation.current=null;
       void(async()=>{setBusy(true);try{
         const result=await payRecoverableHelpPay(requestId,value,key,actor);if(!active())return;
         setReceipt(receiptText(result));await load();
       }catch{if(active()){Alert.alert(label("lbl.sharedPay.d5dc6f809720", "Payment not confirmed"),label('lbl.helpPayPaymentUnconfirmed','Payment not confirmed. Check Wallet activity before trying again.'));await load();}}
       finally{if(active()){submitting.current=false;setBusy(false);}}})();
      }
    }]
   );
 };
 return <View style={s.page}>
   <View style={s.header}>
     <Pressable accessibilityLabel={label("lbl.sharedPay.76900f1bfd16", "Back")} onPress={onBack} style={s.back}><MaterialCommunityIcons name="arrow-left" size={24} color={INK}/></Pressable>
     <Text cmsKey={"lbl.sharedPay.4e60343ccd34"} style={s.heading}>{label("lbl.sharedPay.4e60343ccd34", "Help Pay · Goodies")}</Text>
   </View>
   <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
     <View style={s.hero}>
       <View style={s.icon}><MaterialCommunityIcons name="account-group-outline" size={27} color={GREEN}/></View>
       <Text cmsKey={"lbl.sharedPay.aeca45af88a6"} style={s.title}>{label("lbl.sharedPay.aeca45af88a6", "Help pay a Goodies bill")}</Text>
       <Text cmsKey={"lbl.sharedPay.e21a6332ee26"} style={s.subtitle}>{label("lbl.sharedPay.e21a6332ee26", "A secure Wantiss request. Your payment goes directly toward the original customer's order.")}</Text>
     </View>
     {loading?<ActivityIndicator color={GREEN} size="large"/>:null}
     {!!error?<View style={s.card}><Text style={s.error}>{error}</Text><Pressable onPress={()=>{void load();}} style={s.outline}><Text cmsKey={"lbl.sharedPay.942087cc2d41"} style={s.outlineText}>{label("lbl.sharedPay.942087cc2d41", "Retry")}</Text></Pressable></View>:null}
     {request?<><View style={s.card}>
       <Text cmsKey={"lbl.sharedPay.d08a8574e8ca"} style={s.caption}>{label("lbl.sharedPay.d08a8574e8ca", "BILL SUMMARY")}</Text>
       <View style={s.row}><Text cmsKey={"lbl.sharedPay.4bf46f85b397"} style={s.label}>{label("lbl.sharedPay.4bf46f85b397", "Goodies bill")}</Text><Text style={s.total}>{price(request.total_cents)}</Text></View>
       <View style={s.row}><Text cmsKey={"lbl.sharedPay.92432ea870cc"} style={s.label}>{label("lbl.sharedPay.92432ea870cc", "Already funded")}</Text><Text style={s.value}>{price(funded)}</Text></View>
       <View style={s.progress}><View style={[s.progressActive,{width:`${Math.max(0,Math.min(100,100*funded/Math.max(1,request.total_cents)))}%`}]}/></View>
       <View style={s.row}><Text cmsKey={"lbl.sharedPay.b60de3ca37f2"} style={s.label}>{label("lbl.sharedPay.b60de3ca37f2", "Still needed")}</Text><Text style={s.totalGreen}>{price(request.status==='active'?remaining:0)}</Text></View>
       <View style={s.row}><Text cmsKey={"lbl.sharedPay.de9967524f05"} style={s.label}>{label("lbl.sharedPay.de9967524f05", "Expires in")}</Text><Text style={s.value}>{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</Text></View>
     </View>
     {request.is_creator?<View style={s.notice}><MaterialCommunityIcons name="information-outline" color={GREEN} size={20}/><Text cmsKey={"lbl.sharedPay.901b78876685"} style={s.noticeText}>{label("lbl.sharedPay.901b78876685", "This is your own request. Share your QR or message card with friends; you cannot pay yourself.")}</Text></View>:null}
     {!walletEnabled||request.status!=='active'||seconds<=0?<View style={s.card}>
       <Text cmsKeys={["lbl.sharedPay.04cd2b8aaa12","lbl.sharedPay.7108183f1888","lbl.sharedPay.0ff5e16d4eb0","lbl.sharedPay.416f4bdc7db9"]} style={s.title}>{request.status==='fulfilled'?label("lbl.sharedPay.04cd2b8aaa12", "Order fully funded"):request.status==='cancelled'?label("lbl.sharedPay.7108183f1888", "Request cancelled"):request.status==='expired'||seconds<=0?label("lbl.sharedPay.0ff5e16d4eb0", "Request expired"):label("lbl.sharedPay.416f4bdc7db9", "Not accepting payments")}</Text>
       <Text cmsKeys={['lbl.helpPayRefundPending',"lbl.sharedPay.28b5ba9e934d"]} style={s.subtitle}>{request.status==='refund_pending'||(['expired','cancelled'].includes(request.status)&&request.my_contributed_cents>0)?label('lbl.helpPayRefundPending','Your Wallet refund is being processed. Check Wallet activity for confirmation.'):label("lbl.sharedPay.28b5ba9e934d", "No new payments can be accepted. Any expired or cancelled contributions are returned to their original Wallets.")}</Text>
     </View>:!request.is_creator?<><View style={s.card}>
       <Text cmsKey={"lbl.sharedPay.7a919abc163d"} style={s.caption}>{label("lbl.sharedPay.7a919abc163d", "YOUR CONTRIBUTION")}</Text>
       {request.mode==='share'?<>
         <Text cmsKey={"lbl.sharedPay.a106da9432de"} style={s.label}>{label("lbl.sharedPay.a106da9432de", "Choose a percentage of the remaining bill")}</Text>
         <View style={s.percentRow}>{[10,25,50,75,100].map(p=><Pressable key={p} onPress={()=>{setMode('percent');setPercent(String(p));}}
           style={[s.chip,mode==='percent'&&percent===String(p)&&s.chipSelected]}><Text style={[s.chipText,mode==='percent'&&percent===String(p)&&s.chipTextSelected]}>{p}%</Text></Pressable>)}</View>
         <View style={s.row}><Pressable onPress={()=>{setMode('percent');}} style={{flex:1}}><Text cmsKey={"lbl.sharedPay.ddf9b59c7bf4"} style={s.label}>{label("lbl.sharedPay.ddf9b59c7bf4", "Custom percentage (%)")}</Text></Pressable>
           <TextInput accessibilityLabel={label("lbl.sharedPay.709e29ca60c0", "Custom percentage")} value={percent} onChangeText={v=>{setMode('percent');setPercent(v);}} keyboardType="decimal-pad" style={s.smallInput} placeholder="25" /></View>
         <View style={s.row}><Pressable onPress={()=>{setMode('amount');}} style={{flex:1}}><Text cmsKey={"lbl.sharedPay.20a7aa907eeb"} style={s.label}>{label("lbl.sharedPay.20a7aa907eeb", "Or exact amount (USD)")}</Text></Pressable>
           <TextInput accessibilityLabel={label("lbl.sharedPay.ad68dbabf62f", "Custom contribution amount")} value={enteredAmount} onChangeText={v=>{setMode('amount');setEnteredAmount(v);}} keyboardType="decimal-pad" style={s.smallInput} placeholder="0.00" /></View>
       </>:<Text cmsKey={"lbl.sharedPay.fbb4c1079b3d"} style={s.subtitle}>{label("lbl.sharedPay.fbb4c1079b3d", "This request requires one person to cover the entire unpaid bill.")}</Text>}
       {!valid?<Text cmsKey={"lbl.sharedPay.60c6b463eb3c"} style={s.error}>{label("lbl.sharedPay.60c6b463eb3c", "Choose an amount between $0.01 and")}{price(remaining)}.</Text>:null}
       <View style={s.separator}/>
       <View style={s.row}><Text cmsKey={"lbl.sharedPay.5a4a4293580d"} style={s.label}>{label("lbl.sharedPay.5a4a4293580d", "You will pay")}</Text><Text style={s.payAmount}>{price(valid?value:0)}</Text></View>
       <View style={s.row}><Text cmsKey={"lbl.sharedPay.2e7ab90ac60c"} style={s.label}>{label("lbl.sharedPay.2e7ab90ac60c", "Wallet balance")}</Text><Text cmsKey={"lbl.sharedPay.81659570b4ae"} style={s.value}>{walletBalance===null?label("lbl.sharedPay.81659570b4ae", "Wallet not available"):money(walletBalance)}</Text></View>
       <Pressable accessibilityRole="button" disabled={!valid||busy||walletBalance===null||walletBalance*100+0.0001<value} onPress={confirm} style={[s.primary,(!valid||busy||walletBalance===null||walletBalance*100+0.0001<value)&&s.disabled]}>
         {busy?<ActivityIndicator color="#FFF"/>:<MaterialCommunityIcons name="wallet-outline" size={20} color="#FFF"/>}
         <Text cmsKeys={["lbl.sharedPay.b9378c00f9db","lbl.sharedPay.761d0751f5d4"]} style={s.primaryText}>{busy?label("lbl.sharedPay.b9378c00f9db", "Confirming…"):label("lbl.sharedPay.761d0751f5d4", "Pay ")+price(valid?value:0)}</Text>
       </Pressable>
       <Text cmsKey={"lbl.sharedPay.02cea13ccec6"} style={s.helper}>{label("lbl.sharedPay.02cea13ccec6", "Payments are debited exactly once and automatically refunded if the order cannot be fulfilled.")}</Text>
     </View></>:null}
     {!!receipt?<View style={s.success}><MaterialCommunityIcons name="check-circle" size={24} color={GREEN}/><Text style={s.noticeText}>{receipt}</Text></View>:null}
     {request.my_contributed_cents>0?<View style={s.notice}><MaterialCommunityIcons name="check-circle-outline" size={21} color={GREEN}/><Text cmsKey={"lbl.sharedPay.cf8698e6a85f"} style={s.noticeText}>{label("lbl.sharedPay.cf8698e6a85f", "Your Wallet contributions:")}{price(request.my_contributed_cents)}</Text></View>:null}
     </>:null}
   </ScrollView>
 </View>;
}
const s=StyleSheet.create({
 page:{flex:1,backgroundColor:BG},header:{height:94,paddingTop:35,paddingHorizontal:15,backgroundColor:'#FFF',flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderColor:'#E1ECDD'},
 back:{width:42,height:42,alignItems:'center',justifyContent:'center'},heading:{fontSize:18,fontWeight:'700',color:INK},
 content:{padding:17,paddingBottom:65,gap:14},hero:{backgroundColor:'#ECF7EB',borderRadius:22,padding:23,alignItems:'center'},icon:{width:54,height:54,borderRadius:18,backgroundColor:'#FFF',alignItems:'center',justifyContent:'center'},
 title:{fontSize:19,fontWeight:'800',color:INK,textAlign:'center',marginTop:10},subtitle:{fontSize:13,color:MUTED,textAlign:'center',marginTop:8,lineHeight:19},
 card:{backgroundColor:'#FFF',borderRadius:19,padding:19,borderWidth:1,borderColor:'#E0ECDB',gap:12},
 caption:{fontSize:11,fontWeight:'800',color:GREEN,letterSpacing:1.2},row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10},
 label:{fontSize:13,color:MUTED,flexShrink:1},value:{fontSize:14,fontWeight:'700',color:INK},total:{fontSize:21,fontWeight:'800',color:INK},totalGreen:{fontSize:20,fontWeight:'800',color:GREEN},
 progress:{height:9,borderRadius:9,backgroundColor:'#EAF2E7',overflow:'hidden'},progressActive:{height:9,backgroundColor:GREEN},
 percentRow:{flexDirection:'row',gap:6,flexWrap:'wrap',marginTop:7,marginBottom:4},chip:{flexGrow:1,paddingHorizontal:9,paddingVertical:11,borderRadius:12,backgroundColor:BG,borderWidth:1,borderColor:'#DEEBDB',alignItems:'center'},
 chipSelected:{backgroundColor:'#E2F1E0',borderColor:GREEN},chipText:{fontSize:12,fontWeight:'700',color:INK},chipTextSelected:{color:GREEN},
 smallInput:{width:102,borderWidth:1,borderColor:'#D7E5D3',borderRadius:11,paddingVertical:9,paddingHorizontal:9,fontSize:16,fontWeight:'700',textAlign:'right',color:INK},
 separator:{borderBottomWidth:1,borderColor:'#E5EEE1',marginVertical:2},payAmount:{fontSize:25,fontWeight:'800',color:GREEN},
 primary:{minHeight:53,backgroundColor:GREEN,borderRadius:14,flexDirection:'row',gap:9,alignItems:'center',justifyContent:'center',marginTop:6},disabled:{opacity:.45},
 primaryText:{fontSize:16,fontWeight:'800',color:'#FFF'},helper:{fontSize:11,lineHeight:17,color:MUTED,textAlign:'center'},error:{fontSize:13,color:'#C33C43'},
 notice:{backgroundColor:'#ECF7EB',borderRadius:14,padding:14,flexDirection:'row',gap:9,alignItems:'center'},noticeText:{fontSize:12,lineHeight:18,color:'#315B37',flex:1},
 success:{backgroundColor:'#ECF7EB',borderRadius:14,padding:13,flexDirection:'row',gap:10,alignItems:'center'},
 outline:{borderRadius:12,borderWidth:1,borderColor:GREEN,alignItems:'center',padding:11,marginTop:7},outlineText:{color:GREEN,fontWeight:'700'}
});
