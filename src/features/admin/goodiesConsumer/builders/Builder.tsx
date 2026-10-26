/* Build Your Own screen. Port of v24 vByo, bzStage, bgView, pzView, bzOpts, bzRev, bzFoot, vByoDone. */
import React, {useEffect, useMemo, useRef} from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {View, Text, Pressable, ScrollView, Image, Animated, Easing, TextInput} from 'react-native';
import {SvgXml} from 'react-native-svg';
import {LinearGradient} from 'expo-linear-gradient';
import {Icon} from '../components/Icon';
import {T, Circ, Cta, Empty, Stepper, useTheme} from '../components/ui';
import {S, STB, money, cnt, emit} from '../store';
import {back, browse, go, tab} from '../actions';
import {ASSETS, LAYOUT} from '../content';
import {BD, Builder, BItem, bGet, bDraft, setBD, units, itemOf, bBreak, bCheck, bzDirty, BYO, bzAdd, bzSub, bzSize, bzUndo, bzQty, bzNote, bzResetAsk, bzAddOrder, bzCancel, bzAnother, bzShop} from './engine';
import {PSZ, bzr, hs, clamp, shade, pizzaBase, defsXml, shreds, iconXml, hasSymbol} from './pizzaArt';

/* ---------- asset helpers (Admin library ids) ---------- */
const key = (assetId: string | null) => (assetId || '').replace(/^(burger|pizza)\./, '');
const isBun = (it: BItem) => /^(bun_|lettuce_wrap)/.test(key(it.assetId));
const isSeason = (it: BItem) => /^(pepper_|spice_)/.test(key(it.assetId));
export const burgerLayerKey = (it: BItem) => {const k = key(it.assetId); return /^sauce_/.test(k) ? k + '_squiggle' : k;};
export function thumbAsset(it: BItem, type: string) {
  if (!it.assetId) return null; const k = key(it.assetId);
  if (type === 'pizza') return ASSETS[it.assetId] || null;
  if (/^bun_/.test(k)) return ASSETS['burger.' + k + '_top'] || null;
  if (k === 'lettuce_wrap') return ASSETS['burger.lettuce_wrap_top'] || null;
  if (/^sauce_/.test(k)) return ASSETS['burger.' + k] || ASSETS['burger.ramekin_' + k.replace('sauce_', '')] || null;
  return ASSETS['burger.' + k] || null;
}
const artOfBurger = (it: BItem) => {const k = key(it.assetId); return /^sauce_/.test(k) ? 'sauce' : /^patty_/.test(k) ? 'patty' : /^cheese_|^cheddar/.test(k) ? 'cheese' : /^onion|^onions_/.test(k) ? 'onion' : k === 'egg_fried' ? 'egg' : ['lettuce', 'tomato', 'pickle', 'bacon'].includes(k) ? k : 'generic';};
export const pizzaArtOf = (it: BItem) => {
  const k = key(it.assetId);
  if (/_crust$/.test(k)) return 'crust'; if (/_sauce$/.test(k)) return 'sauce'; if (k === 'red_onion') return 'onion';
  return ['pepperoni', 'mushroom', 'olives', 'basil', 'peppers', 'tomato', 'mozzarella'].includes(k) ? k : 'generic';
};

/* v24 layer tables, overridden by Admin layout metadata when present */
const RKt: any = {lwb: .5, lwt: 11, sauce: 1, patty: 6, cheese: 7, shred: 7.4, bacon: 8, lettuce: 9, pickle: 9.5, cucumber: 9.55, avocado: 9.6, mushroom: 9.65, pineapple: 9.7, jalapeno: 9.75, generic: 9.8, tomato: 10, egg: 10.4, caramel: 10.7, onion: 10.8, pepper: 11.2, spice: 11.4};
const Wt: any = {lwb: 178, lwt: 178, patty: 184, cheese: 160, shred: 154, lettuce: 176, tomato: 152, onion: 144, caramel: 148, pickle: 134, cucumber: 136, jalapeno: 120, pineapple: 140, avocado: 156, mushroom: 150, bacon: 158, egg: 152, sauce: 112, generic: 146, pepper: 70, spice: 65};
const Kt: any = {lwb: .2, lwt: .12, patty: .13, cheese: .035, shred: .035, lettuce: .07, tomato: .055, onion: .04, caramel: .045, pickle: .045, cucumber: .045, jalapeno: .045, pineapple: .05, avocado: .05, mushroom: .05, bacon: .055, egg: .055, sauce: .02, generic: .05, pepper: .025, spice: .02};
const CL = (k: string) => /^sauce_/.test(k) ? 'sauce' : /^patty_/.test(k) ? 'patty' : /^cheese_/.test(k) ? 'cheese' : (({cheddar_shredded: 'shred', mushrooms: 'mushroom', onions_caramelized: 'caramel', onion_red: 'onion', onion_white: 'onion', egg_fried: 'egg'} as any)[k] || (RKt[k] ? k : 'generic'));

type Pos = {p: {u: string; w: number; h: number}; w: number; k: number; c: string; y: number; h: number; top?: boolean; sauce?: boolean; it?: BItem};
function burgerGeometry(b: Builder, d: any) {
  let bun: BItem | null = null; const L: BItem[] = [];
  b.groups.forEach(g => units(g, d).forEach(id => {const it = itemOf(g, id); if (!it) return; if (isBun(it)) {bun = bun || it; return;} if (isSeason(it)) return; L.push(it);}));
  const bk = bun ? key((bun as BItem).assetId) : 'bun_plain';
  const topK = bk === 'lettuce_wrap' ? 'lettuce_wrap_top' : bk + '_top', botK = bk === 'lettuce_wrap' ? 'lettuce_wrap_bottom' : bk === 'bun_pretzel' ? 'bun_toasted_bottom' : bk + '_bottom';
  const bt = ASSETS['burger.' + topK], bb = ASSETS['burger.' + botK];
  let ok = !!(bt && bb);
  const Q = L.map((it, i) => {const k = burgerLayerKey(it), a = ASSETS['burger.' + k]; if (!a) ok = false; return {it, k, a, c: CL(k), i};});
  if (!ok) return null;
  Q.sort((a, c) => ((LAYOUT['burger.' + a.k]?.rk ?? RKt[a.c] ?? 5.5) - (LAYOUT['burger.' + c.k]?.rk ?? RKt[c.c] ?? 5.5)) || a.i - c.i);
  const seq: {p: any; w: number; k: number; c: string; it?: BItem}[] = [{p: bb, w: 184, k: .2, c: 'bun'}].concat(Q.map(q => ({p: q.a, w: LAYOUT['burger.' + q.k]?.w ?? (/^cheese_melted/.test(q.k) ? 196 : Wt[q.c] || 146), k: LAYOUT['burger.' + q.k]?.k ?? Kt[q.c] ?? .05, c: q.c, it: q.it})) as any);
  let y = 0; const pos: Pos[] = seq.map(x => {const h = x.w * x.p.h / x.p.w, r = {...x, y, h} as any; y += h * x.k; return r;});
  const topH = 184 * bt.h / bt.w;
  return {pos, top: {p: bt, w: 184, y, h: topH}, y};
}

function BurgerStage({b, fin}: {b: Builder; fin: boolean}) {
  const th = useTheme(), t = useRef(new Animated.Value(fin && !BD?.assembling ? 1 : 0)).current;
  const g = useMemo(() => burgerGeometry(b, BD), [b, JSON.stringify(BD?.sel)]);
  useEffect(() => {if (BD?.assembling) Animated.timing(t, {toValue: 1, duration: 720, easing: Easing.bezier(.2, .75, .25, 1), useNativeDriver: false}).start(); else if (!fin) t.setValue(0);}, [BD?.assembling]);
  if (!g) return <BurgerFallback b={b} />;
  const {pos, top, y} = g, n = pos.length, spacing = Math.min(19, 260 / Math.max(1, n));
  const disp = pos.map((r, i) => r.y + i * spacing), lp = pos[n - 1], totE = disp[n - 1] + lp.h, scE = Math.min(.86, 200 / Math.max(1, totE));
  const finalH = y + top.h, scF = Math.min(.9, 200 / Math.max(1, finalH)), done = fin && !BD?.assembling, stageH = done ? Math.max(230, Math.ceil(finalH * scF + 12)) : 300, W = 210;
  const sUse = scE, topFinal = y * sUse, topStart = Math.min(stageH - 10, topFinal + top.h * sUse + 24);
  const contScale = t.interpolate({inputRange: [0, 1], outputRange: [1, scF / scE]});
  const tY = Animated.multiply(Animated.subtract(1, contScale), stageH / 2);
  const layers: React.ReactNode[] = [];
  pos.forEach((r, i) => {
    const ww = r.w * sUse, hh = r.h * sUse, bottom = t.interpolate({inputRange: [0, 1], outputRange: [disp[i] * sUse, r.y * sUse]});
    if (r.c === 'sauce') [-35, 0, 35].forEach((dx, j) => layers.push(<Animated.Image key={i + '_' + j} source={{uri: r.p.u}} style={{position: 'absolute', width: ww * .78, height: hh * .78 * (r.p.h / r.p.w) / (r.p.h / r.p.w), left: W / 2 - ww * .39 + dx * sUse, bottom, zIndex: i + 1}} resizeMode="stretch" />));
    else layers.push(<Animated.Image key={i} source={{uri: r.p.u}} style={{position: 'absolute', width: ww, height: hh, left: (W - ww) / 2, bottom, zIndex: i + 1, transform: r.c === 'lettuce' ? [{rotate: '180deg'}] : undefined}} resizeMode="stretch" />);
  });
  layers.push(<Animated.Image key="top" source={{uri: top.p.u}} style={{position: 'absolute', width: 184 * sUse, height: top.h * sUse, left: (W - 184 * sUse) / 2, zIndex: 999, opacity: fin ? t.interpolate({inputRange: [0, .3, 1], outputRange: [0, 1, 1]}) : 0, bottom: t.interpolate({inputRange: [0, 1], outputRange: [topStart, topFinal]})}} resizeMode="stretch" />);
  const expanded = !fin && BD?.exploded !== false;
  const labels = expanded ? pos.map((r, i) => ({r, i})).filter(x => x.r.it).map((x, k) => {const yy = disp[x.i] * sUse, hh = x.r.h * sUse, topPx = Math.max(10, Math.min(stageH - 10, stageH - (yy + hh * .5))); return {name: x.r.it!.name, top: topPx, side: k % 2 ? 'right' : 'left'};}) : [];
  return (
    <View style={{height: stageH, width: '100%', alignItems: 'center', justifyContent: 'flex-end', overflow: 'visible'}}>
      <Animated.View style={{width: W, height: stageH, transform: [{translateY: tY as any}, {scale: contScale as any}]}}>{layers}</Animated.View>
      {labels.map((l, k) => (
        <Animated.View key={k} pointerEvents="none" style={{position: 'absolute', top: l.top - 8, [l.side]: 8, width: '30%', maxWidth: 118, opacity: Animated.subtract(1, t) as any, zIndex: 4, flexDirection: l.side === 'left' ? 'row' : 'row-reverse', alignItems: 'center'}}>
          <Text style={{color: '#fff', fontSize: 10, fontWeight: '600', textAlign: l.side === 'left' ? 'left' : 'right', flexShrink: 1}}>{l.name}</Text>
          <View style={{width: 18, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.72)', marginHorizontal: 3}} />
        </Animated.View>
      ))}
      {BD?.seasoningPulse && !fin ? <Flakes /> : null}
    </View>
  );
}
function Flakes() {
  const vals = useRef(Array.from({length: 34}, () => new Animated.Value(0))).current;
  useEffect(() => {Animated.parallel(vals.map((v, j) => Animated.timing(v, {toValue: 1, duration: 950, delay: (j % 9) * 45, easing: Easing.out(Easing.quad), useNativeDriver: true}))).start(() => {if (BD) {BD.seasoningPulse = 0; emit();}});}, []);
  return (
    <View pointerEvents="none" style={{position: 'absolute', left: 0, right: 0, top: 4, bottom: 0, zIndex: 5}}>
      {vals.map((v, j) => {const seed = (j * 17 + 11) % 97, drift = ((j % 7) - 3) * 7; return <Animated.View key={j} style={{position: 'absolute', left: `${18 + (seed % 64)}%`, width: 2 + (j % 4), height: 3 + (j % 5), borderRadius: 1.5, backgroundColor: ['#f5d18a', '#d9a04a', '#b8792d', '#70431c', '#e8b866'][j % 5], opacity: v.interpolate({inputRange: [0, .1, .85, 1], outputRange: [0, .8, .8, 0]}), transform: [{translateY: v.interpolate({inputRange: [0, 1], outputRange: [0, 150]})}, {translateX: v.interpolate({inputRange: [0, 1], outputRange: [0, drift]})}, {rotate: v.interpolate({inputRange: [0, 1], outputRange: ['22deg', (j % 2 ? 260 : -240) + 'deg']})}]}} />;})}
    </View>
  );
}

/* v24 vector burger, used when the Admin library is missing a needed layer (shown, never silently) */
function BurgerFallback({b}: {b: Builder}) {
  const th = useTheme();
  let bun: BItem | null = null; let L: BItem[] = [];
  b.groups.forEach(g => units(g, BD).forEach(id => {const it = itemOf(g, id); if (!it) return; if (isBun(it)) {bun = bun || it; return;} if (isSeason(it)) return; L.push(it);}));
  const RK: any = {sauce: 1, lettuce: 2, tomato: 3, onion: 4, pickle: 5, generic: 5.5, patty: 6, cheese: 7, bacon: 8, egg: 9}, H: any = {patty: 30, cheese: 9, lettuce: 12, tomato: 13, onion: 8, pickle: 8, bacon: 9, egg: 14, sauce: 7, generic: 10};
  L = L.map((x, i) => [x, i] as [BItem, number]).sort((a, c) => (RK[artOfBurger(a[0])] || 5.5) - (RK[artOfBurger(c[0])] || 5.5) || a[1] - c[1]).map(x => x[0]);
  const bc = bun ? (bun as BItem).col : '#E0A24A', tot = 26 + 38 + 12 + L.reduce((s, i) => s + (H[artOfBurger(i)] || 10), 0); let cur = tot - 6, o = '';
  o += `<rect x="24" y="${cur - 26}" width="202" height="26" rx="13" fill="${shade(bc, -.12)}"/>`; cur -= 26;
  L.forEach(it => {const a = artOfBurger(it), h = H[a] || 10; cur -= h; const y = cur;
    if (a === 'patty') o += `<rect x="14" y="${y}" width="222" height="${h}" rx="14" fill="${it.col}"/><path d="M30 ${y + 10}h40M100 ${y + 18}h50M170 ${y + 9}h40" stroke="#000" stroke-opacity=".18" stroke-width="3" stroke-linecap="round"/>`;
    else if (a === 'cheese') o += `<path d="M10 ${y}H240V${y + 5}L205 ${y + 5}L195 ${y + h + 3}L184 ${y + 5}H66L55 ${y + h + 3}L45 ${y + 5}H10Z" fill="${it.col}"/>`;
    else if (a === 'lettuce') {let d = `M10 ${y + h}V${y + 5}`; for (let i = 0; i < 14; i++) d += 'q8.5 -9 17 0'; o += `<path d="${d}V${y + h}Z" fill="#5FAE3C"/><path d="M14 ${y + h - 3}H236" stroke="#8ED45F" stroke-width="2" opacity=".6"/>`;}
    else if (a === 'tomato') o += `<rect x="18" y="${y}" width="214" height="${h}" rx="6" fill="#D8412E"/><path d="M40 ${y + 4}h30M120 ${y + 4}h40M190 ${y + 4}h24" stroke="#F58B7A" stroke-width="3" stroke-linecap="round"/>`;
    else if (a === 'onion') o += `<rect x="22" y="${y}" width="206" height="${h}" rx="4" fill="#C98AD0"/><path d="M30 ${y + h / 2}H220" stroke="#F2DCF4" stroke-width="2"/>`;
    else if (a === 'pickle') o += `<rect x="20" y="${y}" width="210" height="${h}" rx="4" fill="#6C9B3A"/><path d="M36 ${y + 4}h6M90 ${y + 5}h6M150 ${y + 4}h6M200 ${y + 5}h6" stroke="#B8DB86" stroke-width="2.5" stroke-linecap="round"/>`;
    else if (a === 'bacon') {let d2 = `M12 ${y + h / 2}`; for (let j = 0; j < 13; j++) d2 += `q9.5 -${h * .9} 19 0t19 0`; o += `<path d="${d2.replace(/t19 0$/, '')}" fill="none" stroke="#B5382A" stroke-width="${h * .75}" stroke-linecap="round"/>`;}
    else if (a === 'egg') o += `<ellipse cx="125" cy="${y + h / 2}" rx="100" ry="${h / 2}" fill="#FFFDF3"/><circle cx="125" cy="${y + h / 2}" r="${h / 2 - 2}" fill="#F4B01F"/>`;
    else if (a === 'sauce') o += `<rect x="16" y="${y}" width="218" height="${h}" rx="4" fill="${it.col}" opacity=".92"/>`;
    else o += `<rect x="16" y="${y}" width="218" height="${h}" rx="5" fill="${it.col}"/>`;});
  const topY = cur - 38; o += `<path d="M16 ${cur}Q16 ${topY} 125 ${topY}Q234 ${topY} 234 ${cur}Z" fill="${bc}"/><path d="M40 ${cur - 12}Q60 ${topY + 8} 100 ${topY + 6}" stroke="#fff" stroke-opacity=".28" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  [[80, cur - 22], [120, cur - 28], [160, cur - 24], [100, cur - 12], [150, cur - 14], [190, cur - 14]].forEach(p => {o += `<ellipse cx="${p[0]}" cy="${p[1]}" rx="4" ry="2.2" fill="#FFF3D6" opacity=".8" transform="rotate(-20 ${p[0]} ${p[1]})"/>`;});
  const vb = `0 ${topY - 6} 250 ${tot - topY + 8}`, hgt = Math.min(210, 190 * (tot - topY + 8) / 250);
  return <View style={{alignItems: 'center'}}><SvgXml width={190} height={hgt} xml={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${o}</svg>`} /><T size={10.5} color="rgba(255,255,255,.6)" style={{marginTop: 6}}>Preview drawing. Photo layers appear once uploaded in Admin.</T></View>;
}

/* ---------- pizza ---------- */
const PZ_ORDER = ['crust', 'sauce', 'cheese', 'meat', 'veg'];
const pzRole = (it: BItem) => {const k = key(it.assetId); return /_crust$/.test(k) ? 0 : /_sauce$/.test(k) ? 1 : ['mozzarella', 'cheddar', 'parmesan'].includes(k) ? 2 : ['pepperoni', 'sausage', 'bacon'].includes(k) ? 3 : 4;};
function pizzaPieces(b: Builder, d: any) {
  const placed: number[][] = [], cnt: any = {}; let out = '', cheese = 0, sauce: BItem | null = null;
  b.groups.forEach(g => units(g, d).forEach(id => {
    const it = itemOf(g, id); if (!it) return; const art = pizzaArtOf(it);
    if (art === 'sauce') {sauce = sauce || it; return;} if (art === 'crust') return; if (art === 'mozzarella') {cheese++; return;}
    const n = cnt[id] = (cnt[id] || 0) + 1, R = bzr(hs(id + ':' + n)), sz = PSZ[art] || 13, pc = art === 'onion' ? 7 : 3; let best = [.5, .5], bd = -1;
    for (let k = 0; k < 30; k++) {const a = R() * 6.28, r = Math.sqrt(R()) * .28, x = .5 + r * Math.cos(a), y = .5 + r * Math.sin(a), dm = placed.reduce((mm, p) => Math.min(mm, Math.hypot(p[0] - x, p[1] - y)), 9); if (dm > bd) {bd = dm; best = [x, y];}}
    placed.push(best);
    for (let j = 0; j < pc; j++) {
      const a2 = R() * 6.28, dd = sz / 100 * (.4 + R() * (art === 'onion' ? 2.6 : 1.9)), c = clamp(best[0] + dd * Math.cos(a2), best[1] + dd * Math.sin(a2), sz, 1), rot = -180 + R() * 360, s = .8 + R() * .4, v = art === 'onion' ? ['', '', '2', '2', '3', '4'][Math.floor(R() * 6)] : '', w = 300 * sz / 100, cx = c[0] * 300, cy = c[1] * 300;
      out += hasSymbol(art) ? `<use href="#p-${art}${v}" width="${w}" height="${w}" transform="translate(${cx} ${cy}) rotate(${rot.toFixed(0)}) scale(${s.toFixed(2)}) translate(${-w / 2} ${-w / 2})"/>` : `<g transform="translate(${cx} ${cy}) rotate(${rot.toFixed(0)}) scale(${s.toFixed(2)})"><circle r="${w * .38}" fill="${it.col}"/><circle cx="${-w * .12}" cy="${-w * .12}" r="${w * .12}" fill="#fff" opacity=".22"/></g>`;
    }
  }));
  return {out, cheese, sauce: sauce as BItem | null};
}
function PizzaStage({b}: {b: Builder}) {
  const idx = Math.max(0, b.sizes.findIndex(s => s.id === BD.size)), px = [170, 190, 205, 220][Math.min(idx, 3)];
  const sel: BItem[] = []; b.groups.forEach(g => units(g, BD).forEach(id => {const it = itemOf(g, id); if (it) sel.push(it);}));
  const layered = sel.some(i => pzRole(i) === 0) && sel.filter(i => i.assetId).every(i => !!ASSETS[i.assetId as string]);
  if (layered) {
    const L = sel.slice().sort((a, c) => (LAYOUT[a.assetId as string]?.rk ?? pzRole(a)) - (LAYOUT[c.assetId as string]?.rk ?? pzRole(c)));
    return <View style={{width: px, height: px}}>{L.map((i, k) => <Image key={i.id + k} source={{uri: ASSETS[i.assetId as string].u}} style={{position: 'absolute', width: px, height: px}} resizeMode="contain" />)}</View>;
  }
  const pl = pizzaPieces(b, BD), col = pl.sauce ? pl.sauce.col : '#C62E18'; let ch = '';
  for (let u = 1; u <= pl.cheese; u++) ch += `<g fill="none" stroke-linecap="round">${shreds(u)}</g>`;
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">${defsXml()}${pizzaBase().replace('#D23A20', shade(col, .18)).replace('#A9260F', shade(col, -.12))}${ch}${pl.out}</svg>`;
  return <SvgXml width={px} height={px} xml={xml} />;
}
function CustomPlate({b}: {b: Builder}) {
  const names: string[] = []; b.groups.forEach(g => units(g, BD).forEach(id => {const it = itemOf(g, id); if (it) names.push(it.name);}));
  return (
    <View style={{alignItems: 'center', paddingHorizontal: 16}}>
      <Text style={{fontSize: 84, lineHeight: 92}}>{b.emoji}</Text>
      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 8}}>{(names.length ? names : ['Pick your options below']).map((x, i) => <View key={i} style={{backgroundColor: 'rgba(255,255,255,.12)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5}}><T size={12.5} color="#F5F5F5">{x}</T></View>)}</View>
    </View>
  );
}
export function Stage({b, fin}: {b: Builder; fin?: boolean}) {
  return (
    <LinearGradient colors={['#2C4A5B', '#233D4C']} style={{marginHorizontal: 16, borderRadius: 24, height: 300, flexShrink: 0, alignItems: 'center', justifyContent: 'center', paddingVertical: b.type === 'burger' ? 8 : 14, overflow: 'visible'}}>
      <Pressable accessibilityLabel="Undo last change" disabled={!BD.hist.length} onPress={bzUndo} style={{position: 'absolute', left: 10, top: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: '#2E4D5F', borderWidth: 1, borderColor: 'rgba(255,255,255,.14)', alignItems: 'center', justifyContent: 'center', zIndex: 20, opacity: BD.hist.length ? 1 : 0.3}}><Icon name="undo" size={20} color="#F5F5F5" /></Pressable>
      {b.type === 'pizza' ? <PizzaStage b={b} /> : b.type === 'burger' ? <BurgerStage b={b} fin={!!fin || !!BD.assembling} /> : <CustomPlate b={b} />}
    </LinearGradient>
  );
}

/* ---------- options ---------- */
const hint = (g: any) => {const rq = g.req || g.min > 0, mn = rq ? Math.max(1, g.min) : 0; if (g.kind === 'one') return 'Choose 1 · ' + (rq ? 'Required' : 'Optional'); return (mn ? 'Choose ' + mn + (g.max > mn ? ' to ' + g.max : '') : 'Up to ' + g.max) + ' · ' + (rq ? 'Required' : 'Optional');};
function TileIcon({it, type}: {it: BItem; type: string}) {
  const th = useTheme(), a = thumbAsset(it, type);
  if (a) return <Image source={{uri: a.u}} style={{width: 42, height: 42}} resizeMode="contain" />;
  if (type === 'pizza') {const art = pizzaArtOf(it); if (hasSymbol(art)) return <SvgXml width={36} height={36} xml={iconXml(art)} />;}
  return <View style={{width: 26, height: 26, borderRadius: 13, backgroundColor: it.col, borderWidth: 2, borderColor: 'rgba(0,0,0,.12)'}} />;
}
function OptTile({b, g, it}: {b: Builder; g: any; it: BItem}) {
  const th = useTheme(), us = units(g, BD), q = us.filter(x => x === it.id).length, on = q > 0, free = it.free || it.price === 0, lab = !it.avail ? 'Unavailable' : free ? 'Free' : g.kind === 'many' && us.length < g.inc ? 'Free' : '+' + money(it.price);
  return (
    <View style={{width: 96, opacity: it.avail ? 1 : 0.45}}>
      <Pressable accessibilityRole="button" accessibilityLabel={it.name + ', ' + lab + (on ? ', selected ' + q : '')} accessibilityState={{selected: on, disabled: !it.avail}} disabled={!it.avail} onPress={() => bzAdd(g.id, it.id)} style={{alignItems: 'center', gap: 4, paddingTop: 10, paddingBottom: 8, paddingHorizontal: 4, borderRadius: 16, borderWidth: 2, borderColor: on ? th.br : th.line, backgroundColor: on ? th.brt : th.card, minHeight: 100}}>
        <View style={{width: 46, height: 46, borderRadius: 23, backgroundColor: th.soft, alignItems: 'center', justifyContent: 'center'}}><TileIcon it={it} type={b.type} /></View>
        <T size={12.5} weight="700" align="center" style={{lineHeight: 14}}>{it.name}</T>
        <T size={11.5} color={on ? th.brd : th.mut} weight={on ? '700' : undefined}>{lab}</T>
      </Pressable>
      {on ? <View style={{position: 'absolute', top: -4, right: -4, minWidth: 22, height: 22, paddingHorizontal: 5, borderRadius: 11, backgroundColor: th.br, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: th.bg}}><T size={12} weight="800" color="#fff">{q > 1 ? '×' + q : '✓'}</T></View> : null}
      {on && g.kind === 'many' ? <Pressable accessibilityLabel={'Remove one ' + it.name} onPress={() => bzSub(g.id, it.id)} style={{position: 'absolute', top: -6, left: -6, width: 30, height: 30, borderRadius: 15, backgroundColor: th.bg, borderWidth: 2, borderColor: th.br, alignItems: 'center', justifyContent: 'center'}}><T size={18} weight="800">−</T></Pressable> : null}
    </View>
  );
}
function Options({b}: {b: Builder}) {
  const th = useTheme();
  return (
    <View>
      {b.sizes.length ? (
        <View style={{marginTop: 18}}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8}}><T size={16} weight="800">Size</T><T size={12} color={th.mut}>Choose 1 · Required</T></View>
          <View style={{flexDirection: 'row', gap: 8}}>{b.sizes.map(sz => (
            <Pressable key={sz.id} disabled={!sz.avail} onPress={() => bzSize(sz.id)} accessibilityState={{selected: BD.size === sz.id}} style={{flex: 1, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 14, borderWidth: 2, borderColor: BD.size === sz.id ? th.br : th.line, backgroundColor: BD.size === sz.id ? th.brt : th.card, alignItems: 'center', gap: 2, opacity: sz.avail ? 1 : 0.45}}>
              <T size={14} weight="800">{sz.name}</T><T size={11.5} color={th.mut}>{sz.avail ? (sz.add ? '+' + money(sz.add) : 'Base price') : 'Unavailable'}</T>
            </Pressable>))}</View>
        </View>
      ) : null}
      {b.groups.map(g => {const us = units(g, BD); return (
        <View key={g.id} style={{marginTop: 18}}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 8}}>
            <T size={16} weight="800" style={{flexShrink: 1}}>{g.name}{g.kind === 'many' ? <T size={12} color={th.mut} weight="400">{'  ' + us.length + '/' + g.max}</T> : null}</T>
            <T size={12} color={th.mut} align="right">{hint(g)}</T>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginHorizontal: -16}} contentContainerStyle={{paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6, gap: 10}}>{g.items.map(it => <OptTile key={it.id} b={b} g={g} it={it} />)}</ScrollView>
        </View>);})}
    </View>
  );
}
function Review({b}: {b: Builder}) {
  const th = useTheme(), br = bBreak(b, BD), ck = bCheck(b, BD);
  const R = (a: string, c: string, strong?: boolean) => <View style={{flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginVertical: 5, ...(strong ? {borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: th.line, paddingTop: 8, marginTop: 8} : {})}}><T size={strong ? 16 : 13.5} weight={strong ? '800' : undefined} style={{flexShrink: 1}}>{a}</T><T size={strong ? 16 : 13.5} weight={strong ? '800' : undefined} color={strong ? th.ink : th.mut}>{c}</T></View>;
  return (
    <View style={{marginTop: 20, borderWidth: 1, borderColor: th.line, borderRadius: 18, padding: 14, backgroundColor: th.card}}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}><T size={15} weight="800">Your order</T>{bzDirty() && !BD.edit ? <Pressable onPress={bzResetAsk}><T size={12.5} weight="700" color={th.br}>Start over</T></Pressable> : null}</View>
      {R(b.name + (br.size ? ' — ' + br.size.name : ''), money(b.base + (br.size ? br.size.add : 0)))}
      {br.lines.map((L: any) => <View key={L.gid}><T size={11.5} weight="800" color={th.mut} style={{marginTop: 8, letterSpacing: 0.4}}>{String(L.gname).toUpperCase()}</T>{L.items.map((i: any) => <View key={i.id}>{R((i.qty > 1 ? i.qty + '× ' : '') + i.name, i.charge > 0 ? '+' + money(i.charge) : i.inc ? 'Included' : 'Free')}</View>)}</View>)}
      {R('Item price', money(br.total), true)}
      {BD.edit && BD.snap != null && br.total !== BD.snap ? <View style={{backgroundColor: th.brt, borderWidth: 1, borderColor: th.br, borderRadius: 12, padding: 10, marginTop: 10}}><T size={13}>Prices changed since you added this item (was {money(BD.snap)}, now {money(br.total)}). Saving applies the new price.</T></View> : null}
      {ck.conf.length ? <View style={{backgroundColor: th.brt, borderWidth: 1, borderColor: th.br, borderRadius: 12, padding: 10, marginTop: 10}}><T size={13} weight="800">Some choices changed</T>{ck.conf.map(x => <T key={x} size={13}>• {x}</T>)}<T size={13}>Please remove or replace them to continue. We did not change anything for you.</T></View> : null}
    </View>
  );
}

export function ByoFoot() {
  const th = useTheme(); if (!BD || BD.added) return null; const b = bGet(BD.sid, BD.bid); if (!b) return null;
  const ck = bCheck(b, BD), br = bBreak(b, BD), tot = Math.round(br.total * BD.q * 100) / 100, why = ck.errs[0] || ck.conf[0] || '';
  return (
    <View>
      {why ? <T size={12.5} color={th.red} align="center" style={{marginBottom: 8}}>{why}</T> : null}
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
        <Stepper q={BD.q} onMinus={() => bzQty(-1)} onPlus={() => bzQty(1)} />
        <View style={{flex: 1}}><Cta label={(BD.edit ? 'Save changes' : 'Add to Order') + ' · ' + money(tot)} disabled={!ck.ok || !!BD.busy} onPress={bzAddOrder} /></View>
      </View>
      {BD.edit ? <View style={{marginTop: 8}}><Cta small ghost label="Cancel" onPress={bzCancel} /></View> : null}
    </View>
  );
}

export function ByoScreen({p}: {p: string}) {
  const th = useTheme(), a = (p || '').split('|'), sid = a[0], b = bGet(sid, a[1]);
  if (!b || !STB[sid]) return <View><Header title="Builder" onBack={back} /><Empty emoji="🍽️" title="This builder is not available" text="The store may have turned it off." button="Back to Goodies" onPress={browse} /></View>;
  if (!BD || BD.bid !== b.id || BD.sid !== sid) setBD(bDraft(b, sid));
  if (BD.added) return <ByoDone b={b} />;
  const s = STB[sid], un = !b.enabled || !b.available || BYO.store[sid] === false || !s.open;
  return (
    <View style={{flex: 1}}>
      <Header title={b.name} sub={s.n + (BD.edit ? ' · Editing item' : '')} onBack={back} />
      <Stage b={b} />
      <ScrollView style={{flex: 1}} contentContainerStyle={{paddingHorizontal: 16, paddingTop: 15, paddingBottom: 20}} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {un ? <Warn><T weight="800" size={13}>Currently unavailable. </T><T size={13}>{s.open ? 'The store paused this item.' : s.n + ' is closed.'} You can look, but it cannot be added right now.</T></Warn> : null}
        {BD.resumed ? <Warn><T size={13}>Resuming the draft you left earlier.</T></Warn> : null}
        <Options b={b} />
        {b.notes ? (
          <View style={{marginTop: 18}}>
            <T size={14} weight="700" style={{marginBottom: 6}}>Anything else we should know?</T>
            <TextInput value={BD.note} onChangeText={bzNote} maxLength={200} multiline placeholder="E.g. light sauce, cut into 8 slices…" placeholderTextColor={th.mut} style={{minHeight: 64, fontSize: 15, color: th.ink, backgroundColor: th.soft, borderWidth: 1, borderColor: th.line, borderRadius: 12, padding: 12, textAlignVertical: 'top'}} />
            <T size={12} color={th.mut} align="right" style={{marginTop: 3}}>{BD.note.length}/200</T>
          </View>
        ) : null}
        <Review b={b} />
      </ScrollView>
    </View>
  );
}
const Warn = ({children}: any) => {const th = useTheme(); return <View style={{backgroundColor: th.brt, borderWidth: 1, borderColor: th.br, borderRadius: 12, padding: 10, marginBottom: 10}}><Text>{children}</Text></View>;};
function Header({title, sub, onBack}: {title: string; sub?: string; onBack: () => void}) {
  const th = useTheme(), ins = useSafeAreaInsets();
  return (
    <>
      <View style={{height: 100, justifyContent: 'flex-end', paddingTop: ins.top, paddingHorizontal: 16, paddingBottom: 10}}>
        <View style={{height: 40, flexDirection: 'row', alignItems: 'center', gap: 10}}>
          <Circ icon="chevL" label="Back" onPress={onBack} />
          <View style={{flex: 1, justifyContent: 'center'}}><T size={20} weight="800" style={{lineHeight: 22}}>{title}</T>{sub ? <T size={12} color={th.mut}>{sub}</T> : null}</View>
        </View>
      </View>
      <View style={{height: 20, backgroundColor: '#FD802E'}} />
      <View style={{height: 15}} />
    </>
  );
}
function ByoDone({b}: {b: Builder}) {
  const th = useTheme();
  return (
    <View>
      <Header title="Added to your order" onBack={back} />
      <View style={{alignItems: 'center', paddingTop: 30, paddingHorizontal: 20}}>
        {b.type === 'burger' ? <LinearGradient colors={['#2C4A5B', '#233D4C']} style={{alignSelf: 'stretch', borderRadius: 24, paddingVertical: 8, alignItems: 'center'}}><BurgerStage b={b} fin /></LinearGradient> : <Text style={{fontSize: 64}}>✅</Text>}
        <T size={24} weight="800" style={{marginTop: 10}}>Added to your order!</T>
        <T color={th.mut} style={{marginTop: 4}}>{BD.added.n} · {BD.added.q} × {money(BD.added.p)}</T>
        <T size={13} color={th.mut} align="center" style={{marginTop: 6}}>Nothing has been ordered yet. Add more, or review your cart when you are ready.</T>
        <View style={{alignSelf: 'stretch', marginTop: 20, gap: 10}}><Cta label="Customize Another" onPress={bzAnother} /><Cta ghost label="Continue Shopping" onPress={bzShop} /><Cta ghost label={'View Cart (' + cnt() + ')'} onPress={() => go('cart')} /></View>
      </View>
    </View>
  );
}
