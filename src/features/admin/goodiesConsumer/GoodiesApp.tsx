import {previewLinking as Linking} from './previewNative';
import {EditableNativeText as Text} from './EditableNativeText';
/* Goodies customer app entry. Mount inside the main Wantiss app:
     <GoodiesApp onExit={() => navigation.goBack()} />
   Navigation is an internal stack that mirrors v24 (S.stack). Native back (Android) and left-edge swipe (iOS and Android) both call navBack(). */
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {View, Text as UnusedNativeText, Image, Pressable, ScrollView, RefreshControl, Animated, PanResponder, BackHandler, Platform, ActivityIndicator, StatusBar, KeyboardAvoidingView, Dimensions, AppState, Linking as UnusedNativeLinking} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {Icon} from './components/Icon';
import {T, Grad, Cta, Badge, Row, Input, Card, SheetBox, Ttl, Radio, useTheme, Bar} from './components/ui';
import {S, ST, STB, load, save, emit, useGoodies, cur, cnt, totals, ui, toast, done, stage, notify, navBack, reset, applyZone, money, TL, TP, addr, push, setPreviewOnly, refreshLiveSchedules, refreshGoodiesAccess, validateActiveGroup} from './store';
import * as A from './actions';
import {refreshGoodiesOrders, startGoodiesSync} from './serverSync';
import {Home, Cats, CatList, Search, Promos, FlashDeals, Notifs, Explore} from './screens/Browse';
import {Store, StoreReviews, Product, ProductFoot, Cart, Checkout, CheckoutFoot, Confirm, Track, Orders, Favs, Help} from './screens/Shop';
import {Account} from './screens/Account';
import {Sheets, GroupOrderPage} from './components/Sheets';
import WalletAddNewCardScreen from './screens/AddCard';
import {CardAuthentication} from './screens/CardAuthentication';
import {HelpPay} from './screens/HelpPay';
import {ByoScreen, ByoFoot} from './builders/Builder';
import {loadBuilders, BD} from './builders/engine';
import {loadContent, label, stageLabels, onContent, catName} from './content';
import {PROMO} from './theme';
import {t as tr} from './i18n';
import GoodiesQuickMenu, {type GoodiesMenuAction} from './GoodiesQuickMenu';

const TABS = ['home', 'cats', 'orders', 'cart'];
const NOCB = ['cart', 'checkout', 'help-pay', 'confirm', 'track', 'notifs', 'storechat', 'grouporder', 'settings', 'payments', 'help', 'contact', 'supdone', 'profile', 'addresses', 'product', 'wantiss', 'ndetail', 'policies', 'policy', 'byo'];
const FOOTED = ['product', 'checkout'];

export function GoodiesApp({onExit, embedded = true, onUniversalAction, unreadNotifications = 0, unreadMessages = 0, initialRoute, previewMode=false}: {onExit?: () => void; embedded?: boolean; onUniversalAction?: (action:GoodiesMenuAction)=>void; unreadNotifications?:number; unreadMessages?:number; initialRoute?:string;previewMode?:boolean}) {
  // Resolve Saved shortcuts before the first frame; never show an empty transition screen.
  const initialDestination = useRef(false);
  if (!initialDestination.current) {
    initialDestination.current = true;
    if (initialRoute) {
      if (initialRoute.startsWith('product:')) { reset('home'); const productId=initialRoute.slice(8); if(productId in require('./store').IT) A.openProduct(productId); } else if (initialRoute.startsWith('store:')) { reset('home'); push('store', initialRoute.slice(6)); } else if (initialRoute === 'favs:stores' || initialRoute === 'favs:items') {
        S.ft = initialRoute.split(':')[1];
        reset('favs');
      } else reset(initialRoute);
    }
  }
  useGoodies();
  useEffect(() => onContent(() => emit()), []);
  const th = useTheme(), ins = useSafeAreaInsets();
  const scroll = useRef<React.ElementRef<typeof ScrollView>>(null);
  const [sheetRecord, setSheetRecord] = useState<any>(null), [toastTxt, setToastTxt] = useState(''), [goodiesLoaded, setGoodiesLoaded] = useState(false), [refreshing, setRefreshing] = useState(false);
  const sheet=sheetRecord?.accountId===S.accountId?sheetRecord?.value:null;
  const setSheet=(value:any)=>setSheetRecord(value?{accountId:S.accountId,value}:null);
  const toastT = useRef<any>(null);
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  useEffect(()=>{setSheetRecord(null);setToastTxt('');setQuickMenuOpen(false);},[S.accountId]);
  const goodiesUnreadCount = Math.max(Number(S.serverUnread || 0), S.notifs.filter((n: any) => n.u).length);
  const [startupError, setStartupError] = useState(false), [startupAttempt, setStartupAttempt] = useState(0);

  useEffect(() => {
    if (!goodiesLoaded) return;
    let active = true;
    /* Drop a group that ended or expired while the app was closed, so it cannot interfere with personal orders. */
    void validateActiveGroup();
    const openInvite = (url: string | null) => {
      if (!url) return;
      const productMatch=url.match(/^wantiss:\/\/goodies\/product\/([^?#]+)/i);
      if(productMatch){try{const productId=decodeURIComponent(productMatch[1]);if(productId in require('./store').IT)A.openProduct(productId);}catch{}return;}
      const storeMatch=url.match(/^wantiss:\/\/goodies\/store\/([^?#]+)/i);
      if(storeMatch){try{const storeId=decodeURIComponent(storeMatch[1]);if(STB[storeId])push('store',storeId);}catch{}return;}
      const match = url.match(/wantiss:\/\/goodies\/group\?code=([^&]+)/i);
      if (!match) return;
      try {(S as any).pendingGroupInviteCode = decodeURIComponent(match[1]).trim().toUpperCase();}
      catch {return;}
      ui.sheet({kind: 'group-order'});
    };
    void Linking.getInitialURL().then(url => {if (active) openInvite(url);});
    const subscription = Linking.addEventListener('url', ({url}) => openInvite(url));
    return () => {active = false; subscription.remove();};
  }, [goodiesLoaded]);


  /* bridge for store/actions */
  ui.toast = (t: string) => {setToastTxt(t); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToastTxt(''), 2300);};
  ui.sheet = (s: any) => setSheet(s);
  ui.close = () => setSheet(null);

  useEffect(() => {
    setPreviewOnly(previewMode);
    let active = true;
    let stopSync: (() => void) | null = null;
    void (async () => {
      setGoodiesLoaded(false);setStartupError(false);
      const contentReady = loadContent();
      await load();
      // Initial destination is applied synchronously before first render; never replay it after loading.
      await contentReady;
      if (active) {
        // Restore the requested destination after persistence/catalog hydration, before exposing the screen.
        if (initialRoute?.startsWith('product:')) {
          reset('home');
          const productId=initialRoute.slice(8);
          if(productId in require('./store').IT) A.openProduct(productId);
          else toast(label('lbl.productUnavailable','This product is unavailable.'));
        } else if (initialRoute?.startsWith('store:')) { reset('home'); push('store', initialRoute.slice(6)); }
        else if (initialRoute === 'favs:stores' || initialRoute === 'favs:items') { S.ft = initialRoute.split(':')[1]; reset('favs'); }
        else if (initialRoute) reset(initialRoute);
        else if (embedded) reset('home');
        setGoodiesLoaded(true);
      }
      await loadBuilders();
      if (active && !previewMode) stopSync = startGoodiesSync();
    })().catch(() => {if(active)setStartupError(true);});
    if (embedded && !initialRoute) S.stack = [{r: 'home', u: Date.now()}];
    /* order progress ticker (v24: every second) */
    const appStateSub = AppState.addEventListener('change', next => { if (next === 'active') void loadContent(); });
    const id = setInterval(() => {
      let ch = false;
      S.orders.forEach((o: any) => {
        if (!done(o)) {
          const st = stage(o);
          if (st !== o.st) {
            o.st = st; ch = true; const Tt = stageLabels(!!o.pk, o.pk ? TP : TL);
            notify(done(o) ? (o.pk ? label('lbl.orderNotifPickedUp', 'Order picked up') : label('lbl.orderNotifDelivered', 'Order delivered')) : label('lbl.orderNotifUpdate', 'Order update'), o.id + ': ' + Tt[st], 'track', o.id, 'o');
            if (done(o)) toast((o.pk ? label('lbl.orderToastPickedUp', 'Order {id} picked up 🎉') : label('lbl.orderToastDelivered', 'Order {id} delivered 🎉')).replace('{id}', o.id));
          }
        }
      });
      if (ch) {save(); emit();}
    }, 1000);
    return () => {active = false; appStateSub.remove(); clearInterval(id); stopSync?.();};
  }, [startupAttempt]);

  const handleBack = () => {
    const r = navBack();
    if (r === 'exit') {if (embedded) {S.stack = [{r: 'home', u: Date.now()}]; onExit && onExit();} emit();}
    return true;
  };
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => (sheet ? (setSheet(null), true) : handleBack()));
    return () => sub.remove();
  }, [sheet]);

  /* swipe-from-left-edge back. Starts only in the first 24px so horizontal rails and carousels keep working. */
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (e, g) => {
      // The floating cart bar and bottom navigation occupy this area. Do not
      // interpret a horizontal swipe there as a navigation-back gesture.
      const startY = e.nativeEvent.pageY - g.dy;
      const bottomOverlay = startY >= Dimensions.get('window').height - 190;
      return !bottomOverlay && e.nativeEvent.pageX - g.dx < 24 && g.dx > 12 && Math.abs(g.dy) < g.dx / 2 && cur().r !== 'wantiss';
    },
    onPanResponderRelease: (_e, g) => {if (g.dx > 80 && Math.abs(g.dy) < 45) handleBack();},
  }), [sheet]);

  const c = cur(), r = c.r;
  useEffect(() => { if (goodiesLoaded && ['home','cats','cart','explore','search','catlist','store','product','checkout','byo','promos','favs'].includes(r)) void refreshGoodiesAccess(); }, [goodiesLoaded, r]);
  const key = c.u + '|' + (r === 'checkout' ? S.cs : '');
  const lastKey = useRef('');
  useEffect(() => {if (key !== lastKey.current) {scroll.current?.scrollTo({y: c.sy || 0, animated: false}); lastKey.current = key;}}, [key]);

  let body: any;
  switch (r) {
    case 'wantiss': body = <Home onExit={handleBack} />; break;
    case 'home': body = <Home onExit={handleBack} />; break;
    case 'cats': body = <><Bar cmsKey={"lbl.interface.categories"} title={tr('categories')} onBack={A.back} right={<Pressable accessibilityRole="button" accessibilityLabel={label("lbl.cms.3ad6a1d313d9", "Favorites")} onPress={() => A.go('favs')} hitSlop={8} style={{width: 40, height: 40, alignItems: 'center', justifyContent: 'center'}}><Icon name="heart" size={24} color={th.br} /></Pressable>} /><Cats /></>; break;
    case 'orders': body = <Orders />; break;
    case 'cart': body = <Cart />; break;
    case 'grouporder': body = <GroupOrderPage onBack={handleBack} storeId={c.p} />; break;
    case 'explore': body = <Explore />; break;
    case 'search': body = <Search />; break;
    case 'catlist': body = <><TopBar title={c.p === 'all' ? label('lbl.catAllStores', 'All stores') : catName(String(c.p || 'all'))} /><CatList p={c.p} /></>; break;
    case 'store': body = <Store id={c.p} />; break;
    case 'reviews': body = <StoreReviews id={c.p} />; break;
    case 'product': body = <Product />; break;
    case 'checkout': body = <Checkout />; break;
    case 'help-pay': body = <HelpPay key={S.accountId||'signed-out'} />; break;
    case 'addcard': body = <WalletAddNewCardScreen contentLabel={label} onBack={A.back} onSaved={() => {void A.refreshPaymentOptions();}} />; break;
    case 'cardauth': body = S.cardPending ? <CardAuthentication clientSecret={S.cardPending.clientSecret} publishableKey={S.cardPending.publishableKey} onComplete={() => {void A.completeCardOrder();}} onCancel={() => {void A.cancelPendingCardOrder();}} /> : <Account r="payments" p={undefined} onOpenWallet={onUniversalAction?()=>onUniversalAction('wallet'):undefined} />; break;
    case 'confirm': body = <Confirm id={c.p} />; break;
    case 'track': body = <Track id={c.p} />; break;
    case 'notifs': body = <Notifs />; break;
    case 'promos': body = <Promos />; break;
    case 'flashdeals': body = <FlashDeals />; break;
    case 'favs': body = <Favs />; break;
    case 'byo': body = <ByoScreen p={c.p} />; break;
    case 'help': body = <Help />; break;
    default: body = <Account r={r} p={c.p} onOpenWallet={onUniversalAction?()=>onUniversalAction('wallet'):undefined} />;
  }
  const startupFailure = startupError ? <View style={{padding:20}}><Ttl>{label('lbl.startupFailed', 'Goodies could not load')}</Ttl><T cmsKey={'lbl.catalogRetryHint'}>{label('lbl.catalogRetryHint', 'Check your connection and try again.')}</T><Cta cmsKey={'lbl.retry'} label={label('lbl.retry', 'Try again')} onPress={()=>setStartupAttempt(n=>n+1)} /></View> : null;
  if (startupError) body = startupFailure;
  const accessBlocked = S.goodiesAccess?.status === 'suspended' || S.goodiesAccess?.status === 'banned';
  const accessRoutes = ['home', 'cats', 'cart', 'explore', 'search', 'catlist', 'store', 'product', 'checkout', 'byo', 'promos', 'favs'];
  if (accessBlocked && accessRoutes.includes(r)) {
    const banned = S.goodiesAccess.status === 'banned';
    body = <View style={{padding: 20, paddingTop: 36}}>
      <Card>
        <Ttl>{banned ? label("lbl.cms.77f13132a763", "Goodies access permanently restricted") : label("lbl.cms.8f441d23a479", "Goodies access temporarily suspended")}</Ttl>
        <T cmsKeys={["lbl.cms.53af57ba3af5","lbl.cms.870d2ecc0e14"]} size={13} style={{marginTop: 8}}>{S.goodiesAccess.reason || (banned ? label("lbl.cms.53af57ba3af5", "Your account can no longer use Goodies.") : label("lbl.cms.870d2ecc0e14", "Your access to Goodies is currently paused."))}</T>
        {S.goodiesAccess.endsAt ? <T cmsKey={"lbl.cms.cdd2f4e6592f"} size={12} style={{marginTop: 8}}>{label("lbl.cms.cdd2f4e6592f", "Access suspension ends ")}{new Date(S.goodiesAccess.endsAt).toLocaleDateString()}.</T> : null}
        <T cmsKey={"lbl.cms.392c62d5ae01"} size={12} style={{marginTop: 12}}>{label("lbl.cms.392c62d5ae01", "Your Wantiss account, wallet and existing Goodies order history remain available. Contact Wantiss Support if you believe this decision is incorrect.")}</T>
      </Card>
    </View>;
  }
  const [dismissedCartCount, setDismissedCartCount] = useState(-1);
  const cartDragX = useRef(new Animated.Value(0)).current;
  const showTabs = TABS.indexOf(r) > -1, showCb = !accessBlocked && cnt() > 0 && NOCB.indexOf(r) < 0 && dismissedCartCount !== cnt(), footed = !accessBlocked && (FOOTED.indexOf(r) > -1 || (r === 'byo' && !!BD && !BD.added));
  useEffect(() => { cartDragX.setValue(0); }, [cnt(), cartDragX]);
  const cartBannerPan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponderCapture: (_e, g) => Math.abs(g.dx) > 7 && Math.abs(g.dx) > Math.abs(g.dy) * 1.15,
    onPanResponderMove: (_e, g) => cartDragX.setValue(g.dx),
    onPanResponderRelease: (_e, g) => {
      if (Math.abs(g.dx) > 64 && Math.abs(g.dx) > Math.abs(g.dy) * 1.1) {
        Animated.timing(cartDragX, {toValue: (g.dx > 0 ? 1 : -1) * Dimensions.get('window').width, duration: 260, useNativeDriver: true}).start(({finished}) => {
          if (finished) { setDismissedCartCount(cnt()); cartDragX.setValue(0); }
        });
      } else {
        Animated.spring(cartDragX, {toValue: 0, useNativeDriver: true, speed: 22, bounciness: 5}).start();
      }
    },
    onPanResponderTerminate: () => Animated.spring(cartDragX, {toValue: 0, useNativeDriver: true}).start(),
  }), [cartDragX]);

  if (!goodiesLoaded && startupError) return <View accessibilityRole="alert" style={{flex:1,backgroundColor:th.bg}}><StatusBar barStyle={th.dark?'light-content':'dark-content'} />{startupFailure}</View>;
  if (!goodiesLoaded) return <View style={{flex:1,backgroundColor:th.bg,alignItems:'center',justifyContent:'center',paddingHorizontal:28}} accessibilityRole="progressbar" accessibilityLabel={initialRoute?.startsWith('store:')?label("lbl.cms.6bc6c58f3cfb", "Opening store"):label("lbl.cms.a256d1f083f5", "Loading Goodies")}>
    <StatusBar barStyle={th.dark?'light-content':'dark-content'} />
    <View style={{alignItems:'center',gap:16}}>
      <Image source={{uri:"https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/Goodies.PNG"}} style={{width:112,height:112}} resizeMode="contain" accessibilityLabel={label("lbl.cms.9c6764b3fb4b", "Goodies")} />
      <Text cmsKey={"lbl.cms.9c6764b3fb4b"} style={{fontSize:20,fontWeight:'500',color:th.dark?th.ink:'#000000'}}>{label("lbl.cms.9c6764b3fb4b", "Goodies")}</Text>
      <ActivityIndicator size="small" color="#BF008E" />
      <Text cmsKeys={["lbl.cms.e161497dcb67","lbl.cms.2da7d46cf638"]} style={{fontSize:13,color:th.mut,textAlign:'center'}}>{initialRoute?.startsWith('store:')?label("lbl.cms.e161497dcb67", "Opening store…"):label("lbl.cms.2da7d46cf638", "Getting everything ready…")}</Text>
    </View>
  </View>;

  // Do not render the previous Goodies route while an incoming deep link is loading.
  // The destination is applied after load() restores persisted navigation state.
  return (
    <KeyboardAvoidingView style={{flex: 1, backgroundColor: th.bg}} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0} {...pan.panHandlers}>
      <StatusBar barStyle={th.dark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={{flex: 1}} edges={[]}>
        {r === 'byo' || r === 'storechat' ? <View style={{flex: 1}}>{body}</View> : <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" onScroll={e => {c.sy = e.nativeEvent.contentOffset.y;}} scrollEventThrottle={64} showsVerticalScrollIndicator={false} refreshControl={['home','cats','orders','explore','search','catlist','store','flashdeals'].includes(r) ? <RefreshControl refreshing={refreshing} onRefresh={() => {if (refreshing) return; setRefreshing(true); void Promise.all([loadContent(), refreshLiveSchedules(), refreshGoodiesOrders()]).finally(() => setRefreshing(false));}} /> : undefined} contentContainerStyle={{paddingBottom: showTabs ? 170 : footed ? 120 : 110}}>
          {S.catalogError && ['cats','explore','search','catlist','store','product'].includes(r) ? <Card><T cmsKey={'lbl.catalogFailed'}>{label('lbl.catalogFailed', 'Could not load stores')}</T><Cta cmsKey={'lbl.retry'} ghost label={label('lbl.retry', 'Try again')} onPress={()=>void refreshLiveSchedules()} /></Card> : null}
          {body}
        </ScrollView>}
      </SafeAreaView>

      {footed ? <View style={{position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 12, paddingHorizontal: 16, paddingBottom: 12 + ins.bottom, backgroundColor: th.bg, borderTopWidth: 0.5, borderTopColor: th.line}}>{r === 'product' ? <ProductFoot /> : r === 'byo' ? <ByoFoot /> : <CheckoutFoot />}</View> : null}

      {showCb ? (
        <View pointerEvents="box-none" style={{position: 'absolute', left: 12, right: 12, bottom: showTabs ? 92 + ins.bottom : 14 + ins.bottom, height: 68, zIndex: 12}}>
          <Animated.View {...cartBannerPan.panHandlers} style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 54, borderRadius: 16, backgroundColor: th.br, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 14, paddingRight: 12, shadowColor: th.br, shadowOpacity: 0.45, shadowRadius: 24, shadowOffset: {width: 0, height: 10}, elevation: 12, transform: [{translateX: cartDragX}]}}>
            <Pressable accessibilityRole="button" accessibilityLabel={label("lbl.browseAutoJGDJ0J", "Open cart")} onPress={() => A.tab('cart')} style={{flex: 1, height: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
              <Row style={{gap: 10}}><View style={{minWidth: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,.25)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6}}><T size={13} weight="600" color="#fff">{cnt()}</T></View><T cmsKey={"lbl.browseAutoEJBBC2"} size={14.5} weight="600" color="#fff">{label("lbl.browseAutoEJBBC2", "Your cart")}</T></Row>
              <View style={{backgroundColor: '#fff', height: 38, paddingHorizontal: 13, borderRadius: 12, justifyContent: 'center'}}><T cmsKey={"lbl.cms.11da7c9c425f"} size={13.5} weight="600" color={th.brd}>{label("lbl.cms.11da7c9c425f", "View cart · ")}{money(totals().total)}</T></View>
            </Pressable>
          </Animated.View>
          <Pressable accessibilityRole="button" accessibilityLabel={label("lbl.browseAuto1APR0T", "Dismiss cart banner")} onPress={() => { cartDragX.setValue(0); setDismissedCartCount(cnt()); }} hitSlop={8} style={{position: 'absolute', top: -2, right: -3, width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 0.5, borderColor: th.line, alignItems: 'center', justifyContent: 'center', zIndex: 3, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 5, shadowOffset: {width: 0, height: 2}, elevation: 5}}>
            <Icon name="x" size={13} color={th.br} />
          </Pressable>
        </View>
      ) : null}

      {showTabs ? <BottomNav r={r} bottom={18} /> : null}
      <Pressable accessibilityRole="button" accessibilityLabel={label("lbl.cms.94924a30e5ac", "Open Goodies quick menu")} onPress={() => setQuickMenuOpen(true)} style={{position:'absolute',top:ins.top+42,right:12,width:49,height:42,alignItems:'center',justifyContent:'center',flexDirection: 'row',gap:3,backgroundColor:th.bg,borderRadius:22,zIndex:45}}><View style={{width:5,height:5,borderRadius:3,backgroundColor:th.ink}}/><View style={{width:7,height:7,borderRadius:4,backgroundColor:th.ink}}/><View style={{width:10,height:10,borderRadius:5,backgroundColor:th.ink}}/>{goodiesUnreadCount>0?<View style={{position:'absolute',right:-3,top:-7,minWidth:19,height:19,borderRadius:10,paddingHorizontal:4,backgroundColor:th.br,alignItems:'center',justifyContent:'center'}}><Text style={{color:'#FFF',fontSize:10,fontWeight:'600'}}>{goodiesUnreadCount>99?'99+':goodiesUnreadCount}</Text></View>:null}</Pressable>
      <GoodiesQuickMenu visible={quickMenuOpen} close={() => setQuickMenuOpen(false)} onUniversalAction={onUniversalAction} unreadNotifications={unreadNotifications} unreadMessages={unreadMessages} />
      <Sheets sheet={sheet} close={() => setSheet(null)} />
      {toastTxt ? <View pointerEvents="none" style={{position: 'absolute', left: 0, right: 0, bottom: 150, alignItems: 'center', zIndex: 30}}><View style={{backgroundColor: '#1B1B1F', borderRadius: 22, paddingHorizontal: 18, paddingVertical: 11, maxWidth: '86%'}}><T size={13.5} weight="600" color="#fff" align="center">{toastTxt}</T></View></View> : null}
    </KeyboardAvoidingView>
  );
}

function TopBar({title}: {title: string}) {
  const {Bar} = require('./components/ui');
  return <Bar title={title} onBack={A.back} />;
}

function BottomNav({r, bottom}: {r: string; bottom: number}) {
  const th = useTheme();
  const item = (id: string, label: string, icon: string) => {
    const on = r === id;
    return (
      <Pressable key={id} onPress={() => A.tab(id)} style={{flex: 1, height: 65, alignItems: 'center', justifyContent: 'center', gap: 3}}>
        <Icon name={icon} size={24} color={on ? th.br : th.mut} fill={icon === 'home' && on} />
        <T size={11} weight="600" color={on ? th.br : th.mut}>{label}</T>
        {on ? <View style={{position: 'absolute', bottom: 0, left: 12, right: 12, height: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: th.br}} /> : null}
        {id === 'cart' && cnt() ? <View style={{position: 'absolute', top: 10, right: 14, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: th.br, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4}}><T size={10.5} weight="600" color={th.navink}>{cnt()}</T></View> : null}
      </Pressable>
    );
  };
  return (
    <View style={{position: 'absolute', left: 14, right: 14, bottom, height: 65, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.88)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.55)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', shadowColor: '#000', shadowOpacity: 0.13, shadowRadius: 5, shadowOffset: {width: 0, height: 2}, elevation: 5, zIndex: 6}}>
      {item('home', tr('home'), 'home')}{item('cats', tr('categories'), 'grid')}
      <Pressable accessibilityLabel={tr('search')} onPress={() => A.go('search')} style={{width: 58, height: 58, borderRadius: 29, backgroundColor: th.br, alignItems: 'center', justifyContent: 'center', marginTop: -26, shadowColor: th.br, shadowOpacity: 0.4, shadowRadius: 9, shadowOffset: {width: 0, height: 8}}}><Icon name="search" size={26} color={th.navink} /></Pressable>
      {item('orders', tr('orders'), 'bag')}{item('cart', tr('cart'), 'cart')}
    </View>
  );
}
