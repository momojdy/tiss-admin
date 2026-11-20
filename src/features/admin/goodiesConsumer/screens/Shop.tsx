import {EditableNativeText as Text} from '../EditableNativeText';
import {GOODIES_SHARED_PAYMENTS_RELEASED} from '../helpPayApi';
import {friendlyError} from '../friendlyError';
import {loadOlderGoodiesOrders, refreshGoodiesOrders} from '../serverSync';
import {useStoreReviews} from '../reviews';
import {coordinate, courierLocation, routeSegments, trackingRegion} from '../deliveryTracking';
import {previewDeliveryProof as resolveGoodiesDeliveryProof} from '../previewRuntime';
import {createGoodiesRefresh} from '../refreshScope';
import React, {useState, useEffect, useRef} from 'react';
import {previewClipboard as Clipboard} from '../previewNative';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {View, Text as UnusedNativeText, Pressable, ScrollView, useWindowDimensions, Image, TextInput, ActivityIndicator, Alert, AppState} from 'react-native';
import {Icon} from '../components/Icon';
import {T, Grad, Circ, Bar, Sh, Rail, Chips, Cta, Card, Row, Badge, Ttl, Empty, Tile, Radio, Seg, Stepper, Input, Switch, bgIdx, useTheme} from '../components/ui';
import {Dish, StoreCard, ItemRow} from '../components/cards';
import {storeSub, lineStore, fmtTime, fmtDay, fmtStoreTime, fmtStoreDay, hasAlcohol, alcAge, S, ST, STB, IT, DEALS, money, dp, addr, cnt, first, totals, isPk, ctOf, qtyIn, done, TL, TP, defAddr, emit, save, toast, refreshLiveSchedules, refreshStoreDistance, deliveryAddressKey, deliveryQuoteReady, refreshGoodiesDeliveryQuote, refreshFirstDeliveryEligibility} from '../store';
import {go, tab, back, browse, heart, favp, setSize, toggleDrink, productQty, productAdd, qty, clearAsk, promoApply, promoClear, goCheckout, checkoutNext, setMode, setTip, setSch, setPay, setCard, placeOrder, cancelAsk, reorder, setOrdersTab, refreshPaymentOptions} from '../actions';
import {CHOOSE_SIZE_CATS, setConsent, createWallet} from '../actions';
import {rgText, stageLabels, fees, faq as faqList, label} from '../content';
import {BYO, loadBuilders, byoRows, byoOn, lineBad, bzEdit, bzRemove} from '../builders/engine';
import {ScheduleInline} from '../components/Sheets';
import {t as tr} from '../i18n';
import {previewBackend as supabase} from '../previewRuntime';
import Svg, {Path, Circle} from 'react-native-svg';
import MapView, {Marker, Polyline} from '../previewNative';


const Hero = ({s, onBack, right}: any) => (
  <View style={{height: 220, overflow: 'hidden', backgroundColor: '#E8EDE5'}}>
    {s.cover || s.thumbnail || s.logo ? <Image source={{uri: s.cover || s.thumbnail || s.logo}} style={{width: '100%', height: 220, position: 'absolute'}} resizeMode="cover" /> : <Grad idx={bgIdx(s.bg)} style={{height: 220, alignItems: 'center', justifyContent: 'center'}}><Text style={{fontSize: 90}}>{s.e}</Text></Grad>}
    <View style={{position: 'absolute', top: 50, left: 16}}><Circ icon="chevL" label={tr('back')} onPress={onBack} /></View>
    {right ? <View style={{position: 'absolute', top: 50, right: 16}}>{right}</View> : null}
  </View>
);


export function Store({id}: {id: string}) {
  const [shareOpen,setShareOpen]=useState(false);
  const [shareLoading,setShareLoading]=useState(false);
  const [shareProblem,setShareProblem]=useState('');
  const [shareSending,setShareSending]=useState<string|null>(null);
  const [shareQuery,setShareQuery]=useState('');
  const [shareFriends,setShareFriends]=useState<Array<{id:string;name:string;avatar:string|null}>>([]);
  const storeShareUrl='wantiss://goodies/store/'+encodeURIComponent(id);
  const openStoreShare=async()=>{
    const accountId=S.accountId;
    setShareOpen(true);setShareLoading(true);setShareProblem('');
    try{
      const {data:{user}}=await supabase.auth.getUser();
      if(S.accountId!==accountId)return;
      if(!user||user.id!==accountId){setShareFriends([]);setShareProblem(label("lbl.cms.5ee02dc1f983", "Could not load friends."));return;}
      const [{data:friendships,error:friendError},{data:profiles,error:profileError}]=await Promise.all([
        supabase.from('user_friendships').select('requester_id,recipient_id').eq('status','accepted').or('requester_id.eq.'+user.id+',recipient_id.eq.'+user.id),
        supabase.rpc('wantiss_message_contact_profiles')
      ]);
      if(S.accountId!==accountId)return;
      if(friendError||profileError)throw friendError||profileError;
      const ids=new Set((friendships||[]).map(f=>f.requester_id===user.id?f.recipient_id:f.requester_id));
      setShareFriends((profiles||[]).filter((p:any)=>ids.has(p.id)).map((p:any)=>({id:p.id,name:p.full_name||p.wantiss_number||'Wantiss friend',avatar:p.avatar_url||null})));
    }catch(e){if(S.accountId===accountId){const message=friendlyError(e,label("lbl.cms.5ee02dc1f983", "Could not load friends."));setShareProblem(message);Alert.alert(label("lbl.cms.2bb2b73d8ff1", "Friends unavailable"),message);}}
    finally{setShareLoading(false);}
  };
  const sendStoreToFriend=async(friendId:string)=>{
    if(shareSending)return;const accountId=S.accountId;setShareSending(friendId);
    try{
      const {data:{user}}=await supabase.auth.getUser();if(S.accountId!==accountId||user?.id!==accountId)return;if(!user)throw new Error('Please sign in.');
      const {data:existing,error:findError}=await supabase.from('conversations').select('id').eq('feature','friends').contains('participant_ids',[user.id,friendId]).limit(1).maybeSingle();
      if(S.accountId!==accountId)return;
      if(findError)throw findError;
      let conversationId=existing?.id;
      if(!conversationId){
        const {data:created,error:createError}=await supabase.from('conversations').insert({participant_ids:[user.id,friendId],customer_id:user.id,feature:'friends',status:'active',title:'Wantiss conversation'}).select('id').single();
        if(createError)throw createError;conversationId=created.id;
      }
      if(S.accountId!==accountId)return;
      const body='[wantiss-attachment-v1]'+JSON.stringify({kind:'store',name:STB[id]?.n||'Goodies store',reference:storeShareUrl,image:STB[id]?.cover||STB[id]?.thumbnail||STB[id]?.logo||undefined});
      const {error:sendError}=await supabase.from('messages').insert({conversation_id:conversationId,sender_id:user.id,body});
      if(S.accountId!==accountId)return;
      if(sendError)throw sendError;
      await supabase.from('conversations').update({updated_at:new Date().toISOString()}).eq('id',conversationId);
      setShareOpen(false);toast(label("lbl.cms.3c2b5e6ec88d", "Store shared in Wantiss Messages"));
    }catch(e){Alert.alert(label("lbl.cms.80f7eb45bdba", "Could not share store"),friendlyError(e,label("lbl.cms.c097a7fccce6", "Please try again.")));}
    finally{setShareSending(null);}
  };
  const th = useTheme(), s = STB[id], address = addr(), t = S.ss[id + 't'] || 'all', q = (S.ss[id] || '').toLowerCase();
  const reviewState = useStoreReviews(id);
  useEffect(() => {
    let active = true;
    void refreshLiveSchedules().then(() => {
      if (active && address?.t) return refreshStoreDistance(id, address).catch(() => undefined);
    });
    return () => { active = false; };
  }, [id, address?.t, address?.apt, address?.inst, address?.city, address?.department, address?.country]);
  if (!s) return <View style={{flex:1,padding:24,alignItems:'center',justifyContent:'center',gap:12}}><Text cmsKey={"lbl.cms.3deeda5e9747"} style={{fontSize:17,fontWeight:'600',color:th.ink}}>{label("lbl.cms.3deeda5e9747", "Store unavailable")}</Text><Text cmsKey={"lbl.cms.21eb641a53bd"} style={{fontSize:13,color:th.mut,textAlign:'center'}}>{label("lbl.cms.21eb641a53bd", "This store is not available in the Goodies catalog right now.")}</Text><Pressable onPress={back} style={{padding:12}}><Text cmsKey={"lbl.cms.a55440a13be7"} style={{color:'#BF008E',fontSize:14}}>{label("lbl.cms.a55440a13be7", "Go back")}</Text></Pressable></View>;
  const l = s.it.filter((i, n) => (!q || i.n.toLowerCase().indexOf(q) > -1) && (t === 'all' || (t === 'pop' && n < 2) || (t === 'deal' && DEALS.some(d => d[0] === i.id))));
  const rows = t === 'all' || t === 'custom' ? byoRows(id, q) : null;
  const items = t === 'custom' ? [] : l;
  const reviews = reviewState.rows;
  const tabs: [string, string][] = [['all', label('lbl.storeAll', 'All')], ['pop', label('lbl.storePopular', 'Popular')], ['deal', label('lbl.storeDeals', 'Deals')], ...(byoOn(id) ? [['custom', label('lbl.storeCustom', 'Custom products')] as [string, string]] : [])];
  return (
    <View>
      <Hero s={s} onBack={back} right={<View style={{flexDirection:'row',gap:8,alignItems:'center'}}><Pressable accessibilityLabel={label("lbl.cms.a7b88c6bea1a", "Share store")} onPress={()=>void openStoreShare()} style={{width:40,height:40,borderRadius:20,backgroundColor:'#FFFFFF',alignItems:'center',justifyContent:'center'}}><MaterialCommunityIcons name="share-variant-outline" size={22} color="#FD802E"/></Pressable><Circ icon="heart" label={label('lbl.storeSave', 'Save store')} color={S.fav.indexOf(id) > -1 ? '#FD802E' : undefined} fill={S.fav.indexOf(id) > -1} onPress={() => heart(id)} /></View>} />
      {shareOpen?<View style={{margin:14,padding:14,borderRadius:18,backgroundColor:'#FFF7FB',borderWidth:1,borderColor:'#F0D9E9',gap:12}}>
        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><View style={{flex:1}} /><Pressable onPress={()=>setShareOpen(false)} accessibilityLabel={label("lbl.cms.3f3b2e1178c9", "Close share panel")}><MaterialCommunityIcons name="close" size={22} color="#302631"/></Pressable></View>
        <View style={{flexDirection:'row',alignItems:'center',gap:10}}>{s.cover||s.thumbnail||s.logo?<Image source={{uri:s.cover||s.thumbnail||s.logo||undefined}} style={{width:58,height:58,borderRadius:12}}/>:null}<View style={{flex:1}}><Text style={{color:'#302631',fontWeight:'600'}} numberOfLines={1}>{s.n}</Text><Text cmsKey={"lbl.cms.ca48b79aba54"} style={{color:'#827783',fontSize:12}}>{label("lbl.cms.ca48b79aba54", "Goodies store")}</Text></View></View>
        <Pressable onPress={async()=>{await Clipboard.setStringAsync(storeShareUrl);toast(label("lbl.cms.eb1f7b6d929c", "Store link copied"));}} style={{padding:12,borderRadius:12,backgroundColor:'#FFFFFF',flexDirection:'row',gap:9,alignItems:'center'}}><MaterialCommunityIcons name="content-copy" size={19} color="#BF008E"/><Text cmsKey={"lbl.cms.48feb130cb0a"} style={{color:'#BF008E',fontWeight:'600'}}>{label("lbl.cms.48feb130cb0a", "Copy store link")}</Text></Pressable>
        <Text cmsKey={"lbl.cms.edaff19cc43c"} style={{fontSize:14,fontWeight:'600',color:'#302631'}}>{label("lbl.cms.edaff19cc43c", "Send to a Wantiss friend")}</Text>
        <TextInput value={shareQuery} onChangeText={setShareQuery} placeholder={label("lbl.cms.eb7b802f12ab", "Search friends")} style={{backgroundColor:'#FFFFFF',borderRadius:11,paddingHorizontal:12,paddingVertical:10,color:'#302631'}}/>
        {shareLoading?<ActivityIndicator color="#BF008E"/>:shareProblem?<View><Text style={{color:th.red}}>{shareProblem}</Text><Pressable onPress={()=>void openStoreShare()} style={{paddingVertical:8}}><Text cmsKey={'lbl.retry'} style={{color:'#BF008E'}}>{label('lbl.retry','Try again')}</Text></Pressable></View>:<ScrollView style={{maxHeight:205}} keyboardShouldPersistTaps="handled">{shareFriends.filter(friend=>friend.name.toLowerCase().includes(shareQuery.trim().toLowerCase())).map(friend=><Pressable key={friend.id} disabled={!!shareSending} onPress={()=>void sendStoreToFriend(friend.id)} style={{paddingVertical:10,flexDirection:'row',alignItems:'center',gap:10}}>{friend.avatar?<Image source={{uri:friend.avatar}} style={{width:38,height:38,borderRadius:19}}/>:<View style={{width:38,height:38,borderRadius:19,backgroundColor:'#EBD7E7',alignItems:'center',justifyContent:'center'}}><MaterialCommunityIcons name="account" size={20} color="#BF008E"/></View>}<Text style={{color:'#302631',flex:1}} numberOfLines={1}>{friend.name}</Text>{shareSending===friend.id?<ActivityIndicator size="small" color="#BF008E"/>:<MaterialCommunityIcons name="send-outline" size={20} color="#BF008E"/>}</Pressable>)}{!shareFriends.length?<Text cmsKey={"lbl.cms.908e66f0e1a3"} style={{color:'#827783',padding:8}}>{label("lbl.cms.908e66f0e1a3", "No accepted friends to show yet.")}</Text>:null}</ScrollView>}
      </View>:null}
      <View style={{paddingHorizontal: 16}}>
        <T size={24} weight="600" style={{marginTop: 16}}>{s.n}</T>
        <T cmsKeys={["lbl.cms.ffbce6e6a57c","lbl.cms.6f24af4842a9","lbl.cms.a2cc2b9fa21d","lbl.cms.0a7b93a19c11",'lbl.sheetKmAway',"lbl.cms.a85c2c949931"]} size={13} color={th.mut} style={{marginTop: 3}}>{s.k}{s.live && s.distanceReady ? ' · ' + (Math.round(s.km * 1000) < 1000 ? Math.round(s.km * 1000) + label("lbl.cms.ffbce6e6a57c", " m") : s.km.toFixed(1) + label("lbl.cms.6f24af4842a9", " km")) + (S.currentLocation && S.currentLocation.addressText === address?.t ? label("lbl.cms.a2cc2b9fa21d", " from your location") : label("lbl.cms.0a7b93a19c11", " from your address")) : !s.live ? ' · ' + label('lbl.sheetKmAway', '{km} km away').replace('{km}', s.km.toFixed(1)) : s.live && s.distanceError ? label("lbl.cms.a85c2c949931", " · Distance unavailable") : ''}</T>
        {!s.open ? <Card style={{backgroundColor: th.brt, borderColor: th.br, marginTop: 12}}><T cmsKey={'lbl.storeClosed'} weight="600">{label('lbl.storeClosed', 'Closed right now')}</T><T cmsKeys={["lbl.cms.9a05153daef9","lbl.cms.f1cd4727c8c8"]} size={13} color={th.mut}>{s.acceptScheduledOrders ? s.nx + label("lbl.cms.9a05153daef9", ". Scheduled orders are available for future opening-time slots.") : s.nx + label("lbl.cms.f1cd4727c8c8", ". Ordering is paused until then.")}</T></Card> : null}
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, marginBottom: 4}}>
          <Pressable accessibilityRole="button" accessibilityLabel={label('lbl.storeReadReviews', 'Read store reviews')} onPress={() => go('reviews', id)}><Badge green label={s.ratingsAvailable===false ? label('lbl.ratingsUnavailable', 'Ratings unavailable') : s.live && s.rv === 0 ? label('lbl.storeNewNoReviews', 'New · No reviews yet') : '★ ' + s.r.toFixed(1) + ' (' + s.rv + ')'} /></Pressable><Badge cmsKey={'lbl.unitMinutes'} label={s.eta + label('lbl.unitMinutes', ' min')} /><Badge label={s.fee === 0 ? tr('freeDelivery') : money(s.fee) + ' ' + tr('delivery')} /><Badge cmsKey={"lbl.cms.60f2f9167a32"} label={label("lbl.cms.60f2f9167a32", "Min. ") + money(s.min)} /><Badge cmsKey={"lbl.shopAuto18E4IBZ"} label={label("lbl.shopAuto18E4IBZ", "Delivery + pickup")} />{s.pr ? <Badge label={s.pr} /> : null}
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 10}}>
          <Cta cmsKey={'lbl.storeInfo'} small ghost label={label('lbl.storeInfo', 'Store info')} onPress={() => require('../store').ui.sheet({kind: 'sinfo', id})} />
          <Cta cmsKey={'lbl.messageStore'} small ghost label={label('lbl.messageStore', 'Message store')} onPress={() => go('contact', {storeContact: true, storeId: id})} />
          <Pressable accessibilityRole="button" accessibilityLabel={label('lbl.storeGroupOrder', 'Start a group order')} onPress={() => require('../store').ui.sheet({kind: 'group-order', storeId: id})} hitSlop={10} style={{padding: 4, alignItems: 'center', justifyContent: 'center'}}><Icon name="user-plus" size={21} color={th.br} /></Pressable>
        </View>
        <View style={{marginTop: 14}}><Input cmsPlaceholderKey={'lbl.storeSearch'} value={S.ss[id] || ''} onChange={v => {S.ss[id] = v; emit();}} placeholder={label('lbl.storeSearch', 'Search in {store}').replace('{store}',s.n)} /></View>
      </View>
      <View style={{marginTop: 8}}><Chips list={tabs} on={t} onPick={k => {S.ss[id + 't'] = k; emit();}} /></View>
      <View style={{paddingHorizontal: 16, marginTop: 4}}>
        {s.live && BYO.loading ? <T cmsKey={'lbl.buildersLoading'} color={th.mut}>{label('lbl.buildersLoading', 'Loading custom products…')}</T> : null}
        {s.live && BYO.error ? <Card><T color={th.red}>{BYO.error}</T><Cta cmsKey={'lbl.retry'} small ghost label={label('lbl.retry', 'Try again')} onPress={() => void loadBuilders()} /></Card> : null}
        {rows || items.length ? (<>{rows}{items.map(i => <ItemRow key={i.id} i={i} />)}</>) : !BYO.loading && !BYO.error ? <Empty emoji="🔎" title={label('lbl.storeNoItems', 'No items found')} text={label('lbl.storeTryAnother', 'Try another word.')} /> : null}
        <T cmsKey={'lbl.storeReviews'} size={19} weight="600" style={{marginTop: 24, marginBottom: 8}}>{label('lbl.storeReviews', 'Reviews')}</T>
        {reviews.map((v: any, k: number) => (
          <Card key={k} style={{marginBottom: 8}}>
            <Row sp><Row style={{gap: 6}}><T weight="600">{v.n}</T>{v.you ? <Badge cmsKey={'lbl.storeYourReview'} label={label('lbl.storeYourReview', 'Your review')} /> : null}</Row><Row style={{gap: 3}}><Icon name="star" size={13} color="#FFB400" fill /><T size={13} weight="600">{v.r}</T></Row></Row>
            <T cmsKey={'lbl.storeNoComment'} size={13.5} color={th.mut} style={{marginTop: 4}}>{v.t || label('lbl.storeNoComment', 'No comment')}</T>
            <T size={11.5} color={th.mut} style={{marginTop: 4}}>{v.d}</T>
          </Card>
        ))}
        {reviewState.loading ? <T cmsKey={'lbl.reviewsLoading'} color={th.mut}>{label('lbl.reviewsLoading', 'Loading reviews…')}</T> : null}
        {reviewState.error ? <Empty title={label('lbl.reviewsFailed', 'Could not load reviews')} button={label('lbl.retry', 'Try again')} onPress={reviewState.reload} /> : null}
        {reviewState.hasMore ? <Cta cmsKey={'lbl.loadMore'} ghost disabled={reviewState.loading} label={label('lbl.loadMore', 'Load more')} onPress={reviewState.more} /> : null}
        {!reviews.length && !reviewState.loading && !reviewState.error ? <Empty emoji="⭐" title={label('lbl.storeNoReviews', 'No reviews yet')} text={s.live && s.rv > 0 ? label('lbl.storeRatingsOnly', 'Ratings are available, but written review details are not available here yet.') : label('lbl.storeBeFirstReview', 'Be the first customer to review this store.')} /> : null}
      </View>
    </View>
  );
}

export function StoreReviews({id}: {id: string}) {
  const th = useTheme(), s = STB[id];
  const reviewState = useStoreReviews(id);
  if (!s) return <View><Bar cmsKey={'lbl.storeReviewsTitle'} title={label('lbl.storeReviewsTitle', 'Store reviews')} onBack={back} /><Empty emoji="⭐" title={label('lbl.storeNotFound', 'Store not found')} button={label('lbl.storeBackToStores', 'Back to stores')} onPress={browse} /></View>;
  const reviews = reviewState.rows;
  return (
    <View>
      <Bar cmsKey={'lbl.storeReviews'} title={label('lbl.storeReviews', 'Reviews')} onBack={back} />
      <View style={{paddingHorizontal: 16}}>
        <Card style={{marginBottom: 14}}>
          <Row style={{alignItems: 'center', gap: 12}}>
            <View style={{width: 54, height: 54, borderRadius: 16, backgroundColor: th.soft, alignItems: 'center', justifyContent: 'center'}}><Text style={{fontSize: 30}}>{s.e}</Text></View>
            <View style={{flex: 1}}><T size={18} weight="600">{s.n}</T><T cmsKey={'lbl.storeCustomerReviews'} size={13} color={th.mut}>{label('lbl.storeCustomerReviews', 'Customer reviews')}</T></View>
            <View style={{alignItems: 'flex-end'}}>{s.ratingsAvailable===false ? <T cmsKey={'lbl.ratingsUnavailable'} size={12} color={th.mut}>{label('lbl.ratingsUnavailable', 'Ratings unavailable')}</T> : s.rv > 0 ? <><T size={22} weight="600">★ {s.r.toFixed(1)}</T><T cmsKey={"lbl.page.screens.Shop.a03800365a"} size={11.5} color={th.mut}>{s.rv} {label("lbl.page.screens.Shop.a03800365a", " reviews")}</T></> : <T cmsKey={'lbl.storeNoReviewsYet'} size={12} color={th.mut}>{label('lbl.storeNoReviewsYet', 'No reviews yet')}</T>}</View>
          </Row>
        </Card>
        {reviewState.loading ? <T cmsKey={'lbl.reviewsLoading'} color={th.mut}>{label('lbl.reviewsLoading', 'Loading reviews…')}</T> : null}
        {reviewState.error ? <Empty title={label('lbl.reviewsFailed', 'Could not load reviews')} button={label('lbl.retry', 'Try again')} onPress={reviewState.reload} /> : null}
        {reviews.length ? reviews.map((v: any, k: number) => <Card key={k} style={{marginBottom: 10}}>
          <Row sp><Row style={{gap: 6}}><T weight="600">{v.n}</T>{v.you ? <Badge cmsKey={'lbl.storeYourReview'} label={label('lbl.storeYourReview', 'Your review')} /> : null}</Row><Row style={{gap: 4}}><Icon name="star" size={13} color="#FFB400" fill /><T size={13} weight="600">{v.r}</T></Row></Row>
          <T cmsKey={'lbl.storeNoComment'} size={13.5} style={{marginTop: 6}}>{v.t || label('lbl.storeNoComment', 'No comment')}</T>
          <T size={11.5} color={th.mut} style={{marginTop: 5}}>{v.d}</T>
        </Card>) : !reviewState.loading && !reviewState.error ? <Empty emoji="⭐" title={label('lbl.storeNoReviews', 'No reviews yet')} text={s.live && s.rv > 0 ? label('lbl.storeRatingsOnly', 'Ratings are available, but written review details are not available here yet.') : label('lbl.storeBeFirstReview', 'Be the first customer to review this store.')} /> : null}
        {reviewState.hasMore ? <Cta cmsKey={'lbl.loadMore'} ghost disabled={reviewState.loading} label={label('lbl.loadMore', 'Load more')} onPress={reviewState.more} /> : null}
        <Cta cmsKey={'lbl.storeBack'} ghost label={label('lbl.storeBack', 'Back to store')} onPress={() => go('store', id)} />
      </View>
    </View>
  );
}

export function Product() {
  const th = useTheme(), {width} = useWindowDimensions(), h = S.sh, i = h && IT[h.id];
  const [photoIndex, setPhotoIndex] = useState(0);
  useEffect(() => { setPhotoIndex(0); }, [h?.id]);
  if (!i || !STB[i.s]) return <View><Bar cmsKey={'lbl.productTitle'} title={label('lbl.productTitle', 'Product')} onBack={back} /><Empty emoji="📦" title={label('lbl.productNotFound', 'Product not found')} button={label('lbl.productBackGoodies', 'Back to Goodies')} onPress={browse} /></View>;
  const s = STB[i.s], o = CHOOSE_SIZE_CATS.indexOf(s.c) > -1, u = ['restaurants', 'bakery'].indexOf(s.c) > -1;
  const base = h.off ? dp(i, h.off) : i.p, unit = base + (h.size > 0 ? 1.5 : 0) + (h.drink ? 1 : 0);
  const rel = s.it.filter(x => x.id !== i.id).concat(ST.filter(x => x.c === s.c && x.id !== s.id).flatMap(x => x.it)).slice(0, 6);
  const fav = S.favp.indexOf(i.id) > -1;
  return (
    <View>
      <Bar title={s.n} onBack={back} stripe={false} right={<Circ icon="heart" label={label('lbl.productSaveItem', 'Save item')} color={S.favp.indexOf(i.id) > -1 ? '#FD802E' : undefined} fill={S.favp.indexOf(i.id) > -1} onPress={() => favp(i.id)} />} />
      {((i.photos && i.photos.length ? i.photos : i.photo ? [i.photo] : [])).length ? <>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={e => setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / width))}>
          {(i.photos && i.photos.length ? i.photos : [i.photo]).filter(Boolean).slice(0,5).map((photo: string, n: number) => <View key={photo + n} style={{width, height:210, backgroundColor:th.soft, alignItems:'center',justifyContent:'center'}}><Image source={{uri:photo}} style={{width,height:210}} resizeMode="contain" /></View>)}
        </ScrollView>
        {(i.photos && i.photos.length ? i.photos : [i.photo]).length > 1 ? <View style={{flexDirection:'row',justifyContent:'center',alignItems:'center',gap:6,marginTop:9}}>
          {(i.photos && i.photos.length ? i.photos : [i.photo]).slice(0,5).map((photo: string | null | undefined,n: number)=><View key={`${photo ?? 'photo'}-${n}`} style={{width:photoIndex===n?16:6,height:6,borderRadius:4,backgroundColor:photoIndex===n?th.br:th.line}} />)}
        </View> : null}
      </> : <Grad idx={bgIdx(s.bg)} style={{width, height:210}} />}
      <View style={{paddingHorizontal: 16}}>
        <T size={23} weight="600" style={{marginTop: 10}}>{i.n}</T>
        <Pressable onPress={() => go('store', s.id)}><T cmsKeys={['lbl.ratingsUnavailable',"lbl.cms.2d44412e115d"]} size={13.5} weight="600" color={th.br}>{s.n}{s.ratingsAvailable===false ? ' · '+label('lbl.ratingsUnavailable', 'Ratings unavailable') : s.rv > 0 ? ' · ★ ' + s.r.toFixed(1) : label("lbl.cms.2d44412e115d", " · New store")}</T></Pressable>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8}}>
          <T size={24} weight="600" color={th.br}>{money(base)}</T>
          {h.off ? <><T size={15} color={th.mut} style={{textDecorationLine: 'line-through'}}>{money(i.p)}</T><Badge label={'-' + h.off + '%'} /></> : null}
        </View>
        {i.w ? <T cmsKey={'lbl.productEstimatedPrice'} size={12.5} color={th.mut} style={{marginTop: 4}}>{label('lbl.productEstimatedPrice', 'Estimated price. Final amount may vary with the exact weight.')}</T> : null}
        <T size={14.5} style={{marginTop: 12, lineHeight: 21}}>{i.d}</T>
        {i.al ? <T cmsKey={'lbl.productAllergens'} size={13} color={th.mut} style={{marginTop: 6}}>{label('lbl.productAllergens', 'Allergens')}: {i.al}</T> : null}
        {(i as any).restriction === 'alcohol' ? <Card style={{backgroundColor: th.brt, borderColor: th.br, marginTop: 12}}><T cmsKey={'lbl.productAlcoholWarning'} weight="600">{label('lbl.productAlcoholWarning', 'Alcohol. Minors may not purchase.')}</T><T cmsKeys={["lbl.cms.423ee2331261","lbl.cms.55bf5c7385be"]} size={13} color={th.mut} style={{marginTop: 3}}>{rgText('rg.minors', 'Minors may not purchase alcohol.', alcAge(i.s).age)} {label("lbl.cms.423ee2331261", "Minimum age ")}{alcAge(i.s).age}{label("lbl.cms.55bf5c7385be", ". Valid government photo ID is required at delivery or pickup.")}</T></Card> : null}
        {(i as any).restriction === 'otc' ? <T cmsKey={'lbl.productOtcWarning'} size={12.5} color={th.mut} style={{marginTop: 8}}>{label('lbl.productOtcWarning', 'Over-the-counter product. Read the label and use as directed.')}</T> : null}
        <T cmsKeys={['lbl.productStockOut','lbl.productStockLow',"lbl.cms.764a54257195",'lbl.productInStock']} size={13} weight="600" color={i.oos ? th.red : i.stock <= 5 ? th.brd : th.grn} style={{marginTop: 8}}>{i.oos ? label('lbl.productStockOut', 'Out of stock') : i.stock <= 5 ? label('lbl.productStockLow', 'Only') + ' ' + i.stock + label("lbl.cms.764a54257195", " left") : label('lbl.productInStock', 'In stock')}</T>
        {o ? (<>
          <Row style={{marginTop: 18, marginBottom: 8, gap: 8}}><T cmsKey={'lbl.productSize'} size={15} weight="600">{label('lbl.productSize', 'Size')}</T><Badge cmsKey={'lbl.productRequired'} label={label('lbl.productRequired', 'Required')} /></Row>
          <Radio on={h.size === 0} onPress={() => setSize(0)}><T cmsKey={'lbl.productRegular'}>{label('lbl.productRegular', 'Regular')}</T></Radio>
          <Radio on={h.size === 1} onPress={() => setSize(1)}><Row sp><T cmsKey={'lbl.productLarge'}>{label('lbl.productLarge', 'Large')}</T><T weight="600">+$1.50</T></Row></Radio>
        </>) : null}
        {u ? <Radio on={!!h.drink} onPress={toggleDrink}><Row sp><T cmsKey={'lbl.productAddDrink'}>{label('lbl.productAddDrink', 'Add a drink')}</T><T weight="600">+$1.00</T></Row></Radio> : null}
        <Input cmsKey={'lbl.productInstructions'} cmsPlaceholderKey={'lbl.productOptional'} label={label('lbl.productInstructions', 'Special instructions')} value={h.note || ''} onChange={v => {S.sh.note = v; emit();}} placeholder={label('lbl.productOptional', 'Optional')} multiline />
        <T cmsKey={'lbl.productRecommendations'} size={18} weight="600" style={{paddingTop: 22, paddingBottom: 10}}>{label('lbl.productRecommendations', 'You may also like')}</T>
      </View>
      <Rail>{rel.map(x => <Dish key={x.id} i={x} />)}</Rail>
    </View>
  );
}
export function ProductFoot() {
  const th = useTheme(), h = S.sh, i = h && IT[h.id];
  if (!i || !STB[i.s]) return null;
  const s = STB[i.s], o = CHOOSE_SIZE_CATS.indexOf(s.c) > -1, base = h.off ? dp(i, h.off) : i.p, unit = base + (h.size > 0 ? 1.5 : 0) + (h.drink ? 1 : 0);
  const blocked = i.oos || (!s.open && !s.acceptScheduledOrders) || (o && h.size < 0), lbl = i.oos ? label('lbl.productStockOut', 'Out of stock') : !s.open && !s.acceptScheduledOrders ? label('lbl.productStoreClosed', 'Store is closed') : !s.open ? label('lbl.productScheduleOrder', 'Schedule order') + ' · ' + money(unit * h.q) : o && h.size < 0 ? label('lbl.productChooseSize', 'Choose a size') : label('lbl.productAddToCart', 'Add to cart') + ' · ' + money(unit * h.q);
  return <Row><Stepper q={h.q} onMinus={() => productQty(-1)} onPlus={() => productQty(1)} /><View style={{flex: 1}}><Cta label={lbl} disabled={!!blocked} onPress={productAdd} /></View></Row>;
}

const Sum = ({rows, total}: {rows: [string, string, 'g'?][]; total?: [string, string]}) => {
  const th = useTheme();
  return (
    <Card>
      {rows.map((r, k) => <View key={k} style={{flexDirection: 'row', justifyContent: 'space-between', marginVertical: 7}}><T size={14} color={r[2] === 'g' ? th.grn : th.mut} weight={r[2] === 'g' ? '700' : undefined}>{r[0]}</T><T size={14} color={r[2] === 'g' ? th.grn : th.mut} weight={r[2] === 'g' ? '700' : undefined} style={{maxWidth: '60%', textAlign: 'right'}}>{r[1]}</T></View>)}
      {total ? <View style={{flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, marginTop: 4, borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: th.line}}><T size={17} weight="600">{total[0]}</T><T size={17} weight="600">{total[1]}</T></View> : null}
    </Card>
  );
};

export function Cart() {
  const th = useTheme(), c = S.cart, [code, setCode] = useState(S.pin || ''), [scheduleOpen, setScheduleOpen] = useState(false);
  const storeKey = [...new Set(c.lines.map(lineStore).filter(Boolean))].join(',');
  const addressKey = deliveryAddressKey(addr());
  const firstOfferEnabled = fees().firstFree;
  useEffect(() => {
    if (!c.lines.length || !addressKey || isPk() || storeKey.split(',').some(id => !STB[id]?.live)) return;
    void Promise.all([refreshFirstDeliveryEligibility(), refreshGoodiesDeliveryQuote()]);
  }, [storeKey, addressKey, S.mode, firstOfferEnabled]);
  if (!c.lines.length) return <View><Bar cmsKey={'lbl.cartTitle'} title={label('lbl.cartTitle', 'Your cart')} onBack={back} right={<Pressable accessibilityRole="button" accessibilityLabel={label('lbl.cartGroupOrder', 'Start a group order')} onPress={() => require('../store').ui.sheet({kind:'group-order'})} hitSlop={10} style={{padding: 4, alignItems: 'center', justifyContent: 'center'}}><Icon name="user-plus" size={23} color={th.br} /></Pressable>} /><View style={{alignItems:'center',paddingHorizontal:28,paddingTop:76,paddingBottom:34}}><Icon name="bag" size={38} color={th.mut}/><T cmsKey={'lbl.cartEmptyTitle'} size={21} weight="600" style={{marginTop:18,textAlign:'center'}}>{label('lbl.cartEmptyTitle', 'Your cart is empty')}</T><T cmsKey={'lbl.cartEmptyText'} size={13} color={th.mut} align="center" style={{marginTop:7,marginBottom:22}}>{label('lbl.cartEmptyText', 'Explore nearby stores and discover products around your chosen address.')}</T><View style={{width:'100%'}}><Cta cmsKey={'lbl.cartBrowse'} label={label('lbl.cartBrowse', 'Browse stores')} onPress={() => go('explore')} /></View></View></View>;
  const t = totals(), st = t.st, stops: string[] = (t as any).stops || [], multi = stops.length > 1;
  if (!st?.live || stops.some(id => !STB[id]?.live)) return <View><Bar cmsKey={'lbl.cartTitle'} title={label('lbl.cartTitle', 'Your cart')} onBack={back} /><Empty emoji="🛒" title={label('lbl.cartStoreTemporarilyUnavailable', 'Store temporarily unavailable')} text={label('lbl.cartStoreMissingKeepCart', 'One of the stores in your saved cart is no longer available. Your cart has not been cleared.')} button={label('lbl.cartBrowse', 'Browse stores')} onPress={() => go('explore')} /></View>;
  const badLine = c.lines.some((l: any) => l.byo && lineBad(l));
  const short = (multi ? stops.some((id: string) => storeSub(id) < (STB[id]?.min || 0)) : t.sub < st.min) || badLine;
  const deliveryReady = isPk() || (deliveryQuoteReady() && (!firstOfferEnabled || S.firstOrderEligible !== null));
  const feeLabel = isPk() ? label("lbl.cms.c036c1628698","Pickup") : !deliveryReady
    ? (S.deliveryQuoteError || S.firstOrderEligibilityError ? label('lbl.deliveryUnavailableRetry','Unavailable — retry') : firstOfferEnabled && S.firstOrderEligible === null ? label('lbl.deliveryEligibilityLoading','Checking first-delivery offer…') : label('lbl.deliveryFeeLoading','Calculating…'))
    : t.free ? (first() ? label('lbl.cartFirstDeliveryFree', 'Free (first delivery)') : label("lbl.cms.b9a67ad4232a","Free")) : money(t.fee);
  return (
    <View>
      <Bar cmsKey={'lbl.cartTitle'} title={label('lbl.cartTitle', 'Your cart')} onBack={back} right={<Circ icon="trash" label={label('lbl.cartClearAction', 'Clear cart')} onPress={clearAsk} />} />
      <View style={{paddingHorizontal: 16}}>
        {S.catalogError ? <Card><T cmsKey={'lbl.catalogFailed'} color={th.red}>{label('lbl.catalogFailed', 'Could not load stores')}</T><Cta cmsKey={'lbl.retry'} small ghost label={label('lbl.retry', 'Try again')} onPress={() => void refreshLiveSchedules()} /></Card> : null}
        {!multi && st.cover ? <Image source={{uri: st.cover}} style={{width: '100%', height: 112, borderRadius: 14, marginBottom: 10}} resizeMode="cover" /> : null}
        {multi ? null : <Row style={{marginBottom: 8}}><Tile e={st.e} bg={st.bg} size={44} photo={st.thumbnail || st.logo} /><View style={{flex: 1}}><T weight="600">{st.n}</T><T cmsKeys={['lbl.cartStoreOrder',"lbl.cms.40babc6bdeb6"]} size={13} color={th.mut}>{label('lbl.cartStoreOrder', 'Your order from this store')} · {st.eta} {label("lbl.cms.40babc6bdeb6", "min")}</T></View></Row>}
                {!multi && !S.catalogError && !st.open ? <Card style={{backgroundColor: th.brt, borderColor: th.br}}><T cmsKey={"lbl.cms.4ac2c8430ce8"} weight="600">{st.n} {label("lbl.cms.4ac2c8430ce8", "is closed")}</T><T cmsKeys={["lbl.cms.41b312a60379","lbl.cms.6548a2ae6f3e"]} size={13} color={th.mut}>{st.acceptScheduledOrders ? st.nx + label("lbl.cms.41b312a60379", ". Scheduled orders are available. The earliest time is set by this shop.") : st.nx + label("lbl.cms.6548a2ae6f3e", ". This store does not currently accept scheduled orders.")}</T></Card> : null}
        <View style={{marginTop:14,marginBottom:8,paddingVertical:10,borderBottomWidth:0.5,borderBottomColor:th.line}}>
          <Row sp>
            <View style={{flex:1}}>
              <T cmsKey={"lbl.cms.2fb4e79b6c80"} weight="600">{label("lbl.cms.2fb4e79b6c80", "Order time")}</T>
              <T cmsKey={"lbl.cms.2d27b416d70d"} size={13} color={th.mut} style={{marginTop:3}}>{S.sch > Date.now() ? fmtStoreDay(S.cart.sid,S.sch) + ' · ' + fmtStoreTime(S.cart.sid,S.sch) : label("lbl.cms.2d27b416d70d", "ASAP")}</T>
            </View>
            {st.acceptScheduledOrders && stops.every(id=>STB[id]?.acceptScheduledOrders) ? <Pressable onPress={() => setScheduleOpen(v => !v)}><T cmsKeys={["lbl.cms.a366719f0771","lbl.cms.c349a59278cd","lbl.cms.482e3b899f84"]} size={13.5} weight="600" color={th.br}>{scheduleOpen ? label("lbl.cms.a366719f0771", "Close") : S.sch > Date.now() ? label("lbl.cms.c349a59278cd", "Change time") : label("lbl.cms.482e3b899f84", "Choose time")}</T></Pressable> : <Badge cmsKey={"lbl.cms.2d27b416d70d"} label={label("lbl.cms.2d27b416d70d", "ASAP")} />}
          </Row>
          {S.sch > Date.now() ? <Pressable onPress={() => {setSch(0);setScheduleOpen(false);}} style={{alignSelf:'flex-start',marginTop:8}}><T cmsKey={"lbl.cms.655123d67917"} size={12.5} weight="600" color={th.br}>{label("lbl.cms.655123d67917", "Switch to ASAP")}</T></Pressable> : null}
          {scheduleOpen ? <ScheduleInline close={() => setScheduleOpen(false)} /> : null}
        </View>
        {c.lines.map((l: any, index: number) => {
          const bad = l.byo ? lineBad(l) : '';
          const lineSid = require('../store').lineStore(l), prevSid = index > 0 ? require('../store').lineStore(c.lines[index - 1]) : '';
          return (
            <React.Fragment key={l.k}>
            {multi && lineSid !== prevSid ? <View style={{marginTop: index ? 18 : 6, paddingBottom: 6}}><Row><Tile e={STB[lineSid]?.e} bg={STB[lineSid]?.bg} size={36} photo={STB[lineSid]?.thumbnail || STB[lineSid]?.logo} /><View style={{flex: 1}}><T weight="600">{STB[lineSid]?.n}</T>{!STB[lineSid]?.open ? <T cmsKey={"lbl.cms.85dae124f037"} size={12} color={th.red}>{label("lbl.cms.85dae124f037", "Closed")}</T> : storeSub(lineSid) < (STB[lineSid]?.min || 0) ? <T cmsKeys={["lbl.cms.553c2557ccce","lbl.cms.d7f2d0c9c8b8"]} size={12} color={th.red}>{label("lbl.cms.553c2557ccce", "Add ")}{money((STB[lineSid]?.min || 0) - storeSub(lineSid))} {label("lbl.cms.d7f2d0c9c8b8", "more to reach the minimum")}</T> : null}</View></Row></View> : null}
            <View style={{flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: th.line}}>
              <Tile e={l.e} bg="bg0" size={48} photo={l.photo} />
              <View style={{flex: 1}}>
                <T size={14.5} weight="600">{l.n}</T>
                {l.d ? <T size={12} color={th.mut} style={{lineHeight: 17}}>{l.d}</T> : null}
                {l.nt ? <T cmsKey={"lbl.cms.32c8df865bbe"} size={12.5} color={th.mut} style={{fontStyle: 'italic', marginTop: 3}}>{label("lbl.cms.32c8df865bbe", "Note: ")}{l.nt}</T> : null}
                {bad ? <T size={12.5} weight="600" color={th.red} style={{marginTop: 4}}>{l.n} {bad}</T> : null}
                <T size={14} weight="600" style={{marginTop: 4}}>{money(l.p * l.q)}</T>
                {l.byo ? <View style={{flexDirection: 'row', gap: 16, marginTop: 6}}><Pressable onPress={() => bzEdit(l.k)}><T cmsKey={'lbl.cartEditItem'} size={13} weight="600" color={th.br}>{label('lbl.cartEditItem', 'Edit')}</T></Pressable><Pressable onPress={() => bzRemove(l.k)}><T cmsKey={"lbl.shopAutoU0R7PW"} size={13} weight="600" color={th.red}>{label("lbl.shopAutoU0R7PW", "Remove")}</T></Pressable></View> : null}
              </View>
              <Stepper q={l.q} onMinus={() => l.q > 1 ? qty(l.k, -1) : require('../store').ui.sheet({kind: 'remove-item', lineKey: l.k, itemName: l.n})} onPlus={() => qty(l.k, 1)} />
            </View>
            </React.Fragment>
          );
        })}
        <Pressable onPress={() => go('store', st.id)} style={{flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, padding: 14, borderWidth: 0.5, borderStyle: 'dashed', borderColor: th.line, borderRadius: 16}}><T cmsKey={'lbl.cartContinueShopping'} weight="600" style={{flex: 1}}>{'+ ' + label('lbl.cartContinueShopping', 'Continue shopping')}</T><Icon name="chevR" size={16} color={th.ink} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={label('lbl.cartStartGroup', 'Start a group order')} onPress={() => require('../store').ui.sheet({kind:'group-order'})} style={{flexDirection:'row',alignItems:'center',gap:12,marginTop:10,padding:14,borderWidth:1,borderColor:th.br,borderRadius:16,backgroundColor:th.brt}}>
          <View style={{width:42,height:42,borderRadius:13,backgroundColor:th.card,alignItems:'center',justifyContent:'center'}}><Icon name="user-plus" size={21} color={th.br}/></View>
          <View style={{flex:1}}><T cmsKey={'lbl.cartGroupOrder'} weight="600">{label('lbl.cartGroupOrder', 'Start a group order')}</T><T cmsKey={'lbl.cartGroupOrderDesc'} size={12.5} color={th.mut} style={{marginTop:3}}>{label('lbl.cartGroupOrderDesc', 'Invite friends and coordinate a shared cart')}</T></View>
          <Icon name="chevR" size={17} color={th.br}/>
        </Pressable>

        {hasAlcohol() ? <Card style={{backgroundColor: th.brt, borderColor: th.br, marginTop: 14}}><T cmsKey={'lbl.cartAlcoholHeading'} weight="600">{label('lbl.cartAlcoholHeading', 'Your order includes alcohol')}</T><T size={13} color={th.mut} style={{marginTop: 3}}>{rgText('rg.rules', 'Alcohol is sold only to customers aged {age} or older. Minors may not buy alcohol. Valid government photo ID is required at delivery or pickup. If the ID check fails, you are refunded to your Wantiss wallet minus the delivery fee.', alcAge(c.sid).age)}</T></Card> : null}
        <Ttl>{label('lbl.cartPromoTitle', 'Promo code')}</Ttl>
        {S.promo ? (
          <Card style={{padding: 12}}><Row sp><View style={{flex: 1}}><Row style={{gap: 6}}><T weight="600">{S.promo}</T>{t.pok ? <Badge cmsKey={'lbl.cartApplied'} green label={label('lbl.cartApplied', 'Applied')} /> : <Badge cmsKey={'lbl.cartInvalid'} red label={label('lbl.cartInvalid', 'Not valid')} />}</Row>{t.perr ? <T size={12.5} color={th.mut} style={{marginTop: 4}}>{t.perr}</T> : null}</View><Pressable onPress={promoClear}><T cmsKey={'lbl.cartRemove'} weight="600" color={th.red}>{label('lbl.cartRemove', 'Remove')}</T></Pressable></Row></Card>
        ) : (<>
          <Row><View style={{flex: 1}}><Input cmsPlaceholderKey={'lbl.cartPromoPlaceholder'} value={code} onChange={v => setCode(v.toUpperCase())} placeholder={label('lbl.cartPromoPlaceholder', 'Enter promo code')} /></View><View style={{width: 90}}><Cta cmsKey={'lbl.cartApply'} label={label('lbl.cartApply', 'Apply')} onPress={() => promoApply(code)} /></View></Row>
          <Pressable onPress={() => go('promos')}><T cmsKey={'lbl.cartAvailableCoupons'} size={13} weight="600" color={th.br} style={{marginTop: 8}}>{label('lbl.cartAvailableCoupons', 'See available coupons')}</T></Pressable>
        </>)}
        <View style={{marginTop: 16}}><Sum rows={[[label('lbl.cartSubtotal', 'Subtotal'), money(t.sub)], [label('lbl.cartDeliveryFee', 'Delivery fee'), feeLabel, t.free && deliveryReady ? 'g' : undefined as any], [label('lbl.cartServiceFee', 'Service fee'), money(t.svc)], ...(t.disc ? [[label('lbl.cartDiscount', 'Discount'), '-' + money(t.disc), 'g'] as any] : []), ...(t.tip ? [[label('lbl.cartCourierTip', 'Courier tip'), money(t.tip)] as any] : [])]} total={[label('lbl.cartTotal', 'Total'), deliveryReady ? money(t.total) : label('lbl.cms.deliveryCalculating', 'Calculating…')]} /></View>
        {badLine ? <T cmsKey={'lbl.cartFixItems'} size={13} color={th.red} align="center" style={{marginBottom: 10}}>{label('lbl.cartFixItems', 'Fix the items marked above to continue.')}</T> : t.sub < st.min ? <T cmsKeys={['lbl.cartMinMore','lbl.cartReachMinimum',"lbl.cms.432ca9a22ed3"]} size={13} color={th.mut} align="center" style={{marginBottom: 10}}>{label('lbl.cartMinMore', 'Add')} {money(st.min - t.sub)} {label('lbl.cartReachMinimum', 'more to reach the')} {money(st.min)} {label("lbl.cms.432ca9a22ed3", "minimum.")}</T> : null}
        {!deliveryReady && (S.deliveryQuoteError || S.firstOrderEligibilityError) ? <Pressable onPress={() => {void Promise.all([refreshFirstDeliveryEligibility(true), refreshGoodiesDeliveryQuote()]);}} style={{paddingVertical:10}}><T cmsKey={'lbl.cartTapRetryDelivery'} color={th.red} size={13}>{S.deliveryQuoteError || S.firstOrderEligibilityError}{label('lbl.cartTapRetryDelivery', ' · Tap to retry')}</T></Pressable> : null}
        <Cta cmsKeys={['lbl.checkoutAddAddress','lbl.cartCheckout','lbl.cms.deliveryCalculating']} label={!isPk() && !addressKey ? label('lbl.checkoutAddAddress', 'Choose delivery address') : deliveryReady ? label('lbl.cartCheckout', 'Checkout') + ' · ' + money(t.total) : label('lbl.cartCheckout', 'Checkout') + ' · ' + label('lbl.cms.deliveryCalculating', 'Calculating delivery…')} disabled={short} onPress={!isPk() && !addressKey ? () => go('addresses') : goCheckout} />
      </View>
    </View>
  );
}

const IcBox = ({icon}: {icon: string}) => {const th = useTheme(); return <View style={{width: 40, height: 40, borderRadius: 12, backgroundColor: th.brt, alignItems: 'center', justifyContent: 'center'}}><Icon name={icon} color={th.br} /></View>;};

export function Checkout() {
  const th = useTheme(), t = totals(), pk = isPk(), a = addr() || null, st = t.st, stp = [label('lbl.checkoutDelivery', 'Delivery'), label('lbl.checkoutTime', 'Time'), label('lbl.checkoutPaymentMethod', 'Payment method'), label('lbl.checkoutReview', 'Review')];
  const stops: string[] = (t as any).stops || [], multi = stops.length > 1;
  const [cashEligible, setCashEligible] = useState(false), [scheduleOpen, setScheduleOpen] = useState(false),[cashError,setCashError]=useState(false),[cashRetry,setCashRetry]=useState(0);
  const checkoutAddressKey = deliveryAddressKey(a);
  useEffect(() => {
    if (!pk && st?.live && checkoutAddressKey) {
      void Promise.all([refreshFirstDeliveryEligibility(), refreshGoodiesDeliveryQuote()]);
    }
  }, [st?.id, pk, checkoutAddressKey, stops.join(','), fees().firstFree]);
  useEffect(() => {
    let active = true;
    void refreshLiveSchedules().then(() => {
      if (active && st?.id && st.live && a?.t) return refreshStoreDistance(st.id, a).catch(() => undefined);
    });
    void refreshPaymentOptions();
    return () => { active = false; };
  }, [st?.id, st?.live, a?.t, a?.apt, a?.inst, a?.city, a?.department, a?.country]);
  useEffect(() => { if (st?.id && (!st.acceptScheduledOrders || stops.some(id=>!STB[id]?.acceptScheduledOrders)) && S.sch) setSch(0); }, [st?.id, st?.acceptScheduledOrders, stops.join(',')]);
  /* A closed store can only be ordered from by scheduling: open the picker so the customer is not left on an empty "Schedule" choice. */
  useEffect(() => { if (st?.id && !st.open && st.acceptScheduledOrders && stops.every(id=>STB[id]?.acceptScheduledOrders) && !S.sch) setScheduleOpen(true); }, [st?.id, st?.open, st?.acceptScheduledOrders, stops.join(',')]);
  useEffect(() => {
    let active = true;
    setCashEligible(false);setCashError(false);
    const storeIds = multi ? stops : st?.id ? [st.id] : [];
    if ((!pk && storeIds.length)) {
      void Promise.all(storeIds.map(async storeId => {
        const {data, error} = await supabase.rpc('goodies_cash_on_delivery_available', {p_store_id: storeId});
        if(error)throw error;if(typeof data!=='boolean')throw new Error('Cash availability unavailable');
        return data;
      })).then(results => {
        if (active) setCashEligible(results.length === storeIds.length && results.every(Boolean));
      }).catch(()=>{if(active)setCashError(true);});
    }
    return () => { active = false; };
  }, [st?.id, pk, multi, stops.join(','),cashRetry,S.accountId]);
  const paymentReady = S.paymentOptionsStatus === 'ready';
  const paymentStatusText = S.paymentOptionsStatus === 'error' ? label('lbl.checkoutPaymentUnavailable', 'Payment details unavailable. Please try again.') : label('lbl.checkoutPaymentLoading', 'Loading payment methods…');
  const PAYON: any = fees().pay, allPays: [string, string, string, string][] = [['wallet', label('lbl.checkoutWallet', 'Wantiss Wallet'), !paymentReady ? paymentStatusText : S.hasWallet ? label('lbl.checkoutWalletBalance', 'Balance {amount}').replace('{amount}', money(S.wallet)) : label('lbl.checkoutWalletMissing', "Wallet not created"), 'wallet'], ['moncash', label('lbl.checkoutMoncash', 'MonCash'), label('lbl.checkoutUnavailablePayment', "Not available for live Goodies orders"), 'phone'], ['card', label('lbl.checkoutCard', 'Credit / debit card'), !paymentReady ? paymentStatusText : S.cards.length ? (S.cards.length === 1 ? label('lbl.checkoutSavedCardCountOne', '{count} saved card') : label('lbl.checkoutSavedCardCountMany', '{count} saved cards')).replace('{count}', String(S.cards.length)) : label('lbl.checkoutAddCard', "Add a card"), 'card'], ['cash', label('lbl.checkoutCash', 'Cash on') + ' ' + label('lbl.checkoutDelivery', 'delivery'), label('lbl.checkoutCashCondition', "Only when this store and an available courier accept cash on delivery"), 'bag']], pays = allPays.filter(p => PAYON[({wallet: 'Wallet', moncash: 'MonCash', card: 'Card', cash: 'Cash'} as any)[p[0]]] && !(multi && p[0] === 'card') && ((p[0] !== 'moncash' && (p[0] !== 'cash' || cashEligible))));
  const availablePayKey = pays.map(p => p[0]).join('|');
  useEffect(() => { if (pays.length && !pays.some(p => p[0] === S.pay)) setPay(pays[0][0]); }, [availablePayKey, S.pay]);
  const ct = ctOf() || {ph: S.pf?.ph || '', l: label('lbl.sheetDefaultNumber', 'Default Wantiss number'), w: 1};
  if (!st?.live || stops.some(id => !STB[id]?.live)) return <View><Bar cmsKey={'lbl.checkoutTitle'} title={label('lbl.checkoutTitle', 'Checkout')} onBack={back} /><Empty emoji="🛒" title={label('lbl.checkoutCartUnavailable', 'Your cart is unavailable')} text={label('lbl.cartReviewUnavailableStore', 'Your saved cart includes an unavailable store. Please review it.')} button={label('lbl.cartTitle', 'Your cart')} onPress={() => go('cart')} /></View>;
  if (!pk && !a?.t) return <View><Bar cmsKey={'lbl.checkoutTitle'} title={label('lbl.checkoutTitle', 'Checkout')} onBack={back} /><Empty emoji="📍" title={label('lbl.checkoutAddressRequired', 'Choose a delivery address')} button={label('lbl.checkoutAddAddress', 'Add address')} onPress={() => go('addresses')} /></View>;
  let body: any = null;
  if (S.cs === 0) body = (<>
    <Seg list={[['delivery', label('lbl.checkoutDelivery', 'Delivery')], ['pickup', label('lbl.checkoutPickup', 'Pickup')]]} on={pk ? 'pickup' : 'delivery'} onPick={k => {if (k === 'delivery' && st.far){toast(label('lbl.deliveryOutOfRange','Delivery is unavailable for this address. Choose pickup or another address.'));return;}setMode(k);}} />
    <Ttl>{pk ? label('lbl.checkoutPickupFrom', 'Pickup from') : label('lbl.checkoutDeliverTo', 'Deliver to')}</Ttl>
    <Card><Row><IcBox icon="pin" /><View style={{flex: 1}}>
      {pk ? <><T weight="600">{st.n}</T><T cmsKeys={["lbl.cms.7c642a8ed0bc","lbl.cms.ebaf18552056","lbl.cms.f409318cbe6e",'lbl.checkoutKmFromYou','lbl.checkoutOpenHours']} size={13} color={th.mut}>{st.live ? (st.distanceReady ? (Math.round(st.km * 1000) < 1000 ? Math.round(st.km * 1000) + label("lbl.cms.7c642a8ed0bc", " m from your address") : st.km.toFixed(1) + label("lbl.cms.ebaf18552056", " km from your address")) : st.distanceError ? label("lbl.cms.f409318cbe6e", "Distance unavailable") : null) : label('lbl.checkoutKmFromYou', '{km} km from you').replace('{km}', st.km.toFixed(1))}{st.h ? ' · ' + label('lbl.checkoutOpenHours', 'open {hours}').replace('{hours}', st.h) : ''}</T></> : a ? <><T cmsKey={"lbl.cms.5f5052920c34"} weight="600">{a.l || label("lbl.cms.5f5052920c34", "Delivery address")}</T><T size={13} color={th.mut}>{a.t}{a.apt ? ', ' + a.apt : ''}</T>{a.inst ? <T cmsKey={'lbl.checkoutNote'} size={12.5} color={th.mut}>{label('lbl.checkoutNote', 'Note: {note}').replace('{note}', a.inst)}</T> : null}</> : <><T cmsKey={"lbl.cms.6795bcf3e74a"} weight="600">{label("lbl.cms.6795bcf3e74a", "Choose a delivery address")}</T><T cmsKey={"lbl.cms.2c1905767c95"} size={13} color={th.mut}>{label("lbl.cms.2c1905767c95", "Select a saved address to continue.")}</T></>}
    </View>{pk ? null : <Pressable onPress={() => go('addresses')}><T cmsKeys={['lbl.checkoutChange',"lbl.cms.1586f89c0499"]} size={13} weight="600" color={th.br} >{a ? label('lbl.checkoutChange', 'Change') : label("lbl.cms.1586f89c0499", "Add address")}</T></Pressable>}</Row></Card>
    {st.far && !st.live ? <Card style={{backgroundColor: th.brt, borderColor: th.br, marginTop: 12}}><T cmsKey={'lbl.checkoutPickupOnly'} weight="600">{label('lbl.checkoutPickupOnly', 'Pickup only')}</T><T cmsKeys={["lbl.cms.51f14b4a403f","lbl.cms.cea0549897a2"]} size={13} color={th.mut}>{st.n} {label("lbl.cms.51f14b4a403f", "is ")}{st.km.toFixed(1)} {label("lbl.cms.cea0549897a2", "km from this address, beyond delivery range. Pick another address to get delivery.")}</T></Card> : null}
    {paymentReady && hasAlcohol() && !S.hasWallet ? <Card style={{backgroundColor: th.brt, borderColor: th.br, marginTop: 12}}><T cmsKey={'lbl.checkoutCreateWallet'} weight="600">{label('lbl.checkoutCreateWallet', 'Create a Wantiss wallet')}</T><T size={13} color={th.mut} style={{marginVertical: 4}}>{rgText('rg.wallet', 'Create a Wantiss wallet so any refund has somewhere to go. You can withdraw from it later.', alcAge(S.cart.sid).age)}</T><Cta cmsKey={'lbl.checkoutCreateWallet'} small label={label('lbl.checkoutCreateWallet', 'Create wallet')} onPress={createWallet} /></Card> : null}
    <Ttl>{label('lbl.checkoutContactNumber', 'Contact number')}</Ttl>
    <Card><Row><IcBox icon="phone" /><View style={{flex: 1}}><T weight="600">{ct.ph}</T><View style={{marginTop: 3, flexDirection: 'row', gap: 6, flexWrap: 'wrap'}}>{ct.w ? <Badge cmsKey={'lbl.checkoutDefaultPhone'} green label={label('lbl.checkoutDefaultPhone', 'Default Wantiss number')} /> : <><Badge cmsKey={"lbl.shopAuto1TZ3XVT"} label={label("lbl.shopAuto1TZ3XVT", "Goodies checkout number")} /><T size={12.5} color={th.mut}>{ct.l}</T></>}</View></View><Pressable onPress={() => require('../store').ui.sheet({kind: 'contacts'})}><T cmsKey={"lbl.shopAuto1YYH3EC"} size={13} weight="600" color={th.br}>{label("lbl.shopAuto1YYH3EC", "Change")}</T></Pressable></Row></Card>
  </>);
  if (S.cs === 1) body = (<>
    <T cmsKey={'lbl.checkoutWhen'} size={15} weight="600" style={{marginBottom: 8}}>{label('lbl.checkoutWhen', 'When do you want it?')}</T>
    {st.open ? <Radio on={!S.sch} onPress={() => {setSch(0);setScheduleOpen(false);}}>
      <Row sp style={{alignItems:'center',flex:1}}>
        <T cmsKey={'lbl.checkoutAsap'} weight="600">{label('lbl.checkoutAsap', 'ASAP')}</T><T cmsKey={'lbl.checkoutAsapMinimum'} size={12} color={th.mut}>{label('lbl.checkoutAsapMinimum', 'Earliest available fulfillment time')}</T>
        <T cmsKey={"lbl.cms.40babc6bdeb6"} size={12.5} color={th.mut}>{st.eta} {label("lbl.cms.40babc6bdeb6", "min")}</T>
      </Row>
    </Radio> : null}
    {st.acceptScheduledOrders && stops.every(id=>STB[id]?.acceptScheduledOrders) ? <Radio on={!!S.sch} onPress={() => setScheduleOpen(v => !v)}>
      <Row sp style={{alignItems:'center',flex:1}}>
        <View style={{flex:1,minWidth:0}}>
          <T cmsKey={'lbl.checkoutScheduleOption'} weight="600">{label('lbl.checkoutScheduleOption','Schedule')}</T>
          {S.sch ? <T size={12.5} color={th.mut} style={{marginTop:3}}>{fmtStoreDay(st.id,S.sch)+' · '+fmtStoreTime(st.id,S.sch)}</T> : null}
        </View>
        <Icon name="edit" size={17} color={th.br}/>
      </Row>
    </Radio> : null}
    {scheduleOpen && st.acceptScheduledOrders && stops.every(id=>STB[id]?.acceptScheduledOrders) ? <ScheduleInline close={() => setScheduleOpen(false)} /> : null}
    {pk ? null : (<><Ttl>{label('lbl.checkoutCourierTip', 'Tip your courier')}</Ttl><View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>{fees().tips.map((v: number) => <Pressable key={v} onPress={() => setTip(v)} style={{paddingVertical: 9, paddingHorizontal: 14, borderRadius: 18, backgroundColor: S.tip === v ? th.br : th.soft}}><T cmsKey={'lbl.checkoutNoTip'} size={13.5} weight="600" color={S.tip === v ? '#fff' : th.ink}>{v ? money(v) : label('lbl.checkoutNoTip', 'No tip')}</T></Pressable>)}</View></>)}
    <Input cmsPlaceholderKey={'lbl.checkoutOptional'} label={pk ? label('lbl.checkoutStoreNote', 'Note for the store') : label('lbl.checkoutDeliveryInstructions', 'Delivery instructions')} value={S.note} onChange={v => {S.note = v; emit();}} placeholder={label('lbl.checkoutOptional', 'Optional')} multiline />
  </>);
  if (S.cs === 2) body = (<>
    {cashError?<Card><T cmsKey={'lbl.checkoutCashUnavailable'} color={th.red}>{label('lbl.checkoutCashUnavailable','Could not check cash-on-delivery availability. Please retry or choose another payment method.')}</T><Cta cmsKey={'lbl.retry'} small ghost label={label('lbl.retry','Try again')} onPress={()=>setCashRetry(value=>value+1)}/></Card>:null}
    {!paymentReady ? <Card><T color={S.paymentOptionsStatus === 'error' ? th.red : th.mut}>{paymentStatusText}</T>{S.paymentOptionsStatus === 'error' ? <Cta cmsKey={'lbl.retry'} small ghost label={label('lbl.retry', 'Try again')} onPress={() => void refreshPaymentOptions()} /> : null}</Card> : null}
    <T cmsKey={'lbl.checkoutPaymentMethod'} size={15} weight="600" style={{marginBottom: 8}}>{label('lbl.checkoutPaymentMethod', 'Payment method')}</T>
    {pays.map(p => <Radio key={p[0]} on={S.pay === p[0]} onPress={() => {if (p[0] !== 'card' || paymentReady) setPay(p[0]);}}><Row><Icon name={p[3]} size={20} color={th.ink} /><View style={{flex: 1}}><T size={14.5} weight="600">{p[1]}</T><T size={12.5} color={th.mut}>{p[2]}</T></View></Row></Radio>)}
    {(paymentReady) && !S.hasWallet ? <Card style={{borderColor: th.br}}><T cmsKey={'lbl.checkoutWalletNotFound'} weight="600">{label('lbl.checkoutWalletNotFound', 'Wantiss wallet not found')}</T><T cmsKey={'lbl.checkoutWalletHint'} size={12.5} color={th.mut} style={{marginVertical: 6}}>{label('lbl.checkoutWalletHint', 'Create a wallet to pay for Goodies orders with your balance.')}</T><Cta cmsKey={"lbl.shopAutoFLJ2MD"} label={label("lbl.shopAutoFLJ2MD", "Create wallet")} onPress={createWallet} /></Card> : null}
    {(paymentReady) && S.pay === 'wallet' && (!S.hasWallet || S.wallet < t.total) ? <View style={{paddingVertical:10}}>
      <T cmsKeys={['lbl.checkoutWalletNotFound','lbl.checkoutInsufficient']} size={14} weight="600" color={th.red}>{!S.hasWallet ? label('lbl.checkoutWalletNotFound', 'Wantiss wallet not found') : label('lbl.checkoutInsufficient', 'Insufficient wallet balance')}</T>
      <T cmsKeys={["lbl.cms.cbbfe5f88c2e","lbl.cms.181c95d39d9a","lbl.cms.b11cd484018f","lbl.cms.e0b12ec3af49"]} size={12.5} color={th.mut} style={{marginTop:4}}>{!S.hasWallet ? label("lbl.cms.cbbfe5f88c2e", "Create a Wantiss wallet or choose another payment method.") : label("lbl.cms.181c95d39d9a", "Balance: ") + money(S.wallet) + label("lbl.cms.b11cd484018f", " · Add at least ") + money(Math.max(0, t.total - S.wallet)) + label("lbl.cms.e0b12ec3af49", " to continue.")}</T>
      <Pressable onPress={() => go('payments')} style={{alignSelf:'flex-start',paddingVertical:7}}><T cmsKey={'lbl.checkoutOpenWallet'} size={13} weight="600" color={th.br}>{label('lbl.checkoutOpenWallet', 'Open Wallet')}</T></Pressable>
    </View> : null}
    {GOODIES_SHARED_PAYMENTS_RELEASED?<Pressable accessibilityRole="button" onPress={() => go('help-pay')} style={{paddingVertical: 13, marginTop: 8}}><T cmsKey={"lbl.cms.42b822c31c92"} size={14} weight="600" color={th.br}>{label("lbl.cms.42b822c31c92", "Help Pay / Share Bill")}</T><T cmsKey={"lbl.cms.d0b078223c9e"} size={12} color={th.mut}>{label("lbl.cms.d0b078223c9e", "Create a verified payment request and share it with friends")}</T></Pressable>:null}
    {paymentReady && S.pay === 'card' ? <Card style={{marginTop: 10, padding: 12}}>
      <T cmsKey={'lbl.checkoutSavedCard'} weight="600" style={{marginBottom: 10}}>{label('lbl.checkoutSavedCard', 'Choose a saved card')}</T>
      {S.cards.length ? S.cards.map((card: any) => <Pressable key={card.id} accessibilityRole="radio" accessibilityState={{checked:S.selectedCardId === card.id}} onPress={() => setCard(card.id)} style={{marginBottom:10,borderRadius:16,borderWidth:S.selectedCardId === card.id ? 2 : 1,borderColor:S.selectedCardId === card.id ? '#8FAF84' : th.line,overflow:'hidden'}}>
        <View style={{backgroundColor:'#1A2517',padding:14,minHeight:104,justifyContent:'space-between'}}>
          <Row sp><T cmsKey={"lbl.cms.1ea8cb359549"} size={11} weight="600" color="#ACC8A2">{label("lbl.cms.1ea8cb359549", "WANTISS · ")}{String(card.b || 'CARD').toUpperCase()}</T>{card.isDefault ? <T cmsKey={"lbl.cms.2982d9de568c"} size={10} weight="600" color="#ACC8A2">{label("lbl.cms.2982d9de568c", "DEFAULT")}</T> : null}</Row>
          <View style={{flexDirection:'row',alignItems:'center',gap:9}}>
            <View style={{width:32,height:23,borderRadius:5,backgroundColor:'#ACC8A2',padding:4}}><View style={{flex:1,borderRadius:2,backgroundColor:'rgba(26,37,23,0.16)'}} /></View>
            <T size={15} weight="600" color="#FFFFFF">••••  ••••  ••••  {card.l4}</T>
          </View>
          <Row sp><T cmsKeys={["lbl.cms.ea6b7c9309ba","lbl.cms.270cfd8932e4"]} size={10} color="#ACC8A2">{card.expiryMonth && card.expiryYear ? label("lbl.cms.ea6b7c9309ba", "EXP ") + String(card.expiryMonth).padStart(2,'0') + '/' + String(card.expiryYear).slice(-2) : label("lbl.cms.270cfd8932e4", "SAVED CARD")}</T><T cmsKey={"lbl.cms.24b1ece4f51b"} size={11} weight="600" color="#ACC8A2">{label("lbl.cms.24b1ece4f51b", "WANTISS")}</T></Row>
        </View>
        <View style={{paddingHorizontal:12,paddingVertical:10,backgroundColor:S.selectedCardId === card.id ? '#EAF2E5' : th.soft,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
          <T cmsKey={"lbl.cms.daaf245c613a"} size={13} weight="600">{card.b} {label("lbl.cms.daaf245c613a", "ending in ")}{card.l4}</T>
          <View style={{width:19,height:19,borderRadius:10,borderWidth:2,borderColor:S.selectedCardId === card.id ? '#557B4C' : th.mut,alignItems:'center',justifyContent:'center'}}>{S.selectedCardId === card.id ? <Icon name="check" size={12} color="#557B4C"/> : null}</View>
        </View>
      </Pressable>) : <View style={{alignItems:'center',paddingVertical:20,paddingHorizontal:10}}>
        <View style={{width:62,height:62,borderRadius:20,backgroundColor:'#DCE8D2',alignItems:'center',justifyContent:'center',marginBottom:10}}><Icon name="card" size={30} color="#1A2517"/></View>
        <T cmsKey={'lbl.checkoutNoCards'} weight="600">{label('lbl.checkoutNoCards', 'No saved cards yet')}</T>
        <T cmsKeys={["lbl.cms.1a0545c55765","lbl.cms.0175f1d4a19a"]} size={12.5} color={th.mut} align="center" style={{marginTop:5,lineHeight:18}}>{S.hasWallet ? label("lbl.cms.1a0545c55765", "Add a debit or credit card to your Wantiss Wallet to pay here.") : label("lbl.cms.0175f1d4a19a", "Your Wantiss Wallet is not set up yet. Create your wallet to add and use saved cards.")}</T>
        <Cta cmsKeys={['lbl.checkoutAddCard',"lbl.cms.7f28264e6c5c"]} label={S.hasWallet ? label('lbl.checkoutAddCard', 'Add a card') : label("lbl.cms.7f28264e6c5c", "Create wallet")} onPress={() => go('payments')} />
      </View>}
    </Card> : null}
    {(<T cmsKeys={['lbl.checkoutCashNotice',"lbl.cms.3b2939c58c05","lbl.cms.c3f6f449738e"]} size={12} color={th.mut}>{S.pay==='cash'?label('lbl.checkoutCashNotice','Pay in cash when you receive your order.'):S.pay === 'card' ? label("lbl.cms.3b2939c58c05", "Your payment is processed securely.") : label("lbl.cms.c3f6f449738e", "Wantiss Wallet payments debit your available balance.")}</T>)}
  </>);
  if (S.cs === 3) body = (<>
    {!paymentReady ? <Card><T color={S.paymentOptionsStatus === 'error' ? th.red : th.mut}>{paymentStatusText}</T>{S.paymentOptionsStatus === 'error' ? <Cta cmsKey={'lbl.retry'} small ghost label={label('lbl.retry', 'Try again')} onPress={() => void refreshPaymentOptions()} /> : null}</Card> : null}
    <Card>{!multi && st.cover ? <Image source={{uri:st.cover}} style={{width:"100%",height:100,borderRadius:12,marginBottom:10}} resizeMode="cover" /> : null}{multi ? <T cmsKey={"lbl.page.screens.Shop.c5a9016622"} weight="600">{stops.length} {label("lbl.page.screens.Shop.c5a9016622", " stores · one delivery")}</T> : <Row style={{gap:10, alignItems:"center"}}><Tile e={st.e} bg={st.bg} size={46} photo={st.thumbnail || st.logo} /><View style={{flex:1}}><T weight="600">{st.n}</T><T cmsKey={'lbl.cartStoreOrder'} size={12} color={th.mut}>{label('lbl.cartStoreOrder', "Your order from this store")}</T></View></Row>}{S.cart.lines.map((l: any, li: number) => <React.Fragment key={l.k}>{multi && (li === 0 || lineStore(l) !== lineStore(S.cart.lines[li - 1])) ? <T size={12.5} weight="600" color={th.mut} style={{marginTop: 14}}>{STB[lineStore(l)]?.n}</T> : null}<Row sp style={{marginTop: 10, alignItems: "center"}}><Row style={{flex:1, gap:9, alignItems:"center"}}><Tile e={l.e} bg="bg0" size={42} photo={l.photo} /><View style={{flex:1}}><T size={14}>{l.q}× {l.n}</T>{l.d ? <T size={12} color={th.mut}>{l.d}</T> : null}</View></Row><T size={14}>{money(l.p * l.q)}</T></Row></React.Fragment>)}</Card>
    {(paymentReady && S.pay === 'wallet') && (!S.hasWallet || S.wallet < t.total) ? <View style={{paddingVertical:10}}>
      <T cmsKeys={["lbl.cms.dcdea3f94cd3","lbl.cms.1b69bdd92811"]} size={14} weight="600" color={th.red}>{!S.hasWallet ? label("lbl.cms.dcdea3f94cd3", "Wantiss Wallet is not available.") : label("lbl.cms.1b69bdd92811", "Insufficient Wantiss Wallet balance.")}</T>
      <T cmsKeys={["lbl.cms.a878cc26f08f","lbl.cms.ffb62b872edd","lbl.cms.d2f0b5c9f696","lbl.cms.e1ce1d9b44e5"]} size={12.5} color={th.mut} style={{marginTop:3}}>{!S.hasWallet ? label("lbl.cms.a878cc26f08f", "Create a wallet or choose another payment method.") : label("lbl.cms.ffb62b872edd", "Your balance is ") + money(S.wallet) + label("lbl.cms.d2f0b5c9f696", ". Add ") + money(Math.max(0,t.total-S.wallet)) + label("lbl.cms.e1ce1d9b44e5", " or choose another payment method.")}</T>
      <Pressable onPress={() => go('payments')} style={{alignSelf:'flex-start',paddingVertical:6}}><T cmsKey={'lbl.checkoutOpenWallet'} size={13} weight="600" color={th.br}>{label('lbl.checkoutOpenWallet', "Open Wallet")}</T></Pressable>
    </View> : null}
    <Sum rows={[[pk ? label("lbl.cms.c036c1628698","Pickup") : label("lbl.cms.4f41d93f89c6","Delivery to"), pk ? st.n : a.t], [label("lbl.cms.b7e3f7d2bbc4","When"), S.sch ? fmtStoreDay(st.id,S.sch) + ', ' + fmtStoreTime(st.id,S.sch) : label("lbl.cms.2d27b416d70d","ASAP")], [label("lbl.cms.b38dad2419ef","Contact"), ct.ph], [label("lbl.cms.f2c657366cc0","Payment"), S.pay === 'card' ? label("lbl.cms.9d0a083bbac9","Card •••• ") + ((S.cards.find((card: any) => card.id === S.selectedCardId) || S.cards[0])?.l4 || '') : ({wallet: label("lbl.cms.8895dfda4351","Wallet"), moncash: label("lbl.cms.0cad80a25b4b","MonCash"), cash: label("lbl.cms.ffb25a7171b4","Cash")} as any)[S.pay]], ...(S.note ? [[label("lbl.cms.5a9d0e767b9b","Note"), S.note] as any] : [])]} />
    {hasAlcohol() ? <Card style={{borderColor: th.br}}><T cmsKey={'lbl.checkoutAlcoholConfirm'} weight="600">{label('lbl.checkoutAlcoholConfirm', 'Alcohol order. Please confirm.')}</T><T size={13} color={th.mut} style={{marginVertical: 6}}>{rgText('rg.refund', 'If the ID check fails, the alcohol returns to the store and you are refunded to your Wantiss wallet minus the delivery fee.', alcAge(S.cart.sid).age)}</T><Pressable onPress={() => setConsent(!S.alcConsent)} accessibilityRole="checkbox" accessibilityState={{checked: !!S.alcConsent}} style={{flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 4}}><View style={{width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: th.br, backgroundColor: S.alcConsent ? th.br : 'transparent', alignItems: 'center', justifyContent: 'center'}}>{S.alcConsent ? <Icon name="check" size={14} color="#fff" /> : null}</View><T size={13.5} style={{flex: 1}}>{rgText('rg.consent', 'I am {age} or older and will show valid government photo ID on delivery or pickup.', alcAge(S.cart.sid).age)}</T></Pressable></Card> : null}
    <Sum rows={[[label("lbl.cms.87110ca073a0","Subtotal"), money(t.sub)], [label("lbl.cms.375ef58f2e7a","Delivery fee"), pk ? label("lbl.cms.c036c1628698","Pickup") : t.free ? label("lbl.cms.b9a67ad4232a","Free") : money(t.fee), t.free ? 'g' : undefined as any], [label("lbl.cms.b0d33600a790","Service fee"), money(t.svc)], ...(t.disc ? [[label("lbl.cms.157ca315044a","Discount"), '-' + money(t.disc), 'g'] as any] : []), ...(t.tip ? [[label("lbl.cms.4e0609617fa9","Tip"), money(t.tip)] as any] : [])]} total={[label("lbl.cms.85a0073d9a54","Total"), money(t.total)]} />
  </>);
  return (
    <View>
      <Bar cmsKey={'lbl.checkoutTitle'} title={label('lbl.checkoutTitle', 'Checkout')} onBack={back} />
      <View style={{paddingHorizontal: 16}}>
        <View style={{flexDirection: 'row', gap: 6, marginBottom: 6}}>{stp.map((x, n) => <View key={x} style={{flex: 1, alignItems: 'center'}}><View style={{height: 5, borderRadius: 3, alignSelf: 'stretch', backgroundColor: n <= S.cs ? th.br : th.line}} /><T size={11.5} weight={n === S.cs ? '800' : '500'} style={{marginTop: 5}}>{x}</T></View>)}</View>
        {body}
      </View>
    </View>
  );
}
export const CheckoutFoot = () => {
  const pricingReady = isPk() || (deliveryQuoteReady() && (!fees().firstFree || S.firstOrderEligible !== null));
  const insufficientWallet = (S.cs === 3) && S.pay === 'wallet' && (!S.hasWallet || S.wallet < totals().total);
  const lbl = S.busy ? label('lbl.checkoutSubmitting','Placing order…') : !pricingReady && S.cs >= 2 ? label('lbl.cms.deliveryCalculating', 'Calculating delivery…') : S.cs === 3
    ? label('lbl.checkoutPlaceOrder', 'Place order') + ' · ' + money(totals().total)
    : label('lbl.checkoutContinue', 'Continue');
  return <Cta label={lbl} disabled={!!S.busy || (!pricingReady && S.cs >= 2) || (S.cs === 3 && hasAlcohol() && !S.alcConsent) || insufficientWallet} onPress={S.cs === 3 ? () => {void placeOrder();} : checkoutNext} />;
};

export function Confirm({id}: {id: string}) {
  const th = useTheme(), o = S.orders.filter((x: any) => x.id === id)[0];
  if (!o || !o.backendId) return <View><Bar cmsKey={"lbl.shopAuto15CA8YK"} title={label("lbl.shopAuto15CA8YK", "Order")} onBack={back} /><Empty emoji="📦" title={label('lbl.orderUnavailable', 'Order unavailable')} text={label('lbl.orderLiveUnavailable', 'This order is not available from the live Wantiss order service.')} button={label('lbl.orderGoHome', 'Go home')} onPress={browse} /></View>;
  return (
    <View style={{paddingHorizontal: 16, paddingTop: 50, alignItems: 'center'}}>
      <Text style={{fontSize: 70}}>✅</Text>
      <T cmsKey={'lbl.confirmOrderPlaced'} size={24} weight="600" style={{marginTop: 10, marginBottom: 4}}>{label('lbl.confirmOrderPlaced', 'Order placed')}</T>
      <T cmsKeys={["lbl.cms.f7925b4ff6ef","lbl.cms.e2119bae7932",'lbl.storeNotFound']} color={th.mut} align="center">{label("lbl.cms.f7925b4ff6ef", "Order ")}{o.id} {label("lbl.cms.e2119bae7932", "with ")}{STB[o.sid]?.n || o.sn || label('lbl.storeNotFound', 'Store not found')}.</T>
      <View style={{alignSelf: 'stretch', marginTop: 20}}>
        <Sum rows={o.lines.map((l: any) => [l.q + '× ' + l.n, money(l.p * l.q)])} total={[label("lbl.cms.85a0073d9a54","Total"), money(o.total)]} />
        <Cta cmsKey={'lbl.confirmTrackOrder'} label={label('lbl.confirmTrackOrder', 'Track order')} onPress={() => go('track', o.id)} /><View style={{height: 10}} /><Cta cmsKey={'lbl.confirmBackGoodies'} ghost label={label('lbl.confirmBackGoodies', 'Back to Goodies')} onPress={() => tab('home')} />
      </View>
    </View>
  );
}

function DeliveryRouteMap({orderId, origin, destination, route}: {orderId: string; origin: any; destination: any; route: any}) {
  const th = useTheme();
  const accountId = S.accountId, identity = `${accountId}:${orderId}`;
  const [courier, setCourier] = useState<any>(null);
  const [assignmentStatus, setAssignmentStatus] = useState('');
  const [locationStale, setLocationStale] = useState(false);
  const [trackingError, setTrackingError] = useState(false);
  const [mapIdentity, setMapIdentity] = useState(identity);
  useEffect(() => {
    let active = true;
    let request = 0;
    const owned = () => active && S.accountId === accountId;
    setMapIdentity(identity); setCourier(null); setAssignmentStatus(''); setLocationStale(false); setTrackingError(false);
    const load = async () => {
      if (!owned()) return;
      const current = ++request;
      try {
        const {data, error} = await supabase.from('goodies_delivery_assignments')
          .select('latitude,longitude,status,location_updated_at')
          .eq('order_id', orderId).maybeSingle();
        if (!owned() || current !== request) return;
        if (error) throw error;
        const location = courierLocation(data);
        setAssignmentStatus(String(data?.status || ''));
        setLocationStale(!!data?.location_updated_at && !location && ['accepted', 'picked_up'].includes(data.status));
        setCourier(location);
        setTrackingError(false);
      } catch {
        if (!owned() || current !== request) return;
        setCourier(null); setTrackingError(true);
      }
    };
    void load();
    // Recheck freshness even when no realtime event arrives (for example, if GPS stops).
    const freshnessTimer = setInterval(() => {
      if (!owned()) return;
      // Expire locally even if the network request never settles while offline.
      setCourier((previous: any) => previous && {...previous, stale: !courierLocation({...previous, status: 'accepted', location_updated_at: previous.updatedAt})});
      void load();
    }, 30000);
    const channel = supabase.channel('goodies-courier-map-' + orderId)
      .on('postgres_changes', {event: '*', schema: 'public', table: 'goodies_delivery_assignments', filter: 'order_id=eq.' + orderId}, () => { void load(); })
      .subscribe();
    return () => { active = false; clearInterval(freshnessTimer); void supabase.removeChannel(channel); };
  }, [orderId, accountId, identity]);
  const valid = (point: any) => !!coordinate(point);
  const segments = routeSegments(route);
  const owned = mapIdentity === identity, visibleCourier = owned && !courier?.stale ? courier : null;
  const region = trackingRegion([origin, destination, visibleCourier, ...segments.flat()]);
  return <Card style={{padding: 12}}>
    <T cmsKey={'lbl.orderLiveTracking'} size={15} weight="600">{label('lbl.orderLiveTracking', 'Live delivery route')}</T>
    {region ? <MapView style={{height: 250, borderRadius: 14, marginTop: 10}} region={region} showsCompass>
      {valid(origin) ? <Marker coordinate={origin} title={label('lbl.orderStoreOrigin','Store')} pinColor="#2E8B57" /> : null}
      {valid(destination) ? <Marker coordinate={destination} title={label('lbl.orderDeliveryDestination','Delivery address')} pinColor="#D97706" /> : null}
      {valid(visibleCourier) ? <Marker coordinate={visibleCourier} title={label('lbl.orderCourierLocation','Courier')} description={visibleCourier.updatedAt ? label('lbl.orderCourierUpdated','Updated {time}').replace('{time}',fmtTime(new Date(visibleCourier.updatedAt))) : ''} /> : null}
      {segments.map((points, index) => <Polyline key={index} coordinates={points} strokeWidth={4} strokeColor={th.br} />)}
    </MapView> : <Empty title={label('lbl.orderMapPreparing','Preparing delivery map')} text={label('lbl.orderMapPreparingHint','The map appears when the delivery address has been geocoded.')} />}
    {!segments.length && region ? <T cmsKey={'lbl.orderRoadRouteUnavailable'} size={12} color={th.mut} style={{marginTop:8}}>{label('lbl.orderRoadRouteUnavailable', 'Road route unavailable. The map shows known locations only.')}</T> : null}
    <T cmsKeys={['lbl.orderCourierRefreshFailed','lbl.orderCourierLive','lbl.orderCourierStale','lbl.orderCourierOffer','lbl.orderCourierAwaitingGps','lbl.orderCourierPending']} size={12} color={th.mut} style={{marginTop:8}}>{owned && trackingError ? label('lbl.orderCourierRefreshFailed', 'Courier tracking is temporarily unavailable. Retrying automatically.') : valid(visibleCourier) ? label('lbl.orderCourierLive','Courier GPS location is updating live.') : owned && (locationStale || courier?.stale) ? label('lbl.orderCourierStale', 'The courier GPS signal is temporarily stale. Waiting for a fresh location update.') : owned && assignmentStatus === 'offered' ? label('lbl.orderCourierOffer','Waiting for the courier to accept the delivery.') : owned && (assignmentStatus === 'accepted' || assignmentStatus === 'picked_up') ? label('lbl.orderCourierAwaitingGps', 'Courier accepted. Waiting for the first GPS location.') : label('lbl.orderCourierPending','Waiting for courier assignment. The map will update when a courier starts sharing GPS.')}</T>
  </Card>;
}

function PickupLocationMap({origin}: {origin: unknown}) {
  const point = coordinate(origin);
  return <Card style={{padding: 12}}><T cmsKey={'lbl.orderPickupLocation'} size={15} weight="600">{label('lbl.orderPickupLocation', 'Pickup location')}</T>{point ? <MapView style={{height: 200, marginTop: 8, borderRadius: 12}} region={{...point, latitudeDelta: 0.01, longitudeDelta: 0.01}}><Marker coordinate={point} title={label('lbl.orderPickupLocation', 'Pickup location')} /></MapView> : <Empty title={label('lbl.orderPickupUnavailable', 'Live location unavailable')} text={label("lbl.shopAuto1WOHU9O", "Pickup coordinates have not been provided by the store.")} />}</Card>;
}

export function Track({id}: {id: string}) {
  const th = useTheme(), o = S.orders.filter((x: any) => x.id === id)[0];
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState('');
  const accountId = S.accountId, identity = `${accountId}:${id}:${o?.backendId || ''}`;
  const scopeRef = useRef({identity, active: true});
  if (scopeRef.current.identity !== identity) {scopeRef.current.active = false; scopeRef.current = {identity, active: true};}
  const receiptLock = useRef<object | null>(null);
  const [trackingStatus, setTrackingStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [trackingRetry, setTrackingRetry] = useState(0);
  useEffect(() => {
    const scope = scopeRef.current; scope.active = true;
    setReceiptBusy(false); setReportOpen(false); setReportText('');
    return () => {scope.active = false;};
  }, [identity]);
  const receiptCall = async (fn: 'goodies_customer_confirm_received' | 'goodies_customer_dispute_delivery', args: any, okMessage: string) => {
    const scope = scopeRef.current, token = {};
    if (receiptLock.current || !scope.active || !o?.backendId || S.accountId !== accountId) return;
    receiptLock.current = token; setReceiptBusy(true);
    const current = () => scope.active && scopeRef.current === scope && S.accountId === accountId;
    let error: any;
    try {({error} = await supabase.rpc(fn, args));}
    catch {error = {message: 'Request unavailable'};}
    finally {if (receiptLock.current === token) receiptLock.current = null; if (current()) setReceiptBusy(false);}
    if (!current()) return;
    if (error) {toast(label("lbl.cms.d87606c1f3c5", "Could not send this. Please try again.")); return;}
    const order = S.orders.find((row: any) => row.backendId === o.backendId);
    if (!order) return;
    toast(okMessage); setReportOpen(false); setReportText('');
    if (fn === 'goodies_customer_confirm_received') {order.serverStatus = 'completed'; order.st = require('../store').stage(order);} else order.deliveryDispute = 'open';
    save(); emit(); setTrackingRetry(value => value + 1);
  };
  useEffect(() => {
    if (!o?.backendId) return;
    const scope = scopeRef.current, backendId = o.backendId;
    const current = () => scope.active && scopeRef.current === scope && S.accountId === accountId;
    const refresh = createGoodiesRefresh({
      current,
      state: setTrackingStatus,
      read: async () => {
        const {data, error} = await supabase.from('goodies_orders').select('status,scheduled_for,acceptance_deadline_at,decline_reason_public,payment_status,payment_method,payment_provider_ref,store_latitude,store_longitude,delivery_latitude,delivery_longitude,delivery_route,courier_id,self_delivery,self_driver_name,self_driver_phone,delivery_proof_url,vendor_delivered_at,receipt_deadline_at,delivery_dispute_status').eq('id', backendId).maybeSingle();
        if (error || !data) throw error || new Error('Order unavailable');
        let proofUrl = '', proofError = '';
        try {proofUrl = await resolveGoodiesDeliveryProof(data.delivery_proof_url || '');}
        catch {proofError = label('lbl.orderProofUnavailable', 'Delivery photo unavailable. Please try again later.');}
        return {data, proofUrl, proofError};
      },
      commit: ({data, proofUrl, proofError}) => {
        const order = S.orders.find((row: any) => row.backendId === backendId);
        if (!order) return;
        order.serverStatus = data.status;
        order.acceptanceDeadlineAt = data.acceptance_deadline_at;
        order.declineReasonPublic = data.decline_reason_public;
        order.paymentStatus = data.payment_status;
        order.storeLatitude = data.store_latitude == null ? null : Number(data.store_latitude);
        order.storeLongitude = data.store_longitude == null ? null : Number(data.store_longitude);
        order.deliveryLatitude = data.delivery_latitude == null ? null : Number(data.delivery_latitude);
        order.deliveryLongitude = data.delivery_longitude == null ? null : Number(data.delivery_longitude);
        order.deliveryRoute = data.delivery_route || null;
        order.courierId = data.courier_id || null;
        order.selfDelivery = !!data.self_delivery; order.selfDriverName = data.self_driver_name || ''; order.selfDriverPhone = data.self_driver_phone || '';
        order.proofUrl = proofUrl; order.proofError = proofError;
        order.vendorDeliveredAt = data.vendor_delivered_at || null; order.receiptDeadlineAt = data.receipt_deadline_at || null; order.deliveryDispute = data.delivery_dispute_status || null;
        order.declined = data.status === 'declined'; order.expired = data.status === 'expired';
        order.sch = data.scheduled_for ? new Date(data.scheduled_for).getTime() : 0;
        order.cx = ['cancelled', 'declined', 'expired'].includes(data.status) ? 1 : 0;
        order.st = require('../store').stage(order);
        save(); emit();
        if (data.payment_method === 'card' && ['declined','expired','cancelled'].includes(String(data.status)) && ['paid','refund_pending'].includes(data.payment_status) && !order.refundRequested) {
          order.refundRequested = true;
          void (async () => {
            try {
              const refund = await supabase.functions.invoke('refund-goodies-card-order', {body: {order_id: backendId}});
              if (!current()) return;
              if (!refund.error && !refund.data?.error && refund.data?.status) order.paymentStatus = refund.data.status;
            } catch {} finally {
              order.refundRequested = false;
              if (current()) {save(); emit();}
            }
          })();
        }
      },
    });
    void refresh.refresh();
    const channel = supabase.channel('goodies-order-status-' + backendId).on('postgres_changes', {event: 'UPDATE', schema: 'public', table: 'goodies_orders', filter: 'id=eq.' + backendId}, () => {void refresh.refresh();}).subscribe();
    const poll = setInterval(() => {if (AppState.currentState === 'active') void refresh.refresh();}, 30000);
    const foreground = AppState.addEventListener('change', state => {if (state === 'active') void refresh.refresh();});
    return () => {refresh.stop(); clearInterval(poll); foreground.remove(); void supabase.removeChannel(channel);};
  }, [o?.backendId, accountId, identity, trackingRetry]);
  if (!o) return <View><Bar cmsKey={"lbl.shopAuto15CA8YK"} title={label("lbl.shopAuto15CA8YK", "Order")} onBack={back} /><Empty emoji="📦" title={label('lbl.orderNotFound', 'Order not found')} button={label('lbl.orderGoHome', 'Go home')} onPress={browse} /></View>;
  const s = STB[o.sid] || {n: o.sn || label('lbl.storeNotFound', 'Store not found'), e: '🏪', bg: 0}, T_: string[] = stageLabels(!!o.pk, o.pk ? TP : TL), dn = done(o);
  const serverStatus = String(o.serverStatus || '').toLowerCase();
  const eta = o.declined ? label('lbl.orderStoreDeclined', 'Store declined the order') : o.expired ? label('lbl.orderExpired', 'Response window expired') : o.cx ? label('lbl.orderCancelled', 'Cancelled') : dn ? (o.pk ? label('lbl.orderPickedUp', 'Picked up') : label('lbl.orderDelivered', 'Delivered')) : o.backendId ? (serverStatus === 'scheduled' && o.sch && Date.now() < o.sch ? label('lbl.orderScheduledFor', 'Scheduled for {time}').replace('{time}', fmtTime(new Date(o.sch))) : serverStatus === 'scheduled' || serverStatus === 'placed' ? label('lbl.orderWaitingStore', 'Waiting for store to accept') : serverStatus === 'accepted' ? label('lbl.orderAccepted', 'Order accepted by store') : serverStatus === 'preparing' ? label('lbl.orderPreparing', 'Store is preparing your order') : serverStatus === 'ready' ? (o.pk ? label('lbl.orderReadyPickup', 'Ready for pickup') : label('lbl.orderReadyCourier', 'Ready for courier pickup')) : serverStatus === 'courier_assigned' ? label('lbl.orderCourierAssigned', 'A courier has been assigned') : serverStatus === 'picked_up' ? label('lbl.orderCourierPickedUp', 'Your courier has picked up the order') : label('lbl.orderUpdated', 'Order update')) : o.sch && Date.now() < o.sch ? label('lbl.orderScheduledFor', 'Scheduled for {time}').replace('{time}', fmtTime(new Date(o.sch))) : label('lbl.orderUpdated', 'Order update');
  return (
    <View>
      <Bar cmsKey={"lbl.cms.f7925b4ff6ef"} title={label("lbl.cms.f7925b4ff6ef", "Order ") + o.id} onBack={back} />
      <View style={{paddingHorizontal: 16}}>
        <Card>
          <Row><Tile e={s.e} bg={s.bg} photo={s.thumbnail || s.cover || s.logo} /><View style={{flex: 1}}><T weight="600">{s.n}</T><T cmsKeys={['lbl.orderPickupShort','lbl.orderToAddress']} size={13} color={th.mut}>{o.pk ? label('lbl.orderPickupShort', 'Pickup') : label('lbl.orderToAddress', 'To {address}').replace('{address}', o.ad ? o.ad.t + (o.ad.apt ? ', ' + o.ad.apt : '') : o.addr)}</T></View></Row>
          <View style={{marginTop: 10}}><Badge green={!!(dn && !o.cx)} label={eta} /></View>
          {o.selfDelivery && serverStatus === 'picked_up' ? <View style={{marginTop: 14}}>
            <T cmsKey={"lbl.cms.159703b671cc"} size={13} color={th.mut}>{label("lbl.cms.159703b671cc", "Delivered by the store · ")}{o.selfDriverName}{o.selfDriverPhone ? ' · ' + o.selfDriverPhone : ''}</T>
            {o.vendorDeliveredAt ? <View style={{marginTop: 10}}>
              {o.proofUrl ? <Image source={{uri: o.proofUrl}} style={{width: '100%', height: 190, borderRadius: 14, backgroundColor: th.soft}} resizeMode="cover" /> : null}
              {o.proofError ? <T size={12} color={th.mut}>{o.proofError}</T> : null}
              {o.deliveryDispute === 'open' ? <T cmsKey={"lbl.cms.8acc0d99b9d7"} size={13.5} weight="600" style={{marginTop: 10}}>{label("lbl.cms.8acc0d99b9d7", "Your report was sent. Our team is reviewing it.")}</T> : <>
                <T cmsKeys={["lbl.cms.86aa98d055a3","lbl.cms.227331420344"]} size={13.5} style={{marginTop: 10}}>{label("lbl.cms.86aa98d055a3", "The store says this order was delivered. Please confirm, or report a problem before ")}{o.receiptDeadlineAt ? new Date(o.receiptDeadlineAt).toLocaleString() : label("lbl.cms.227331420344", "the deadline")}.</T>
                <View style={{marginTop: 10}}><Cta cmsKeys={["lbl.cms.4531925b5cf1","lbl.cms.b17be51367a9"]} label={receiptBusy ? label("lbl.cms.4531925b5cf1", "Please wait…") : label("lbl.cms.b17be51367a9", "I received my order")} disabled={receiptBusy} onPress={() => void receiptCall('goodies_customer_confirm_received', {p_order_id: o.backendId}, label("lbl.page.screens.Shop.9b6c227411", "Thanks for confirming."))} /></View>
                {reportOpen ? <View style={{marginTop: 10}}>
                  <Input cmsPlaceholderKey={"lbl.cms.7b49bfc70d42"} value={reportText} onChange={setReportText} placeholder={label("lbl.cms.7b49bfc70d42", "What went wrong?")} />
                  <View style={{marginTop: 10}}><Cta cmsKey={"lbl.cms.c814afa2abd9"} ghost label={label("lbl.cms.c814afa2abd9", "Send report")} disabled={receiptBusy || reportText.trim().length < 3} onPress={() => void receiptCall('goodies_customer_dispute_delivery', {p_order_id: o.backendId, p_reason: reportText}, label("lbl.page.screens.Shop.bfeb229338", "Your report was sent."))} /></View>
                </View> : <Pressable onPress={() => setReportOpen(true)} style={{marginTop: 12, alignItems: 'center'}}><T cmsKey={"lbl.cms.1ef1997e7f65"} size={13.5} weight="600" color={th.red}>{label("lbl.cms.1ef1997e7f65", "I have a problem with this order")}</T></Pressable>}
              </>}
            </View> : <T cmsKey={"lbl.cms.74d8ca9709e9"} size={13} color={th.mut} style={{marginTop: 6}}>{label("lbl.cms.74d8ca9709e9", "Your order is on its way.")}</T>}
          </View> : null}
          {o.cx ? <T cmsKeys={['lbl.orderDeclinedMessage','lbl.orderDeclinedFallback','lbl.orderExpiredMessage','lbl.orderCancelledMessage',"lbl.cms.0b1f18ae2490","lbl.cms.55da95a03134","lbl.cms.4a0be576ba7b","lbl.cms.345fec0110b5"]} size={14} color={th.mut} style={{marginTop: 12}}>{o.declined ? label('lbl.orderDeclinedMessage', 'The store could not accept your order. {reason}').replace('{reason}', o.declineReasonPublic || label('lbl.orderDeclinedFallback', 'Please try another store.')) : o.expired ? label('lbl.orderExpiredMessage', 'The store did not respond within 15 minutes. Your order was cancelled.') : label('lbl.orderCancelledMessage', 'This order was cancelled')}{o.pay === 'card' ? (o.paymentStatus === 'refunded' ? label("lbl.cms.0b1f18ae2490", " Your card refund has been submitted. It may take a few business days to appear.") : label("lbl.cms.55da95a03134", " Your card refund is being processed. It may take a few business days to appear.")) : o.paymentStatus === 'refunded' || o.pay === 'wallet' ? label("lbl.cms.4a0be576ba7b", " Any applicable refund will be shown in your Wantiss wallet activity.") : label("lbl.cms.345fec0110b5", " You were not charged for this order.")}</T> : (<>
            <View style={{flexDirection: 'row', gap: 6, marginVertical: 14}}>{T_.map((x, i) => <View key={i} style={{flex: 1, height: 6, borderRadius: 3, backgroundColor: i <= o.st ? th.br : th.line}} />)}</View>
            {T_.map((x, i) => <View key={i} style={{flexDirection: 'row', gap: 12, marginVertical: 12, alignItems: 'center'}}><View style={{width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: i <= o.st ? th.br : th.line, backgroundColor: i <= o.st ? th.br : 'transparent', alignItems: 'center', justifyContent: 'center'}}>{i <= o.st ? <Icon name="check" size={12} color="#fff" /> : null}</View><T size={14} color={i <= o.st ? th.ink : th.mut} weight={i <= o.st ? '700' : undefined}>{x}</T></View>)}
          </>)}
          {trackingStatus === 'loading' ? <ActivityIndicator size="small" /> : null}
          {trackingStatus === 'error' ? <View><T cmsKey={'lbl.orderTrackingFailed'} size={12} color={th.red}>{label('lbl.orderTrackingFailed', 'Could not refresh this order. Please try again.')}</T><Cta cmsKey={'lbl.retry'} small ghost label={label('lbl.retry', 'Try again')} onPress={() => setTrackingRetry(value => value + 1)} /></View> : null}
        </Card>
        {o.pk && o.st >= 3 && !o.cx ? <PickupLocationMap origin={{latitude: o.storeLatitude, longitude: o.storeLongitude}} /> : null}
        {!o.pk && o.st >= 4 && !dn && o.backendId ? <DeliveryRouteMap orderId={o.backendId} origin={{latitude:o.storeLatitude,longitude:o.storeLongitude}} destination={{latitude:o.deliveryLatitude,longitude:o.deliveryLongitude}} route={o.deliveryRoute} /> : null}
        {o.alc ? <Card style={{borderColor: o.alc.status === 'failed' ? th.red : th.br}}><Row><Text style={{fontSize: 26}}>🪪</Text><View style={{flex: 1}}><T cmsKeys={["lbl.cms.5a0595a94ee9","lbl.cms.b76c533d659a","lbl.cms.e6097512cd01"]} weight="600">{label("lbl.cms.5a0595a94ee9", "ID check · ")}{o.alc.age}+ ({o.alc.who === 'shop' ? label("lbl.cms.b76c533d659a", "checked by the shop") : label("lbl.cms.e6097512cd01", "checked by the courier")})</T><T cmsKeys={["lbl.cms.d78ba6e23dc0","lbl.cms.3dc4a54dd622","lbl.cms.dab075b135b8","lbl.cms.08bec5419d29","lbl.cms.6c1b35aaee08"]} size={13} color={th.mut}>{o.alc.status === 'pending' ? label("lbl.cms.d78ba6e23dc0", "Have your valid government photo ID ready. The order is completed only after it is checked.") : o.alc.status === 'passed' ? label("lbl.cms.3dc4a54dd622", "ID checked.") : (o.pay === 'cash' ? label("lbl.cms.dab075b135b8", "ID check failed. You were not charged.") : label("lbl.cms.08bec5419d29", "ID check failed. ") + money(o.refund || 0) + label("lbl.cms.6c1b35aaee08", " was refunded to your Wantiss wallet. The delivery fee is not refunded."))}</T></View></Row>{(null)}</Card> : null}
        {dn && !o.cx && (!o.rated || (!o.pk && !!o.courierId && !o.selfDelivery && !o.driverRated)) ? <Card><Row sp style={{alignItems:'center'}}><View style={{flex:1}}><T cmsKey={'lbl.orderRate'} weight="600">{label('lbl.orderRate', 'Rate your order')}</T><T cmsKey={'lbl.orderFeedback'} size={12} color={th.mut}>{label('lbl.orderFeedback', 'Order and delivery feedback')}</T></View><View style={{flexDirection:'row',gap:3}}>{[1,2,3,4,5].map(k=><Pressable key={k} accessibilityRole="button" accessibilityLabel={label('lbl.a11yRateOrder', 'Rate order {n} stars').replace('{n}', String(k))} onPress={()=>{S.rt=k;require('../store').ui.sheet({kind:'review',id:o.id,initialStars:k});}}><Icon name="star" size={23} color={o.rated>=k?'#FFB400':th.line} fill /></Pressable>)}</View></Row>{o.rated ? <T cmsKey={'lbl.orderYourRating'} size={12} color={th.mut} style={{marginTop:5}}>{label('lbl.orderYourRating', 'Your rating: {n} ★').replace('{n}', String(o.rated))}</T> : null}{!o.pk && !!o.courierId && !o.selfDelivery ? <><View style={{height:1,backgroundColor:th.line,marginVertical:10}}/><Row sp style={{alignItems:'center'}}><View style={{flex:1}}><T cmsKey={'lbl.orderRateDriver'} weight="600">{label('lbl.orderRateDriver', 'Rate your driver')}</T><T cmsKey={'lbl.orderDeliveryExperience'} size={12} color={th.mut}>{label('lbl.orderDeliveryExperience', 'Delivery experience')}</T></View>{o.driverRated ? <T weight="600">{o.driverRated} ★</T> : <View style={{flexDirection:'row',gap:3}}>{[1,2,3,4,5].map(k=><Pressable key={k} accessibilityRole="button" accessibilityLabel={label('lbl.a11yRateDriver', 'Rate driver {n} stars').replace('{n}', String(k))} onPress={()=>{S.rt=k;require('../store').ui.sheet({kind:'driver-review',id:o.id,initialStars:k});}}><Icon name="star" size={23} color="#FFB400" fill /></Pressable>)}</View>}</Row></> : null}</Card> : null}
        {o.rated && (o.pk || !o.courierId || o.selfDelivery || o.driverRated) ? <Card>
          <T cmsKey={'lbl.orderThanksFeedback'} weight="600" align="center">{label('lbl.orderThanksFeedback', 'Thank you for your feedback!')}</T>
          {o.orderReview?.t ? <T cmsKey={"lbl.cms.dae6f942d4dd"} size={12.5} color={th.mut} style={{marginTop:8}}>{label("lbl.cms.dae6f942d4dd", "Your shop/order comment: “")}{o.orderReview.t}”</T> : null}
          {o.driverReview?.t ? <T cmsKey={"lbl.cms.46f72c090911"} size={12.5} color={th.mut} style={{marginTop:6}}>{label("lbl.cms.46f72c090911", "Your driver comment: “")}{o.driverReview.t}”</T> : null}
        </Card> : null}
        <Card style={{padding:12}}><T cmsKey={"lbl.cms.8d5e1a5fadd8"} size={14} weight="600" style={{marginBottom:8}}>{label("lbl.cms.8d5e1a5fadd8", "Items")}</T>{o.lines.map((l:any,index:number)=><Row key={l.k || l.id || index} style={{alignItems:'center',paddingVertical:6}}><Tile e={l.e || '🛍️'} bg={s?.bg || 'bg0'} photo={l.photo || IT[l.id]?.photo} size={46}/><View style={{flex:1}}><T weight="600">{l.q}× {l.n}</T>{l.d ? <T size={11.5} color={th.mut}>{l.d}</T> : null}</View><T weight="600">{money(l.p*l.q)}</T></Row>)}</Card><Sum rows={ [[label("lbl.cms.ef4acf6a72bb","Fees"), money(o.fee + o.svc)], ...(o.disc ? [[label("lbl.cms.157ca315044a","Discount"), '-' + money(o.disc), 'g'] as any] : []), ...(o.tip ? [[label("lbl.cms.4e0609617fa9","Tip"), money(o.tip)] as any] : []), [label("lbl.cms.b38dad2419ef","Contact"), (o.ph || label("lbl.cms.6ae0f21e3435","n/a")) + (o.phl ? ' (' + o.phl + ')' : '')], ...(o.ad && o.ad.inst ? [[label("lbl.cms.234ba50b0bb2","Instructions"), o.ad.inst] as any] : []), ...(o.note ? [[label("lbl.cms.5a9d0e767b9b","Note"), o.note] as any] : [])]} total={[label("lbl.cms.2a83279eab59","Total · ") + o.payl, money(o.total)]} />
        {!dn && o.st <= 2 ? <><Card style={{padding: 0, borderWidth: 0}}><Pressable onPress={() => cancelAsk(o.id)} style={{height: 52, borderRadius: 16, backgroundColor: th.soft, alignItems: 'center', justifyContent: 'center'}}><T cmsKey={'lbl.orderCancelAction'} size={15.5} weight="600" color={th.red}>{label('lbl.orderCancelAction', 'Cancel order')}</T></Pressable></Card></> : null}
        <Cta cmsKey={'lbl.orderAgain'} ghost label={label('lbl.orderAgain', 'Order again')} onPress={() => reorder(o.id)} /><View style={{height: 10}} />
        {!o.cx ? <><Cta cmsKey={'lbl.orderMessageStore'} ghost label={label('lbl.orderMessageStore', 'Message store')} onPress={() => go('storechat', o.sid)} /><View style={{height: 10}} /></> : null}
        <Cta cmsKey={'lbl.orderGetHelp'} ghost label={label('lbl.orderGetHelp', 'Get help with this order')} onPress={() => go('contact', {o: true, oid: o.id})} /><View style={{height: 10}} />
        <Cta cmsKey={'lbl.orderGoToOrders'} label={label('lbl.orderGoToOrders', 'Go to Orders')} onPress={() => tab('orders')} />
      </View>
    </View>
  );
}

export function Orders() {
  useEffect(() => {void refreshGoodiesOrders();}, [S.accountId]);
  const th = useTheme(), a = S.orders.filter((o: any) => (S.ot === 'active' ? !done(o) : done(o)));
  const stTxt = (o: any) => (o.cx ? label('lbl.orderCancelled', 'Cancelled') : stageLabels(!!o.pk, o.pk ? TP : TL)[o.st]);
  return (
    <View>
      <Bar cmsKey={'lbl.ordersTitle'} title={label('lbl.ordersTitle', 'Your orders')} onBack={() => require('../actions').back()} />
      <View style={{paddingHorizontal: 16}}>
        <Seg list={[['active', label('lbl.ordersActive', 'Active')], ['past', label('lbl.ordersPast', 'Past')]]} on={S.ot} onPick={setOrdersTab} />
        <View style={{height: 14}} />
        {S.ordersLoading && !S.orders.length ? <Card><View style={{height:64,borderRadius:12,backgroundColor:th.soft}} /><T cmsKey={'lbl.ordersLoading'} color={th.mut}>{label('lbl.ordersLoading', 'Loading orders…')}</T></Card> : null}
        {S.ordersError ? <View><T cmsKey={'lbl.ordersRefreshFailed'} color={th.red}>{label('lbl.ordersRefreshFailed', 'Could not refresh orders. Pull down to try again.')}</T><Cta cmsKey={'lbl.retry'} small ghost label={label('lbl.retry', 'Try again')} onPress={() => void refreshGoodiesOrders()} /></View> : null}
        {a.length ? a.map((o: any) => {
          const s = STB[o.sid] || {e: '🏪', bg: 0, n: o.sn || label('lbl.storeNotFound', 'Store not found')}, d = new Date(o.t0);
          return (
            <Card key={o.id}>
              <Pressable onPress={() => go('track', o.id)} style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                <Tile e={s.e} bg={s.bg} photo={s.thumbnail || s.cover || s.logo} />
                <View style={{flex: 1}}><T weight="600">{s.n}</T><T size={12.5} color={th.mut}>{o.id} · {fmtDay(d)} · {money(o.total)}</T><View style={{marginTop: 5}}><Badge green={!!(done(o) && !o.cx)} label={stTxt(o)} /></View></View>
                <Icon name="chevR" size={16} color={th.ink} />
              </Pressable>
              <Row style={{marginTop: 12}}><Cta cmsKey={'lbl.ordersReorder'} small ghost label={label('lbl.ordersReorder', 'Reorder')} onPress={() => reorder(o.id)} /><Cta cmsKeys={['lbl.ordersDetails','lbl.ordersTrack']} small label={done(o) ? label('lbl.ordersDetails', 'Details') : label('lbl.ordersTrack', 'Track')} onPress={() => go('track', o.id)} /></Row>
            </Card>
          );
        }) : S.ordersError || S.ordersLoading ? null : <Empty emoji={S.ot === 'active' ? '🍽️' : '🧾'} title={S.ot === 'active' ? label('lbl.ordersNoActive', 'No active orders') : label('lbl.ordersNoPast', 'No past orders yet')} text={label('lbl.ordersEmptyText', 'Your orders will show up here.')} button={label('lbl.ordersBrowse', 'Browse stores')} onPress={() => go('explore')} />}
        {S.ordersHasMore ? <Cta cmsKeys={['lbl.ordersLoadingMore','lbl.loadMore']} ghost disabled={S.ordersPaging} label={S.ordersPaging ? label('lbl.ordersLoadingMore', 'Loading orders…') : label('lbl.loadMore', 'Load more')} onPress={() => void loadOlderGoodiesOrders()} /> : null}
      </View>
    </View>
  );
}

export function Favs() {
  const th = useTheme(), st = ST.filter(s => S.fav.indexOf(s.id) > -1), it = S.favp.map((id: string) => IT[id]).filter(Boolean);
  return (
    <View>
      <Bar cmsKey={'lbl.favoritesTitle'} title={label('lbl.favoritesTitle', 'Your favorites')} onBack={back} />
      <View style={{paddingHorizontal: 16}}><Seg list={[['stores', label('lbl.searchTabStores', 'Stores ({n})').replace('{n}', String(st.length))], ['items', label('lbl.searchTabItems', 'Items ({n})').replace('{n}', String(it.length))]]} on={S.ft} onPick={k => {S.ft = k; emit();}} /></View>
      {S.ft === 'stores' ? (st.length ? <View style={{gap: 22, padding: 16}}>{st.map(s => <StoreCard key={s.id} s={s} />)}</View> : <Empty icon="heart" title={label('lbl.favoritesEmpty', 'Nothing saved yet')} text={label('lbl.favoritesEmptyText', 'Save stores and products to find them here.')} button={label("lbl.shopAuto1GWRJAO", "Browse stores")} onPress={browse} />)
        : (it.length ? <View style={{paddingHorizontal: 16, marginTop: 6}}>{it.map((i: any) => <ItemRow key={i.id} i={i} />)}</View> : <Empty icon="heart" title={label('lbl.favoritesEmpty', 'Nothing saved yet')} text={label('lbl.favoritesEmptyText', 'Save stores and products to find them here.')} button={label("lbl.shopAuto1GWRJAO", "Browse stores")} onPress={browse} />)}
    </View>
  );
}

const FAQ: [string, string][] = [];
export function Help() {
  const th = useTheme(), [open, setOpen] = useState(-1);
  return (
    <View>
      <Bar cmsKey={'lbl.helpTitle'} title={label('lbl.helpTitle', 'Help center')} onBack={back} />
      <View style={{paddingHorizontal: 16}}>
        {faqList([]).map((x, k) => (
          <Pressable key={k} onPress={() => setOpen(open === k ? -1 : k)} style={{borderBottomWidth: 1, borderBottomColor: th.line, paddingVertical: 14, paddingHorizontal: 4}}>
            <T size={14.5} weight="600">{x[0]}</T>
            {open === k ? <T size={13.5} color={th.mut} style={{marginTop: 8, lineHeight: 20}}>{x[1]}</T> : null}
          </Pressable>
        ))}
        <View style={{height: 18}} /><Cta cmsKey={'lbl.helpContact'} label={label('lbl.helpContact', 'Contact support')} onPress={() => go('contact')} /><View style={{height: 10}} />
        <Cta cmsKey={'lbl.helpOrders'} ghost label={label('lbl.helpOrders', 'Report an order problem')} onPress={() => go('contact', {o: true, oid: ''})} /><View style={{height: 10}} />
        <Cta cmsKey={'lbl.accountTermsPolicies'} ghost label={label('lbl.accountTermsPolicies', 'Terms and policies')} onPress={() => go('policies')} />
      </View>
    </View>
  );
}
