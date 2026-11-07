import {EditableNativeText as Text} from '../EditableNativeText';
import {usePreviewScenario} from '../previewNative';
// @refresh reset
/**
 * src/screens/WalletAddNewCardScreen.tsx – Wantiss Add New Card (React Native / Expo dev build)
 *
 * npx expo install react-native-webview react-native-svg \
 *   react-native-safe-area-context expo-font @expo-google-fonts/manrope
 * Card entry = real Stripe.js Elements (3 separate fields) inside a WebView, so card data never touches React state.
 */
console.log('[AddCard] WebView version loaded');
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, Easing, Keyboard, PanResponder, Platform, Pressable, ScrollView,
  StatusBar, StyleSheet, Text as UnusedNativeText, TextInput, View, LayoutChangeEvent,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';
import { WebView, WebViewMessageEvent } from '../previewNative';
import {
  useFonts, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { previewBackend as supabase } from '../previewRuntime';
import { previewFunctionError as functionErrorMessage } from '../previewRuntime';
// import { supabase } from './supabase';   // <- your client

/* ───────────── Backend hook: replace with your create-card-setup-intent call ───────────── */
function makeStripeHtml(clientSecret: string, publishableKey: string, cardText: CardContentLabel = defaultCardLabel) {
  const htmlText = (text: string) => text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
  const secret = JSON.stringify(clientSecret);
  const key = JSON.stringify(publishableKey);
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet">
<script>window.addEventListener("error",()=>window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:"load_error"})));</script><script src="https://js.stripe.com/v3/" onerror='window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:"load_error"}))'></script>
<style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;background:transparent;font-family:Manrope,-apple-system,sans-serif}
.field{margin-bottom:16px}.row .field{margin:0}
label{display:block;font-size:13px;font-weight:600;color:#5C6B57;margin:0 0 7px 2px}
.box{height:54px;border-radius:15px;background:#DCE8D2;display:flex;align-items:center;padding:0 16px;transition:background .2s}
.box.focus{background:#CFE0C7}.box.invalid{background:#FBE2E3}
.box>div{width:100%}
.row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
</style></head><body>
<div class="field"><label>${htmlText(cardText('lbl.addcard.cardNumber', 'Card Number'))}</label><div class="box" id="b-num"><div id="num"></div></div></div>
<div class="row">
  <div class="field"><label>${htmlText(cardText('lbl.addcard.expiryDate', 'Expiry Date'))}</label><div class="box" id="b-exp"><div id="exp"></div></div></div>
  <div class="field"><label>${htmlText(cardText('lbl.addcard.securityCode', 'CVV'))}</label><div class="box" id="b-cvv"><div id="cvv"></div></div></div>
</div>
<script>
const send=x=>window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(x));
const stripe=Stripe(${key});
const elements=stripe.elements({fonts:[{cssSrc:'https://fonts.googleapis.com/css2?family=Manrope:wght@500;600'}]});
const style={base:{fontFamily:'Manrope, sans-serif',fontSize:'16px',fontWeight:'600',color:'#1A2517',letterSpacing:'.02em','::placeholder':{color:'#9AA595',fontWeight:'500'}},invalid:{color:'#1A2517'}};
const map={
  num:elements.create('cardNumber',{style,placeholder:'1234 5678 9012 3456',disableLink:true}),
  exp:elements.create('cardExpiry',{style,placeholder:'MM/YY'}),
  cvv:elements.create('cardCvc',{style,placeholder:'CVC'})
};
const st={num:{empty:true,complete:false,error:null},exp:{empty:true,complete:false,error:null},cvv:{empty:true,complete:false,error:null},brand:'unknown'};
function push(){
  const error=['num','exp','cvv'].map(k=>st[k].error).find(Boolean)||null;
  send({type:'change',data:{complete:st.num.complete&&st.exp.complete&&st.cvv.complete,
    numEmpty:st.num.empty,numComplete:st.num.complete,expEmpty:st.exp.empty,expComplete:st.exp.complete,
    cvvEmpty:st.cvv.empty,cvvComplete:st.cvv.complete,brand:st.brand,error}});
}
Object.keys(map).forEach(k=>{
  const el=map[k],box=document.getElementById('b-'+k);
  el.mount('#'+k);
  el.on('change',e=>{st[k]={empty:e.empty,complete:e.complete,error:e.error?e.error.message:null};if(k==='num')st.brand=e.brand||'unknown';box.classList.toggle('invalid',!!e.error);push()});
  el.on('focus',()=>{box.classList.add('focus');send({type:'focus',field:k})});
  el.on('blur',()=>{box.classList.remove('focus');send({type:'blur',field:k})});
});
window.focusCard=k=>{(map[k]||map.num).focus()};
window.blurCard=()=>{Object.keys(map).forEach(k=>map[k].blur())};
let saving=false;
function onMsg(e){
  let m;try{m=JSON.parse(e.data)}catch(_){return}
  if(m.type!=='save'||saving)return;
  if(!(st.num.complete&&st.exp.complete&&st.cvv.complete)){send({type:'result',error:'Please complete all card details.'});return}
  saving=true;
  stripe.confirmCardSetup(${secret},{payment_method:{card:map.num,billing_details:{name:m.name}}})
    .then(r=>{saving=false;send({type:'result',error:r.error?r.error.message:null})})
    .catch(err=>{saving=false;send({type:'result',error:String((err&&err.message)||err)})});
}
window.addEventListener('message',onMsg);document.addEventListener('message',onMsg);
</script></body></html>`;
}

async function getSetupIntent(): Promise<{ client_secret: string; publishable_key: string }> {
  const { data, error } = await supabase.functions.invoke('create-card-setup-intent', { body: {} });
  if (error) throw new Error(await functionErrorMessage(error, 'Could not start card setup. Please try again.'));
  if (!data?.client_secret || !data?.publishable_key) throw new Error(data?.error || 'Unable to create card setup session');
  return { client_secret: data.client_secret, publishable_key: data.publishable_key };
}

/* ───────────── Tokens ───────────── */
const C = {
  olive: '#1A2517', oliveDk: '#12190F', sage: '#ACC8A2', sageTint: '#DCE8D2',
  ink: '#1A2517', muted: '#5C6B57', line: '#E4EAE1', bg: '#F5F8F3',
  danger: '#e5484d', ok: '#3F6B37', focus: '#CFE0C7', invalid: '#FBE2E3',
};
const FW = { 500: 'Manrope_500Medium', 600: 'Manrope_600SemiBold', 700: 'Manrope_700Bold', 800: 'Manrope_800ExtraBold' } as const;

type Brand = 'none' | 'visa' | 'mc' | 'amex' | 'discover';
type Phase = 'empty' | 'typing' | 'complete';

const mapBrand = (b?: string): Brand => {
  const s = (b || '').toLowerCase();
  if (s === 'visa') return 'visa';
  if (s === 'mastercard') return 'mc';
  if (s === 'americanexpress' || s === 'amex') return 'amex';
  if (s === 'discover') return 'discover';
  return 'none';
};

/* ───────────── Logos ───────────── */
const LOGO_SIZE: Record<Exclude<Brand, 'none'>, [number, number]> = { visa: [64, 24], mc: [48, 30], amex: [48, 30], discover: [84, 24] };
function Logo({ brand, h, color }: { brand: Exclude<Brand, 'none'>; h: number; color: string }) {
  const [vw, vh] = LOGO_SIZE[brand];
  const w = (h * vw) / vh;
  const F = FW[800];
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${vw} ${vh}`} preserveAspectRatio="xMaxYMid meet">
      {brand === 'visa' && <SvgText x="62" y="20" textAnchor="end" fontFamily={F} fontStyle="italic" fontSize="24" letterSpacing="-1" fill={color}>VISA</SvgText>}
      {brand === 'mc' && (<>
        <Circle cx="17" cy="15" r="13" fill="#eb001b" /><Circle cx="31" cy="15" r="13" fill="#f79e1b" />
        <Path d="M24 4.6a13 13 0 0 1 0 20.8 13 13 0 0 1 0-20.8z" fill="#ff5f00" />
      </>)}
      {brand === 'amex' && (<>
        <Rect x="2" y="2" width="44" height="26" rx="5" fill="none" stroke={color} strokeWidth="2" />
        <SvgText x="24" y="20" textAnchor="middle" fontFamily={F} fontSize="11" letterSpacing=".6" fill={color}>AMEX</SvgText>
      </>)}
      {brand === 'discover' && (<>
        <SvgText x="84" y="19" textAnchor="end" fontFamily={F} fontSize="15" letterSpacing="-.2" fill={color}>Discover</SvgText>
        <Circle cx="10" cy="12" r="5.5" fill="#ff6000" />
      </>)}
    </Svg>
  );
}
const BRAND_COLOR: Record<string, string> = { visa: '#1a1f71', amex: '#2e77bc', discover: '#e57a1f', mc: '#000' };

/* ───────────── Pulsing / settling wrapper ───────────── */
function Dotted({ phase, pulse, children, style }: { phase: Phase; pulse: Animated.Value; children: React.ReactNode; style?: any }) {
  const pop = useRef(new Animated.Value(1)).current;
  const prev = useRef<Phase>(phase);
  useEffect(() => {
    if (phase === 'complete' && prev.current !== 'complete') {
      pop.setValue(0.94);
      Animated.spring(pop, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }).start();
    }
    prev.current = phase;
  }, [phase, pop]);
  const typing = phase === 'typing';
  const opacity = typing ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) : 1;
  const scale = typing ? pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.012] }) : pop;
  return <Animated.View style={[style, { opacity, transform: [{ scale }] }]}>{children}</Animated.View>;
}

/* ───────────── Screen ───────────── */
type CardContentLabel = (id: string, fallback: string) => string;
const defaultCardLabel: CardContentLabel = (_id, fallback) => fallback;

function AddCardScreen({ onBack, onDone, clientSecret, publishableKey, contentLabel: cardText = defaultCardLabel }: { contentLabel?: CardContentLabel; onBack?: () => void; onDone?: () => void; clientSecret: string; publishableKey: string }) {
  const insets = useSafeAreaInsets();
  const previewScenario=usePreviewScenario();
  const [fontsLoaded] = useFonts({ Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold });

  const [box, setBox] = useState({ w: 390, h: 800 });
  const [kb, setKb] = useState(0);
  useEffect(() => {
    const s = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', e => setKb(e.endCoordinates.height));
    const h = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => { setKb(0); flipTo(0); });
    return () => { s.remove(); h.remove(); };
  }, []);

  const [brand, setBrand] = useState<Brand>('none');
  const [det, setDet] = useState<any>({});
  const [focused, setFocused] = useState<'' | 'num' | 'exp' | 'cvv' | 'name'>('');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [webFailed, setWebFailed] = useState(false), [webAttempt, setWebAttempt] = useState(0);
  const webFailure = () => {setWebFailed(true);setProcessing(false);setErr(cardText('lbl.addcard.networkFailed', 'The secure card form could not load. Check your connection and try again.'));};
  const [bad, setBad] = useState({ card: false, name: false });
  const [processing, setProcessing] = useState(['saving','success'].includes(previewScenario));
  const [success, setSuccess] = useState(previewScenario==='success');
  const [isBack, setIsBack] = useState(false);
  const [settled, setSettled] = useState(true);
  const isBackRef = useRef(false);

  const webRef = useRef<WebView>(null);
  const webSource = useMemo(() => ({ html: makeStripeHtml(clientSecret, publishableKey, cardText), baseUrl: 'https://wantiss.app' }), [clientSecret, publishableKey, cardText]);
  const focusCard = (f: 'num' | 'exp' | 'cvv') => webRef.current?.injectJavaScript("window.focusCard&&window.focusCard('" + f + "');true;");
  const blurCard = () => webRef.current?.injectJavaScript('window.blurCard&&window.blurCard();true;');
  const nameRef = useRef<React.ElementRef<typeof TextInput>>(null);
  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);

  /* shared pulse loop */
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
  }, [pulse]);

  /* sizing (cqw units) */
  const availH = box.h - (Platform.OS === 'ios' ? kb : 0);
  const compact = availH < 620, micro = availH < 420;
  const sceneW = Math.min(box.w - 40, micro ? 128 : compact ? 212 : 348);
  const sceneH = sceneW / 1.586;
  const u = sceneW / 100;
  const barH = insets.top + (micro ? 30 : compact ? 44 : 58);

  /* flip */
  const angle = useRef(new Animated.Value(0)).current;
  const angleNow = useRef(0);
  useEffect(() => { const id = angle.addListener(({ value }) => { angleNow.current = value; const b = value >= 90; if (b !== isBackRef.current) { isBackRef.current = b; setIsBack(b); } }); return () => angle.removeListener(id); }, [angle]);
  const flipTo = useCallback((to: number) => {
    angle.stopAnimation();
    const d = Math.abs(to - angleNow.current);
    if (!d) { setSettled(true); return; }
    setSettled(false);
    Animated.timing(angle, {
      toValue: to,
      duration: Math.max(260, (720 * d) / 180),
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => { if (finished) setSettled(true); });
  }, [angle]);
  const rotateY = angle.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] });
  const frontOpacity = angle.interpolate({ inputRange: [0, 89.9, 90, 180], outputRange: [1, 1, 0, 0] });
  const backOpacity = angle.interpolate({ inputRange: [0, 89.9, 90, 180], outputRange: [0, 0, 1, 1] });
  const flipScale = 1;

  const drag = useRef({ start: 0 });
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderGrant: () => { setSettled(false); angle.stopAnimation(); drag.current.start = angleNow.current; },
    onPanResponderMove: (_, g) => angle.setValue(Math.min(180, Math.max(0, drag.current.start + (g.dx / sceneWRef.current) * 220))),
    onPanResponderRelease: () => {
      const t = angleNow.current >= 90 ? 180 : 0;
      flipTo(t);
      if (t === 0) blurCard();
    },
    onPanResponderTerminate: () => flipTo(angleNow.current >= 90 ? 180 : 0),
  })).current;
  const sceneWRef = useRef(sceneW); sceneWRef.current = sceneW;

  /* Events from the Stripe page */
  const onFocus = (f: string) => {
    if (f === 'cvv') { setFocused('cvv'); flipTo(180); }
    else if (f === 'exp') { setFocused('exp'); flipTo(0); }
    else if (f === 'num') { setFocused('num'); flipTo(0); }
  };
  const onCardChange = (d: any) => {
    setDet(d); setBrand(mapBrand(d.brand)); setErr('');
    setBad(b => ({ ...b, card: !!d.error }));
    if (d.error) shake(shakeCard);
  };
  const onBlurCard = () => setFocused(f => (f === 'name' ? f : ''));
  const onWebMessage = (ev: WebViewMessageEvent) => {
    let m: any;
    try { m = JSON.parse(ev.nativeEvent.data); } catch { return; }
    if (m.type === 'focus') onFocus(m.field);
    else if (m.type === 'blur') onBlurCard();
    else if (m.type === 'load_error') webFailure();
    else if (m.type === 'change') onCardChange(m.data);
    else if (m.type === 'result') {
      if (m.error) {
        Animated.timing(proc, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => setProcessing(false));
        glow.setValue(0); setErr(cardText === defaultCardLabel ? m.error : cardText('lbl.addcard.saveFailed', 'Your card could not be saved. Please check the details and try again.')); return;
      }
      // setup_intent.succeeded webhook writes user_payment_methods server-side.
      setSuccess(true);
      Animated.spring(okAnim, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }).start();
    }
  };

  const phaseOf = (empty: boolean | undefined, complete: boolean | undefined): Phase => (complete ? 'complete' : empty === false ? 'typing' : 'empty');
  const numPhase: Phase = phaseOf(det.numEmpty, det.numComplete);
  const expPhase: Phase = phaseOf(det.expEmpty, det.expComplete);
  const cvvPhase: Phase = phaseOf(det.cvvEmpty, det.cvvComplete);

  /* shake */
  const shakeCard = useRef(new Animated.Value(0)).current;
  const shakeName = useRef(new Animated.Value(0)).current;
  const shake = (v: Animated.Value) => {
    v.setValue(0);
    Animated.sequence([-5, 5, -3, 3, 0].map(x => Animated.timing(v, { toValue: x, duration: 80, useNativeDriver: true }))).start();
  };

  /* processing animation */
  const proc = useRef(new Animated.Value(['saving','success'].includes(previewScenario)?1:0)).current;       // 0 → 1
  const glow = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const okAnim = useRef(new Animated.Value(previewScenario==='success'?1:0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })).start();
  }, [spin]);

  const targetCenter = box.h * 0.4;
  const naturalCenter = barH + 6 + sceneH / 2;
  const cardY = proc.interpolate({ inputRange: [0, 1], outputRange: [0, targetCenter - naturalCenter] });
  const cardS = proc.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

  const onSave = async () => {
    const problems = { card: !(det.complete), name: name.trim().length < 2 };
    if (problems.card || problems.name) {
      setBad(problems); if (problems.card) shake(shakeCard); if (problems.name) shake(shakeName);
      setErr(cardText("lbl.addcard.8bb79a16ce", "Please complete all fields.")); return;
    }
    Keyboard.dismiss(); setErr(''); flipTo(0);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    if (!clientSecret || !publishableKey) {
      setErr(cardText("lbl.addcard.a0df07b3b0", "Preparing the secure card form…"));
      return;
    }
    setProcessing(true);
    Animated.timing(proc, { toValue: 1, duration: 800, easing: Easing.bezier(0.22, 0.8, 0.24, 1), useNativeDriver: true }).start();
    Animated.timing(glow, { toValue: 1, duration: 500, useNativeDriver: true }).start();

    webRef.current?.postMessage(JSON.stringify({ type: 'save', name: name.trim() }));
  };

  if (!fontsLoaded) return <View style={s.root} />;

  const glowColor = success ? 'rgba(63,107,55,.6)' : 'rgba(172,200,162,.55)';
  const formStyle = { opacity: proc.interpolate({ inputRange: [0, 0.6], outputRange: [1, 0], extrapolate: 'clamp' }), transform: [{ translateY: proc.interpolate({ inputRange: [0, 1], outputRange: [0, 24] }) }] };
  const barStyle = { opacity: proc.interpolate({ inputRange: [0, 0.6], outputRange: [1, 0], extrapolate: 'clamp' }) };
  const payStyle = { opacity: proc.interpolate({ inputRange: [0, 0.6], outputRange: [1, 0], extrapolate: 'clamp' }), transform: [{ translateY: proc.interpolate({ inputRange: [0, 1], outputRange: [0, 100] }) }] };
  const statusOpacity = proc.interpolate({ inputRange: [0.6, 1], outputRange: [0, 1], extrapolate: 'clamp' });

  const groups = brand === 'amex' ? [4, 6, 5] : [4, 4, 4, 4];
  const cvvLen = brand === 'amex' ? 4 : 3;
  const ring = (on: boolean) => (on ? { borderColor: 'rgba(255,255,255,.6)', backgroundColor: 'rgba(255,255,255,.07)' } : null);
  const slotRing = { position: 'absolute' as const, top: -1.6 * u, bottom: -1.6 * u, left: -2.2 * u, right: -2.2 * u, borderRadius: 2.4 * u, borderWidth: 0.35 * u, borderColor: 'transparent' };
  const nameVal = name.trim() ? name.toUpperCase() : '';

  return (
    <View style={s.root} onLayout={(e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <StatusBar barStyle="dark-content" />
      <View style={{ flex: 1, paddingBottom: Platform.OS === 'ios' ? kb : 0 }}>
        <ScrollView
          ref={scrollRef} stickyHeaderIndices={[0]} keyboardShouldPersistTaps="handled"
          scrollEnabled={!processing} showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 16 }}
        >
          {/* ── Hero (sticky) ── */}
          <View style={{ backgroundColor: C.bg, paddingBottom: micro ? 8 : compact ? 16 : 22, zIndex: 5 }}>
            <Animated.View style={[{ height: 100, paddingHorizontal: 10, paddingBottom: 4, justifyContent: 'flex-end' }, barStyle]}>
              <View style={{ width: '100%', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Pressable onPress={onBack} accessibilityLabel={cardText("lbl.addcard.76900f1bfd", "Back")} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.sageTint, alignItems: 'center', justifyContent: 'center' }}>
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={C.olive} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><Path d="M15 5l-7 7 7 7" /></Svg>
                  </Pressable>
                  <Text cmsKey={"lbl.addcard.dbb87a7e89"} style={{ marginLeft: 12, fontFamily: 'Inter_600SemiBold', fontSize: 19, lineHeight: 23, color: C.olive, transform: [{ translateY: 1 }] }}>{cardText("lbl.addcard.dbb87a7e89", "Add New Card")}</Text>
                </View>
              </View>
            </Animated.View>
            <View style={{ height: 20, backgroundColor: '#E6EDE1' }} />

            <View style={{ marginTop: compact ? 2 : 6, alignItems: 'center' }}>
              <Animated.View style={{ transform: [{ translateY: cardY }, { scale: cardS }] }}>
                <View style={{ width: sceneW, height: sceneH }} {...pan.panHandlers}>
                  <Animated.View pointerEvents="none" style={{ position: 'absolute', top: -8, left: -8, right: -8, bottom: -8, borderRadius: 5.6 * u + 8, borderWidth: 3, borderColor: glowColor, opacity: glow }} />
                  <Animated.View
  style={{ width: sceneW, height: sceneH, transform: [{ perspective: 1400 }, { rotateY }] }}
  renderToHardwareTextureAndroid
  shouldRasterizeIOS
>
                    {/* FRONT */}
                    <Animated.View pointerEvents={isBack ? 'none' : 'auto'} style={[StyleSheet.absoluteFill, { opacity: frontOpacity }]}>
                    <View style={[s.face, { borderRadius: 5.6 * u, paddingHorizontal: 7 * u, paddingTop: 7 * u, paddingBottom: 6.4 * u, justifyContent: 'space-between' }]}>
                      <View pointerEvents="none" style={{ position: 'absolute', right: 0, bottom: 0, width: '82%', aspectRatio: 1, overflow: 'hidden' }}>
                        <View style={{ position: 'absolute', width: '96%', height: '96%', right: '-38%', bottom: '-44%', borderRadius: 999, backgroundColor: 'rgba(172,200,162,.08)' }} />
                        <View style={{ position: 'absolute', width: '68%', height: '68%', right: '-10%', bottom: '-26%', borderRadius: 999, backgroundColor: 'rgba(172,200,162,.14)' }} />
                        <View style={{ position: 'absolute', width: '40%', height: '40%', right: '8%', bottom: '-10%', borderRadius: 999, backgroundColor: 'rgba(220,232,210,.22)' }} />
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ width: 13 * u, height: 9.6 * u, borderRadius: 2 * u, backgroundColor: '#C7CDBE' }}>
                          <View style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 0.3 * u, backgroundColor: 'rgba(26,37,23,.28)' }} />
                          <View style={{ position: 'absolute', top: 0, bottom: 0, left: '38%', width: 0.3 * u, backgroundColor: 'rgba(26,37,23,.28)' }} />
                          <View style={{ position: 'absolute', top: 0, bottom: 0, left: '38%', marginLeft: 4.2 * u, width: 0.3 * u, backgroundColor: 'rgba(26,37,23,.28)' }} />
                        </View>
                        <View style={{ width: 17 * u, height: 9 * u, alignItems: 'flex-end', justifyContent: 'center' }}>
                          {brand !== 'none' && <Logo brand={brand} h={9 * u} color="#fff" />}
                        </View>
                      </View>

                      <Pressable onPress={() => nameRef.current?.focus()} style={{ marginTop: 5 * u }}>
                        <View pointerEvents="none" style={[slotRing, ring(focused === 'name')]} />
                        <Text cmsKey={"lbl.addcard.1120d5f61a"} style={[s.lbl, { fontSize: 2.5 * u, lineHeight: 3.2 * u, includeFontPadding: false, marginBottom: 1 * u }]}>{cardText("lbl.addcard.1120d5f61a", "Card holder")}</Text>
                        <Text cmsKey={'lbl.addcard.fullName'} numberOfLines={1} style={{ fontFamily: FW[700], fontSize: 4 * u, lineHeight: 5 * u, includeFontPadding: false, letterSpacing: 0.05 * 4 * u, color: C.sage, opacity: nameVal ? 1 : 0.4, minHeight: 1.2 * 4 * u }}>{nameVal || cardText('lbl.addcard.fullName', 'FULL NAME')}</Text>
                      </Pressable>

                      <Pressable onPress={() => focusCard('num')} style={{ alignSelf: 'flex-start', marginTop: 4 * u }}>
                        <View pointerEvents="none" style={[slotRing, ring(focused === 'num')]} />
                        <Dotted phase={numPhase} pulse={pulse} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 6.3 * u }}>
                          {numPhase !== 'empty' && groups.map((g, gi) => (
                            <View key={gi} style={{ flexDirection: 'row', marginLeft: gi ? 0.5 * 6.3 * u : 0 }}>
                              {Array.from({ length: g }).map((_, i) => (
                                <Text key={i} style={{ width: 0.68 * 6.3 * u, textAlign: 'center', fontFamily: FW[600], fontSize: 6.3 * u, lineHeight: 6.3 * u * 1.2, includeFontPadding: false, color: C.sage }}>•</Text>
                              ))}
                            </View>
                          ))}
                        </Dotted>
                      </Pressable>

                      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                        <Pressable onPress={() => focusCard('exp')}>
                          <View pointerEvents="none" style={[slotRing, ring(focused === 'exp')]} />
                          <Text cmsKey={"lbl.addcard.f6725f3af0"} style={[s.lbl, { fontSize: 2.5 * u, lineHeight: 3.2 * u, includeFontPadding: false, marginBottom: 1 * u }]}>{cardText("lbl.addcard.f6725f3af0", "Expires")}</Text>
                          {expPhase === 'empty'
                            ? <Text cmsKey={"lbl.addcard.1b5f68f875"} style={{ fontFamily: FW[700], fontSize: 4 * u, lineHeight: 5 * u, includeFontPadding: false, letterSpacing: 0.05 * 4 * u, color: C.sage, opacity: 0.4 }}>{cardText("lbl.addcard.1b5f68f875", "MM/YY")}</Text>
                            : <Dotted phase={expPhase} pulse={pulse}><Text style={{ fontFamily: FW[700], fontSize: 4 * u, lineHeight: 5 * u, includeFontPadding: false, letterSpacing: 0.05 * 4 * u, color: C.sage }}>••/••</Text></Dotted>}
                        </Pressable>
                      </View>
                    </View>

                    </Animated.View>

                    {/* BACK */}
                    <Animated.View pointerEvents={isBack ? 'auto' : 'none'} style={[StyleSheet.absoluteFill, { opacity: backOpacity, transform: [{ rotateY: '180deg' }] }]}>
                    <View style={[s.face, { borderRadius: 5.6 * u }]}>
                      <View style={{ position: 'absolute', left: 0, right: 0, top: '12%', height: '17%', backgroundColor: C.oliveDk }} />
                      <View style={{ position: 'absolute', left: 7 * u, right: 7 * u, top: '38%', flexDirection: 'row', gap: 3 * u, alignItems: 'flex-start' }}>
                        <View style={{ flex: 1 }}>
                          <View style={{ height: 12 * u, borderRadius: 1.2 * u, backgroundColor: C.sageTint }} />
                          <Text cmsKey={"lbl.addcard.bb62f38afd"} style={[s.lbl, { fontSize: 2.5 * u, lineHeight: 3.2 * u, includeFontPadding: false, marginTop: 1.4 * u }]}>{cardText("lbl.addcard.bb62f38afd", "Authorized signature")}</Text>
                        </View>
                        <View style={{ width: 22 * u }}>
                          <Pressable onPress={() => focusCard('cvv')}
                            style={{ height: 12 * u, borderRadius: 1.2 * u, backgroundColor: C.sageTint, alignItems: 'center', justifyContent: 'center', borderWidth: focused === 'cvv' ? 0.6 * u : 0, borderColor: 'rgba(172,200,162,.9)' }}>
                            <Dotted phase={cvvPhase} pulse={pulse} style={{ flexDirection: 'row' }}>
                              {cvvPhase !== 'empty' && Array.from({ length: cvvLen }).map((_, i) => (
                                <Text key={i} style={{ fontFamily: FW[800], fontSize: 5.4 * u, lineHeight: 6.5 * u, includeFontPadding: false, color: C.olive, marginHorizontal: 0.06 * 5.4 * u }}>•</Text>
                              ))}
                            </Dotted>
                          </Pressable>
                          <Text cmsKey={"lbl.addcard.07f548c871"} style={[s.lbl, { fontSize: 2.5 * u, lineHeight: 3.2 * u, includeFontPadding: false, marginTop: 1.4 * u }]}>{cardText("lbl.addcard.07f548c871", "CVV")}</Text>
                        </View>
                      </View>
                      <View style={{ position: 'absolute', right: 7 * u, bottom: 5 * u, width: 11 * u, height: 6 * u, alignItems: 'flex-end', justifyContent: 'center' }}>
                        {brand !== 'none' && <Logo brand={brand} h={6 * u} color="#fff" />}
                      </View>
                    </View>
                    </Animated.View>
                  </Animated.View>
                </View>
              </Animated.View>
            </View>

          </View>

            <Animated.View style={{ transform: [{ translateX: shakeCard }], marginTop: 16, marginHorizontal: 20 }} pointerEvents="auto">
              {clientSecret && publishableKey ? (
                <WebView
                  key={webAttempt}
                  ref={webRef}
                  source={webSource}
                  onError={webFailure}
                  onHttpError={webFailure}
                  onMessage={onWebMessage}
                  onLoadEnd={() => webRef.current?.injectJavaScript("window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'ready'}));true;")}
                  originWhitelist={['*']}
                  javaScriptEnabled
                  domStorageEnabled
                  scrollEnabled={false}
                  nestedScrollEnabled
                  keyboardDisplayRequiresUserAction={false}
                  pointerEvents="auto"
                  automaticallyAdjustContentInsets={false}
                  bounces={false}
                  style={{ height: 176, backgroundColor: 'transparent' }}
                />
              ) : (
                <View style={{ height: 176, justifyContent: 'center', alignItems: 'center' }}>
                  <Animated.View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      borderWidth: 3,
                      borderColor: 'rgba(26,37,23,.14)',
                      borderTopColor: C.olive,
                      transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
                    }}
                  />
                  <Text cmsKey={"lbl.addcard.b465f953a8"} style={{ marginTop: 12, color: C.muted, fontFamily: FW[500], fontSize: 13 }}>
                    {cardText("lbl.addcard.b465f953a8", "Preparing secure card form…")}</Text>
                </View>
              )}
            </Animated.View>

            <Animated.View style={[{ paddingTop: 6, paddingHorizontal: 20, paddingBottom: 8 }, formStyle]} pointerEvents={processing ? 'none' : 'auto'}>
              <View style={{ marginBottom: 16 }}>
              <Text cmsKey={"lbl.addcard.c08eb70f1a"} style={s.label}>{cardText("lbl.addcard.c08eb70f1a", "Name on Card")}</Text>
              <Animated.View style={{ transform: [{ translateX: shakeName }], height: 54, borderRadius: 15, backgroundColor: bad.name ? C.invalid : focused === 'name' ? C.focus : C.sageTint, justifyContent: 'center' }}>
                <TextInput
                  ref={nameRef} value={name} placeholder={cardText("lbl.addcard.f13a64ba2f", "Full name")} placeholderTextColor="#9AA595"
                  autoComplete="off" textContentType="none" importantForAutofill="no" spellCheck={false} maxLength={26} returnKeyType="done"
                  autoCapitalize="characters" autoCorrect={false}
                  onChangeText={t => { setName(t.replace(/[^\p{L} .'-]/gu, '')); setBad(b => ({ ...b, name: false })); }}
                  onFocus={() => { setFocused('name'); flipTo(0); }}
                  onBlur={() => setFocused(f => (f === 'name' ? '' : f))}
                  onSubmitEditing={onSave}
                  style={{ height: '100%', paddingHorizontal: 16, fontSize: 16, fontFamily: FW[600], letterSpacing: 0.32, color: C.ink, textTransform: 'uppercase' }}
                />
              </Animated.View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8, marginHorizontal: 2 }}>
              <Text cmsKey={"lbl.addcard.f520fe9010"} style={{ fontFamily: FW[600], fontSize: 13, color: C.muted }}>{cardText("lbl.addcard.f520fe9010", "We accept")}</Text>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                {(['visa', 'mc', 'amex', 'discover'] as const).map(b => (
                  <View key={b} style={{ opacity: brand === b ? 1 : 0.4 }}>
                    <Logo brand={b} h={22} color={brand === b || b === 'mc' ? BRAND_COLOR[b] : '#6b7280'} />
                  </View>
                ))}
              </View>
            </View>

            <Text style={{ marginTop: 14, marginHorizontal: 2, color: C.danger, fontFamily: FW[600], fontSize: 13, minHeight: 16 }}>{err}</Text>
            {webFailed ? <Pressable accessibilityRole="button" onPress={() => {setWebFailed(false);setErr('');setWebAttempt(n=>n+1);}}><Text cmsKey={'lbl.addcard.retry'} style={{color:C.olive,fontFamily:FW[600],paddingVertical:10}}>{cardText('lbl.addcard.retry', 'Try again')}</Text></Pressable> : null}
          </Animated.View>
        </ScrollView>

        {/* ── Pay bar ── */}
        {!compact && (
          <Animated.View style={[s.paybar, { paddingBottom: 12 + insets.bottom }, payStyle]} pointerEvents={processing ? 'none' : 'auto'}>
            <Pressable onPress={onSave} disabled={processing} style={({ pressed }) => [s.pay, pressed && { transform: [{ scale: 0.97 }] }]}>
              <Text cmsKey={"lbl.addcard.39d561254a"} style={{ color: '#fff', fontFamily: FW[800], fontSize: 16 }}>{cardText("lbl.addcard.39d561254a", "Save Card")}</Text>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><Path d="M5 12h14M13 6l6 6-6 6" /></Svg>
            </Pressable>
          </Animated.View>
        )}
      </View>

      {/* ── Status overlay ── */}
      <Animated.View pointerEvents={processing ? 'auto' : 'none'}
        style={{ position: 'absolute', left: 0, right: 0, top: targetCenter + (sceneH * 1.06) / 2 + 34, paddingHorizontal: 32, alignItems: 'center', opacity: statusOpacity, zIndex: 6 }}>
        <View style={{ width: 54, height: 54 }}>
          <Animated.View style={{ position: 'absolute', width: 54, height: 54, borderRadius: 27, borderWidth: 4, borderColor: 'rgba(26,37,23,.14)', borderTopColor: C.olive, opacity: success ? 0 : 1, transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }} />
          <Animated.View style={{ position: 'absolute', width: 54, height: 54, borderRadius: 27, backgroundColor: C.ok, alignItems: 'center', justifyContent: 'center', opacity: okAnim, transform: [{ scale: okAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }}>
            <Svg width={28} height={28} viewBox="0 0 28 28" fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round"><Path d="M6 14.5l5.5 5.5L22 9" /></Svg>
          </Animated.View>
        </View>
        <View style={{ marginTop: 22, alignItems: 'center' }}>
          <Text cmsKeys={["lbl.addcard.a2cd15933f","lbl.addcard.e6f60d31e2"]} style={{ fontFamily: FW[800], fontSize: 20, color: C.ink, letterSpacing: -0.2, marginBottom: 6 }}>{success ? cardText("lbl.addcard.a2cd15933f", "Card Saved") : cardText("lbl.addcard.e6f60d31e2", "Saving Card…")}</Text>
          <Text cmsKeys={["lbl.addcard.6085111fd3","lbl.addcard.2fe82d1748"]} style={{ fontFamily: FW[500], fontSize: 14.5, lineHeight: 21.75, color: C.muted, textAlign: 'center' }}>
            {success ? cardText("lbl.addcard.6085111fd3", "Your card has been saved for future payments.") : cardText("lbl.addcard.2fe82d1748", "This only takes a moment.")}
          </Text>
        </View>
        <Pressable onPress={onDone} disabled={!success}
          style={{ marginTop: 26, height: 48, paddingHorizontal: 30, borderRadius: 14, backgroundColor: C.sageTint, justifyContent: 'center', opacity: success ? 1 : 0 }}>
          <Text cmsKey={"lbl.addcard.11a6767d56"} style={{ fontFamily: FW[700], fontSize: 15, color: C.ink }}>{cardText("lbl.addcard.11a6767d56", "Done")}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

/* ───────────── Exported screen (matches your router: <WalletAddNewCardScreen onBack=... />) ───────────── */
export default function WalletAddNewCardScreen({ onBack, onSaved, contentLabel }: { contentLabel?: CardContentLabel; onBack?: () => void; onSaved?: () => void }) {
  const [si, setSi] = useState<{ client_secret: string; publishable_key: string } | null>(null);
  const [fail, setFail] = useState('');
  useEffect(() => { getSetupIntent().then(setSi).catch(e => setFail(contentLabel ? contentLabel('lbl.addcard.setupFailed', 'Could not prepare the secure card form. Please try again.') : String(e?.message || e))); }, []);

  return (
    // Render the Add Card UI immediately. Stripe setup happens in the background so navigation never waits on the network.
    <SafeAreaProvider>
      <AddCardScreen
        contentLabel={contentLabel}
        clientSecret={si?.client_secret ?? ''}
        publishableKey={si?.publishable_key ?? ''}
        onBack={onBack}
        onDone={() => { onSaved?.(); onBack?.(); }}
      />
      {!!fail && (
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 20, right: 20, bottom: 24, alignItems: 'center' }}>
          <Text style={{ color: C.danger, textAlign: 'center', fontFamily: FW[600], fontSize: 13 }}>{fail}</Text>
        </View>
      )}
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  back: { borderRadius: 12, backgroundColor: C.sageTint, alignItems: 'center', justifyContent: 'center' },
  face: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', backgroundColor: C.olive },
  lbl: { fontFamily: FW[600], color: C.sage, opacity: 0.62, letterSpacing: 0.4 },
  label: { fontFamily: FW[600], fontSize: 13, color: C.muted, marginBottom: 7, marginLeft: 2 },
  paybar: { backgroundColor: '#fff', paddingTop: 12, paddingHorizontal: 20 },
  pay: { height: 52, borderRadius: 15, backgroundColor: C.olive, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
});