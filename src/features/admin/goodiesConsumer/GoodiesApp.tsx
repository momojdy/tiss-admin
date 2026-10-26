/* Goodies customer app entry. Mount inside the main Wantiss app:
     <GoodiesApp onExit={() => navigation.goBack()} />
   Navigation is an internal stack that mirrors v24 (S.stack). Native back (Android) and left-edge swipe (iOS and Android) both call navBack(). */
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {View, Text, Pressable, ScrollView, Animated, PanResponder, BackHandler, Platform, StatusBar, KeyboardAvoidingView, Dimensions} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {Icon} from './components/Icon';
import {T, Grad, Cta, Badge, Row, Input, Card, SheetBox, Ttl, Radio, useTheme} from './components/ui';
import {S, ST, STB, load, save, emit, useGoodies, cur, cnt, totals, ui, toast, done, stage, notify, navBack, reset, applyZone, money, TL, TP, addr, push, setPreviewOnly} from './store';
import * as A from './actions';
import {startGoodiesSync} from './serverSync';
import {Home, Cats, CatList, Search, Promos, Notifs, Explore} from './screens/Browse';
import {Store, StoreReviews, Product, ProductFoot, Cart, Checkout, CheckoutFoot, Confirm, Track, Orders, Favs, Help} from './screens/Shop';
import {Account} from './screens/Account';
import {Sheets} from './components/Sheets';
import {ByoScreen, ByoFoot} from './builders/Builder';
import {loadBuilders, BD} from './builders/engine';
import {loadContent} from './content';
import {PROMO} from './theme';
import {t as tr} from './i18n';

const TABS = ['home', 'cats', 'orders', 'cart'];
const NOCB = ['cart', 'checkout', 'confirm', 'track', 'notifs', 'storechat', 'settings', 'payments', 'help', 'contact', 'supdone', 'profile', 'addresses', 'product', 'wantiss', 'ndetail', 'policies', 'policy', 'byo', 'seller', 'sellerEdit'];
const FOOTED = ['product', 'checkout'];

export function GoodiesApp({onExit, embedded = true, previewMode = false}: {onExit?: () => void; embedded?: boolean; previewMode?: boolean}) {
  useGoodies();
  const th = useTheme(), ins = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const [sheet, setSheet] = useState<any>(null), [toastTxt, setToastTxt] = useState('');
  const toastT = useRef<any>(null);

  /* bridge for store/actions */
  ui.toast = (t: string) => {setToastTxt(t); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToastTxt(''), 2300);};
  ui.sheet = (s: any) => setSheet(s);
  ui.close = () => setSheet(null);

  useEffect(() => {
    setPreviewOnly(previewMode);
    let active = true;
    let stopSync: (() => void) | null = null;
    void (async () => {
      await load();
      await loadContent();
      await loadBuilders();
      if (active && !previewMode) stopSync = startGoodiesSync();
    })();
    if (embedded) S.stack = [{r: 'home', u: Date.now()}];
    /* order progress ticker (v24: every second) */
    const id = setInterval(() => {
      let ch = false;
      S.orders.forEach((o: any) => {
        if (!done(o)) {
          const st = stage(o);
          if (st !== o.st) {
            o.st = st; ch = true; const Tt = o.pk ? TP : TL;
            notify(done(o) ? 'Order ' + (o.pk ? 'picked up' : 'delivered') : 'Order update', o.id + ': ' + Tt[st], 'track', o.id, 'o');
            if (done(o)) toast('Order ' + o.id + ' ' + (o.pk ? 'picked up' : 'delivered') + ' 🎉');
          }
        }
      });
      if (ch) {save(); emit();}
    }, 1000);
    return () => {active = false; clearInterval(id); stopSync?.(); setPreviewOnly(false);};
  }, [previewMode]);

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
  const key = c.u + '|' + (r === 'checkout' ? S.cs : '');
  const lastKey = useRef('');
  useEffect(() => {if (key !== lastKey.current) {scroll.current?.scrollTo({y: c.sy || 0, animated: false}); lastKey.current = key;}}, [key]);

  let body: any;
  switch (r) {
    case 'wantiss': body = <WantissEntry />; break;
    case 'home': body = <Home onExit={handleBack} />; break;
    case 'cats': body = <><TopBar title={tr('categories')} /><Cats /></>; break;
    case 'orders': body = <Orders />; break;
    case 'cart': body = <Cart />; break;
    case 'explore': body = <Explore />; break;
    case 'search': body = <Search />; break;
    case 'catlist': body = <><TopBar title={c.p === 'all' ? 'All stores' : String(require('./data/seed').CATS.find((x: any) => x.id === c.p)?.name || '')} /><CatList p={c.p} /></>; break;
    case 'store': body = <Store id={c.p} />; break;
    case 'reviews': body = <StoreReviews id={c.p} />; break;
    case 'product': body = <Product />; break;
    case 'checkout': body = <Checkout />; break;
    case 'confirm': body = <Confirm id={c.p} />; break;
    case 'track': body = <Track id={c.p} />; break;
    case 'notifs': body = <Notifs />; break;
    case 'promos': body = <Promos />; break;
    case 'favs': body = <Favs />; break;
    case 'byo': body = <ByoScreen p={c.p} />; break;
    case 'help': body = <Help />; break;
    default: body = <Account r={r} p={c.p} />;
  }
  const [dismissedCartCount, setDismissedCartCount] = useState(-1);
  const cartDragX = useRef(new Animated.Value(0)).current;
  const showTabs = TABS.indexOf(r) > -1, showCb = cnt() > 0 && NOCB.indexOf(r) < 0 && dismissedCartCount !== cnt(), footed = FOOTED.indexOf(r) > -1 || (r === 'byo' && !!BD && !BD.added);
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

  return (
    <KeyboardAvoidingView style={{flex: 1, backgroundColor: th.bg}} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0} {...pan.panHandlers}>
      <StatusBar barStyle={th.dark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={{flex: 1}} edges={[]}>
        {r === 'byo' || r === 'storechat' ? <View style={{flex: 1}}>{body}</View> : <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" onScroll={e => {c.sy = e.nativeEvent.contentOffset.y;}} scrollEventThrottle={64} showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: showTabs ? 170 : footed ? 120 : 110}}>
          {body}
        </ScrollView>}
      </SafeAreaView>

      {footed ? <View style={{position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 12, paddingHorizontal: 16, paddingBottom: 12 + ins.bottom, backgroundColor: th.bg, borderTopWidth: 1, borderTopColor: th.line}}>{r === 'product' ? <ProductFoot /> : r === 'byo' ? <ByoFoot /> : <CheckoutFoot />}</View> : null}

      {showCb ? (
        <View pointerEvents="box-none" style={{position: 'absolute', left: 12, right: 12, bottom: showTabs ? 92 + ins.bottom : 14 + ins.bottom, height: 68, zIndex: 12}}>
          <Animated.View {...cartBannerPan.panHandlers} style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 54, borderRadius: 16, backgroundColor: th.br, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 14, paddingRight: 12, shadowColor: th.br, shadowOpacity: 0.45, shadowRadius: 24, shadowOffset: {width: 0, height: 10}, elevation: 12, transform: [{translateX: cartDragX}]}}>
            <Pressable accessibilityRole="button" accessibilityLabel="Open cart" onPress={() => A.tab('cart')} style={{flex: 1, height: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
              <Row style={{gap: 10}}><View style={{minWidth: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,.25)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6}}><T size={13} weight="800" color="#fff">{cnt()}</T></View><T size={14.5} weight="800" color="#fff">Your cart</T></Row>
              <View style={{backgroundColor: '#fff', height: 38, paddingHorizontal: 13, borderRadius: 12, justifyContent: 'center'}}><T size={13.5} weight="800" color={th.brd}>View cart · {money(totals().total)}</T></View>
            </Pressable>
          </Animated.View>
          <Pressable accessibilityRole="button" accessibilityLabel="Dismiss cart banner" onPress={() => { cartDragX.setValue(0); setDismissedCartCount(cnt()); }} hitSlop={8} style={{position: 'absolute', top: -2, right: -3, width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: th.line, alignItems: 'center', justifyContent: 'center', zIndex: 3, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 5, shadowOffset: {width: 0, height: 2}, elevation: 5}}>
            <Icon name="x" size={13} color={th.br} />
          </Pressable>
        </View>
      ) : null}

      {showTabs ? <BottomNav r={r} bottom={18} /> : null}
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
        <T size={11} weight="700" color={on ? th.br : th.mut}>{label}</T>
        {on ? <View style={{position: 'absolute', bottom: 0, left: 12, right: 12, height: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: th.br}} /> : null}
        {id === 'cart' && cnt() ? <View style={{position: 'absolute', top: 10, right: 14, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: th.br, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4}}><T size={10.5} weight="700" color={th.navink}>{cnt()}</T></View> : null}
      </Pressable>
    );
  };
  return (
    <View style={{position: 'absolute', left: 14, right: 14, bottom, height: 65, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.88)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', shadowColor: '#000', shadowOpacity: 0.13, shadowRadius: 5, shadowOffset: {width: 0, height: 2}, elevation: 5, zIndex: 6}}>
      {item('home', tr('home'), 'home')}{item('cats', tr('categories'), 'grid')}
      <Pressable accessibilityLabel={tr('search')} onPress={() => A.go('search')} style={{width: 58, height: 58, borderRadius: 29, backgroundColor: th.br, alignItems: 'center', justifyContent: 'center', marginTop: -26, shadowColor: th.br, shadowOpacity: 0.4, shadowRadius: 9, shadowOffset: {width: 0, height: 8}}}><Icon name="search" size={26} color={th.navink} /></Pressable>
      {item('orders', tr('orders'), 'bag')}{item('cart', tr('cart'), 'cart')}
    </View>
  );
}

/* standalone demo entry only (embedded mode starts at home) */
function WantissEntry() {
  const th = useTheme();
  return (
    <View style={{padding: 16, paddingTop: 60}}>
      <T size={32} weight="800" style={{fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif'}}>Wantiss</T>
      <T color={th.mut} style={{marginTop: 6, marginBottom: 24}}>Your everyday super-app (demo entry screen)</T>
      <Pressable onPress={() => {S.stack = [{r: 'wantiss', u: 1}, {r: 'home', u: 2}]; emit();}} style={{height: 130, borderRadius: 18, overflow: 'hidden'}}>
        <Grad colors={['#FD802E', '#FF9F4D']} style={{flex: 1, padding: 14}}>
          <T size={22} weight="800" color="#fff">Goodies</T><T size={12} color="#fff" style={{marginTop: 3}}>Food, groceries, drinks and everyday essentials</T>
          <Text style={{position: 'absolute', right: 6, bottom: -4, fontSize: 62}}>🛍️</Text>
        </Grad>
      </Pressable>
      <T size={12.5} color={th.mut} align="center" style={{marginTop: 16}}>This is a stand-in for the Wantiss home. Other services will appear here.</T>
    </View>
  );
}
