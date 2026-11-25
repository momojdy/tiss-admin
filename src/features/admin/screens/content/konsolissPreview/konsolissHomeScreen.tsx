// Generated from the approved consumer homepage. Run sync-konsoliss-preview.cjs.
import {Modal} from './PreviewModal';
import React, {useContext, useEffect, useRef, useState} from 'react';
import {AccessibilityInfo, Animated, Easing, View, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, StatusBar, useWindowDimensions, StyleSheet} from 'react-native';
import {SafeAreaProvider, useSafeAreaInsets} from 'react-native-safe-area-context';
import {WebView} from 'react-native-webview';
import {useFeatureTheme} from './previewData';
import {useKonsolissHomepageContent, type KonsolissCopy} from './previewData';
import {Tx,CmsImage,KonsolissContentContext} from './KonsolissContent';
import {estimateCbm,formatCopy} from './cms/model';
import {currentKonsolissContainerLabel, useCurrentKonsolissContainer, type KonsolissContainerStatus} from './previewData';
import {sendKonsolissSupport,supportRequestId} from './previewData';
import {useKonsolissLoadProgress, type KonsolissLoadProgress} from './previewData';
import {trackingCountdown,verifiedContainerInbound,liveLoadCallout,liveHomeStatus} from './konsolissLoadModel';
import {useKonsolissContainerOccupancy, type KonsolissContainerOccupancy} from './previewData';
import {useKonsolissAssignedContainers} from './previewData';
import {type KonsolissSelectableContainer} from './previewData';
import {PREVIEW_GROUP_LABELS,PREVIEW_SCENARIOS,PREVIEW_SCENARIO_COUNT,konsolissDemoEnabled,previewProgress,previewRender,previewLoadStatus,previewViews,type PreviewGroup} from './konsolissPreviewScenarios';
import {useKonsolissPreviewController} from './useKonsolissPreviewController';
import KonsolissQuickMenu, {type KonsolissMenuAction} from './PreviewQuickMenu';
import Svg, {Path, G, Circle, Rect, Defs, LinearGradient, Stop} from 'react-native-svg';

const StatusBarCompat: any = StatusBar;


const L = {bg: '#FFFBD4', tx: '#2B1210', mu: '#7a5a52', ac: '#A90E02', tint: 'rgba(169,14,2,0.1)', nav: '#FFFBD4', card: 'rgba(255,255,255,0.55)', bd: 'rgba(169,14,2,0.12)', gr: '#1E8E3E', inp: '#fff9c2'};
const Dk: typeof L = {bg: '#17100F', tx: '#FFFBD4', mu: '#BDB08C', ac: '#FF5B4A', tint: 'rgba(255,251,212,0.09)', nav: '#1E1514', card: 'rgba(255,251,212,0.06)', bd: 'rgba(255,251,212,0.1)', gr: '#5FD38A', inp: '#241a18'};
type Th = typeof L;
const RED = '#A90E02', CREAM = '#FFFBD4';

const P: Record<string, string> = {
  box: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9',
  calc: 'M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zM8 6h8v3H8zM8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01',
  wh: 'M3 10l9-6 9 6v10H3zM8 20v-6h8v6',
  ct: 'M3 7h18v10H3zM7 7v10M11 7v10M15 7v10',
  ln: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1',
  gl: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  ch: 'M9 6l6 6-6 6',
  back: 'M15 6l-6 6 6 6',
  home: 'M3 10.5L12 3l9 7.5v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z',
  warehouse: 'M5 16h14a3 3 0 013 3v1H2v-1a3 3 0 013-3zM5 16a2 2 0 01-2-2v-1h18v1a2 2 0 01-2 2M7 13a2 2 0 104 0 2 2 0 10-4 0M13 13a2 2 0 104 0 2 2 0 10-4 0M7 6h10a1 1 0 011 1v4H6V7a1 1 0 011-1zM9 6v5M15 6v5',
  consolidated: 'M4 8l4-3 4 3-4 3-4-3zM8 11l4-3 4 3-4 3-4-3zM12 14l4-3 4 3-4 3-4-3zM4 8v4l4 3M12 8v4l4 3M16 11v4',
  handshake: 'M7 11l2-2 3 3 3-3 2 2-3 3a3 3 0 01-4 0zM9 9L7 7a2 2 0 00-3 0l-1 1 4 4M15 9l2-2a2 2 0 013 0l1 1-4 4M7 12l-2 2a2 2 0 003 3l2-2M17 12l2 2a2 2 0 01-3 3l-2-2',
  hub: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM17 13v8M13 17h8',
};
const Ic = ({d, c, s = 22, w = 1.8}: {d: string; c: string; s?: number; w?: number}) => (
  <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round"><Path d={d} /></Svg>
);

const Fa = (t: Th) => ({fill: t.tint, stroke: t.mu, strokeWidth: 1});
const Wl = (t: Th) => ({fill: 'none', stroke: t.mu, strokeWidth: 1.2});
const CP = ({c}: {c: string}) => (<><Path fill={c} fillOpacity={0.5} d="M10 0l10 5-10 5L0 5z" /><Path fill={c} fillOpacity={0.8} d="M0 5l10 5v12L0 17z" /><Path fill={c} d="M10 10l10-5v12l-10 5z" /></>);
const Cube = ({x, y, w = 20, h = 22, c}: {x: number; y: number; w?: number; h?: number; c: string}) => (<G transform={`translate(${x} ${y}) scale(${w / 20} ${h / 22})`}><CP c={c} /></G>);
const Ctr = ({t, x = 0, y = 0, w = 140, h = 100}: {t: Th; x?: number; y?: number; w?: number; h?: number}) => (<G transform={`translate(${x} ${y}) scale(${w / 140} ${h / 100})`}><Path d="M70 12l54 24-54 24-54-24z" {...Fa(t)} /><Path d="M16 36l54 24v32L16 68zM70 60l54-24v32L70 92z" {...Fa(t)} /><Path d="M34 44v32M52 52v32M88 52v32M106 44v32M43 24l54 24M97 24l-54 24" {...Wl(t)} /></G>);
const ILL: ((t: Th) => React.ReactNode)[] = [
  t => (<><Ctr t={t} /><Cube x={48} y={52} c={t.ac} /><Cube x={68} y={42} c={t.ac} /><Cube x={68} y={64} c={t.ac} /><Cube x={88} y={52} c={t.ac} /></>),
  t => (<><Path d="M60 30l40 18-40 18-40-18z" {...Fa(t)} /><Path d="M20 48l40 18v22L20 70zM60 66l40-18v22L60 88z" {...Fa(t)} /><Path d="M28 62l10 4v10l-10-4zM44 69l10 4v10l-10-4z" {...Wl(t)} /><Cube x={104} y={62} c={t.mu} /><Cube x={114} y={74} w={16} h={18} c={t.mu} /></>),
  t => (<><Path d="M70 50l36 16-36 16-36-16z" {...Fa(t)} /><Path d="M34 66l36 16v10L34 76zM70 82l36-16v10L70 92z" {...Fa(t)} /><Cube x={60} y={42} c={t.ac} /><Circle cx={104} cy={24} r={14} fill={t.gr} /><Path d="M97 24l5 5 9-10" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /></>),
  t => (<><Ctr t={t} /><Cube x={34} y={52} c={t.mu} /><Cube x={54} y={62} c={t.mu} /><Cube x={94} y={48} c={t.mu} /><Cube x={74} y={52} c={t.ac} /></>),
  t => (<><Ctr t={t} x={30} y={18} w={80} h={57} /><Path d="M8 76h124l-14 16H22z" {...Fa(t)} /><Path d="M6 98q8-4 16 0t16 0t16 0t16 0t16 0t16 0t16 0" {...Wl(t)} /></>),
];
const KONSOLISS_HOW_IMAGES = [
  {uri:"https://raw.githubusercontent.com/momojdy/tiss_tiss_beta/main/src/assets/konsoliss/how-it-works/step1.png?v=9ab2509813ab6adf290805734eb6c75b972c01a4ebfab44a780e409a8274b28d"},
  {uri:"https://raw.githubusercontent.com/momojdy/tiss_tiss_beta/main/src/assets/konsoliss/how-it-works/step2.png?v=fca6862902a05b85f26a0f1989dc72768cc3c731a3fc323d32d73cb8fc0c563f"},
  {uri:"https://raw.githubusercontent.com/momojdy/tiss_tiss_beta/main/src/assets/konsoliss/how-it-works/step3.png?v=cc53f84b9e50f98ac49efc8d6f6b1c4f2be3ff1f3269e18cbce316ba904311be"},
  {uri:"https://raw.githubusercontent.com/momojdy/tiss_tiss_beta/main/src/assets/konsoliss/how-it-works/step4.png?v=faef831354ecba0359a080f0a8dad1d17e4ef10d203d9b2d99d11a69de7a9334"},
  {uri:"https://raw.githubusercontent.com/momojdy/tiss_tiss_beta/main/src/assets/konsoliss/how-it-works/step5.png?v=2c2ba22fb68f0dec6d2b8dcb570742e5e9a961b399225b4e5fc36ba2e8a89b6f"},
];

function Card({t, i, title, sub, onPress, red, right, style}: {t: Th; i: string; title: string; sub: string; onPress?: () => void; red?: boolean; right?: React.ReactNode; style?: object}) {
  return <Pressable onPress={onPress} style={[s.card, {backgroundColor: red ? RED : t.card, borderColor: red ? RED : t.bd}, red && s.redSh, style, {paddingHorizontal: 5}]}><Ic d={P[i]} c={red ? CREAM : t.ac} /><View style={{flex: 1, minWidth: 0}}><Tx numberOfLines={1} ellipsizeMode="tail" style={[s.ct, {color: red ? CREAM : t.tx}]}>{title}</Tx><Tx numberOfLines={1} ellipsizeMode="tail" style={[s.cs, {color: red ? 'rgba(255,251,212,0.75)' : t.mu}]}>{sub}</Tx></View>{right}<Ic d={P.ch} c={red ? CREAM : t.mu} s={16} w={2} /></Pressable>;
}
const Head = ({t, i, title}: {t: Th; i: string; title: string}) => <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}><Ic d={P[i]} c={t.ac} s={20} /><Tx style={{flex: 1, fontSize: 14, lineHeight: 18, fontWeight: '700', color: t.tx}}>{title}</Tx><Ic d={P.ch} c={t.mu} s={16} w={2} /></View>;

function Sheet({t, onClose, children, compact = false}: {t: Th; onClose: () => void; children: (close: () => void) => React.ReactNode; compact?: boolean}) {
  const insets = useSafeAreaInsets(); const {height} = useWindowDimensions(); const [p] = useState(() => new Animated.Value(0));
  useEffect(() => { Animated.timing(p, {toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true}).start(); }, [p]);
  const close = () => Animated.timing(p, {toValue: 0, duration: 250, easing: Easing.in(Easing.cubic), useNativeDriver: true}).start(({finished}) => finished && onClose());
  return <Modal transparent animationType="none" statusBarTranslucent onRequestClose={close}><Animated.View style={[StyleSheet.absoluteFill, {backgroundColor: 'rgba(0,0,0,0.4)', opacity: p}]}><Pressable style={{flex: 1}} onPress={close} /></Animated.View><View style={{flex: 1, justifyContent: 'flex-end'}} pointerEvents="box-none"><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} pointerEvents="box-none"><Animated.View style={[s.sheet, compact && {borderTopLeftRadius:16,borderTopRightRadius:16,paddingTop:12,paddingHorizontal:17}, {backgroundColor: t.bg, paddingBottom: Math.max(14, insets.bottom), transform: [{translateY: p.interpolate({inputRange: [0, 1], outputRange: [height, 0]})}]}]}>{children(close)}</Animated.View></KeyboardAvoidingView></View></Modal>;
}
function Calc({t,copy}: {t: Th;copy:KonsolissCopy}) {
  const [v, setV] = useState({l: '', w: '', h: '', q: '1'}); const c=estimateCbm(v.l,v.w,v.h,v.q); const f = [['l', copy['calc.length']], ['w', copy['calc.width']], ['h', copy['calc.height']], ['q', copy['calc.quantity']]] as const;
  return <><Tx style={[s.h3, {color: t.tx}]}>{copy['calc.heading']}</Tx><Tx style={[s.m, {color: t.mu}]}>{copy['calc.instructions']}</Tx><View style={s.g}>{f.map(([k, p]) => <TextInput key={k} value={v[k]} onChangeText={x => setV({...v, [k]: x})} placeholder={p} placeholderTextColor={t.mu} keyboardType="decimal-pad" style={[s.inp, {backgroundColor: t.inp, color: t.tx}]} />)}</View><Tx style={[s.res, {color: t.ac}]}>{formatCopy(copy,'calc.estimate',{volume:c===null?'—':c.toFixed(c<0.001?6:3).replace(/0+$/,'').replace(/\.$/,'.0')})}</Tx>{c===null&&(v.l||v.w||v.h)?<Tx style={{color:t.ac}}>{copy['calc.invalid']}</Tx>:null}<Tx style={[s.rs, {color: t.mu}]}>{copy['calc.disclaimer']}</Tx></>;
}
function Book({t, onClose,copy,onRequest}: {t: Th; onClose: () => void;copy:KonsolissCopy;onRequest:(volume:number)=>void}) {
  const [v, setV] = useState(0.5); return <><Tx style={[s.h3, {color: t.tx}]}>{copy['book.heading']}</Tx><Tx style={[s.m, {color: t.mu}]}>{formatCopy(copy,'book.capacity',{capacity:68})}</Tx><View style={s.chips}>{[0.02, 0.05, 0.2, 0.5, 1].map(x => <Pressable key={x} onPress={() => setV(x)} style={[s.chip, {backgroundColor: x === v ? RED : t.tint}]}><Tx style={{color: x === v ? CREAM : t.ac, fontWeight: '700', fontSize: 14}}>{x.toFixed(2)} CBM</Tx></Pressable>)}</View><Tx style={[s.res, {color: t.ac}]}>{`${v.toFixed(2)} CBM`}</Tx><Tx style={[s.rs, {color: t.mu}]}>{copy['book.unavailable']}</Tx><Pressable onPress={()=>onRequest(v)} style={s.rev}><Tx style={{color:CREAM,fontWeight:'700'}}>{copy['support.contact']}</Tx></Pressable><Pressable onPress={onClose} style={{padding:12}}><Tx style={{color: CREAM, fontWeight: '700', fontSize: 16}}>{copy['a11y.back']}</Tx></Pressable></>;
}

function SupportForm({t,copy,initial}:{t:Th;copy:KonsolissCopy;initial:{subject:string;message:string}}){
 const [subject,setSubject]=useState(initial.subject);const [message,setMessage]=useState(initial.message);const [busy,setBusy]=useState(false);const [notice,setNotice]=useState('');const id=useRef(supportRequestId());const lock=useRef(false);const alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const send=async()=>{if(lock.current)return;if(!subject.trim()||!message.trim()){setNotice(copy['support.required']);return;}lock.current=true;setBusy(true);setNotice('');try{const ticket=await sendKonsolissSupport(id.current,subject,message);if(alive.current){setNotice(formatCopy(copy,'support.sent',{ticket}));setSubject('');setMessage('');id.current=supportRequestId();}}catch{if(alive.current)setNotice(copy['support.error']);}finally{lock.current=false;if(alive.current)setBusy(false);}};
 return <><Tx style={[s.h3,{color:t.tx}]}>{copy['support.heading']}</Tx><Tx style={[s.m,{color:t.mu}]}>{copy['support.info']}</Tx><TextInput accessibilityLabel={copy['support.subject']} value={subject} editable={!busy} onChangeText={value=>{setSubject(value);id.current=supportRequestId();}} placeholder={copy['support.subject']} style={[s.inp,{color:t.tx,backgroundColor:t.inp}]} maxLength={160}/><TextInput accessibilityLabel={copy['support.message']} value={message} editable={!busy} onChangeText={value=>{setMessage(value);id.current=supportRequestId();}} placeholder={copy['support.message']} multiline maxLength={4000} style={[s.inp,{color:t.tx,backgroundColor:t.inp,minHeight:100,marginTop:10}]}/>{notice?<Tx style={{color:t.ac,marginTop:12}}>{notice}</Tx>:null}<Pressable disabled={busy} onPress={()=>{void send();}} style={s.rev}><Tx style={{color:CREAM,fontWeight:'700'}}>{copy[busy?'common.sending':'common.send']}</Tx></Pressable></>;
}

function KonsolissMarker({n, top, ac}: {n: number; top: boolean; ac: string}) {
  const dash = {width: 38, height: 4, marginTop: 6, backgroundColor: ac};
  return <View style={{width: 48, height: 161, alignItems: 'center', justifyContent: top ? 'flex-start' : 'center', paddingTop: top ? 20 : 0}}>
    <View style={{width: 7, height: 80, backgroundColor: ac}} />
    <View style={dash} />
    <View style={dash} />
    <Tx style={{marginTop: 2, fontSize: 30, lineHeight: 36, fontWeight: '700', color: ac}}>{n}</Tx>
  </View>;
}


/** TEMPORARY DEMO / PREVIEW. Fixtures live in konsolissPreviewScenarios.ts (frontend-only, never written to Supabase).
 * Development preview; production defaults off and EAS production explicitly sets 0.
 */
const KONSOLISS_DEMO_TOUR_ENABLED = true;

const KONSOLISS_STEPS=[1,2,3,4,5];

export default function KonsolissHomeScreen({onBack,onUniversalAction,unreadNotifications=0,unreadMessages=0}: {onBack?: () => void;onUniversalAction?:(action:KonsolissMenuAction)=>void;unreadNotifications?:number;unreadMessages?:number}) {
  return <SafeAreaProvider><Screen onBack={onBack} onUniversalAction={onUniversalAction} unreadNotifications={unreadNotifications} unreadMessages={unreadMessages} /></SafeAreaProvider>;
}
function DeadlineReminder({t,dueAt,remainingMs}:{t:Th;dueAt?:string;remainingMs?:number}){
  // The live clock uses the server-provided absolute deadline, never purchase-day copy.
  const [demoDue]=useState(()=>Date.now()+(remainingMs??0));
  const deadline=dueAt?Date.parse(dueAt):demoDue;
  const [now,setNow]=useState(()=>Date.now());
  const [reduced,setReduced]=useState(true);
  useEffect(()=>{
    let active=true;
    const apply=(value:boolean)=>{if(active)setReduced(value)};
    const subscription=AccessibilityInfo?.addEventListener?.('reduceMotionChanged',apply);
    if(AccessibilityInfo?.isReduceMotionEnabled)AccessibilityInfo.isReduceMotionEnabled().then(apply).catch(()=>apply(true));else apply(false);
    const timer=setInterval(()=>setNow(Date.now()),1000);
    return()=>{active=false;clearInterval(timer);subscription?.remove();};
  },[]);
  const countdown=trackingCountdown(deadline,now);
  if(!countdown)return null;
  const urgent=countdown.seconds<=3*86400,left=countdown.label;
  return <View style={{marginTop:3,opacity:urgent&&!reduced&&Math.floor(now/1000)%2===1?.58:1}}><Tx style={{fontSize:10.5,lineHeight:15,fontWeight:'700',color:t.ac}}>Send goods and upload tracking</Tx><Tx style={{fontSize:11,lineHeight:15,fontWeight:'700',color:t.ac}}>{left}</Tx></View>;
}

function Screen({onBack,onUniversalAction,unreadNotifications,unreadMessages}: {onBack?: () => void;onUniversalAction?:(action:KonsolissMenuAction)=>void;unreadNotifications:number;unreadMessages:number}) {
  const insets = useSafeAreaInsets(); const {dark,toggle:toggleKonsolissDarkMode,error:themeError}=useFeatureTheme('konsoliss.theme'); const t=dark?Dk:L; const content=useKonsolissHomepageContent(); const copy=content.copy; const editing=useContext(KonsolissContentContext); const [supportDraft,setSupportDraft]=useState({subject:'',message:''}); const [sh, setShState] = useState<null | 'calc' | 'book' | 'warehouse' | 'load' | 'sourcing' | 'orders' | 'support'>(null); const scrollRef=useRef<React.ElementRef<typeof ScrollView>>(null); const [scroll, setScroll] = useState(true); const [progressView,setProgressView]=useState<'customer'|'container'>('customer'); const [loadDetailsOpen,setLoadDetailsOpen]=useState(false); const [quickMenuOpen,setQuickMenuOpen]=useState(false); const [selectorOpen,setSelectorOpen]=useState(false); const [containerMenuOpen,setContainerMenuOpen]=useState(false); const [selectedContainerId,setSelectedContainerId]=useState<string|null>(null); const loadProgress=useKonsolissLoadProgress(); const snapshotMode=loadProgress.snapshot!==undefined; const legacyCurrent=useCurrentKonsolissContainer(!snapshotMode); const legacyAssigned=useKonsolissAssignedContainers(!snapshotMode); const preview=useKonsolissPreviewController(); const demoScenario=KONSOLISS_DEMO_TOUR_ENABLED?preview.scenario:null; const isDemo=demoScenario!=null; const demoView=isDemo?preview.view:null; const demoRender=demoScenario?previewRender(demoScenario,demoView):null; const demoProgressValue=demoScenario?previewProgress(demoScenario):null;
  // Live production uses the one atomic snapshot; legacy hooks are disabled.
  // Only the isolated admin preview and existing host harness omit snapshot.
  const snapshotContainers=loadProgress.snapshot?.containers??[];
  const latest=snapshotContainers[0];
  const currentContainer=snapshotMode?(loadProgress.kind==='loading'?{kind:'loading' as const}:loadProgress.kind==='unavailable'?{kind:'unavailable' as const}:latest?{kind:'assigned' as const,number:latest.number,status:latest.status}:{kind:'unassigned' as const}):legacyCurrent;
  const assignedContainers=snapshotMode?{containers:snapshotContainers,state:loadProgress.kind==='loading'?'loading' as const:loadProgress.kind==='unavailable'?'unavailable' as const:'ready' as const}:legacyAssigned;
  // Demo mode only swaps what is DISPLAYED. Live hooks keep running untouched underneath, so exiting restores genuine data.
  const setSh=(value:typeof sh)=>{if(isDemo&&value!==null)return;setShState(value);};
  useEffect(()=>{setProgressView('customer');},[preview.index]);
  const displayLoadState=demoScenario?(demoScenario.data==='loading'?{kind:'loading' as const}:demoScenario.data==='unavailable'?{kind:'unavailable' as const}:demoProgressValue&&demoScenario.code!=='A1'?{kind:'recorded' as const,progress:demoProgressValue}:{kind:'unrecorded' as const}):loadProgress;
  const displayCurrentContainer=demoScenario?(demoScenario.data==='loading'?{kind:'loading' as const}:demoScenario.data==='unavailable'?{kind:'unavailable' as const}:demoRender?.container?{kind:'assigned' as const,number:demoRender.container.number,status:demoRender.container.status}:{kind:'unassigned' as const}):currentContainer;
  const displayAssignmentState=isDemo?(demoScenario?.data==='loading'?'loading' as const:demoScenario?.data==='unavailable'?'unavailable' as const:'ready' as const):assignedContainers.state;

  const [lifecycleNotice,setLifecycleNotice] = useState<KonsolissContainerStatus|null>(null);
  const previousContainerStage = useRef<string|null>(null);
  const assignedStage = !isDemo&&currentContainer.kind === 'assigned' ? currentContainer.number + ':' + currentContainer.status : null;
  useEffect(() => {
    if (!assignedStage) return;
    if (previousContainerStage.current === assignedStage) return;
    previousContainerStage.current = assignedStage;
    setLifecycleNotice(currentContainer.kind === 'assigned' ? currentContainer.status : null);
  }, [assignedStage,currentContainer]);
  useEffect(() => {
    if (!lifecycleNotice) return;
    const timer = setTimeout(() => setLifecycleNotice(null), 7000);
    return () => clearTimeout(timer);
  }, [lifecycleNotice]);
  // Customer assignments remain server-owned; sample containers are local preview data only.
  const realFallback=!snapshotMode&&currentContainer.kind==='assigned'?{
    id:'current:'+currentContainer.number,number:currentContainer.number,status:currentContainer.status,demo:false,
  } as KonsolissSelectableContainer:null;
  const liveContainers:KonsolissSelectableContainer[]=isDemo&&demoScenario?demoScenario.containers.map(c=>({id:'demo:'+demoScenario.id+':'+c.key,number:c.number,status:c.status,demo:true} as KonsolissSelectableContainer)):(assignedContainers.containers.length?assignedContainers.containers:(realFallback?[realFallback]:[]));
  const defaultContainer=liveContainers.find(row=>row.number===realFallback?.number)
    ??liveContainers[0]??realFallback
;
  const unassignedCbm=loadProgress.kind==='recorded'?Math.max(0,Math.round((loadProgress.progress.reservedCbm-loadProgress.progress.allocatedCbm)*1000)/1000):0;
  const liveUnassigned=!isDemo&&snapshotMode&&liveContainers.length>0&&unassignedCbm>0&&selectedContainerId==='live';
  const selectedContainer:KonsolissSelectableContainer|null=isDemo&&demoScenario?(liveContainers.find(row=>row.id==='demo:'+demoScenario.id+':'+demoView?.id)??null):liveUnassigned?null:
    (liveContainers.find(row=>row.id===selectedContainerId)
      ??(selectedContainerId===realFallback?.id?realFallback:null)
      ??defaultContainer);
  const hasCurrentContainer=selectedContainer!==null;
  const isSelectedCurrent=selectedContainer!==null&&!isDemo&&currentContainer.kind==='assigned'&&currentContainer.number===selectedContainer.number;
  const containerStatusLabel=(item:KonsolissSelectableContainer)=>
    item.number+' · '+copy['status.'+item.status];
  // Rotate only when a container is selected; always start with customer progress.
  useEffect(()=>{
    // No shared-container bar exists without a selected container.
    if(!selectedContainer){if(progressView!=='customer')setProgressView('customer');return;}
    // A manual arrow tap changes progressView, resets this timeout and guarantees 7 full seconds.
    const timeout=setTimeout(()=>setProgressView(view=>view==='customer'?'container':'customer'),7000);
    return()=>clearTimeout(timeout);
  },[selectedContainer?.id,progressView]);
  const verifiedOccupancy=useKonsolissContainerOccupancy(!snapshotMode&&!isDemo&&selectedContainer?.id&&!selectedContainer.id.startsWith('current:')?selectedContainer.id:null);
  const containerOccupancy=isDemo?(demoRender?.occupancy??null):snapshotMode?(snapshotContainers.find(c=>c.id===selectedContainer?.id)?.occupancy??null):verifiedOccupancy;
  // "Your space" in the lower container bar is loaded cargo, not reserved allocation.
  // The aggregation RPC's yourSpaceCbm is also physically loaded cargo.
  const yourPhysicallyLoadedCbm=containerOccupancy?.yourSpaceCbm;
  // Reserved space, goods sent and cargo loaded are different customer-owned quantities.
  // Unknown data is never replaced with the former 51.7/68 sample occupancy.
  const progress=displayLoadState.kind==='recorded'?displayLoadState.progress:null;
  const noActiveLoad=displayCurrentContainer.kind==='unassigned'&&(
    displayLoadState.kind==='unrecorded'||(progress!==null&&progress.reservedCbm===0&&progress.sentCbm===0));
  const fmt=(n:number)=>n.toFixed(3).replace(/0+$/,'').replace(/\.$/,'.0');
  const loadedValue=progress?fmt(progress.loadedCbm):'—';
  const inboundValue=progress?fmt(progress.inboundCbm):'—';
  const committedValue=progress?fmt(progress.allocatedCbm):'—';
  const warehouseOrTransitValue=progress?fmt(progress.atWarehouseOrInTransitCbm):'—';
  const reservedValue=progress?fmt(progress.reservedCbm):'—';
  const sentValue=progress?fmt(progress.sentCbm):'—';
  const notLoadedValue=progress?fmt(progress.sentNotLoadedCbm):'—';
  const stillToSendValue=progress?fmt(progress.reservedNotSentCbm):'—';
  const notAllocatedValue=progress?fmt(Math.max(0,progress.reservedCbm-progress.allocatedCbm)):'—';
  const physicallyLoadedRatio=progress&&progress.reservedCbm>0?progress.loadedCbm/progress.reservedCbm:0;
  const inboundRatio=progress&&progress.reservedCbm>0?progress.inboundCbm/progress.reservedCbm:0;
  const fillPercent=progress?progress.loadedPercent+'%':'—';
  const fillRatio=progress&&progress.reservedCbm>0?progress.allocatedCbm/progress.reservedCbm:0;
  const noCargoLoaded=!progress||progress.allocatedCbm===0;
  const visualMode=noCargoLoaded?'illustration':'sample';
  // Left: customer committed CBM / reserved CBM. Right: the shared 68 CBM container only.
  const containerRatio=containerOccupancy?containerOccupancy.loadedCbm/containerOccupancy.capacityCbm:0;
  const containerPercent=containerOccupancy?(containerRatio>0&&containerRatio<0.01?(containerRatio*100).toFixed(2):String(Math.round(containerRatio*100)))+'%':'—';
  const containerAvailable=containerOccupancy?fmt(containerOccupancy.freeCbm):'—';
  const showEmptyLoadHint=!selectedContainer&&displayAssignmentState==='ready'&&liveContainers.length===0&&displayCurrentContainer.kind==='unassigned'&&(
    displayLoadState.kind==='unrecorded'||(progress!==null&&progress.reservedCbm===0&&progress.sentCbm===0));
  const showReservedPreview=isDemo?!!demoRender?.preview:liveUnassigned||progress!==null&&progress.reservedCbm>0&&progress.loadedCbm===0&&((containerOccupancy!==null&&containerOccupancy.yourSpaceCbm===0)||(!selectedContainer&&displayAssignmentState==='ready'&&liveContainers.length===0&&displayCurrentContainer.kind==='unassigned'));
  const loadPreviewValues={reservedValue,sentValue,loadedValue,inboundValue,committedValue,warehouseOrTransitValue,stillToSendValue,notAllocatedValue};
  const resetPreviewUi=()=>{setSelectedContainerId(null);setProgressView('customer');setLoadDetailsOpen(false);setContainerMenuOpen(false);setLifecycleNotice(null);setSelectorOpen(false);};
  const enterDemo=()=>{setShState(null);preview.start();resetPreviewUi();};
  const moveDemo=(delta:number)=>{preview.step(delta);resetPreviewUi();};
  const pickDemo=(index:number)=>{preview.select(index);resetPreviewUi();};
  const exitDemo=()=>{preview.exit();resetPreviewUi();};
  const replayDemo=()=>{preview.replayCurrent();setProgressView('customer');setLoadDetailsOpen(false);};
  const demoCountdown=demoScenario?.deadlineRemainingMs;
  const liveDeadline=!isDemo&&loadProgress.kind==='recorded'&&loadProgress.progress.reservedCbm>0?loadProgress.trackingDueAt:undefined;
  const splitShipment=liveContainers.length>1;
  const liveCaption=liveLoadCallout(progress,containerOccupancy,splitShipment);
  const snapshotStatus=liveHomeStatus(loadProgress.snapshot,copy);
  const loadStatus=demoScenario?previewLoadStatus(demoScenario,demoView):liveUnassigned?(splitShipment?'Split into '+liveContainers.length+' containers • ':'')+fmt(unassignedCbm)+' CBM unassigned':splitShipment?'Split into '+liveContainers.length+' containers'+(snapshotStatus==='Incident under review'?' • '+snapshotStatus:''):snapshotStatus|| (showReservedPreview&&!containerOccupancy?copy['load.reserved']+' • '+(progress?.sentCbm===0?(copy['warehouse.empty']||'No goods sent yet'):(copy['load.warehouseTransit']||'At warehouse or still in transit')):'');
  const webHtml=containerHtml(dark,
    isDemo?!!demoRender?.empty:showEmptyLoadHint,
    isDemo?(demoRender?.empty?68:(demoRender?.reserved??0)):showReservedPreview?(liveUnassigned?unassignedCbm:(progress?.reservedCbm??0)):(containerOccupancy?.capacityCbm??(showEmptyLoadHint?68:0)),
    isDemo?(demoRender?.loaded??0):(containerOccupancy?.loadedCbm??0),0,isDemo,
    isDemo?(demoRender?.yourLoaded??0):(yourPhysicallyLoadedCbm??0),
    isDemo?(demoRender?.free??null):(containerOccupancy?.freeCbm??null),copy,showReservedPreview,
    isDemo?(demoRender?.sent??0):(progress?.sentCbm??0),
    demoRender&&isDemo?{here:demoRender.here,hereInbound:demoRender.hereInbound,sealed:demoRender.sealed,caption:demoRender.caption}
      :{here:containerOccupancy?.yourAllocatedCbm??0,hereInbound:verifiedContainerInbound(containerOccupancy),sealed:selectedContainer!==null&&selectedContainer.status!=='filling',caption:liveUnassigned?'Not assigned yet':liveCaption});
  const nav = [copy['nav.home'], copy['nav.warehouse'], copy['nav.consolidated'], copy['nav.sourcing'], copy['nav.hub']];
  return <KonsolissContentContext.Provider value={{...editing,copy,images:content.images}}><View style={{flex: 1, backgroundColor: t.bg}}><StatusBarCompat barStyle={dark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
    <ScrollView ref={scrollRef} scrollEnabled={scroll} contentContainerStyle={{paddingTop: Math.max(14, insets.top), paddingBottom: 110 + insets.bottom}} showsVerticalScrollIndicator={false}>
      <View style={[s.row, {height: 60, paddingHorizontal: 24}]}><View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}><Pressable onPress={onBack} hitSlop={8}><Ic d={P.back} c={t.ac} s={22} w={2} /></Pressable><Pressable onPress={onBack}><Tx style={[s.logo, {color: t.ac}]}>{copy['home.brand']}</Tx></Pressable></View><Pressable accessibilityRole="button" accessibilityLabel={copy['a11y.chooseContainer']} accessibilityHint={copy['a11y.openContainers']}
        onPress={() => setContainerMenuOpen(true)}
        style={[s.pill,{backgroundColor:t.tint,flexDirection:'row',alignItems:'center',gap:5,maxWidth:'72%'}]}>
        <Tx numberOfLines={1} style={{fontSize:12,lineHeight:15,fontWeight:'600',color:t.ac}}>
          {isDemo&&demoScenario?.pill?demoScenario.pill:(isDemo&&demoView?.kind==='unassigned'||liveUnassigned)?'Not assigned yet':selectedContainer?containerStatusLabel(selectedContainer):
            displayCurrentContainer.kind==='unassigned'?(progress&&(progress.reservedCbm>0||progress.sentCbm>0)?copy['status.preparing']:currentKonsolissContainerLabel(displayCurrentContainer,copy)):
              currentKonsolissContainerLabel(displayCurrentContainer,copy)}
        </Tx>
        <Tx style={{fontSize:12,color:t.ac}}>⌄</Tx>
      </Pressable></View>
      {KONSOLISS_DEMO_TOUR_ENABLED?<View style={{paddingHorizontal:24,marginTop:3,gap:6}}>
        {isDemo&&demoScenario?<>
          <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
            <View style={{backgroundColor:t.ac,borderRadius:8,paddingHorizontal:8,paddingVertical:3}}><Tx style={{fontSize:10,fontWeight:'800',color:CREAM}}>DEMO ONLY</Tx></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Open demo scenario list" onPress={()=>setSelectorOpen(true)} style={[s.pill,{flex:1,backgroundColor:t.tint,flexDirection:'row',alignItems:'center',gap:5}]}><Tx numberOfLines={1} style={{flex:1,fontSize:11,fontWeight:'700',color:t.ac}}>{demoScenario.code+' · '+demoScenario.title}</Tx><Tx style={{fontSize:12,color:t.ac}}>⌄</Tx></Pressable>
          </View>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'flex-end',gap:6,flexWrap:'wrap'}}>
            <Tx style={{fontSize:11,color:t.mu,fontWeight:'700'}}>{((preview.index??0)+1)+'/'+PREVIEW_SCENARIO_COUNT}</Tx>
            <Pressable accessibilityRole="button" accessibilityLabel="Previous demo state" onPress={()=>moveDemo(-1)} style={[s.pill,{backgroundColor:t.tint}]}><Tx style={{fontSize:11,color:t.ac}}>‹ Prev</Tx></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Next demo state" onPress={()=>moveDemo(1)} style={[s.pill,{backgroundColor:t.tint}]}><Tx style={{fontSize:11,color:t.ac}}>Next ›</Tx></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Replay demo state" onPress={replayDemo} style={[s.pill,{backgroundColor:t.tint}]}><Tx style={{fontSize:11,color:t.ac}}>↻ Replay</Tx></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={preview.autoplay?'Pause demo tour':'Play all demo states'} onPress={preview.togglePlay} style={[s.pill,{backgroundColor:t.tint}]}><Tx style={{fontSize:11,color:t.ac}}>{preview.autoplay?'Pause':'▶ Play all'}</Tx></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Return to live data" onPress={exitDemo} style={[s.pill,{backgroundColor:t.ac}]}><Tx style={{fontSize:11,fontWeight:'700',color:CREAM}}>Live / Original</Tx></Pressable>
          </View>
          <Tx style={{fontSize:10,color:t.ac,fontWeight:'700'}}>{'DEMO ONLY · '+demoScenario.title}</Tx>
        </>:<View style={{flexDirection:'row',justifyContent:'flex-end'}}><Pressable accessibilityRole="button" accessibilityLabel="Preview Konsoliss demo states" onPress={enterDemo} style={[s.pill,{backgroundColor:t.tint,borderWidth:1,borderColor:t.bd}]}><Tx style={{fontSize:11,color:t.ac,fontWeight:'700'}}>▶ Demo / Preview</Tx></Pressable></View>}
      </View>:null}
      {showEmptyLoadHint?<Tx style={{fontSize:11,color:t.mu,textAlign:'right',marginRight:24,marginTop:3}}>{copy['home.noAssignment']}</Tx>:null}
      <View style={[s.row, {alignItems: 'flex-end', marginTop: 16}]}><Pressable accessibilityRole="button" accessibilityLabel={copy['a11y.loadDetails']} accessibilityState={{expanded:loadDetailsOpen}} onPress={()=>setLoadDetailsOpen(open=>!open)} style={{paddingVertical:4,paddingRight:12,flex:1,minWidth:0}}><View style={{flexDirection:'row',alignItems:'center',gap:7}}><Tx style={{fontSize: 12.5, lineHeight: 16, fontWeight: '600', color: t.mu}}>{copy['home.load.heading']}</Tx><Tx style={{fontSize:15,color:t.ac}}>{loadDetailsOpen?'⌃':'⌄'}</Tx></View><Tx style={[s.num, {color: t.ac}]}>{loadPreviewValues.committedValue}<Tx style={{fontSize: 17, letterSpacing: 0, color: t.mu, fontWeight: '600'}} > / {loadPreviewValues.reservedValue} CBM</Tx></Tx><Tx style={{fontSize:10.5,color:t.mu}}>{formatCopy(copy,'home.loadedInbound',{loaded:loadPreviewValues.loadedValue,inbound:loadPreviewValues.inboundValue})}</Tx>{loadStatus?<Tx style={{fontSize:10.5,lineHeight:15,color:t.mu,marginTop:3}}>{loadStatus}</Tx>:null}{demoCountdown!==undefined||liveDeadline?<DeadlineReminder key={demoScenario?.id??liveDeadline} t={t} remainingMs={demoCountdown} dueAt={liveDeadline}/>:null}{showReservedPreview&&!containerOccupancy?<Tx style={{fontSize:10,lineHeight:13,color:t.mu,marginTop:2}}>Illustration · not a real container</Tx>:null}</Pressable><View style={{alignItems: 'flex-end', paddingBottom: 4}}><Svg width={34} height={34} viewBox="0 0 36 36" style={{marginBottom: 8}}><Circle cx={18} cy={18} r={14} fill="none" stroke={t.tint} strokeWidth={4} /><Circle cx={18} cy={18} r={14} fill="none" stroke={t.ac} strokeWidth={4} strokeLinecap="round" strokeDasharray={`${(containerRatio*87.96).toFixed(2)} 87.96`} rotation={-90} origin="18, 18" /></Svg><Tx style={{fontSize: 20, lineHeight: 25, fontWeight: '700', color: t.tx}}>{formatCopy(copy,'home.filled',{percent:containerPercent})}</Tx>{selectedContainer&&selectedContainer.status!=='filling'?<Tx style={{fontSize: 12, lineHeight: 15, color: t.mu}}>{copy['status.'+selectedContainer.status]}</Tx>:<Tx style={{fontSize: 12, lineHeight: 15, color: t.mu}}><Tx style={{color: t.gr, fontWeight: '700'}} >{containerAvailable} CBM</Tx> {copy['home.available']}</Tx>}</View></View>
      {(containerOccupancy || showEmptyLoadHint || showReservedPreview) ? (
      <View style={{height: 300, marginTop: 2}} onTouchStart={() => setScroll(false)} onTouchEnd={() => setScroll(true)} onTouchCancel={() => setScroll(true)}><WebView key={(dark ? 'd' : 'l')+'-'+(isDemo?'demo-'+demoScenario?.id+'-'+(demoView?.id??'')+'-'+preview.replay:(selectedContainer?.id??(showReservedPreview?'reserved-'+reservedValue:visualMode)))+'-'+(containerOccupancy?.loadedCbm??'unverified')+'-'+(yourPhysicallyLoadedCbm??'unknown')+'-'+(showReservedPreview?'reserve-'+reservedValue:'physical')} originWhitelist={['*']} source={{html: webHtml}} style={{backgroundColor: 'transparent'}} containerStyle={{backgroundColor: 'transparent'}} scrollEnabled={false} bounces={false} overScrollMode="never" javaScriptEnabled showsVerticalScrollIndicator={false} /></View>
      ) : <View style={{height:300,alignItems:'center',justifyContent:'center',paddingHorizontal:24}}><Tx style={{color:t.mu,textAlign:'center',fontSize:13}}>{displayAssignmentState==='loading'||displayCurrentContainer.kind==='loading'?copy['home.loading']:!hasCurrentContainer&&(displayAssignmentState==='unavailable'||displayCurrentContainer.kind==='unavailable')?copy['status.unavailable']:!hasCurrentContainer?copy['home.noAccountContainer']:copy['home.measurementsUnavailable']}</Tx></View>}
      <View style={{marginTop: 1, height: 32, alignItems: 'center', justifyContent: 'center'}}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}><Tx style={{fontSize: 12, lineHeight: 14, fontWeight: '600', color: t.mu}}>———</Tx><View style={{width: 4}} /><View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: t.mu}} /><View style={{width: 4}} /><Tx style={{fontSize: 12, lineHeight: 14, fontWeight: '600', color: t.mu}}>———</Tx></View>
      </View>
      <View pointerEvents={isDemo?'none':'auto'} style={{paddingHorizontal:24,marginTop:12}}>
        {progressView==='container'?<>
          <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
            <View style={{flex:1,height:10,borderRadius:5,overflow:'hidden',backgroundColor:t.tint,flexDirection:'row'}}>
              <View style={{width:`${containerOccupancy?Math.max(0,Math.min(100,(splitShipment?containerOccupancy.loadedCbm:containerOccupancy.otherCargoCbm)/containerOccupancy.capacityCbm*100)):0}%`,backgroundColor:'#CDAA7D'}}/>
              {!splitShipment?<View style={{width:`${containerOccupancy?Math.max(0,Math.min(100,containerOccupancy.yourSpaceCbm/containerOccupancy.capacityCbm*100)):0}%`,backgroundColor:t.ac}}/>:null}
            </View>
            {<Pressable accessibilityRole="button" accessibilityLabel={copy['a11y.progress']} accessibilityHint={copy['a11y.progressHint']}
            onPress={()=>setProgressView(view=>view==='customer'?'container':'customer')}
            hitSlop={10} style={{paddingHorizontal:5,paddingVertical:5,justifyContent:'center',alignItems:'center'}}>
            <Svg width={30} height={19} viewBox="0 0 30 19" fill="none" stroke={t.ac} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M3 5h23m-5-4 5 4-5 4M27 14H4m5-4-5 4 5 4"/>
            </Svg>
          </Pressable>}
          </View>
          <View style={{flexDirection:'row',justifyContent:'space-between',marginTop:7}}>
            <Tx style={s.leg}>{splitShipment?copy['load.loaded']:copy['home.otherCargo']} <Tx style={{color:t.tx}}>{containerOccupancy?fmt(splitShipment?containerOccupancy.loadedCbm:containerOccupancy.otherCargoCbm):'—'}</Tx></Tx>
            {!splitShipment?<Tx style={[s.leg,{color:t.ac}]}>{copy['home.yourSpace']} <Tx style={{color:t.tx}}>{containerOccupancy?fmt(containerOccupancy.yourSpaceCbm):'—'}</Tx></Tx>:null}
            <Tx style={s.leg}>{copy['home.free']} <Tx style={{color:t.tx}}>{containerOccupancy?fmt(containerOccupancy.freeCbm):'—'}</Tx></Tx>
          </View>
        </>:<>
          <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
            <View style={{flex:1,flexDirection:'row',height:10,borderRadius:5,overflow:'hidden',gap:2}}>
            <View style={{width:`${Math.max(0,Math.min(100,physicallyLoadedRatio*100))}%`}}>
              <Svg width="100%" height={10}><Defs><LinearGradient id="g" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#CDAA7D"/><Stop offset="0.5" stopColor="#B7B1A3"/><Stop offset="1" stopColor="#D2B48A"/></LinearGradient></Defs><Rect width="100%" height={10} fill="url(#g)"/></Svg>
            </View>
            <View style={{width:`${Math.max(0,Math.min(100,inboundRatio*100))}%`,backgroundColor:t.ac}}/>
              <View style={{flex:1,backgroundColor:t.tint}}/>
            </View>
            {<Pressable accessibilityRole="button" accessibilityLabel={copy['a11y.progress']} accessibilityHint={copy['a11y.progressHint']}
            onPress={()=>setProgressView(view=>view==='customer'?'container':'customer')}
            hitSlop={10} style={{paddingHorizontal:5,paddingVertical:5,justifyContent:'center',alignItems:'center'}}>
            <Svg width={30} height={19} viewBox="0 0 30 19" fill="none" stroke={t.ac} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M3 5h23m-5-4 5 4-5 4M27 14H4m5-4-5 4 5 4"/>
            </Svg>
          </Pressable>}
          </View>
          <View style={{flexDirection:'row',justifyContent:'space-between',marginTop:7}}>
            <Tx style={s.leg}>{copy['load.loaded']} <Tx style={{color:t.tx}}>{loadedValue}</Tx></Tx>
            <Tx style={[s.leg,{color:t.ac}]}>{copy['load.inbound']} <Tx style={{color:t.tx}}>{inboundValue}</Tx></Tx>
            <Tx style={s.leg}>{copy['load.notAllocated']} <Tx style={{color:t.tx}}>{notAllocatedValue}</Tx></Tx>
          </View>
        </>}
      </View>
      <View style={{paddingHorizontal: 24, paddingTop: 22, gap: 12}}><View style={{flexDirection: 'row', gap: 12}}><Card t={t} i="box" title={copy['home.book.title']} sub={copy['home.book.subtitle']} red style={{flex: 1, height: 70}} onPress={() => setSh('book')} /><Card t={t} i="box" title={copy['home.load.title']} sub={copy['home.load.subtitle']} onPress={()=>setSh('load')} style={{flex: 1, height: 70, borderWidth: 0.5}} /></View><Card t={t} i="calc" title={copy['home.calc.title']} sub={copy['home.calc.subtitle']} onPress={() => setSh('calc')} style={{borderWidth: 0.5}} /><View style={{flexDirection: 'row', gap: 12}}><Pressable accessibilityRole="button" onPress={()=>setSh('warehouse')} style={[s.card2, {backgroundColor: t.card, borderColor: t.bd, borderWidth: 0.5}]}><Head t={t} i="wh" title={copy['home.warehouse.title']} /><Tx style={[s.body, {color: t.tx}]}>{progress?(progress.sentCbm===0?copy['warehouse.empty']:formatCopy(copy,'warehouse.amount',{volume:warehouseOrTransitValue})):copy['warehouse.unavailable']}</Tx><View style={{position: 'absolute', right: 10, bottom: 8}}><Svg width={38} height={42} viewBox="0 0 20 22"><CP c={t.ac} /></Svg></View></Pressable><Pressable accessibilityRole="button" accessibilityLabel={copy['a11y.consolidated']}
  onPress={() => setContainerMenuOpen(true)}
  style={[s.card2, {backgroundColor: t.card, borderColor: t.bd, borderWidth: 0.5}]}>
  <Head t={t} i="ct" title={copy['home.consolidated.title']} />
  {selectedContainer?<Tx style={[s.body,{color:t.tx}]}>
    {selectedContainer.number+'\n'+copy['status.'+selectedContainer.status]}
  </Tx>:<Tx style={[s.body,{color:t.mu}]}>{displayCurrentContainer.kind==='unassigned'?copy['status.unassigned']:copy['container.detailsUnavailable']}</Tx>}
</Pressable></View><Card t={t} i="ln" title={copy['home.sourcing.title']} sub={copy['home.sourcing.subtitle']} onPress={()=>setSh('sourcing')} right={<Ic d={P.gl} c={t.tx} s={20} />} style={{borderWidth: 0.5}} /></View>
      <View style={{paddingTop: 20}}>
        <Tx style={[s.how, {color: t.tx, fontSize: 16, lineHeight: 20, fontWeight: '400', paddingTop: 6, paddingBottom: 10, marginBottom: 0}]}>{copy['home.how.heading']}</Tx>
        {KONSOLISS_STEPS.map((_, i) => {
          const title = copy[`home.how.${i+1}.title`];
          const body = copy[`home.how.${i+1}.body`];
          const textFirst = i % 2 === 0;
          const last = i === KONSOLISS_STEPS.length - 1;
          const textBlock = <View style={{flex: 1, minWidth: 150, paddingTop: 25, alignItems: 'flex-start'}}>
            <View style={{alignItems: 'center'}}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Tx style={{fontSize: 14, lineHeight: 18, fontWeight: '600', color: t.tx, maxWidth: i === 1 ? 105 : undefined, paddingRight: i === 1 ? 3 : 0}}>{title}</Tx>
                {i === 3 && <Svg width={16} height={16} viewBox="0 0 16 16" style={{marginLeft: 5}}>
                  <Circle cx={8} cy={8} r={6.6} fill="none" stroke={t.tx} strokeWidth={1.4} />
                  <Path d="M8 7.2V11.2" stroke={t.tx} strokeWidth={1.4} strokeLinecap="round" />
                  <Circle cx={8} cy={5.2} r={0.8} fill={t.tx} />
                </Svg>}
              </View>
              <Tx style={{marginTop: 10, fontSize: 12, lineHeight: 16, fontStyle: 'italic', color: t.mu}}>{body}</Tx>
            </View>
          </View>;
          const pic = <View style={[{width: 190, height: 190, overflow: 'hidden'}, last ? {borderTopLeftRadius: 90} : {borderRadius: 8}]}>
            <CmsImage slot={'how.'+(i+1)} source={KONSOLISS_HOW_IMAGES[i]} style={{width: '100%', height: '100%'}} resizeMode={last ? 'cover' : 'contain'} />
          </View>;
          return <View key={title} style={{flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 1}}>
            {textFirst ? <>{textBlock}<KonsolissMarker n={i + 1} top={textFirst} ac={t.ac} />{pic}</> : <>{pic}<KonsolissMarker n={i + 1} top={textFirst} ac={t.ac} />{textBlock}</>}
          </View>;
        })}
      </View>
    </ScrollView>
    <View pointerEvents={isDemo?'none':'auto'} style={s.bottomWrap}><View style={s.bottomNav}>{nav.map((n, k) => <Pressable key={n} onPress={() => {if(k===0)scrollRef.current?.scrollTo({y:0,animated:true});else if(k===1)setSh('warehouse');else if(k===2)setContainerMenuOpen(true);else if(k===3)setSh('sourcing');else setQuickMenuOpen(true);}} style={s.flyzNavItem}><View style={[s.flyzNavIcon, k === 0 && {backgroundColor: t.tint, borderRadius: 999}]}><CmsImage slot={['nav.home','nav.warehouse','nav.consolidated','nav.sourcing','nav.hub'][k]} source={k===0?{uri:"https://raw.githubusercontent.com/momojdy/tiss_tiss_beta/main/src/assets/konsoliss/icons/homeicon.png?v=4ede6e59ca6c031f926fe2c8e04edcf5cbfc7ccc9df3abffc419446e07f6bd8a"}:k===1?{uri:"https://raw.githubusercontent.com/momojdy/tiss_tiss_beta/main/src/assets/konsoliss/icons/warehouseicon.png?v=564ab5319f43a29ee85ebbbf9345302d83910d5e9bc43ba8a3fc274909da79c8"}:k===2?{uri:"https://raw.githubusercontent.com/momojdy/tiss_tiss_beta/main/src/assets/konsoliss/icons/consolidation.png?v=4a05db3866c896879016628522b366bc3deda96109b194c98a8e2cd2cb83dc80"}:k===3?{uri:"https://raw.githubusercontent.com/momojdy/tiss_tiss_beta/main/src/assets/konsoliss/icons/sourcingicon.png?v=6588c651bc6a89bb61a4ea0071aa85b21c90c76effe05676d910dafde32796e8"}:{uri:"https://raw.githubusercontent.com/momojdy/tiss_tiss_beta/main/src/assets/konsoliss/icons/hub.png?v=7f5b1a01f70b91fbd273790d623d240a09513868b82a54b25f5878a0aa1507e7"}} style={{width: k === 3 ? 43 : k === 4 ? 37 : 39, height: k === 3 ? 43 : k === 4 ? 37 : 39}} resizeMode="contain" /></View><Tx style={[s.flyzNavLabel, {color: k===0?t.ac:t.tx}]}>{n}</Tx></Pressable>)}</View></View>
    {sh && <Sheet t={t} compact={sh==='book'} onClose={() => setSh(null)}>{done => sh === 'calc' ? <Calc t={t} copy={copy} /> : sh==='book'?<Book t={t} copy={copy} onClose={done} onRequest={volume=>{setSupportDraft({subject:copy['book.heading'],message:volume.toFixed(3)+' CBM'});setSh('support');}}/>:sh==='support'?<SupportForm key={content.accountId??'anonymous'} t={t} copy={copy} initial={supportDraft}/>:<><Tx style={[s.h3,{color:t.tx}]}>{copy['panel.'+sh]}</Tx><Tx style={[s.body,{color:t.tx}]}>{sh==='warehouse'?(progress?formatCopy(copy,'warehouse.amount',{volume:warehouseOrTransitValue}):copy['warehouse.unavailable']):copy['panel.'+sh+'Info']}</Tx><Pressable style={s.rev} onPress={()=>{setSupportDraft({subject:copy['panel.'+sh]??copy['support.heading'],message:''});setSh('support');}}><Tx style={{color:CREAM,fontWeight:'700'}}>{copy['support.contact']}</Tx></Pressable><Pressable onPress={done} style={{padding:12}}><Tx style={{color:t.ac}}>{copy['common.back']}</Tx></Pressable></>}</Sheet>}
    {/* Fixed overlay, outside the scrolling content like the Goodies quick-menu trigger. */}
    <Pressable accessibilityRole="button" accessibilityLabel={copy['a11y.quickMenu']} onPress={()=>{if(!isDemo)setQuickMenuOpen(true);}} style={{position:'absolute',top:insets.top+198,right:18,width:49,height:42,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:3,backgroundColor:dark?'#6B1D16':'#A90E02',borderRadius:22,zIndex:45,elevation:8,shadowColor:'#000',shadowOpacity:0.15,shadowRadius:5,shadowOffset:{width:0,height:2}}}><View style={{width:5,height:5,borderRadius:3,backgroundColor:'#FFFBD4'}}/><View style={{width:7,height:7,borderRadius:4,backgroundColor:'#FFFBD4'}}/><View style={{width:10,height:10,borderRadius:5,backgroundColor:'#FFFBD4'}}/></Pressable>
    {themeError?<Tx style={{color:t.ac,fontSize:11,paddingHorizontal:24}}>{copy['theme.error']}</Tx>:null}
    <KonsolissQuickMenu visible={quickMenuOpen} close={()=>setQuickMenuOpen(false)} dark={dark} unreadNotifications={unreadNotifications} unreadMessages={unreadMessages} onAction={action=>{if(action==='help'||action==='feedback'){setSupportDraft({subject:copy[action==='feedback'?'support.feedback':'support.heading'],message:''});setSh('support');return;}if(action==='orders'){setSh('orders');return;}if(action==='dark'){toggleKonsolissDarkMode();return;}if(onUniversalAction)onUniversalAction(action);else if(action==='home')onBack?.();}} />
    <Modal transparent visible={selectorOpen} animationType="fade" statusBarTranslucent onRequestClose={()=>setSelectorOpen(false)}>
      <View style={{flex:1}}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close demo scenario list" onPress={()=>setSelectorOpen(false)} style={[StyleSheet.absoluteFill,{backgroundColor:'rgba(0,0,0,0.3)'}]}/>
        <View style={{position:'absolute',top:Math.max(14,insets.top)+60,left:18,right:18,maxHeight:'78%',backgroundColor:t.bg,borderRadius:16,borderWidth:1,borderColor:t.bd,overflow:'hidden'}}>
          <Tx style={{paddingHorizontal:14,paddingVertical:11,fontSize:13,fontWeight:'800',color:t.ac}}>DEMO ONLY · choose a state</Tx>
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
            {(['A','B','C','D'] as PreviewGroup[]).map(group=><View key={group}>
              <Tx style={{paddingHorizontal:14,paddingTop:8,paddingBottom:4,fontSize:11,fontWeight:'800',color:t.mu}}>{PREVIEW_GROUP_LABELS[group]}</Tx>
              {PREVIEW_SCENARIOS.map((sc,i)=>sc.group===group?<Pressable key={sc.id} accessibilityRole="button" accessibilityLabel={'Show demo state '+sc.code} accessibilityState={{selected:preview.index===i}} onPress={()=>pickDemo(i)} style={{paddingHorizontal:14,paddingVertical:9,backgroundColor:preview.index===i?t.tint:'transparent'}}><Tx style={{fontSize:12.5,fontWeight:preview.index===i?'800':'600',color:preview.index===i?t.ac:t.tx}}>{sc.code+' · '+sc.title}</Tx></Pressable>:null)}
            </View>)}
          </ScrollView>
        </View>
      </View>
    </Modal>
    <Modal transparent visible={loadDetailsOpen} animationType="fade" statusBarTranslucent onRequestClose={()=>setLoadDetailsOpen(false)}>
      <View style={{flex:1}}>
        <Pressable accessibilityRole="button" accessibilityLabel={copy['a11y.closeDetails']} onPress={()=>setLoadDetailsOpen(false)} style={[StyleSheet.absoluteFill,{backgroundColor:'rgba(0,0,0,0.23)'}]}/>
        <View style={{position:'absolute',top:Math.max(14,insets.top)+125,left:18,width:'88%',maxWidth:350,maxHeight:'72%',backgroundColor:t.bg,borderRadius:16,borderWidth:1,borderColor:t.bd,overflow:'hidden',shadowColor:'#000',shadowOpacity:0.16,shadowRadius:12,elevation:12}}>
          <View style={{paddingHorizontal:14,paddingVertical:11,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
            <Tx style={{fontSize:14,fontWeight:'800',color:t.tx}}>{copy['home.load.heading']}</Tx>
            <Pressable accessibilityRole="button" accessibilityLabel={copy['a11y.closeBreakdown']} onPress={()=>setLoadDetailsOpen(false)} hitSlop={10}><Tx style={{color:t.ac,fontSize:19}}>✕</Tx></Pressable>
          </View>
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:12,paddingBottom:12}}>
            <View style={{marginTop:12,padding:13,borderRadius:12,backgroundColor:t.tint}}>
        <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:8,gap:8}}>
          <Tx style={{fontSize:13,fontWeight:'700',color:t.tx}}>{copy['load.breakdown']}</Tx>
        </View>
        {([[copy['load.reserved'],loadPreviewValues.reservedValue],[copy['load.sent'],loadPreviewValues.sentValue],[copy['load.physical'],loadPreviewValues.loadedValue],[copy['load.inboundDetail'],loadPreviewValues.inboundValue],[copy['load.allocated'],loadPreviewValues.committedValue],[copy['load.warehouseTransit'],loadPreviewValues.warehouseOrTransitValue],[copy['load.notSent'],loadPreviewValues.stillToSendValue],[copy['load.notCommitted'],loadPreviewValues.notAllocatedValue]] as const).map(([label,value])=><View key={label} style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:5,gap:12}}><Tx style={{fontSize:11.5,color:t.mu,flex:1}}>{label}</Tx><Tx style={{fontSize:12,fontWeight:'700',color:t.tx}}>{value} CBM</Tx></View>)}
        <Tx style={{fontSize:10.5,color:t.ac,marginTop:8}}>{copy['load.explanation']}</Tx>
      </View>

          </ScrollView>
        </View>
      </View>
    </Modal>
    <Modal transparent visible={containerMenuOpen} animationType="fade" statusBarTranslucent
      onRequestClose={() => setContainerMenuOpen(false)}>
      <View style={{flex:1}}>
        <Pressable accessibilityRole="button" accessibilityLabel={copy['a11y.closeList']}
          onPress={() => setContainerMenuOpen(false)}
          style={[StyleSheet.absoluteFill,{backgroundColor:'rgba(0,0,0,0.23)'}]}/>
        <View style={{position:'absolute',top:Math.max(14,insets.top)+55,right:18,width:'88%',maxWidth:350,
          backgroundColor:t.bg,borderRadius:16,borderWidth:1,borderColor:t.bd,overflow:'hidden',
          shadowColor:'#000',shadowOpacity:0.16,shadowRadius:12,elevation:12}}>
          <View style={{paddingHorizontal:14,paddingVertical:11,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
            <Tx style={{fontSize:14,fontWeight:'800',color:t.tx}}>{copy['a11y.chooseContainer']}</Tx>
            <Pressable accessibilityRole="button" accessibilityLabel={copy['a11y.closeSelector']}
              onPress={() => setContainerMenuOpen(false)} hitSlop={10}><Tx style={{color:t.ac,fontSize:19}}>✕</Tx></Pressable>
          </View>
          <Tx style={{paddingHorizontal:14,paddingVertical:8,fontSize:11,color:t.mu}}>{liveContainers.length?formatCopy(copy,'container.count',{count:liveContainers.length}):displayAssignmentState==='loading'?copy['home.loading']:displayAssignmentState==='unavailable'?copy['status.unavailable']:copy['home.noAccountContainer']}</Tx>
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator
            style={{maxHeight:5*59}} contentContainerStyle={{paddingBottom:5}}>
            {liveContainers.map(item=><View key={item.id} style={{flexDirection:'row',alignItems:'center',
              borderTopWidth:0.5,borderTopColor:t.bd,minHeight:59}}>
              <Pressable accessibilityRole="button" accessibilityLabel={formatCopy(copy,'a11y.selectContainer',{number:item.number})}
                accessibilityState={{selected:selectedContainer?.id===item.id}}
                onPress={() => {if(isDemo)preview.selectView(item.id.split(':')[2]);else setSelectedContainerId(item.id);setContainerMenuOpen(false);setProgressView('customer');}}
                style={{flex:1,paddingHorizontal:14,paddingVertical:10}}>
                <Tx style={{fontSize:13,fontWeight:'700',color:selectedContainer?.id===item.id?t.ac:t.tx}}>{item.number}</Tx>
                <Tx style={{fontSize:11,color:t.mu}}>{copy['status.'+item.status]}</Tx>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={formatCopy(copy,'a11y.explainContainer',{number:item.number})}
                onPress={() => {setSelectedContainerId(item.id);setContainerMenuOpen(false);setLifecycleNotice(item.status);}}
                style={{paddingHorizontal:14,paddingVertical:12}}><Tx style={{color:t.ac,fontSize:17}}>ⓘ</Tx></Pressable>
            </View>)}
            {!isDemo&&snapshotMode&&liveContainers.length>0&&unassignedCbm>0?<Pressable accessibilityRole="button" accessibilityLabel="Show unassigned purchased space" accessibilityState={{selected:liveUnassigned}} onPress={()=>{setSelectedContainerId('live');setContainerMenuOpen(false);setProgressView('customer');}} style={{borderTopWidth:0.5,borderTopColor:t.bd,minHeight:59,paddingHorizontal:14,paddingVertical:10}}><Tx style={{fontSize:13,fontWeight:'700',color:liveUnassigned?t.ac:t.tx}}>Not assigned yet</Tx><Tx style={{fontSize:11,color:t.mu}}>{unassignedCbm.toFixed(3)+' CBM'}</Tx></Pressable>:null}
            {isDemo&&demoScenario?previewViews(demoScenario).filter(v=>v.kind==='unassigned').map(v=><Pressable key={v.id} accessibilityRole="button" accessibilityLabel="Show unassigned purchased space" onPress={()=>{preview.selectView(v.id);setContainerMenuOpen(false);setProgressView('customer');}} style={{borderTopWidth:0.5,borderTopColor:t.bd,minHeight:59,paddingHorizontal:14,paddingVertical:10}}><Tx style={{fontSize:13,fontWeight:'700',color:demoView?.id===v.id?t.ac:t.tx}}>Not assigned yet</Tx><Tx style={{fontSize:11,color:t.mu}}>{(v.unassignedCbm??0).toFixed(3)+' CBM · DEMO'}</Tx></Pressable>):null}
          </ScrollView>
        </View>
      </View>
    </Modal>
    <Modal transparent visible={lifecycleNotice!==null} animationType="fade"
      statusBarTranslucent onRequestClose={() => setLifecycleNotice(null)}>
      <View style={{flex:1,justifyContent:'flex-end'}}>
        <Pressable accessibilityRole="button" accessibilityLabel={copy['a11y.dismissStatus']}
          onPress={() => setLifecycleNotice(null)}
          style={[StyleSheet.absoluteFill,{backgroundColor:'rgba(0,0,0,0.32)'}]}/>
        {lifecycleNotice ? <View accessibilityLabel={copy['a11y.statusExplanation']}
          style={{backgroundColor:t.bg,borderTopLeftRadius:24,borderTopRightRadius:24,paddingTop:22,
            paddingHorizontal:24,paddingBottom:Math.max(30,insets.bottom+18),borderWidth:1,borderColor:t.bd}}>
          <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
            <View style={{flex:1}}>
              <Tx style={{fontSize:19,fontWeight:'800',color:t.ac,lineHeight:25}}>{copy['lifecycle.'+lifecycleNotice+'.title']}</Tx>
              {selectedContainer&&!selectedContainer.demo?<Tx style={{fontSize:12,color:t.mu,marginTop:3}}>{selectedContainer.number}</Tx>:null}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={copy['a11y.closeStatus']}
              hitSlop={12} onPress={() => setLifecycleNotice(null)}
              style={{padding:6}}><Tx style={{fontSize:19,color:t.tx}}>✕</Tx></Pressable>
          </View>
          <Tx style={{fontSize:14,lineHeight:21,color:t.tx,marginTop:12}}>
            {copy['lifecycle.'+lifecycleNotice+'.description']}
          </Tx>
          <Tx style={{fontSize:11,lineHeight:16,color:t.mu,marginTop:13}}>
            {copy['lifecycle.hint']}
          </Tx>
        </View>:null}
      </View>
    </Modal>
  </View></KonsolissContentContext.Provider>;
}

const s = StyleSheet.create({
  row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24}, logo: {lineHeight: 26, fontSize: 21, fontWeight: '800', letterSpacing: -0.5}, pill: {paddingVertical: 6, paddingHorizontal: 11, borderRadius: 20}, num: {fontSize: 52, fontWeight: '800', letterSpacing: -2.5, lineHeight: 52, marginTop: 2}, leg: {fontSize: 11.5, lineHeight: 14, fontWeight: '600', color: '#9a8a60'}, card: {flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 18, padding: 14}, card2: {flex: 1, borderWidth: 1, borderRadius: 18, padding: 14}, redSh: {shadowColor: '#A90E02', shadowOpacity: 0.3, shadowRadius: 9, shadowOffset: {width: 0, height: 8}, elevation: 6}, ct: {fontSize: 14, lineHeight: 18, fontWeight: '700'}, cs: {fontSize: 10.5, lineHeight: 14, marginTop: 1}, body: {fontSize: 11.5, lineHeight: 17, marginTop: 8}, how: {textAlign: 'center', fontSize: 20, lineHeight: 25, fontWeight: '800', marginBottom: 18}, st: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, marginBottom: 10}, bottomWrap: {position: 'absolute', left: 0, right: 0, bottom: 18, paddingHorizontal: 14, zIndex: 100}, bottomNav: {paddingTop: 3, height: 65, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.88)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', elevation: 5, shadowColor: '#000', shadowOpacity: .13, shadowRadius: 5, shadowOffset: {width: 0, height: 2}}, flyzNavItem: {flex: 1, minWidth: 0, height: 46, paddingTop: 4.5, alignItems: 'center', justifyContent: 'flex-end'}, flyzNavIcon: {width: 35, height: 35, alignItems: 'center', justifyContent: 'center'}, flyzNavLabel: {paddingTop: 4, fontSize: 10.5, lineHeight: 13, fontWeight: '500', textAlign: 'center'}, sheet: {borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 20, paddingHorizontal: 24}, h3: {fontSize: 19, lineHeight: 24, fontWeight: '700', marginBottom: 4}, m: {fontSize: 13, lineHeight: 17, marginBottom: 14}, g: {flexDirection: 'row', flexWrap: 'wrap', gap: 10}, inp: {flexGrow: 1, flexBasis: '45%', height: 46, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 0, fontSize: 16}, res: {marginTop: 16, fontSize: 22, lineHeight: 28, fontWeight: '800'}, rs: {fontSize: 12, lineHeight: 15, fontWeight: '600', marginTop: 2}, chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6}, chip: {paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20}, rev: {height: 50, borderRadius: 25, backgroundColor: RED, alignItems: 'center', justifyContent: 'center', marginTop: 16},
});

const attr=(v:string)=>v.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const containerHtml = (dark: boolean, empty = false, reserved = 0, loaded = 0, inbound = 0, demo = false, yourLoaded = 0, freeCbm: number | null = null, copy:KonsolissCopy={}, reservedPreview=false, sent=0, extra:{here?:number;hereInbound?:number;sealed?:boolean;caption?:string}={}) => `<!doctype html><html data-here="${extra.here??0}" data-here-inbound="${extra.hereInbound??0}" data-sealed="${extra.sealed?'true':'false'}" data-caption="${attr(extra.caption??'')}" data-reserved="${reserved}" data-loaded="${loaded}" data-inbound="${inbound}" data-demo="${demo ? 'true' : 'false'}" data-your-loaded="${yourLoaded}" data-free="${freeCbm ?? '-'}" data-preview="${reservedPreview ? 'true' : 'false'}" data-sent="${sent}" data-empty="${empty ? 'true' : 'false'}" data-theme="${dark ? 'dark' : 'light'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>html,body{margin:0;background:transparent;overflow:hidden}canvas{display:block;width:100%;height:300px;touch-action:none}#sheet,#scrim,#calc,#book{display:none}</style></head><body><canvas id="cv"></canvas><div id="scrim"></div><div id="sheet"><div id="sb"></div></div><div id="calc"></div><div id="book"></div><script>${annotationScript(copy)}</script><script>${empty?CONTAINER_JS:REFERENCE_CONTAINER_JS}</script></body></html>`;

const CONTAINER_JS = [
"const $=s=>document.querySelector(s),cv=$('#cv'),cx=cv.getContext('2d'),D=document.documentElement.dataset.theme==='dark',DEMO=document.documentElement.dataset.demo==='true',EMPTY=document.documentElement.dataset.empty==='true',PREVIEW=document.documentElement.dataset.preview==='true',SENT=Number(document.documentElement.dataset.sent)||0,RESERVED=Number(document.documentElement.dataset.reserved)||0,LOADED=Number(document.documentElement.dataset.loaded)||0,INBOUND=Number(document.documentElement.dataset.inbound)||0,YOUR_LOADED=Number(document.documentElement.dataset.yourLoaded)||0,FREE=Number(document.documentElement.dataset.free),HERE=Number(document.documentElement.dataset.here)||0,HERE_INB=Number(document.documentElement.dataset.hereInbound)||0,SEALED=document.documentElement.dataset.sealed==='true',CAP1=document.documentElement.dataset.caption||'',CAP2=document.documentElement.dataset.caption2||'',RM=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;",
"const C=D?{int:'#2b2724',gr:'#FF7A68',spot:'rgba(169,14,2,.32)',shd:'rgba(0,0,0,.6)',tx:'#FFFBD4',fl:'#FFF3A0',halo:'rgba(23,16,15,.92)',fv:.16,ac:'#FF5B4A'}:{int:'#6a6455',gr:'#A90E02',spot:'rgba(241,228,138,.55)',shd:'rgba(43,18,16,.25)',tx:'#2B1210',fl:'#5c4a00',halo:'#FFF3A0',fv:.26,ac:'#A90E02'};",
"const L=12,W=2.35,H=2.7,HX=6,HZ=W/2,ST='#A90E02',LG=[-.45,.85,.5].map((v,_,a)=>v/Math.hypot(...a)),DEF=10;let yaw=0,pitch=DEF,w=0,h=300,raf=0;",
"const rgb=x=>[1,3,5].map(i=>parseInt(x.substr(i,2),16)),sh=(x,k)=>`rgb(${rgb(x).map(v=>Math.max(0,Math.min(255,v*k|0)))})`;",
"const boxF=(x0,x1,y0,y1,z0,z1)=>[[[1,0,0],[[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]]],[[-1,0,0],[[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0]]],[[0,1,0],[[x0,y1,z0],[x0,y1,z1],[x1,y1,z1],[x1,y1,z0]]],[[0,-1,0],[[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]]],[[0,0,1],[[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]]],[[0,0,-1],[[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[x1,y0,z0]]]];",
"const GR=[[0,2,'#CDAA7D'],[2,4,'#E3D3B0'],[4,5,'#B7B1A3'],[5,7,'#D9B8A6'],[7,9,'#D2B48A'],[9,10,'#A90E02']];let sd=11;const rnd=()=>(sd=sd*16807%2147483647)/2147483647;const stickerPick=(i,j,l,q,salt)=>{const n=Math.sin((i+1)*12.9898+(j+1)*78.233+(l+1)*37.719+q*19.19+salt*11.83)*43758.5453;return n-Math.floor(n)};const cargo=[];let user;",
"for(let i=0;i<10;i++){const base=GR.find(g=>i>=g[0]&&i<g[1])[2];for(let j=0;j<2;j++){const za=j?.05:-1.1,zb=j?1.1:-.05,u=i==9&&j==1,nl=i==9?2:(rnd()<.25?2:3),x0=-5.9+i*.9+.02,x1=x0+.86;cargo.push({b:[x0,x1,.15,.27,za+.03,zb-.03],c:'#9a7442',pal:1});for(let l=0;l<nl;l++){const y0=.27+l*.77,y1=y0+.75;for(let q=0;q<2;q++)cargo.push({b:[x0+q*.43+.008,x0+(q+1)*.43-.008,y0,y1,za+.02,zb-.02],c:base,u,top:l==nl-1,lab:stickerPick(i,j,l,q,0)>.18,labelPos:Math.floor(stickerPick(i,j,l,q,1)*6),labelSide:Math.floor(stickerPick(i,j,l,q,2)*4),labelSize:Math.floor(stickerPick(i,j,l,q,4)*5),labelTwo:stickerPick(i,j,l,q,3)<.32,demoCurrent:i===6&&j===1&&l===nl-1&&q===0,k:.95+.05*((l+q+i)%2)});if(u&&l==nl-1)user=[(x0+x1)/2,y1,(za+zb)/2]}}}",
"let demoCount=0,demoBlink=false,demoShowLoad=false;const previewStarted=Date.now();const CE=3.1,wrap=a=>((a+180)%360+360)%360-180;function draw(){raf=0;const th=yaw*Math.PI/180,ph=pitch*Math.PI/180,ct=Math.cos(th),st=Math.sin(th),cp=Math.cos(ph),sp=Math.sin(ph),sc=w/13.6,ox=w/2;let oy=0;const t=Math.max(0,Math.min(1,Math.max(Math.abs(wrap(yaw))/35,(pitch-DEF)/30))),lift=.9*t,lop=1-.86*t;const proj=([x,y,z])=>{y-=H/2;const X=x*ct+z*st,Z=-x*st+z*ct;return[ox+X*sc,oy-(y*cp-Z*sp)*sc,Z*cp+y*sp]};{const ys=[0,H+lift+.1].flatMap(y=>[-HX,HX].flatMap(x=>[-HZ,HZ].map(z=>proj([x,y,z])[1])));oy=h/2+16-(Math.min(...ys)+Math.max(...ys))/2}const nv=n=>{const X=n[0]*ct+n[2]*st,Z=-n[0]*st+n[2]*ct;return[X,n[1]*cp-Z*sp,Z*cp+n[1]*sp]};const lit=n=>{const v=nv(n);return .55+.55*Math.max(0,v[0]*LG[0]+v[1]*LG[1]+v[2]*LG[2])};const it=[];let previewTarget=null;const poly=(l,pts,f,o=1,s=1,sc)=>{const P=pts.map(proj);it.push({l,d:P.reduce((a,p)=>a+p[2],0)/P.length,P,f,o,s,sc})};const line=(l,a,b,c,o,wd,dash)=>{const A=proj(a),B=proj(b);it.push({l,d:(A[2]+B[2])/2,A,B,c,o,wd,dash})};const abox=(l,b,c,o=1,g=0,dec,sc)=>{for(const[n,pts]of boxF(...b)){if(nv(n)[2]<=.001)continue;poly(l,pts,sh(c,g?.82+.5*(lit(n)-.55):lit(n)),o,1,sc);if(dec)dec(l+.001,n)}};const hole=(l,n,b)=>{const[x0,x1,y0,y1,z0,z1]=b,mx=(x0+x1)/2,my=(y0+y1)/2,mz=(z0+z1)/2,r=.06;let q;if(n[0]){const X=n[0]>0?x1:x0;q=[[X,my-r,mz-r],[X,my+r,mz-r],[X,my+r,mz+r],[X,my-r,mz+r]]}else if(n[2]){const Z=n[2]>0?z1:z0;q=[[mx-r,my-r,Z],[mx+r,my-r,Z],[mx+r,my+r,Z],[mx-r,my+r,Z]]}else if(n[1]){const Y=n[1]>0?y1:y0;q=[[mx-r,Y,mz-r],[mx+r,Y,mz-r],[mx+r,Y,mz+r],[mx-r,Y,mz+r]]}if(q)poly(l,q,'#1a0402',.85,0)};const lp=(a,b,u)=>a.map((v,i)=>v+(b[i]-v)*u),grid=(A,B,Cc,Dd,nu,nw,l,col,op)=>{for(let i=1;i<nu;i++)line(l,lp(A,B,i/nu),lp(Dd,Cc,i/nu),col,op,.6);for(let j=1;j<nw;j++)line(l,lp(A,Dd,j/nw),lp(B,Cc,j/nw),col,op,.6)};abox(.5,[-HX,HX,0,.15,-HZ,HZ],'#7a5636');for(let k=-3;k<4;k++){const z=k*.3;if(Math.abs(z)<HZ)line(.6,[-HX,.15,z],[HX,.15,z],'#4d3420',.35,.6)}const wall=(on,q,n)=>{const near=nv(on)[2]>.02;for(let i=0;i<n;i++){let p=q(i);if(near){p=p.map(a=>[a[0],Math.min(a[1],.28),a[2]]);poly(3,p,sh(ST,lit(on)*(i%2?.75:1)))}else poly(0,p,sh(C.int,lit(on.map(c=>-c))*(i%2?.78:1)))}};for(const[zs,n]of[[HZ,[0,0,1]],[-HZ,[0,0,-1]]])wall(n,i=>[[-HX+i*.2,0,zs],[-HX+i*.2+.2,0,zs],[-HX+i*.2,H,zs],[-HX+i*.2,H,zs]],60);for(const[xs,n]of[[HX,[1,0,0]],[-HX,[-1,0,0]]])wall(n,i=>{const z=-HZ+i*.2;return[[xs,0,z],[xs,0,z+.2],[xs,H,z+.2],[xs,H,z]]},12);const labelLocations=[[.19,.81],[.81,.81],[.5,.16],[.5,.5],[.19,.49],[.81,.26]];const labelSizes=[[.10,.09],[.17,.14],[.25,.21],[.34,.27],[.43,.34]];const sticker=(layer,face,b,info)=>{const side=face[2]>0?0:face[2]<0?1:face[0]>0?2:face[0]<0?3:-1;if(side<0||side!==info.side&&!(info.second&&side===(info.side+1)%4))return;const[x0,x1,y0,y1,z0,z1]=b,[u,v]=labelLocations[info.pos],[width,height]=labelSizes[info.size??0];const u0=Math.max(.025,Math.min(.975-width,u-width/2)),v0=Math.max(.025,Math.min(.975-height,v-height/2));const low=y0+(y1-y0)*v0,high=y0+(y1-y0)*(v0+height);if(face[2]){const xx=x0+(x1-x0)*(face[2]>0?u0:1-u0-width),xx2=xx+(x1-x0)*width,zz=face[2]>0?z1:z0;poly(layer,[[xx,low,zz],[xx2,low,zz],[xx2,high,zz],[xx,high,zz]],'#FFF8E8',.98,0)}else{const zz=z0+(z1-z0)*(face[0]>0?u0:1-u0-width),zz2=zz+(z1-z0)*width,xx=face[0]>0?x1:x0;poly(layer,[[xx,low,zz],[xx,low,zz2],[xx,high,zz2],[xx,high,zz]],'#FFF8E8',.98,0)}};const tinyTotal=!EMPTY&&LOADED>0&&LOADED<=0.1,fillRatio=Math.max(0,Math.min(1,LOADED/68)),innerX0=-HX+.12,innerX1=HX-.12,loadedEnd=innerX0+(innerX1-innerX0)*fillRatio,visualGap=Math.min(.045,(innerX1-innerX0)*Math.min(fillRatio,1-fillRatio)*.18),visible=EMPTY?demoCount:tinyTotal?0:cargo.length,boxCount=EMPTY?cargo.slice(0,visible).filter(c=>!c.pal).length:cargo.filter(c=>!c.pal&&innerX0+(c.b[0]+5.9)/9*(innerX1-innerX0)<loadedEnd-visualGap).length,fullCount=EMPTY?0:cargo.filter(c=>!c.pal&&innerX0+(c.b[1]+5.9)/9*(innerX1-innerX0)<=loadedEnd-visualGap+1e-9).length,pool=fullCount>0?fullCount:boxCount,ownCount=!EMPTY&&LOADED>0&&YOUR_LOADED>0.1?Math.min(pool,Math.round(boxCount*YOUR_LOADED/LOADED)|| (YOUR_LOADED>0?1:0)):0;let boxIndex=0,fullIndex=0,customerCartonAnchor=null,redCartonAnchor=null;for(let ci=0;ci<cargo.length;ci++){if(ci>=visible)continue;let c=cargo[ci];const highlight=EMPTY&&demoBlink&&c.demoCurrent;if(!EMPTY){const b=c.b;const x0=innerX0+(b[0]+5.9)/9*(innerX1-innerX0),x1=innerX0+(b[1]+5.9)/9*(innerX1-innerX0);if(x0>=loadedEnd-visualGap)continue;const scaleY=(y)=>.15+(y-.15)*(H-.32)/2.43;const scaleZ=(z)=>z*(HZ-.17)/1.1;const xlo=Math.max(innerX0,x0),xhi=Math.min(x1,loadedEnd-visualGap);if(xhi<=xlo)continue;c={...c,b:[xlo,xhi,scaleY(b[2]),Math.min(H-.15,scaleY(b[3])),scaleZ(b[4]),scaleZ(b[5])]};}if(c.pal){abox(1,c.b,c.c,1,1);continue}const clippedCarton=!EMPTY&&c.b[1]<innerX0+(cargo[ci].b[1]+5.9)/9*(innerX1-innerX0)-1e-9,isYours=!EMPTY&&(fullCount>0?(!clippedCarton&&fullIndex>=fullCount-ownCount):boxIndex>=boxCount-ownCount);boxIndex++;if(!clippedCarton)fullIndex++;if(isYours)customerCartonAnchor=[(c.b[0]+c.b[1])/2,c.b[3],(c.b[4]+c.b[5])/2];if(isYours||c.c==='#A90E02')redCartonAnchor=[(c.b[0]+c.b[1])/2,c.b[3],(c.b[4]+c.b[5])/2];abox(1,c.b,highlight?'#FFE36B':isYours?'#A90E02':c.k?sh(c.c,c.k).replace(/rgb\\((.*)\\)/,(m,v)=>'#'+v.split(',').map(a=>(+a).toString(16).padStart(2,'0')).join('')):c.c,1,1,(l,n)=>{const[x0,x1,y0,y1,z0,z1]=c.b,xm=(x0+x1)/2,zm=(z0+z1)/2,tp=c.u?'#FFE9A8':'#EBDDBF',lb=c.u?'#FFFBD4':'#F7F3E6';if(n[1]==1){if(c.top)poly(l,[[x0,y1,zm-.035],[x0,y1,zm+.035],[x1,y1,zm+.035],[x1,y1,zm-.035]],tp,.9,0)}else if(c.lab)sticker(l,n,c.b,{pos:c.labelPos,side:c.labelSide,second:c.labelTwo,size:c.labelSize})})}let miniatureMarker=null;if(!EMPTY&&LOADED>0){const miniature=(volume,color,base)=>{if(volume<=0)return null;const edge=Math.cbrt(volume*(L*W*H)/68),sx=Math.min(.43,edge),sy=Math.min(.75,edge),sz=Math.min(.55,edge);const x=Math.max(-HX+.1,Math.min(HX-.1-sx,base[0])),z=Math.max(-HZ+.1,Math.min(HZ-.1-sz,base[2])),y=Math.max(.16,Math.min(H-.1-sy,base[1]));const b=[x,x+sx,y,y+sy,z,z+sz];abox(1.1,b,color,1,1,(l,n)=>sticker(l,n,b,{pos:1,side:0,second:true,size:1}));if(color==='#A90E02')miniatureMarker=[(b[0]+b[1])/2,b[3],(b[4]+b[5])/2];return b};const at=customerCartonAnchor||[Math.max(innerX0+.15,Math.min(loadedEnd-.3,innerX0+(loadedEnd-innerX0)*.65)),.35,0];if(tinyTotal){const others=Math.max(0,LOADED-YOUR_LOADED);if(others>0)miniature(others,'#CDAA7D',at);if(YOUR_LOADED>0)miniature(YOUR_LOADED,'#A90E02',[at[0]+.38,at[1],at[2]])}else if(YOUR_LOADED>0&&YOUR_LOADED<=.1)miniature(YOUR_LOADED,'#A90E02',at)}const freeRatio=!EMPTY&&!SEALED&&Number.isFinite(FREE)?Math.max(0,Math.min(1,FREE/68)):0,freeX0=innerX1-(innerX1-innerX0)*freeRatio;if(freeRatio>0){const fz=[Math.min(innerX1,freeX0+visualGap),innerX1,.15,H-.15,-HZ+.12,HZ-.12];abox(.85,fz,'#FFF1A0',C.fv);const cs=[];for(const x of[fz[0],fz[1]])for(const y of[fz[2],fz[3]])for(const z of[fz[4],fz[5]])cs.push([x,y,z]);for(const a of cs)for(const b of cs)if(a<b&&a.filter((v,i)=>v!=b[i]).length==1)line(.95,a,b,C.ac,.55,.9,[3,2.5]);}let allocAnchor=null;if(!EMPTY&&!PREVIEW&&!SEALED&&HERE>YOUR_LOADED+.0005){const rest=HERE-YOUR_LOADED,vis=rest/68*((innerX1-innerX0)*(H-.3)*(2*(HZ-.12))),ed=Math.cbrt(vis),oh=Math.min(ed,H-.35),od=Math.min(ed,1.05),olen=Math.min(innerX1-innerX0,vis/(oh*od)),ox0=Math.max(innerX0,Math.min(innerX1-olen,loadedEnd+visualGap+.03)),inbLen=olen*Math.max(0,Math.min(1,HERE_INB/rest)),oz0=-od/2,ob=[ox0,ox0+olen,.15,.15+oh,oz0,oz0+od];if(inbLen>.001)abox(1.18,[ox0,ox0+inbLen,ob[2],ob[3],oz0,oz0+od],'#A90E02',.38,0);abox(1.15,ob,'#A90E02',.08,0);const oc=[];for(const x of[ob[0],ob[1]])for(const y of[ob[2],ob[3]])for(const z of[ob[4],ob[5]])oc.push([x,y,z]);for(const a of oc)for(const b of oc)if(a<b&&a.filter((v,i)=>v!=b[i]).length==1)line(1.3,a,b,C.ac,.85,1.2,[4,3]);allocAnchor=[(ob[0]+ob[1])/2,ob[3],(ob[4]+ob[5])/2]}const tp=a=>t>.02&&pitch>=0&&proj(a)[2]>proj([0,H/2,0])[2]+.05;const bm=[];for(const zs of[-HZ,HZ])bm.push([-HX,HX,H-.14,H,zs-.07,zs+.07],[-HX,HX,0,.15,zs-.07,zs+.07]);for(const xs of[-HX,HX]){bm.push([xs-.07,xs+.07,H-.14,H,-HZ,HZ],[xs-.07,xs+.07,0,.15,-HZ,HZ]);for(const zs of[-HZ,HZ])bm.push([xs-.07,xs+.07,0,H,zs-.07,zs+.07])}for(const b of bm){const c=[(b[0]+b[1])/2,H/2,(b[4]+b[5])/2],far=proj(c)[2]<proj([0,H/2,0])[2]-.05;if(b[2]>H-.15&&tp(c))continue;abox(far?.7:1.5,b,'#B31204',1,0,null,b[1]<-5.9?'rgba(70,6,2,.55)':undefined)}for(const xs of[-HX,HX])for(const zs of[-HZ,HZ])for(const ys of[.08,H-.08]){if(ys>1&&tp([xs,H/2,zs]))continue;{const cb=[xs-.17,xs+.17,ys-.11,ys+.11,zs-.17,zs+.17],far=proj([xs,H/2,zs])[2]<proj([0,H/2,0])[2]-.05,layer=far?.65:1.6;if(xs<0)abox(layer,cb,'#6a0a02',1,0,(l,n)=>hole(l,n,cb),'rgba(30,3,1,.7)');else abox(layer,cb,'#3b0b06')}}if(nv([-1,0,0])[2]>.02){{const G=[[-HX,.28,-HZ],[-HX,.28,HZ],[-HX,H,HZ],[-HX,H,-HZ]];poly(3,G,ST,.07,0);grid(G[0],G[1],G[2],G[3],3,5,3,C.gr,.2)}poly(4,[[-HX-.01,.28,-HZ],[-HX-.01,.28,HZ],[-HX-.01,H-.14,HZ],[-HX-.01,H-.14,-HZ]],sh(ST,lit([-1,0,0])),.32,0);for(const z of[-.9,-.45,.45,.9]){abox(4.2,[-HX-.09,-HX,.15,H-.15,z-.035,z+.035],'#E6DFCB',1,0,null,'rgba(60,50,35,.5)');for(const y of[.4,1.35,2.3])abox(4.3,[-HX-.12,-HX,y,y+.13,z-.075,z+.075],'#C9C1AA',1,0,null,'rgba(60,50,35,.5)')}line(4.1,[-HX-.01,.28,0],[-HX-.01,H-.14,0],'#3b0b06',.6,1);[.9,1.8].forEach(y=>line(4.1,[-HX-.01,y,-HZ],[-HX-.01,y,HZ],'#3b0b06',.35,.8))}for(const sx of[-HX,HX])for(const sz of[-HZ,HZ])if(lift>.02)line(3.9,[sx,H,sz],[sx,H+lift,sz],ST,.5*lop+.15,.9,[2,2.5]);abox(4,[-HX,HX,H+lift,H+lift+.1,-HZ,HZ],ST,lop);if(nv([0,1,0])[2]>0)for(let i=0;i<60;i+=2)poly(4.1,[[-HX+i*.2,H+lift+.1,-HZ],[-HX+i*.2+.2,H+lift+.1,-HZ],[-HX+i*.2+.2,H+lift+.1,HZ],[-HX+i*.2,H+lift+.1,HZ]],'#000000',.1*lop,0);cx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);cx.clearRect(0,0,w,h);const o0=proj([0,0,0]);cx.save();cx.translate(o0[0],o0[1]+4);cx.scale(1,.34);const g=cx.createRadialGradient(0,0,0,0,0,w*.52);g.addColorStop(0,C.spot);g.addColorStop(1,'rgba(0,0,0,0)');cx.fillStyle=g;cx.beginPath();cx.arc(0,0,w*.52,0,7);cx.fill();cx.restore();cx.save();cx.fillStyle=C.shd;cx.shadowColor=C.shd;cx.shadowBlur=14;cx.beginPath();[[-HX-.3,-HZ-.3],[HX+.3,-HZ-.3],[HX+.3,HZ+.3],[-HX-.3,HZ+.3]].forEach((p,i)=>{const q=proj([p[0],0,p[1]]);i?cx.lineTo(q[0],q[1]+5):cx.moveTo(q[0],q[1]+5)});cx.fill();cx.restore();if(PREVIEW&&RESERVED>0&&LOADED===0&&RESERVED<=68){const il=L-.24,id=W-.24,ih=H-.32,vol=RESERVED/68*il*id*ih,side=Math.cbrt(vol),dep=Math.min(id,side),hei=Math.min(ih,side),len=Math.min(il,vol/(dep*hei)),b=[-HX+.12,-HX+.12+len,.17,.17+hei,-HZ+.12,-HZ+.12+dep];previewTarget=[(b[0]+b[1])/2,b[3],(b[4]+b[5])/2];for(const[n,pts]of boxF(...b)){if(nv(n)[2]>.001)poly(1.05,pts,'#FFE36B',.18,0)}for(let a=0;a<8;a++)for(let k=0;k<3;k++){const b2=a^(1<<k);if(a<b2){const pt=m=>[m&1?b[1]:b[0],m&2?b[3]:b[2],m&4?b[5]:b[4]];line(1.16,pt(a),pt(b2),C.ac,.68,1.1,[3,2.5])}}}it.sort((a,b)=>a.l-b.l||a.d-b.d);for(const e of it){cx.globalAlpha=e.o;if(e.A){cx.strokeStyle=e.c;cx.lineWidth=e.wd;cx.setLineDash(e.dash||[]);cx.beginPath();cx.moveTo(e.A[0],e.A[1]);cx.lineTo(e.B[0],e.B[1]);cx.stroke();cx.setLineDash([])}else{cx.fillStyle=e.f;cx.beginPath();e.P.forEach((p,i)=>i?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]));cx.closePath();cx.fill();if(e.s&&e.o>=1){cx.strokeStyle=e.sc||e.f;cx.lineWidth=e.sc?.7:.5;cx.stroke()}}}cx.lineJoin='round';cx.globalAlpha=1;cx.font='700 11px -apple-system,Arial,sans-serif';cx.textAlign='center';if(t<.3&&pitch<35){const sx=proj([-HX-.5,0,0])[0]<proj([HX+.5,0,0])[0]?-HX-.5:HX+.5,zn=nv([0,0,1])[2]>0?HZ:-HZ,a=proj([sx,.02,zn]),b=proj([sx,H-.02,zn]);cx.globalAlpha=1-t/.3;cx.strokeStyle=C.tx;cx.lineWidth=1.1;cx.beginPath();cx.moveTo(a[0],a[1]);cx.lineTo(b[0],b[1]);cx.moveTo(a[0]-3,a[1]);cx.lineTo(a[0]+3,a[1]);cx.moveTo(b[0]-3,b[1]);cx.lineTo(b[0]+3,b[1]);cx.stroke();cx.fillStyle=C.tx;cx.font='700 10px -apple-system,Arial,sans-serif';cx.textAlign=sx<0?'left':'right';const e=proj([sx<0?-HX:HX,H,zn]);cx.fillText('Ceiling 2.69 m',e[0],proj([sx<0?-HX:HX,H+lift+.1,zn])[1]-7);cx.globalAlpha=1-t/.3;cx.textAlign='center';cx.font='700 11px -apple-system,Arial,sans-serif'}if(EMPTY&&demoShowLoad){const carton=cargo.find(c=>c.demoCurrent);if(carton){const b=carton.b,p=proj([(b[0]+b[1])/2,b[3],(b[4]+b[5])/2]),top=Math.min(...[-HX,HX].flatMap(x=>[0,H+1].flatMap(y=>[-HZ,HZ].map(z=>proj([x,y,z])[1])))),labelY=Math.max(17,top-12),labelX=Math.max(82,Math.min(w-82,p[0]));cx.globalAlpha=1;cx.strokeStyle=C.ac;cx.lineWidth=1.5;cx.beginPath();cx.moveTo(p[0],p[1]);cx.lineTo(labelX,labelY+5);cx.stroke();cx.fillStyle=C.ac;cx.beginPath();cx.arc(p[0],p[1],3,0,Math.PI*2);cx.fill();cx.font='700 12px -apple-system,Arial,sans-serif';cx.textAlign='center';cx.fillStyle=C.tx;cx.fillText('My current loaded space',labelX,labelY);}}if(!EMPTY&&RESERVED>0&&YOUR_LOADED>0){const top=Math.min(...[-HX,HX].flatMap(x=>[0,H+1].flatMap(y=>[-HZ,HZ].map(z=>proj([x,y,z])[1])))),u=proj(miniatureMarker||customerCartonAnchor||redCartonAnchor||user||[innerX0+.15,.35,0]),ly=Math.max(14,top-12);cx.globalAlpha=1;cx.strokeStyle=C.tx;cx.lineWidth=1.1;cx.beginPath();cx.moveTo(u[0],u[1]);cx.lineTo(u[0],ly+4);cx.stroke();cx.fillStyle=C.tx;cx.beginPath();cx.arc(u[0],u[1],2.3,0,7);cx.fill();cx.fillText('My current loaded space '+YOUR_LOADED.toFixed(3)+' CBM',Math.max(108,Math.min(w-108,u[0])),ly);}else if(allocAnchor){const top=Math.min(...[-HX,HX].flatMap(x=>[0,H+1].flatMap(y=>[-HZ,HZ].map(z=>proj([x,y,z])[1])))),u=proj(allocAnchor),ly=Math.max(14,top-12);cx.globalAlpha=1;cx.strokeStyle=C.tx;cx.lineWidth=1.1;cx.beginPath();cx.moveTo(u[0],u[1]);cx.lineTo(u[0],ly+4);cx.stroke();cx.fillStyle=C.tx;cx.beginPath();cx.arc(u[0],u[1],2.3,0,7);cx.fill();cx.fillText(HERE.toFixed(3)+' CBM reserved here · not loaded yet',Math.max(125,Math.min(w-125,u[0])),ly);}if(Number.isFinite(FREE)&&!SEALED&&FREE>=0&&FREE<=68){const f=proj([HX-(FREE/68)*L/2,1.3,0]);cx.globalAlpha=1;cx.textAlign='center';cx.font='700 10px -apple-system,Arial,sans-serif';cx.lineWidth=3;cx.strokeStyle=C.halo;cx.strokeText(FREE.toFixed(1)+' CBM free',f[0],f[1]);cx.fillStyle=C.fl;cx.fillText(FREE.toFixed(1)+' CBM free',f[0],f[1]);}if(PREVIEW&&RESERVED>0){const target=proj(previewTarget||[Math.min(HX-.18,-HX+.4+(L-.8)*Math.min(1,LOADED/68)),.45,-HZ+.6]),cycle=RM?3600:(Date.now()-previewStarted)%7000,part=Math.min(1,cycle/2850),ease=1-Math.pow(1-part,3),fromX=Math.max(22,w*.12),x=fromX+(target[0]-fromX)*ease,y=-12+(target[1]+12)*ease-Math.sin(Math.PI*part)*24,fade=cycle<2900?1:Math.max(0,1-(cycle-2900)/450);if(fade>0){cx.save();cx.lineWidth=1;cx.globalAlpha=(SENT===0?.46:.86)*fade;if(SENT===0){cx.strokeStyle=C.ac;cx.setLineDash([3,2]);cx.strokeRect(x-8,y-6,16,14);cx.setLineDash([])}else{cx.strokeStyle='#805633';cx.fillStyle='#CDAA7D';cx.fillRect(x-8,y-6,16,14);cx.strokeRect(x-8,y-6,16,14);cx.fillStyle='#E3D3B0';cx.beginPath();cx.moveTo(x-8,y-6);cx.lineTo(x-3,y-11);cx.lineTo(x+13,y-11);cx.lineTo(x+8,y-6);cx.closePath();cx.fill();cx.stroke();cx.fillStyle='#B19067';cx.beginPath();cx.moveTo(x+8,y-6);cx.lineTo(x+13,y-11);cx.lineTo(x+13,y+3);cx.lineTo(x+8,y+8);cx.closePath();cx.fill();cx.stroke()}cx.restore()}cx.save();cx.globalAlpha=1;cx.textAlign='center';cx.fillStyle=C.tx;cx.font='700 11px -apple-system,Arial,sans-serif';cx.fillText(CAP1||('Space preview: '+RESERVED.toFixed(3)+' CBM'),w/2,h-26);cx.font='600 10px -apple-system,Arial,sans-serif';cx.fillText(CAP2||(SENT===0?'Goods sent 0 CBM':'Loaded 0 CBM'),w/2,h-12);cx.globalAlpha=.7;cx.textAlign='right';cx.fillText('Illustration · not a real container',w-12,12);cx.restore()}else if(!EMPTY&&YOUR_LOADED>0){const anchor=miniatureMarker||customerCartonAnchor||redCartonAnchor;if(anchor){const q=proj(anchor),pulse=RM?.5:(Math.sin((Date.now()-previewStarted)/720)+1)/2;cx.save();cx.globalAlpha=.16+.22*pulse;cx.strokeStyle=C.ac;cx.lineWidth=1.3;cx.beginPath();cx.arc(q[0],q[1],5+4*pulse,0,Math.PI*2);cx.stroke();cx.restore()}}}const rq=()=>{if(!raf)raf=requestAnimationFrame(draw)};if(EMPTY){const started=Date.now();const tick=()=>{const cycle=(Date.now()-started)%13600;demoCount=cycle<4800?Math.floor(Math.min(1,cycle/4800)*cargo.length):cycle<8600?cargo.length:0;demoShowLoad=cycle>=4800&&cycle<8600;demoBlink=demoShowLoad&&Math.floor((cycle-4800)/500)%2===0;rq()};tick();const timer=setInterval(tick,100);addEventListener('pagehide',()=>clearInterval(timer),{once:true});}if(!RM&&(PREVIEW||(!EMPTY&&YOUR_LOADED>0))){const timer=setInterval(rq,80);addEventListener('pagehide',()=>clearInterval(timer),{once:true});}function fit(){const r=cv.getBoundingClientRect();w=r.width;h=r.height;cv.width=w*devicePixelRatio;cv.height=h*devicePixelRatio;rq()}addEventListener('resize',fit);fit();let px,py,dn=0;cv.addEventListener('pointerdown',e=>{dn=1;px=e.clientX;py=e.clientY;cv.setPointerCapture(e.pointerId)});cv.addEventListener('pointermove',e=>{if(!dn)return;yaw=wrap(yaw+(e.clientX-px)*.5);pitch=Math.max(4,Math.min(90,pitch+(e.clientY-py)*.35));px=e.clientX;py=e.clientY;rq()});['pointerup','pointercancel'].forEach(k=>cv.addEventListener(k,()=>dn=0));",
].join("\n");
const REFERENCE_CONTAINER_JS = [
"const $=s=>document.querySelector(s),cv=$('#cv'),cx=cv.getContext('2d'),D=document.documentElement.dataset.theme==='dark';",
"const C=D?{int:'#2b2724',gr:'#FF7A68',spot:'rgba(169,14,2,.32)',shd:'rgba(0,0,0,.6)',tx:'#FFFBD4',fl:'#FFF3A0',halo:'rgba(23,16,15,.92)',fv:.16,ac:'#FF5B4A'}:{int:'#6a6455',gr:'#A90E02',spot:'rgba(241,228,138,.55)',shd:'rgba(43,18,16,.25)',tx:'#2B1210',fl:'#5c4a00',halo:'#FFF3A0',fv:.26,ac:'#A90E02'};",
"const data=document.documentElement.dataset,RM=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches,started=Date.now(),num=k=>Number(data[k])||0,free=Number(data.free),actual=Number.isFinite(free),loaded=Math.max(0,Math.min(68,num('loaded'))),ld=actual?Math.max(0,Math.min(loaded,num('yourLoaded'))):0,sealed=data.sealed==='true',here=actual?(sealed?ld:Math.max(ld,Math.min(num('here'),ld+Math.max(0,68-loaded)))):(num('reserved')<=68?Math.max(0,num('reserved')):0),inb=actual&&!sealed?Math.max(0,Math.min(here-ld,num('hereInbound'))):0;",
"const flightCycleMs=4600,flightPhase=()=>((Date.now()-started)%flightCycleMs)/flightCycleMs;",
"const keepReservationParcel=here>0&&!sealed&&ld+inb===0;",
"const reservationLanded=(phase=flightPhase())=>keepReservationParcel&&(RM||phase>=.42);",
"const V={k:actual?'c':'u',oth:Math.max(0,loaded-ld),here,ld,inb,sealed,nc:10,fr:actual?Math.max(0,free):0,x0:2.2,z0:.1,fx:0,lab:''};let OW=null;const FR=()=>V.fr.toFixed(1);const L=12,W=2.35,H=2.7,HX=6,HZ=W/2,ST='#A90E02',LG=[-.45,.85,.5].map((v,_,a)=>v/Math.hypot(...a)),DEF=10;",
"let yaw=0,pitch=DEF,w=0,h=300,raf=0;",
"const rgb=x=>[1,3,5].map(i=>parseInt(x.substr(i,2),16)),sh=(x,k)=>`rgb(${rgb(x).map(v=>Math.max(0,Math.min(255,v*k|0)))})`;",
"const boxF=(x0,x1,y0,y1,z0,z1)=>[[[1,0,0],[[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]]],[[-1,0,0],[[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0]]],[[0,1,0],[[x0,y1,z0],[x0,y1,z1],[x1,y1,z1],[x1,y1,z0]]],[[0,-1,0],[[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]]],[[0,0,1],[[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]]],[[0,0,-1],[[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[x1,y0,z0]]]];",
"const GR=[[0,2,'#CDAA7D'],[2,4,'#E3D3B0'],[4,5,'#B7B1A3'],[5,7,'#D9B8A6'],[7,9,'#D2B48A'],[9,10,'#D2B48A']];let sd=11;const rnd=()=>(sd=sd*16807%2147483647)/2147483647;",
"const cargo=[];let user;",
"for(let i=0;i<13;i++){const base=(GR.find(g=>i>=g[0]&&i<g[1])||GR[i%5])[2];for(let j=0;j<2;j++){const za=j?.05:-1.1,zb=j?1.1:-.05,u=0,nl=i==9?2:(rnd()<.25?2:3),x0=-5.9+i*.9+.02,x1=x0+.86;",
"cargo.push({b:[x0,x1,.15,.27,za+.03,zb-.03],c:'#9a7442',pal:1,col:i,j});",
"for(let l=0;l<nl;l++){const y0=.27+l*.77,y1=y0+.75;for(let q=0;q<2;q++)cargo.push({b:[x0+q*.43+.008,x0+(q+1)*.43-.008,y0,y1,za+.02,zb-.02],c:base,u,col:i,j,top:l==nl-1,lab:q==0&&l!=1,k:.95+.05*((l+q+i)%2)});if(u&&l==nl-1)user=[(x0+x1)/2,y1,(za+zb)/2]}}}",
"const ix0=-HX+.12,ix1=HX-.12,il=ix1-ix0,ih=H-.3,iz=HZ-.12,id=iz*2,mv=il*ih*id;",
"const g0=geo(V.here),span=ln(g0,V.here),physicalSpan=ln(g0,V.ld),nominalEnd=ix0+il*loaded/68,clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),gap=Math.min(.045,il*Math.min(loaded/68,1-loaded/68)*.18);",
"V.x0=actual?clamp(nominalEnd-physicalSpan,ix0,ix1-span):clamp(2.2,ix0,ix1-span);V.z0=actual?iz-g0.sz:clamp(.1,-iz,iz-g0.sz);V.fx=Math.max(nominalEnd,V.x0+physicalSpan)+gap;",
"V.lab=V.k==='u'?(data.caption||('Space preview: '+num('reserved').toFixed(3)+' CBM')):data.caption||(V.ld>0?'My current loaded space '+V.ld.toFixed(3)+' CBM':V.here.toFixed(3)+' CBM reserved here · not loaded yet');",
"const own=V.here>0?[V.x0,V.x0+span,.15,.15+g0.sy,V.z0,V.z0+g0.sz]:null;",
"function subtract(b,o){if(!o)return[b];const i=[Math.max(b[0],o[0]),Math.min(b[1],o[1]),Math.max(b[2],o[2]),Math.min(b[3],o[3]),Math.max(b[4],o[4]),Math.min(b[5],o[5])];if(i[1]<=i[0]||i[3]<=i[2]||i[5]<=i[4])return[b];return[[b[0],i[0],b[2],b[3],b[4],b[5]],[i[1],b[1],b[2],b[3],b[4],b[5]],[i[0],i[1],b[2],i[2],b[4],b[5]],[i[0],i[1],i[3],b[3],b[4],b[5]],[i[0],i[1],i[2],i[3],b[4],i[4]],[i[0],i[1],i[2],i[3],i[5],b[5]]].filter(q=>q[1]-q[0]>.012&&q[3]-q[2]>.012&&q[5]-q[4]>.012)}",
"const CE=3.1,wrap=a=>((a+180)%360+360)%360-180;",
"function draw(){raf=0;const phase=flightPhase(),th=yaw*Math.PI/180,ph=pitch*Math.PI/180,ct=Math.cos(th),st=Math.sin(th),cp=Math.cos(ph),sp=Math.sin(ph),sc=w/13.6,ox=w/2;let oy=0;",
"const t=Math.max(0,Math.min(1,Math.max(Math.abs(wrap(yaw))/35,(pitch-DEF)/30))),lift=.9*t,lop=1-.86*t;",
"const proj=([x,y,z])=>{y-=H/2;const X=x*ct+z*st,Z=-x*st+z*ct;return[ox+X*sc,oy-(y*cp-Z*sp)*sc,Z*cp+y*sp]};",
"{const ys=[0,H+lift+.1].flatMap(y=>[-HX,HX].flatMap(x=>[-HZ,HZ].map(z=>proj([x,y,z])[1])));oy=h/2+16-(Math.min(...ys)+Math.max(...ys))/2}",
"const nv=n=>{const X=n[0]*ct+n[2]*st,Z=-n[0]*st+n[2]*ct;return[X,n[1]*cp-Z*sp,Z*cp+n[1]*sp]};",
"const lit=n=>{const v=nv(n);return .55+.55*Math.max(0,v[0]*LG[0]+v[1]*LG[1]+v[2]*LG[2])};",
"const it=[];const poly=(l,pts,f,o=1,s=1,sc)=>{const P=pts.map(proj);it.push({l,d:P.reduce((a,p)=>a+p[2],0)/P.length,P,f,o,s,sc})};",
"const line=(l,a,b,c,o,wd,dash)=>{const A=proj(a),B=proj(b);it.push({l,d:(A[2]+B[2])/2,A,B,c,o,wd,dash})};",
"const abox=(l,b,c,o=1,g=0,dec,sc)=>{for(const[n,pts]of boxF(...b)){if(nv(n)[2]<=.001)continue;poly(l,pts,sh(c,g?.82+.5*(lit(n)-.55):lit(n)),o,1,sc);if(dec)dec(l+.001,n)}};",
"const hole=(l,n,b)=>{const[x0,x1,y0,y1,z0,z1]=b,mx=(x0+x1)/2,my=(y0+y1)/2,mz=(z0+z1)/2,r=.06;let q;if(n[0]){const X=n[0]>0?x1:x0;q=[[X,my-r,mz-r],[X,my+r,mz-r],[X,my+r,mz+r],[X,my-r,mz+r]]}else if(n[2]){const Z=n[2]>0?z1:z0;q=[[mx-r,my-r,Z],[mx+r,my-r,Z],[mx+r,my+r,Z],[mx-r,my+r,Z]]}else if(n[1]){const Y=n[1]>0?y1:y0;q=[[mx-r,Y,mz-r],[mx+r,Y,mz-r],[mx+r,Y,mz+r],[mx-r,Y,mz+r]]}if(q)poly(l,q,'#1a0402',.85,0)};",
"const lp=(a,b,u)=>a.map((v,i)=>v+(b[i]-v)*u),grid=(A,B,Cc,Dd,nu,nw,l,col,op)=>{for(let i=1;i<nu;i++)line(l,lp(A,B,i/nu),lp(Dd,Cc,i/nu),col,op,.6);for(let j=1;j<nw;j++)line(l,lp(A,Dd,j/nw),lp(B,Cc,j/nw),col,op,.6)};",
"abox(.5,[-HX,HX,0,.15,-HZ,HZ],'#7a5636');for(let k=-3;k<4;k++){const z=k*.3;if(Math.abs(z)<HZ)line(.6,[-HX,.15,z],[HX,.15,z],'#4d3420',.35,.6)}",
"const wall=(on,q,n)=>{const near=nv(on)[2]>.02;for(let i=0;i<n;i++){let p=q(i);if(near){p=p.map(a=>[a[0],Math.min(a[1],.28),a[2]]);poly(3,p,sh(ST,lit(on)*(i%2?.75:1)))}else poly(0,p,sh(C.int,lit(on.map(c=>-c))*(i%2?.78:1)))}};",
"for(const[zs,n]of[[HZ,[0,0,1]],[-HZ,[0,0,-1]]])wall(n,i=>[[-HX+i*.2,0,zs],[-HX+i*.2+.2,0,zs],[-HX+i*.2+.2,H,zs],[-HX+i*.2,H,zs]],60);",
"for(const[xs,n]of[[HX,[1,0,0]],[-HX,[-1,0,0]]])wall(n,i=>{const z=-HZ+i*.2;return[[xs,0,z],[xs,0,z+.2],[xs,H,z+.2],[xs,H,z]]},12);",
"for(const raw of cargo){if(!actual&&(raw.col>=V.nc||raw.col===9&&raw.j===1))continue;let b=raw.b;if(actual){if(V.oth<=0||b[0]>=nominalEnd-gap||loaded<=.1)continue;b=[Math.max(ix0,b[0]),Math.min(nominalEnd-gap,b[1]),b[2],b[3],b[4],b[5]];if(b[1]<=b[0])continue;}for(const piece of subtract(b,own)){const c={...raw,b:piece};if(c.pal){abox(1,c.b,c.c,1,1);continue}",
"abox(1,c.b,c.k?sh(c.c,c.k).replace(/rgb\\((.*)\\)/,(m,v)=>'#'+v.split(',').map(a=>(+a).toString(16).padStart(2,'0')).join('')):c.c,1,1,(l,n)=>{const[x0,x1,y0,y1,z0,z1]=c.b,xm=(x0+x1)/2,zm=(z0+z1)/2,tp=c.u?'#FFE9A8':'#EBDDBF',lb=c.u?'#FFFBD4':'#F7F3E6';",
"if(n[1]==1){if(c.top)poly(l,[[x0,y1,zm-.035],[x0,y1,zm+.035],[x1,y1,zm+.035],[x1,y1,zm-.035]],tp,.9,0)}else if(!c.lab);else if(n[2]==1)poly(l,[[x0+.07,y0+.14,z1],[x0+.31,y0+.14,z1],[x0+.31,y0+.32,z1],[x0+.07,y0+.32,z1]],lb,.95,0);",
"else if(n[2]==-1)poly(l,[[x1-.07,y0+.14,z0],[x1-.07,y0+.32,z0],[x1-.31,y0+.32,z0],[x1-.31,y0+.14,z0]],lb,.95,0);else if(n[0]==1)poly(l,[[x1,y0+.14,zm-.12],[x1,y0+.32,zm-.12],[x1,y0+.32,zm+.12],[x1,y0+.14,zm+.12]],lb,.95,0);else if(n[0]==-1)poly(l,[[x0,y0+.14,zm-.12],[x0,y0+.14,zm+.12],[x0,y0+.32,zm+.12],[x0,y0+.32,zm-.12]],lb,.95,0)})}",
"}",
"if(actual&&loaded<=.1&&V.oth>0){const g=geo(V.oth),l=ln(g,V.oth);abox(1,[ix0,ix0+l,.15,.15+g.sy,-iz,-iz+g.sz],'#CDAA7D',1,1)}",
"const fz=[Math.min(V.fx,ix1),ix1,.15,H-.15,-iz,iz],SF=actual&&!V.sealed&&V.fr>0&&V.fx<ix1;if(SF)abox(2,fz,'#FFF1A0',C.fv);const cs=[];for(const x of[fz[0],fz[1]])for(const y of[fz[2],fz[3]])for(const z of[fz[4],fz[5]])cs.push([x,y,z]);",
"if(SF)for(const a of cs)for(const b of cs)if(a<b&&a.filter((v,i)=>v!=b[i]).length==1)line(2.5,a,b,C.ac,.55,.9,[3,2.5]);",
"OW=null;if(V.here>0){const g=geo(V.here),sy=g.sy,sz=g.sz,sxl=ln(g,V.here),x0=V.x0,z0=V.z0,y0=.15,xL=x0+ln(g,V.ld),xI=xL+ln(g,V.inb),nx=Math.max(1,Math.round(sxl/.45)),ny=Math.max(1,Math.round(sy/.45)),nz=Math.max(1,Math.round(sz/.45)),cw=sxl/nx,ch=sy/ny,cd=sz/nz,now=(Date.now()-started)/1000,pul=RM?.5:.5+.5*Math.sin(now*2.6),p=RM?1:phase,fl=V.ld+V.inb>0||p<.42?0:Math.max(0,1-(p-.42)*5);",
"OW={c:proj([x0+sxl/2,y0+sy/2,z0+sz/2]),px:Math.max(16,Math.min(52,sxl*sc*1.1))};",
"const hx=q=>'#'+q.map(n=>Math.max(0,Math.min(255,n|0)).toString(16).padStart(2,'0')).join(''),col=hx([169+30*pul,14+8*pul,2+4*pul]);",
"for(let i=0;i<nx;i++){const a0=x0+i*cw,b1=Math.min(a0+cw,xL);if(b1<=a0)continue;for(let j=0;j<ny;j++)for(let k=0;k<nz;k++){const gx=Math.min(.006,(b1-a0)*.03),gy=Math.min(.006,ch*.03),gz=Math.min(.006,cd*.03),bb=[a0+gx,b1-gx,y0+j*ch+gy,y0+(j+1)*ch-gy,z0+k*cd+gz,z0+(k+1)*cd-gz];abox(1.2,bb,col,1,1,(l,n)=>{if(n[1]==1&&j==ny-1){const zm=(bb[4]+bb[5])/2;poly(l,[[bb[0],bb[3],zm-.03],[bb[0],bb[3],zm+.03],[bb[1],bb[3],zm+.03],[bb[1],bb[3],zm-.03]],'#FFE9A8',.9,0)}})}}",
"if(V.inb>0)abox(1.18,[xL,xI,y0,y0+sy,z0,z0+sz],'#A90E02',.38,0);",
"if(reservationLanded(phase)){const inset=Math.min(.008,sxl*.06,sy*.06,sz*.06),bb=[x0+inset,x0+sxl-inset,y0+inset,y0+sy-inset,z0+inset,z0+sz-inset],opacity=actual?.46:1;abox(1.2,bb,'#A90E02',opacity,1,(l,n)=>{const [a,b,c,d,e,f]=bb,zm=(e+f)/2,tw=Math.min(.035,(f-e)*.12);if(n[1]===1)poly(l,[[a,d,zm-tw],[a,d,zm+tw],[b,d,zm+tw],[b,d,zm-tw]],'#F0B0A8',actual?.45:.95,0);else if(n[2]===1){const x=a+(b-a)*.18,y=c+(d-c)*.28;poly(l,[[x,y,f],[x+(b-a)*.36,y,f],[x+(b-a)*.36,y+(d-c)*.24,f],[x,y+(d-c)*.24,f]],'#FFF8E8',actual?.45:.95,0)}});}",
"if((actual||!reservationLanded(phase))&&xI<x0+sxl-.0001){abox(1.15,[xI,x0+sxl,y0,y0+sy,z0,z0+sz],'#A90E02',.08+.12*fl,0);const c2=[];for(const x of[x0,x0+sxl])for(const y of[y0,y0+sy])for(const z of[z0,z0+sz])c2.push([x,y,z]);for(const a of c2)for(const b of c2)if(a<b&&a.filter((q,i)=>q!=b[i]).length==1)line(1.3,a,b,C.ac,.8+.2*fl,1.3,[4,3])}}",
"const tp=a=>t>.02&&pitch>=0&&proj(a)[2]>proj([0,H/2,0])[2]+.05;const bm=[];",
"for(const zs of[-HZ,HZ])bm.push([-HX,HX,H-.14,H,zs-.07,zs+.07],[-HX,HX,0,.15,zs-.07,zs+.07]);",
"for(const xs of[-HX,HX]){bm.push([xs-.07,xs+.07,H-.14,H,-HZ,HZ],[xs-.07,xs+.07,0,.15,-HZ,HZ]);for(const zs of[-HZ,HZ])bm.push([xs-.07,xs+.07,0,H,zs-.07,zs+.07])}",
"for(const b of bm){const c=[(b[0]+b[1])/2,H/2,(b[4]+b[5])/2],far=proj(c)[2]<proj([0,H/2,0])[2]-.05;if(b[2]>H-.15&&tp(c))continue;abox(far?.7:1.5,b,'#B31204',1,0,null,b[1]<-5.9?'rgba(70,6,2,.55)':undefined)}",
"for(const xs of[-HX,HX])for(const zs of[-HZ,HZ])for(const ys of[.08,H-.08]){if(ys>1&&tp([xs,H/2,zs]))continue;{const cb=[xs-.17,xs+.17,ys-.11,ys+.11,zs-.17,zs+.17];if(xs<0)abox(1.6,cb,'#6a0a02',1,0,(l,n)=>hole(l,n,cb),'rgba(30,3,1,.7)');else abox(1.6,cb,'#3b0b06')}}",
"if(nv([-1,0,0])[2]>.02){{const G=[[-HX,.28,-HZ],[-HX,.28,HZ],[-HX,H,HZ],[-HX,H,-HZ]];poly(3,G,ST,.07,0);grid(G[0],G[1],G[2],G[3],3,5,3,C.gr,.2)}poly(4,[[-HX-.01,.28,-HZ],[-HX-.01,.28,HZ],[-HX-.01,H-.14,HZ],[-HX-.01,H-.14,-HZ]],sh(ST,lit([-1,0,0])),.32,0);",
"for(const z of[-.9,-.45,.45,.9]){abox(4.2,[-HX-.09,-HX,.15,H-.15,z-.035,z+.035],'#E6DFCB',1,0,null,'rgba(60,50,35,.5)');for(const y of[.4,1.35,2.3])abox(4.3,[-HX-.12,-HX,y,y+.13,z-.075,z+.075],'#C9C1AA',1,0,null,'rgba(60,50,35,.5)')}",
"line(4.1,[-HX-.01,.28,0],[-HX-.01,H-.14,0],'#3b0b06',.6,1);[.9,1.8].forEach(y=>line(4.1,[-HX-.01,y,-HZ],[-HX-.01,y,HZ],'#3b0b06',.35,.8))}",
"for(const sx of[-HX,HX])for(const sz of[-HZ,HZ])if(lift>.02)line(3.9,[sx,H,sz],[sx,H+lift,sz],ST,.5*lop+.15,.9,[2,2.5]);",
"abox(4,[-HX,HX,H+lift,H+lift+.1,-HZ,HZ],ST,lop);if(nv([0,1,0])[2]>0)for(let i=0;i<60;i+=2)poly(4.1,[[-HX+i*.2,H+lift+.1,-HZ],[-HX+i*.2+.2,H+lift+.1,-HZ],[-HX+i*.2+.2,H+lift+.1,HZ],[-HX+i*.2,H+lift+.1,HZ]],'#000000',.1*lop,0);",
"cx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);cx.clearRect(0,0,w,h);const o0=proj([0,0,0]);",
"cx.save();cx.translate(o0[0],o0[1]+4);cx.scale(1,.34);const g=cx.createRadialGradient(0,0,0,0,0,w*.52);g.addColorStop(0,C.spot);g.addColorStop(1,'rgba(0,0,0,0)');cx.fillStyle=g;cx.beginPath();cx.arc(0,0,w*.52,0,7);cx.fill();cx.restore();",
"cx.save();cx.fillStyle=C.shd;cx.shadowColor=C.shd;cx.shadowBlur=14;cx.beginPath();[[-HX-.3,-HZ-.3],[HX+.3,-HZ-.3],[HX+.3,HZ+.3],[-HX-.3,HZ+.3]].forEach((p,i)=>{const q=proj([p[0],0,p[1]]);i?cx.lineTo(q[0],q[1]+5):cx.moveTo(q[0],q[1]+5)});cx.fill();cx.restore();",
"it.sort((a,b)=>a.l-b.l||a.d-b.d);",
"for(const e of it){cx.globalAlpha=e.o;if(e.A){cx.strokeStyle=e.c;cx.lineWidth=e.wd;cx.setLineDash(e.dash||[]);cx.beginPath();cx.moveTo(e.A[0],e.A[1]);cx.lineTo(e.B[0],e.B[1]);cx.stroke();cx.setLineDash([])}",
"else{cx.fillStyle=e.f;cx.beginPath();e.P.forEach((p,i)=>i?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]));cx.closePath();cx.fill();if(e.s&&e.o>=1){cx.strokeStyle=e.sc||e.f;cx.lineWidth=e.sc?.7:.5;cx.stroke()}}}",
"cx.lineJoin='round';cx.globalAlpha=1;cx.font='700 11px -apple-system,Arial,sans-serif';cx.textAlign='center';",
"if(t<.3&&pitch<35){const sx=proj([-HX-.5,0,0])[0]<proj([HX+.5,0,0])[0]?-HX-.5:HX+.5,zn=nv([0,0,1])[2]>0?HZ:-HZ,a=proj([sx,.02,zn]),b=proj([sx,H-.02,zn]);cx.globalAlpha=1-t/.3;cx.strokeStyle=C.tx;cx.lineWidth=1.1;cx.beginPath();cx.moveTo(a[0],a[1]);cx.lineTo(b[0],b[1]);cx.moveTo(a[0]-3,a[1]);cx.lineTo(a[0]+3,a[1]);cx.moveTo(b[0]-3,b[1]);cx.lineTo(b[0]+3,b[1]);cx.stroke();",
"cx.fillStyle=C.tx;cx.font='700 10px -apple-system,Arial,sans-serif';cx.textAlign=sx<0?'left':'right';const e=proj([sx<0?-HX:HX,H,zn]);cx.fillText('Ceiling 2.69 m',e[0],proj([sx<0?-HX:HX,H+lift+.1,zn])[1]-7);cx.globalAlpha=1;cx.textAlign='center';cx.font='700 11px -apple-system,Arial,sans-serif'}",
"const top=Math.min(...[-HX,HX].flatMap(x=>[0,H+1].flatMap(y=>[-HZ,HZ].map(z=>proj([x,y,z])[1])))),ly=Math.max(14,top-12);cx.globalAlpha=1;",
"if(OW&&(actual||!data.caption)){const u=OW.c,parts=V.lab.split(' • '),widthOf=x=>{const v=cx.measureText(x);return v&&Number.isFinite(v.width)?v.width:x.length*5.8},limit=w-24,lines=[];let current='';for(const part of parts){const next=current?current+' • '+part:part;if(current&&widthOf(next)>limit){lines.push(current);current=part}else current=next}if(current)lines.push(current);const y=Math.max(13,ly-(lines.length-1)*13),last=y+(lines.length-1)*13,wide=Math.min(limit,Math.max(...lines.map(widthOf))),tx=clamp(u[0],12+wide/2,w-12-wide/2);cx.strokeStyle=C.tx;cx.lineWidth=1.1;cx.beginPath();cx.moveTo(u[0],u[1]);cx.lineTo(u[0],last+5);cx.lineTo(tx,last+5);cx.stroke();cx.fillStyle=C.tx;cx.beginPath();cx.arc(u[0],u[1],2.3,0,7);cx.fill();lines.forEach((line,i)=>cx.fillText(line,tx,y+i*13,limit))}",
"if(actual&&!V.sealed&&V.fr>0){const f=proj([(Math.min(V.fx,ix1)+HX)/2,1.3,0]);cx.font='700 10px -apple-system,Arial,sans-serif';cx.lineWidth=3;cx.strokeStyle=C.halo;cx.strokeText(FR()+' CBM free',f[0],f[1]);cx.fillStyle=C.fl;cx.fillText(FR()+' CBM free',f[0],f[1])}",
"fly(phase);}",
"const rq=()=>{if(!raf)raf=requestAnimationFrame(draw)};",
"function fit(){const r=cv.getBoundingClientRect();w=r.width;h=r.height;cv.width=w*devicePixelRatio;cv.height=h*devicePixelRatio;rq()}",
"addEventListener('resize',fit);fit();if(!RM&&V.here>0){const timer=setInterval(rq,45);addEventListener('pagehide',()=>clearInterval(timer),{once:true});}",
"let px,py,dn=0;cv.addEventListener('pointerdown',e=>{dn=1;px=e.clientX;py=e.clientY;cv.setPointerCapture(e.pointerId)});",
"cv.addEventListener('pointermove',e=>{if(!dn)return;yaw=wrap(yaw+(e.clientX-px)*.5);pitch=Math.max(4,Math.min(90,pitch+(e.clientY-py)*.35));px=e.clientX;py=e.clientY;rq()});",
"['pointerup','pointercancel'].forEach(k=>cv.addEventListener(k,()=>dn=0));",
"function lc(a,b,t){const h=x=>[1,3,5].map(i=>parseInt(x.substr(i,2),16)),A=h(a),B=h(b);return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('')}",
"function geo(h){if(!(h>0))return{sy:0,sz:0};const vol=h/68*mv,ed=Math.cbrt(vol),sy=Math.min(ih,Math.max(Math.min(ed,ih),vol/(il*id))),sz=Math.min(id,Math.max(Math.min(ed,1.05),vol/(il*sy)));return{sy,sz}}",
"function ln(g,x){return g.sy&&g.sz?x/68*mv/(g.sy*g.sz):0}",
"function fly(p){if(RM||!OW||V.sealed||V.ld+V.inb>0)return;if(p>=.42)return;const q0=Math.min(1,p/.42),k=q0<.5?2*q0*q0:1-Math.pow(-2*q0+2,2)/2,m=p>=.42?1:Math.max(0,Math.min(1,(k-.85)/.15)),a=[30,30],e=OW.c,md=[(a[0]+e[0])/2,Math.min(a[1],e[1])-36],rawX=(1-k)*(1-k)*a[0]+2*(1-k)*k*md[0]+k*k*e[0],rawY=(1-k)*(1-k)*a[1]+2*(1-k)*k*md[1]+k*k*e[1],s=34+(OW.px-34)*k,X=clamp(rawX,s*.5+3,w-s*.5-3),Y=clamp(rawY,s*.6+5,h-s*.6-5),alpha=1;",
"cx.save();cx.globalAlpha=alpha;cx.save();const liftShadow=1-k,sx=X+s*.10,sy=Math.min(h-s*.22-4,Y+s*.62+6+liftShadow*s*.13),sw=s*(.5+.12*liftShadow),sd=s*(.24+.06*liftShadow);cx.shadowColor='rgba(25,10,5,.16)';cx.shadowBlur=5+liftShadow*5;for(let j=0;j<12;j++){const f=1.30-j*.052,rx=sw*f,ry=sd*f,r=.24;cx.fillStyle='rgba(30,12,8,'+(j===0?.004:.012)+')';cx.beginPath();cx.moveTo(sx-rx*r,sy-ry*(1-r));cx.quadraticCurveTo(sx,sy-ry,sx+rx*r,sy-ry*(1-r));cx.lineTo(sx+rx*(1-r),sy-ry*r);cx.quadraticCurveTo(sx+rx,sy,sx+rx*(1-r),sy+ry*r);cx.lineTo(sx+rx*r,sy+ry*(1-r));cx.quadraticCurveTo(sx,sy+ry,sx-rx*r,sy+ry*(1-r));cx.lineTo(sx-rx*(1-r),sy+ry*r);cx.quadraticCurveTo(sx-rx,sy,sx-rx*(1-r),sy-ry*r);cx.closePath();cx.fill();}cx.restore();",
"const Q=(pts,c)=>{cx.fillStyle=c;cx.beginPath();pts.forEach((q,i)=>i?cx.lineTo(X+q[0]*s,Y+q[1]*s):cx.moveTo(X+q[0]*s,Y+q[1]*s));cx.closePath();cx.fill()},LF=(u,v)=>[-.5+.5*u,-.3+.3*u+.6*v],RF=(u,v)=>[.5-.5*u,-.3+.3*u+.6*v],bx=(F,u0,u1,v0,v1)=>[F(u0,v0),F(u1,v0),F(u1,v1),F(u0,v1)],ln2=(F,u0,v0,u1,v1,c)=>{cx.strokeStyle=c;cx.lineWidth=Math.max(.6,s/45);cx.beginPath();const A=F(u0,v0),B=F(u1,v1);cx.moveTo(X+A[0]*s,Y+A[1]*s);cx.lineTo(X+B[0]*s,Y+B[1]*s);cx.stroke()};",
"Q([[0,-.6],[.5,-.3],[0,0],[-.5,-.3]],lc('#CDA874','#E0453A',m));Q([[-.5,-.3],[0,0],[0,.6],[-.5,.3]],lc('#A97F4D','#A90E02',m));Q([[.5,-.3],[0,0],[0,.6],[.5,.3]],lc('#8A6339','#7d0a01',m));",
"Q([[-.25,-.5],[.25,-.2],[.25,-.1],[-.25,-.4]],lc('#E6D5AA','#F0B0A8',m));",
"Q(bx(RF,.2,.64,.14,.55),'#FFF8E8');Q(bx(LF,.18,.5,.5,.78),'#FFF8E8');",
"ln2(RF,.26,.22,.56,.22,'#8a6339');ln2(RF,.26,.29,.48,.29,'#b99968');for(let i=0;i<6;i++)ln2(RF,.26+i*.06,.37,.26+i*.06,.5,'#2B1210');ln2(LF,.24,.58,.44,.58,'#b99968');ln2(LF,.24,.67,.38,.67,'#b99968');cx.restore();cx.globalAlpha=1}",
].join("\n");

function annotationScript(copy:KonsolissCopy){
 const labels=JSON.stringify({current:copy['canvas.current']||'My current loaded space',free:copy['canvas.free']||'{volume} CBM free',ceiling:copy['canvas.ceiling']||'Ceiling {height} m',reserved:copy['load.reserved']||'Space purchased',loaded:copy['load.loaded']||'Loaded',sent:copy['load.sent']||'Goods sent'}).replace(/</g,'\\u003c');
 return `(function(){const labels=${labels};for(const method of ['fillText','strokeText']){const original=CanvasRenderingContext2D.prototype[method];CanvasRenderingContext2D.prototype[method]=function(text,...args){if(typeof text==='string'){if(text.startsWith('My current loaded space'))text=labels.current+text.slice(23);else if(/^[0-9.]+ CBM free$/.test(text))text=labels.free.replace('{volume}',text.split(' ')[0]);else if(text.startsWith('Ceiling '))text=labels.ceiling.replace('{height}',text.split(' ')[1]);else if(text.startsWith('Space preview: '))text=labels.reserved+' '+text.slice(15);else if(text==='Loaded 0 CBM')text=labels.loaded+' 0 CBM';else if(text==='Goods sent 0 CBM')text=labels.sent+' 0 CBM';}return original.call(this,text,...args);};}})();`;
}
