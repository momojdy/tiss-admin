import React, {useState} from 'react';
import {View, Text, Pressable, Modal, ScrollView, KeyboardAvoidingView, Platform, Share} from 'react-native';
import {T, Cta, Row, Card, Badge, Input, Radio, SheetBox, useTheme} from './ui';
import {Icon} from './Icon';
import {S, STB, money, emit, save, toast, ui, addr, defAddr, done, phoneOK, fmtDay, fmtTime, alcAge} from '../store';
import * as A from '../actions';
import {PROMO_DETAIL} from '../data/promoText';
import {bzLeave, bzDiscard, bzReset2} from '../builders/engine';
import {rgText, importContent, clearContent, hasContent} from '../content';
import {TextInput, useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

export function Sheets({sheet, close}: {sheet: any; close: () => void}) {
  const th = useTheme(), insets = useSafeAreaInsets(), {height: windowHeight} = useWindowDimensions();
  if (!sheet) return null;
  const k = sheet.kind;
  const stars = (n: number, on: (v: number) => void) => <View style={{flexDirection: 'row', justifyContent: 'center', gap: 6, marginVertical: 10}}>{[1, 2, 3, 4, 5].map(v => <Pressable key={v} onPress={() => on(v)}><Icon name="star" size={32} color={n >= v ? '#FFB400' : th.line} fill /></Pressable>)}</View>;
  let content: any = null;
  if (k === 'newcart') content = (<><T size={20} weight="800">Start a new cart?</T><T color={th.mut} style={{marginVertical: 8, marginBottom: 18}}>Your cart has items from {sheet.from}. Orders are placed with one store at a time, so adding from {sheet.to} replaces them.</T><Cta label="Replace and add" onPress={A.newCart} /><View style={{height: 10}} /><Cta ghost label="Keep current cart" onPress={close} /></>);
  if (k === 'byoleave') content = (<><T size={20} weight="800">{sheet.edit ? 'Discard your changes?' : 'Leave this builder?'}</T><T color={th.mut} style={{marginVertical: 8, marginBottom: 18}}>{sheet.edit ? 'The item in your cart stays as it was.' : 'Your choices can be saved as a draft so you can pick up where you left off.'}</T>{sheet.edit ? null : <><Cta label="Save draft and leave" onPress={bzLeave} /><View style={{height: 10}} /></>}<Pressable onPress={bzDiscard} style={{height: 52, borderRadius: 16, backgroundColor: th.red, alignItems: 'center', justifyContent: 'center'}}><T size={15.5} weight="800" color="#fff">Discard</T></Pressable><View style={{height: 10}} /><Cta ghost label="Keep editing" onPress={close} /></>);
  if (k === 'byoreset') content = (<><T size={20} weight="800">Start over?</T><T color={th.mut} style={{marginVertical: 8, marginBottom: 18}}>This clears your current choices. Items already in your cart are not affected.</T><Cta label="Start over" onPress={bzReset2} /><View style={{height: 10}} /><Cta ghost label="Keep editing" onPress={close} /></>);
  if (k === 'alcrules') { const a = alcAge(sheet.sid || (S.pend && S.pend[0] ? S.pend[0].s : null)); content = (<><View style={{alignItems: 'center', marginBottom: 6}}><Text style={{fontSize: 44}}>🪪</Text></View><T size={20} weight="800">Alcohol rules</T><T color={th.mut} style={{marginTop: 8, lineHeight: 21}}>{rgText('rg.rules', 'Alcohol is sold only to customers aged {age} or older. Minors may not buy alcohol. Valid government photo ID is required at delivery or pickup. If the ID check fails, you are refunded to your Wantiss wallet minus the delivery fee.', a.age)}</T><Card style={{marginTop: 12}}><T size={13.5}>• Minimum age here: <T weight="800">{a.age}</T></T><T size={13.5}>• The courier checks your ID at the door. At a pickup, the shop checks it.</T><T size={13.5}>• If it fails, you get a refund to your Wantiss wallet minus the delivery fee.</T></Card><View style={{height: 6}} /><Cta label="I understand" onPress={A.alcAccept} /><View style={{height: 10}} /><Cta ghost label="Cancel" onPress={close} /></>); }
  if (k === 'group-order') content = <GroupOrderSheet close={close} />;
  if (k === 'schedule') content = <ScheduleSheet close={close} />;
  if (k === 'import') content = <ImportSheet close={close} />;
  if (k === 'contacts') content = <ContactsSheet close={close} />;
  if (k === 'ctform') content = <CtForm key={sheet.id || 'new'} id={sheet.id} />;
  if (k === 'topup') content = (<><T size={20} weight="800">Top up wallet</T><T color={th.mut} style={{marginTop: 6, marginBottom: 14}}>Demo: no real money moves.</T><View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>{[10, 20, 50, 100].map(v => <Pressable key={v} onPress={() => {S.wallet += v; close(); toast('Wallet topped up to ' + money(S.wallet)); save(); emit();}} style={{paddingVertical: 10, paddingHorizontal: 16, borderRadius: 18, backgroundColor: th.soft}}><T size={14} weight="700">+{money(v)}</T></Pressable>)}</View></>);
  if (k === 'replace') content = (<><T size={20} weight="800">Replace your cart?</T><T color={th.mut} style={{marginVertical: 8, marginBottom: 18}}>Your cart has items from {sheet.from}.</T><Cta label="Replace and reorder" onPress={A.runReorder} /><View style={{height: 10}} /><Cta ghost label="Keep current cart" onPress={close} /></>);
  if (k === 'clear') content = (<><T size={20} weight="800">Clear your cart?</T><T color={th.mut} style={{marginVertical: 8, marginBottom: 18}}>All items will be removed.</T><Pressable onPress={A.clearCart} style={{height: 52, borderRadius: 16, backgroundColor: th.red, alignItems: 'center', justifyContent: 'center'}}><T size={15.5} weight="800" color="#fff">Clear cart</T></Pressable><View style={{height: 10}} /><Cta ghost label="Cancel" onPress={close} /></>);
  if (k === 'cancel') content = (<><T size={20} weight="800">Cancel this order?</T><T color={th.mut} style={{marginVertical: 8, marginBottom: 18}}>You can cancel until the store finishes preparing it.</T><Pressable onPress={() => A.cancelOrder(sheet.id)} style={{height: 52, borderRadius: 16, backgroundColor: th.red, alignItems: 'center', justifyContent: 'center'}}><T size={15.5} weight="800" color="#fff">Yes, cancel order</T></Pressable><View style={{height: 10}} /><Cta ghost label="Keep order" onPress={close} /></>);
  if (k === 'promo') {
    const d = PROMO_DETAIL[sheet.p as 'free' | 'points' | 'produce'], custom = sheet.custom || {};
    content = (<>
      <View style={{height: 150, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: d.bg, marginBottom: 12}}><Text style={{fontSize: 78}}>{custom.emoji || d.e}</Text></View>
      <T size={21} weight="800">{custom.title || d.t}</T>
      <T color={th.mut} style={{marginVertical: 8, marginBottom: 18, lineHeight: 21}}>{custom.sub || d.d}</T>
      <Cta label={custom.btn || d.b} onPress={() => {
        const target = String(custom.target || '');
        if (target.startsWith('category:')) A.promoGo(target.slice(9));
        else if (target === 'screen:wallet') {close(); A.go('payments');}
        else if (target === 'screen:promos') {close(); A.go('promos');}
        else if (target) {close(); A.go('catlist', 'all');}
        else A.promoGo(d.go);
      }} />
    </>);
  }
  if (k === 'sinfo') {
    const s = STB[sheet.id];
    const row = (a: string, b: string) => <View key={a} style={{flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: th.line}}><T color={th.mut} style={{width: '38%'}}>{a}</T><T color={th.ink} weight="700" style={{flex: 1, textAlign: 'right'}}>{b}</T></View>;
    content = (<>
      <T size={23} weight="800">{s.businessName || s.n}</T>
      <T color={th.mut} style={{marginTop: 6, marginBottom: 14, lineHeight: 21}}>{s.businessDescription || s.k}</T>
      <Card style={{padding: 16}}>
        <Row style={{gap: 10, alignItems: 'center', marginBottom: 10}}>
          <Pressable accessibilityRole="button" accessibilityLabel="Read store reviews" onPress={() => {close(); A.go('reviews', sheet.id);}} style={{flex: 1}}><T size={13} color={th.br}>CUSTOMER REVIEWS</T><T size={18} weight="800">{s.rv > 0 ? '★ ' + s.r.toFixed(1) + ' (' + s.rv + ' reviews)' : 'No reviews yet'}</T></Pressable>
          <Badge label={s.open ? 'Open now' : 'Closed now'} />
        </Row>
        {row('Opening hours', s.h)}
        {row('Current status', s.open ? 'Accepting orders' : s.nx || 'Currently closed')}
        {s.businessAddress ? row('Address', [s.businessAddress, s.businessCity, s.businessCountry].filter(Boolean).join(', ')) : null}
        {s.businessPhone ? row('Phone', s.businessPhone) : null}
        {s.businessEmail ? row('Email', s.businessEmail) : null}
        {s.businessWebsite ? row('Website', s.businessWebsite) : null}
        {s.businessDeliveryModes?.length ? row('Available services', s.businessDeliveryModes.join(' and ')) : null}
        {row('Delivery fee', s.fee === 0 ? 'Free delivery' : money(s.fee))}
        {row('Minimum order', money(s.min))}
        {row('Distance', s.live ? 'Unavailable until store location is provided' : s.km.toFixed(1) + ' km away')}
        {row('Estimated delivery', s.eta + ' min')}
        {row('Order methods', 'Delivery and pickup')}
        {row('Scheduled orders', s.acceptScheduledOrders ? 'Available while closed' : 'Only while open')}
        {s.acceptScheduledOrders ? row('Minimum advance time', Math.max(0, Number(s.scheduledOrderStartMinutes ?? 60)) + ' minutes after opening') : null}
      </Card>
    </>);
  }
  if (k === 'msg') content = (<><T size={20} weight="800" style={{marginBottom: 14}}>Message courier</T><View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>{['I am at the gate', 'Please call me', 'Leave it at the door', 'Running 5 min late'].map(x => <Pressable key={x} onPress={() => {close(); toast('Sent: ' + x);}} style={{paddingVertical: 9, paddingHorizontal: 14, borderRadius: 18, backgroundColor: th.soft}}><T size={13.5} weight="700">{x}</T></Pressable>)}</View></>);
  if (k === 'review' || k === 'driver-review') content = <ReviewSheet key={String(sheet.id) + ':' + k} id={sheet.id} stars={stars} driver={k === 'driver-review'} initialStars={sheet.initialStars} />;
  if (k === 'addr') content = (<><T size={20} weight="800" style={{marginBottom: 4}}>Deliver to</T><T size={12.5} color={th.mut} style={{marginBottom: 12}}>Choosing an address here only changes Goodies. Your Wantiss default stays the same.</T>{S.addr.map((a: any) => <Radio key={a.id} on={a.id === S.as} onPress={() => A.selectAddr(a.id)}><Row style={{gap: 6}}><T weight="700">{a.l}</T>{a.def ? <Badge green label="Wantiss default" /> : null}</Row><T size={12.5} color={th.mut}>{a.t}</T></Radio>)}<Cta ghost label="Manage addresses" onPress={() => {close(); A.go('addresses');}} /></>);

  const isRatingSheet = k === 'review' || k === 'driver-review';
  return (
    <Modal transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <View style={{flex:1, backgroundColor:'rgba(0,0,0,.5)', justifyContent:'flex-end'}}>
          <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close sheet" style={{position:'absolute',top:0,left:0,right:0,bottom:0}} />
          <View style={{width:'100%', height: isRatingSheet ? Math.min(430, windowHeight * 0.68) : undefined, maxHeight: isRatingSheet ? windowHeight * 0.68 : k==='promo'&&sheet.custom ? '68%' : k==='sinfo'||k==='promo' ? '92%' : '90%', flexShrink:1, minHeight:0, marginBottom:0}}>
            <SheetBox large={isRatingSheet || k === 'sinfo' || (k === 'promo' && !sheet.custom)} compact={k === 'promo' && !!sheet.custom} onClose={close}><ScrollView style={{flex:1,minHeight:0}} contentContainerStyle={{paddingBottom:Math.max(16,insets.bottom),flexGrow:1}} nestedScrollEnabled keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" showsVerticalScrollIndicator={false}>{content}</ScrollView></SheetBox>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ScheduleSheet({close}: {close: () => void}) {
  const th = useTheme(), store: any = STB[S.cart.sid];
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const now = new Date();
  const roundedNow = new Date(now); roundedNow.setMinutes(Math.ceil(now.getMinutes()/5)*5,0,0);
  if (roundedNow.getTime() <= now.getTime()) roundedNow.setMinutes(roundedNow.getMinutes()+5);
  const initialSchedule = S.sch && S.sch > Date.now() ? new Date(S.sch) : roundedNow;
  const [dayOffset,setDayOffset] = useState(() => {
    if (!S.sch || S.sch <= Date.now()) return 0;
    const today = new Date(); today.setHours(0,0,0,0);
    const chosen = new Date(S.sch); chosen.setHours(0,0,0,0);
    return Math.max(0,Math.min(6,Math.round((chosen.getTime()-today.getTime())/86400000)));
  });
  const [deliveryMode,setDeliveryMode] = useState(S.mode === 'pickup' ? 'pickup' : 'delivery');
  const [customHour,setCustomHour] = useState(String(initialSchedule.getHours()).padStart(2,'0'));
  const [customMinute,setCustomMinute] = useState(String(initialSchedule.getMinutes()).padStart(2,'0'));
  const [customMode,setCustomMode] = useState(!!(S.sch && S.sch > Date.now()));
  const [selectedTs,setSelectedTs] = useState<number>(() => S.sch && S.sch > Date.now() ? S.sch : 0);
  const selectedDate = new Date(now);
  selectedDate.setDate(now.getDate()+dayOffset); selectedDate.setHours(0,0,0,0);
  const schedule = store?.scheduleHours || {};
  const hours = schedule[dayNames[selectedDate.getDay()]];
  const opening = hours && !hours.closed && hours.open ? String(hours.open) : '';
  const closing = hours && !hours.closed && hours.close ? String(hours.close) : '';
  const lead = Math.max(0,Number(store?.scheduledOrderStartMinutes ?? 60));
  let earliest = new Date(selectedDate);
  if(dayOffset===0) earliest = new Date();
  if(store && !store.open) {
    if(opening) {
      const [oh,om]=opening.split(':').map(Number);
      const opens=new Date(selectedDate);opens.setHours(oh,om||0,0,0);
      earliest=new Date(Math.max(earliest.getTime(),opens.getTime()+lead*60000));
    } else earliest=new Date(Math.max(earliest.getTime(),Date.now())+lead*60000);
  }
  const noSchedule = !store?.scheduleHours || !Object.keys(store.scheduleHours).length;
  const hasHours = !!(hours && !hours.closed && opening && closing);
  let startMinute=0, endMinute=24*60;
  if(hasHours) {
    const [oh,om]=opening.split(':').map(Number),[ch,cm]=closing.split(':').map(Number);
    startMinute=oh*60+(om||0); endMinute=ch*60+(cm||0);
  } else { startMinute=8*60; endMinute=22*60; }
  const candidates:number[]=[];
  if(hasHours || noSchedule) {
    for(let mins=startMinute;mins<endMinute;mins+=30) {
      const d=new Date(selectedDate);d.setHours(Math.floor(mins/60),mins%60,0,0);
      if(d.getTime()<=Date.now() || d.getTime()<earliest.getTime()) continue;
      candidates.push(d.getTime());
    }
  }
  const customDate = new Date(selectedDate);
  const validCustomDigits = /^\d{1,2}$/.test(customHour) && /^\d{1,2}$/.test(customMinute) && Number(customHour)>=0 && Number(customHour)<=23 && Number(customMinute)>=0 && Number(customMinute)<=59;
  if (validCustomDigits) customDate.setHours(Number(customHour),Number(customMinute),0,0);
  const customMinutes = customDate.getHours()*60+customDate.getMinutes();
  const customInHours = hasHours ? customMinutes>=startMinute && customMinutes<endMinute : noSchedule && customMinutes>=8*60 && customMinutes<22*60;
  const customValid = validCustomDigits && customDate.getTime()>Date.now() && customDate.getTime()>=earliest.getTime() && customInHours;
  const selected = customMode ? (customValid ? customDate.getTime() : 0) : candidates.find(ts=>ts===selectedTs);
  const choose = () => {
    if(!store){toast('Choose a store before scheduling.');return;}
    if(!store.open&&!store.acceptScheduledOrders){toast('This store does not accept scheduled orders while closed.');return;}
    if(!selected){
      if(customMode && !customInHours) toast('Choose a time within the store opening hours.');
      else if(customMode && customDate.getTime()<earliest.getTime()) toast('This store’s earliest available time is '+fmtTime(earliest)+'.');
      else toast('Choose a valid future time or select an available time.');
      return;
    }
    A.setSch(selected); A.setMode(deliveryMode);
    toast('Scheduled for '+fmtDay(new Date(selected))+', '+fmtTime(new Date(selected)));
    close();
  };
  return <>
    <T size={21} weight="800">Schedule your order</T>
    <T size={12.5} color={th.mut} style={{marginTop:4,marginBottom:12}}>Choose delivery or pick-up, a date, and an available time.</T>
    <SegSchedule value={deliveryMode} onChange={setDeliveryMode}/>
    <T size={14} weight="800" style={{marginTop:12,marginBottom:8}}>Choose a day</T>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8,paddingBottom:8}}>
      {Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()+i);const active=dayOffset===i;return <Pressable key={i} onPress={()=>{setDayOffset(i);setSelectedTs(0);setCustomMode(false);}} style={{minWidth:74,paddingVertical:10,paddingHorizontal:10,borderRadius:14,backgroundColor:active?th.br:th.soft,alignItems:'center',borderWidth:1,borderColor:active?th.br:th.line}}>
        <T size={11.5} weight="700" color={active?'#fff':th.mut}>{i===0?'Today':i===1?'Tomorrow':dayNames[d.getDay()].slice(0,3)}</T><T size={15} weight="800" color={active?'#fff':th.ink}>{d.getDate()}</T><T size={10.5} color={active?'#fff':th.mut}>{d.toLocaleDateString(undefined,{month:'short'})}</T>
      </Pressable>;})}
    </ScrollView>
    {store&&!store.open?<Card style={{marginTop:4,marginBottom:8,backgroundColor:th.brt,borderColor:th.br}}><T size={12.5} weight="700">Scheduled-order minimum</T><T size={12} color={th.mut}>{store.acceptScheduledOrders ? (opening ? 'Opening '+opening+' · '+lead+' minutes advance time. Only times after the minimum are selectable.' : 'Minimum advance time: '+lead+' minutes.') : 'This store is not accepting scheduled orders while closed.'}</T></Card>:null}
    <T size={14} weight="800" style={{marginTop:8,marginBottom:8}}>Available times</T>
    {candidates.length ? <ScrollView style={{maxHeight:230}} nestedScrollEnabled showsVerticalScrollIndicator={false} contentContainerStyle={{gap:7,paddingBottom:8}}>
      {candidates.map(ts=><Pressable key={ts} onPress={()=>{setSelectedTs(ts);setCustomHour(String(new Date(ts).getHours()).padStart(2,'0'));setCustomMinute(String(new Date(ts).getMinutes()).padStart(2,'0'));setCustomMode(false);}} style={{minHeight:45,paddingHorizontal:14,paddingVertical:10,borderRadius:13,borderWidth:1,borderColor:selectedTs===ts?th.br:th.line,backgroundColor:selectedTs===ts?th.brt:th.card,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
        <T size={14} weight={selectedTs===ts?'800':'600'} color={selectedTs===ts?th.br:th.ink}>{fmtTime(new Date(ts))}</T>
        {selectedTs===ts?<Icon name="check" color={th.br}/>:<T size={12} color={th.mut}>Select</T>}
      </Pressable>)}
    </ScrollView>:<Card><T size={13} color={th.mut}>{store&&!store.open&&!store.acceptScheduledOrders?'This store does not accept scheduled orders while closed.':'No preset times are available on this date. You can still enter an exact time below if the store’s hours allow it.'}</T></Card>}
    <T size={13} weight="800" style={{marginTop:8,marginBottom:6}}>Or enter an exact time</T>
    <Row style={{gap:10,alignItems:'flex-end'}}>
      <View style={{flex:1}}><Input label="Hour (00–23)" value={customHour} onChange={v=>{setCustomHour(v.replace(/\D/g,'').slice(0,2));setCustomMode(true);setSelectedTs(0);}} placeholder="14" keyboard="number-pad" /></View>
      <T size={20} weight="800" style={{paddingBottom:12}}>:</T>
      <View style={{flex:1}}><Input label="Minute (00–59)" value={customMinute} onChange={v=>{setCustomMinute(v.replace(/\D/g,'').slice(0,2));setCustomMode(true);setSelectedTs(0);}} placeholder="30" keyboard="number-pad" /></View>
    </Row>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:8}}>
      {[0,5,10,15,20,25,30,35,40,45,50,55].map(m=><Pressable key={m} onPress={()=>{setCustomMinute(String(m).padStart(2,'0'));setCustomMode(true);setSelectedTs(0);}} style={{paddingHorizontal:10,paddingVertical:7,borderRadius:16,backgroundColor:Number(customMinute)===m&&customMode?th.brt:th.soft,borderWidth:Number(customMinute)===m&&customMode?1:0,borderColor:th.br}}><T size={11.5} weight="700">{String(m).padStart(2,'0')}</T></Pressable>)}
    </View>
    {selected ? <T size={12.5} color={th.br} style={{marginTop:8}}>Selected: {fmtDay(new Date(selected))}, {fmtTime(new Date(selected))}</T>:null}
    <View style={{height:12}}/><Cta label="Apply" disabled={!selected} onPress={choose}/>
  </>;
}
function SegSchedule({value,onChange}:{value:string;onChange:(v:string)=>void}) {
  const th=useTheme();
  return <View style={{flexDirection:'row',gap:8}}>
    {(['delivery','pickup'] as const).map(v=><Pressable key={v} onPress={()=>onChange(v)} style={{flex:1,paddingVertical:11,borderRadius:13,alignItems:'center',backgroundColor:value===v?th.brt:th.soft,borderWidth:value===v?1:0,borderColor:th.br}}><T weight="800" color={value===v?th.br:th.ink}>{v==='delivery'?'Delivery':'Pick-up'}</T></Pressable>)}
  </View>;
}

function GroupOrderSheet({close}: {close: () => void}) {
  const th = useTheme();
  const [name, setName] = useState('');
  const [group, setGroup] = useState(() => {
    if (S.groupOrder) return S.groupOrder;
    const next = {code: 'GD' + Math.random().toString(36).slice(2, 7).toUpperCase(), host: S.pf.n || 'You', members: []};
    S.groupOrder = next; save(); return next;
  });
  const saveGroup = (next: any) => { setGroup(next); S.groupOrder = next; save(); emit(); };
  const groupSubtotal = S.cart.lines.reduce((sum: number, line: any) => sum + Number(line.p || 0) * Number(line.q || 0), 0);
  const invite = async () => {
    try {
      await Share.share({message: 'Wantiss Goodies group-order invitation. Code: ' + group.code + '. Store: ' + (S.cart.sid && STB[S.cart.sid] ? STB[S.cart.sid].n : 'Choose a store together') + '. This is a demo invitation; please send your item choices to the host so they can add them to the shared cart.'});
    } catch (_) { toast('Invite code: ' + group.code); }
  };
  return <>
    <T size={21} weight="800">Group order</T>
    <T size={13} color={th.mut} style={{marginTop:5, marginBottom:12}}>Start a shared cart, invite friends, and coordinate everyone’s items before checkout.</T>
    <Card style={{marginBottom:12}}>
      <Row sp><View style={{flex:1}}><T size={11.5} weight="800" color={th.mut}>GROUP INVITE CODE</T><T size={22} weight="800">{group.code}</T></View><Cta small label="Invite people" onPress={invite} /></Row>
      <T size={12} color={th.mut} style={{marginTop:7}}>Sharing uses your phone’s share menu. This demo coordinates members locally; it does not create a server-hosted join link.</T>
    </Card>
    <Card style={{marginBottom:12}}>
      <T size={14} weight="800">Shared cart</T>
      {S.cart.lines.length ? S.cart.lines.map((line:any)=><Row key={line.k} sp style={{marginTop:8,alignItems:'flex-start'}}><View style={{flex:1}}><T size={13} weight="700">{line.q}× {line.n}</T>{line.d ? <T size={11.5} color={th.mut}>{line.d}</T> : null}</View><T size={13} weight="700">{money(line.p*line.q)}</T></Row>) : <T size={12.5} color={th.mut} style={{marginTop:7}}>Add items to the cart from the selected store. The host controls checkout.</T>}
      <Row sp style={{marginTop:12,paddingTop:10,borderTopWidth:1,borderTopColor:th.line}}><T weight="800">Subtotal</T><T weight="800">{money(S.cart.lines.reduce((sum:number,line:any)=>sum+line.p*line.q,0))}</T></Row>
      {S.cart.sid && STB[S.cart.sid] ? <T size={12} color={th.mut} style={{marginTop:5}}>Store: {STB[S.cart.sid].n}</T> : null}
      <View style={{height:10}}/><Cta ghost label="View cart" onPress={()=>{close();A.go('cart');}} />
    </Card>
    <T size={15} weight="800" style={{marginBottom:7}}>Group members</T>
    <Row style={{gap:8, marginBottom:10}}>
      <View style={{flex:1}}><Input value={name} onChange={setName} placeholder="Enter member name" /></View>
      <View style={{width:88}}><Cta label="Add" onPress={() => {
        const n=name.trim(); if(!n) {toast('Enter a member name'); return;}
        if(group.members.some((m:any)=>m.name.toLowerCase()===n.toLowerCase())) {toast('That member is already in the group'); return;}
        saveGroup({...group,members:[...group.members,{id:Date.now(),name:n,status:'Invited'}]}); setName('');
      }} /></View>
    </Row>
    <Card>
      <Row style={{gap:10, alignItems:'center', paddingVertical:4}}>
        <View style={{width:38,height:38,borderRadius:19,backgroundColor:th.brt,alignItems:'center',justifyContent:'center'}}><Icon name="user" color={th.br} /></View>
        <View style={{flex:1}}><T weight="800">{group.host || S.pf.n || 'You'} (Host)</T><T size={12} color={th.mut}>Owns the group cart</T></View>
        <Badge green label="Active" />
      </Row>
      {group.members.map((m:any)=><View key={m.id} style={{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:10,borderTopWidth:1,borderTopColor:th.line}}>
        <View style={{width:38,height:38,borderRadius:19,backgroundColor:th.soft,alignItems:'center',justifyContent:'center'}}><Icon name="user" color={th.mut} /></View>
        <View style={{flex:1}}><T weight="700">{m.name}</T><T size={12} color={th.mut}>Waiting to add items</T></View>
        <Badge label={m.status || 'Invited'} />
        <Pressable accessibilityRole="button" accessibilityLabel={'Remove '+m.name} onPress={()=>saveGroup({...group,members:group.members.filter((x:any)=>x.id!==m.id)})}><Icon name="x" size={18} color={th.red}/></Pressable>
      </View>)}
      {!group.members.length ? <T size={13} color={th.mut} style={{paddingVertical:10}}>No members yet. Invite friends or add their names to plan the group.</T> : null}
    </Card>
    <View style={{height:12}}/>
    <T size={15} weight="800" style={{marginBottom:7}}>Shared cart</T>
    <Card>
      {S.cart.lines.length ? S.cart.lines.map((line:any)=><Row key={line.k} sp style={{paddingVertical:7,alignItems:'flex-start'}}><View style={{flex:1}}><T weight="700">{line.q}× {line.n}</T>{line.d ? <T size={11.5} color={th.mut}>{line.d}</T> : null}</View><T weight="700">{money(line.p*line.q)}</T></Row>) : <T size={12.5} color={th.mut}>The host cart is empty. Add items from a store to start the group order.</T>}
      <View style={{borderTopWidth:1,borderTopColor:th.line,marginTop:5,paddingTop:10}}><Row sp><T weight="800">Items subtotal</T><T weight="800">{money(groupSubtotal)}</T></Row><T size={11.5} color={th.mut} style={{marginTop:4}}>Delivery and service fees are calculated at checkout.</T></View>
    </Card>
    <View style={{height:12}} />
    <Cta label="Done" onPress={close} />
    <View style={{height:8}} />
    <Cta ghost label="End group order" onPress={() => {S.groupOrder=null; save(); emit(); close(); toast('Group order ended');}} />
  </>;
}

function ReviewSheet({id, stars, driver = false, initialStars = 0}: {id: string; stars: any; driver?: boolean; initialStars?: number}) {
  const [n, setN] = useState(initialStars || S.rt || 0), [t, setT] = useState('');
  return (<>
    <T size={20} weight="800">{driver ? 'Rate your driver' : 'Rate your order'}</T>{stars(n, setN)}
    <Input value={t} onChange={setT} placeholder="Add a comment (optional)" multiline />
    <View style={{height: 12}} />
    <Cta label="Submit review" onPress={() => {
      const o = S.orders.filter((x: any) => x.id === id)[0];
      if (!o) {toast('Order not found'); return;}
      if (!n) {toast('Pick a star rating'); return;}
      if (driver) {
        S.driverRev = S.driverRev || {};
        S.driverRev[id] = {n: S.pf.n, r: n, t: t.trim(), d: 'Just now', orderId: id};
        o.driverRated = n;
        o.driverReview = {r: n, t: t.trim(), d: 'Just now'};
      } else {
        S.rev[o.sid] = S.rev[o.sid] || [];
        S.rev[o.sid].unshift({n: S.pf.n, r: n, t: t.trim(), d: 'Just now', you: 1, orderId: id});
        o.rated = n;
        o.orderReview = {r: n, t: t.trim(), d: 'Just now'};
      }
      S.rt = 0; ui.close(); toast(driver ? 'Thanks for rating your driver!' : 'Thanks for your review!'); save(); emit();
    }} />
  </>);
}

function ContactsSheet({close}: {close: () => void}) {
  const th = useTheme();
  const rows = [{id: 'w', ph: S.pf.ph, l: 'Default Wantiss number', w: 1}].concat(S.gc.map((c: any) => ({id: c.id, ph: c.ph, l: c.l || 'Goodies number', w: 0})));
  return (<>
    <T size={20} weight="800" style={{marginBottom: 4}}>Contact number</T>
    <T size={12.5} color={th.mut} style={{marginBottom: 12}}>We use this number for this order only. Your Wantiss account number is never changed here.</T>
    {rows.map((r: any) => (
      <View key={r.id} style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
        <View style={{flex: 1}}><Radio on={S.cc === r.id} onPress={() => {S.cc = r.id; close(); save(); emit();}}><T weight="700">{r.ph}</T><View style={{marginTop: 3}}>{r.w ? <Badge green label="Default Wantiss number" /> : <T size={12.5} color={th.mut}>Goodies checkout number · {r.l}</T>}</View></Radio></View>
        {r.w ? null : <><Pressable accessibilityLabel="Edit number" onPress={() => ui.sheet({kind: 'ctform', id: r.id})}><T size={13} weight="700" color={th.br}>Edit</T></Pressable>
        <Pressable accessibilityLabel="Remove number" onPress={() => {if (S.orders.some((o: any) => !done(o) && o.cid == r.id)) {toast('This number is used by an active order'); return;} S.gc = S.gc.filter((c: any) => c.id !== r.id); if (S.cc === r.id) S.cc = 'w'; toast('Number removed'); save(); emit(); ui.sheet({kind: 'contacts'});}}><Icon name="trash" size={18} color={th.red} /></Pressable></>}
      </View>
    ))}
    <Cta ghost label="+ Add another number" onPress={() => ui.sheet({kind: 'ctform', id: ''})} />
  </>);
}
function CtForm({id}: {id: any}) {
  const th = useTheme(), c = S.gc.filter((x: any) => x.id == id)[0] || {l: '', ph: ''};
  const [l, setL] = useState(c.l || ''), [ph, setPh] = useState(c.ph || '');
  const save_ = () => {
    const p = ph.trim();
    if (!phoneOK(p)) return toast('Enter a valid phone number (8 to 15 digits)');
    const dg = p.replace(/\\D/g, '');
    if (dg === S.pf.ph.replace(/\\D/g, '')) return toast('That is already your Wantiss number');
    if (S.gc.some((x: any) => x.id != id && String(x.ph).replace(/\\D/g, '') === dg)) return toast('You already saved that number');
    const cc = S.gc.filter((x: any) => x.id == id)[0];
    if (cc) {cc.ph = p; cc.l = l.trim();} else {const n = {id: Date.now(), ph: p, l: l.trim()}; S.gc.push(n); S.cc = n.id;}
    toast('Number saved for Goodies checkout'); save(); emit(); ui.sheet({kind: 'contacts'});
  };
  return (<>
    <T size={20} weight="800">{id ? 'Edit' : 'Add'} contact number</T>
    <T size={12.5} color={th.mut} style={{marginTop: 3}}>Saved for Goodies checkout only. Your Wantiss account number is not changed here. Country-code management will be handled in Wantiss settings.</T>
    <Input label="Label (optional)" value={l} onChange={setL} placeholder="e.g. Partner, Office" />
    <Input label="Phone number" value={ph} onChange={setPh} placeholder="Enter phone number" keyboard="phone-pad" />
    <View style={{height: 14}} /><Cta label="Save number" onPress={save_} /><View style={{height: 10}} /><Cta ghost label="Back" onPress={() => ui.sheet({kind: 'contacts'})} />
  </>);
}

/* DEMO: paste the JSON exported from Wantiss Admin (Goodies > Overview > Export content). Production fetches the same shape from the backend. */
function ImportSheet({close}: {close: () => void}) {
  const th = useTheme(), [txt, setTxt] = useState('');
  return (<>
    <T size={20} weight="800">Import Admin content</T>
    <T size={12.5} color={th.mut} style={{marginTop: 6, marginBottom: 10}}>Paste the content exported from Wantiss Admin. It replaces promo cards, categories, labels, fees, age rules, texts and artwork in this demo. {hasContent() ? 'Admin content is currently loaded.' : 'The built-in sample content is currently used.'}</T>
    <TextInput value={txt} onChangeText={setTxt} multiline placeholder="Paste JSON here" placeholderTextColor={th.mut} style={{minHeight: 120, maxHeight: 220, fontSize: 12, color: th.ink, backgroundColor: th.soft, borderWidth: 1, borderColor: th.line, borderRadius: 12, padding: 10, textAlignVertical: 'top'}} />
    <View style={{height: 12}} />
    <Cta label="Import" onPress={async () => {try {await importContent(txt.trim()); close(); toast('Admin content loaded'); emit();} catch (e: any) {toast(String(e && e.message ? e.message : 'That is not valid JSON'));}}} />
    {hasContent() ? <><View style={{height: 10}} /><Cta ghost label="Go back to sample content" onPress={async () => {await clearContent(); close(); toast('Using sample content'); emit();}} /></> : null}
  </>);
}
