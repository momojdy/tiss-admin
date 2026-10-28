/** Goodies builder engine: validation, pricing, draft state and actions. */
import React from 'react';
import {View, Pressable} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {supabase} from '../../lib/supabase';
import {previewOnly, S, STB, ui, toast, emit, save, push, navBack, cur, hooks, money} from '../store';
import {TEMPLATES} from './templates';
import {T, useTheme, Tile} from '../components/ui';

export const BKEY = 'goodies-byo-v4';
const r2 = (n: number) => Math.round(n * 100) / 100;
const cl = <X,>(o: X): X => JSON.parse(JSON.stringify(o));
const rid = () => Math.random().toString(36).slice(2, 10);

export type BItem = {id: string; name: string; price: number; free: boolean; avail: boolean; assetId: string | null; col: string; max?: number};
export type BGroup = {id: string; name: string; kind: 'one' | 'many'; req: boolean; min: number; max: number; inc: number; me: number; items: BItem[]};
export type Builder = {id: string; type: 'pizza' | 'burger' | 'custom'; name: string; desc: string; emoji: string; enabled: boolean; available: boolean; base: number; notes: boolean; sizes: {id: string; name: string; add: number; avail: boolean}[]; groups: BGroup[]};

export function bClean(b: any): Builder | null {
  try {
    if (!b || typeof b !== 'object' || !b.id || ['pizza', 'burger', 'custom'].indexOf(b.type) < 0) return null;
    const num = (v: any) => Math.max(0, parseFloat(v) || 0);
    return {
      id: String(b.id), type: b.type, name: String(b.name || 'Build Your Own').slice(0, 60), desc: String(b.desc || '').slice(0, 160), emoji: String(b.emoji || '🍽️').slice(0, 4),
      enabled: b.enabled !== false, available: b.available !== false, base: num(b.base), notes: b.notes !== false,
      sizes: (Array.isArray(b.sizes) ? b.sizes : []).filter((s: any) => s && s.id).map((s: any) => ({id: String(s.id), name: String(s.name || 'Size').slice(0, 30), add: num(s.add), avail: s.avail !== false})),
      groups: (Array.isArray(b.groups) ? b.groups : []).filter((g: any) => g && g.id).map((g: any) => {
        const one = g.kind === 'one', max = one ? 1 : Math.max(1, parseInt(g.max, 10) || 1);
        return {
          id: String(g.id), name: String(g.name || 'Options').slice(0, 40), kind: one ? 'one' : 'many', req: !!g.req, min: one ? (g.req ? 1 : 0) : Math.max(0, parseInt(g.min, 10) || 0), max, inc: one ? 0 : Math.max(0, parseInt(g.inc, 10) || 0), me: one ? 1 : Math.max(1, parseInt(g.me, 10) || max),
          items: (Array.isArray(g.items) ? g.items : []).filter((i: any) => i && i.id).map((i: any) => ({id: String(i.id), name: String(i.name || 'Item').slice(0, 40), price: num(i.price), free: !!i.free, avail: i.avail !== false, assetId: i.assetId ? String(i.assetId) : null, col: /^#[0-9a-f]{6}$/i.test(i.col) ? i.col : '#D9A441', max: i.max ? Math.max(1, parseInt(i.max, 10) || 1) : undefined})),
        };
      }),
    };
  } catch (e) {return null;}
}
/* template -> builder with fresh ids */
export function fromTemplate(type: 'pizza' | 'burger' | 'custom'): Builder {
  const t = TEMPLATES[type];
  return bClean({
    id: rid(), type, name: t.name, desc: t.desc, emoji: t.emoji, base: t.base, notes: true,
    sizes: t.sizes.map(s => ({id: rid(), name: s.name, add: s.add, avail: true})),
    groups: t.groups.map(g => ({...g, id: rid(), items: g.items.map(i => ({...i, id: rid(), avail: true}))})),
  }) as Builder;
}

export const BYO: {cfg: Record<string, Builder[]>; store: Record<string, boolean>; drafts: Record<string, any>} = {cfg: {}, store: {}, drafts: {}};
export async function loadBuilders() {
  if (!previewOnly) try {
    const r = JSON.parse((await AsyncStorage.getItem(BKEY)) || 'null');
    if (r && typeof r === 'object') {if (r.cfg && !Array.isArray(r.cfg)) BYO.cfg = r.cfg; if (r.drafts) BYO.drafts = r.drafts; if (r.store) BYO.store = r.store;}
  } catch (e) {}
  if (!Object.keys(BYO.cfg).length) {const seed: any = {}; ['s12', 's1', 's10'].forEach(k => (seed[k] = [fromTemplate('pizza'), fromTemplate('burger')])); BYO.cfg = seed;}
  Object.keys(BYO.cfg).forEach(k => {if (!STB[k] || !Array.isArray(BYO.cfg[k])) {delete BYO.cfg[k]; return;} BYO.cfg[k] = BYO.cfg[k].map(bClean).filter(Boolean) as Builder[];});
  // Production builders come from the server, never from another user's local cache.
  try {
    const stores = Object.values(STB);
    const businessIds = Array.from(new Set(stores.map((s: any) => String(s.businessId || '')).filter(Boolean)));
    if (businessIds.length) {
      const {data, error} = await supabase.from('goodies_builder_configs')
        .select('business_id,builder_id,config,enabled').in('business_id', businessIds).eq('enabled', true);
      if (error) throw error;
      for (const store of stores as any[]) {
        const rows = (data || []).filter((row: any) => row.business_id === store.businessId);
        BYO.cfg[store.id] = rows.map((row: any) => bClean(row.config)).filter((b: Builder | null): b is Builder => !!b && b.enabled && b.available);
      }
    }
  } catch (e) {
    // If the live builder read fails, fail closed: don't offer locally cached custom items.
    Object.values(STB).forEach((store: any) => { BYO.cfg[store.id] = []; });
  }
  bsave(); emit();
}
export const bsave = () => {try {AsyncStorage.setItem(BKEY, JSON.stringify(BYO));} catch (e) {}};
export const bFor = (sid: string) => BYO.cfg[sid] || [];
export const bGet = (sid: string, id: string) => bFor(sid).filter(b => b.id === id)[0];
export const units = (g: BGroup, d: any): string[] => {const a = d.sel && d.sel[g.id]; return Array.isArray(a) ? a : [];};
export const itemOf = (g: BGroup, id: string) => g.items.filter(i => i.id === id)[0];
export const byoList = (sid: string) => (BYO.store[sid] === false ? [] : bFor(sid).filter(b => b.enabled));
export const byoOn = (sid: string) => byoList(sid).length > 0;
export const byoNames = (sid: string) => byoList(sid).map(b => b.name + ' build your own custom').join(' ');
export const limitOf = (g: BGroup, it: BItem) => Math.min(g.me, it.max || g.me);

export function bBreak(b: Builder, d: any) {
  let tot = b.base; const sz = b.sizes.filter(s => s.id === d.size)[0], lines: any[] = []; if (sz) tot += sz.add;
  b.groups.forEach(g => {
    const map: any = {}, ord: string[] = [];
    units(g, d).forEach((id, k) => {
      const it = itemOf(g, id); if (!it) return;
      const ch = it.free || k < (g.kind === 'one' ? 0 : g.inc) ? 0 : it.price; tot += ch;
      if (!map[id]) {map[id] = {id, name: it.name, qty: 0, charge: 0, inc: true}; ord.push(id);}
      map[id].qty++; map[id].charge = r2(map[id].charge + ch); if (ch > 0) map[id].inc = false;
    });
    if (ord.length) lines.push({gid: g.id, gname: g.name, items: ord.map(i => map[i])});
  });
  return {total: r2(tot), size: sz, lines};
}
export function bCheck(b: Builder, d: any) {
  const errs: string[] = [], conf: string[] = [], s = STB[d.sid];
  if (!s || BYO.store[d.sid] === false || !b.enabled || !b.available) errs.push('This builder is currently unavailable'); else if (!s.open) errs.push(s.n + ' is closed right now');
  if (b.sizes.length) {const sz = b.sizes.filter(x => x.id === d.size)[0]; if (!sz) errs.push('Choose a size'); else if (!sz.avail) conf.push(sz.name + ' is no longer available. Choose another size');}
  b.groups.forEach(g => {
    const us = units(g, d), mn = g.req || g.min > 0 ? Math.max(1, g.min) : 0; let live = 0; const c: any = {};
    us.forEach(id => {const it = itemOf(g, id); c[id] = (c[id] || 0) + 1; if (!it) conf.push('An item you chose in ' + g.name + ' was removed by the store'); else if (!it.avail) conf.push(it.name + ' is unavailable'); else live++;});
    if (live < mn) errs.push(mn === 1 ? 'Choose ' + g.name.toLowerCase() : 'Choose at least ' + mn + ' in ' + g.name);
    if (us.length > g.max) errs.push('Too many in ' + g.name + ' (max ' + g.max + ')');
    Object.keys(c).forEach(id => {const it = itemOf(g, id); const lim = it ? limitOf(g, it) : g.me; if (c[id] > lim) errs.push('At most ' + lim + ' of ' + (it ? it.name : 'the same item') + ' in ' + g.name);});
  });
  return {errs, conf, ok: !errs.length && !conf.length};
}
export const bFlat = (br: any) => br.lines.map((L: any) => L.items.map((i: any) => (i.qty > 1 ? i.qty + '× ' : '') + i.name).join(', ')).join(' · ');
const hs = (s: string) => {let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0;};
export function bLine(b: Builder, d: any, q: number) {
  const br = bBreak(b, d), note = b.notes ? String(d.note || '').trim().slice(0, 200) : '', sel = cl(d.sel);
  return {k: 'byo|' + b.id + '|' + hs(JSON.stringify([d.size, sel, note, br.total])), id: 'byo:' + b.id, n: b.name + (br.size ? ' — ' + br.size.name : ''), e: b.emoji, p: br.total, q, d: bFlat(br), nt: note, byo: {sid: d.sid, bid: b.id, type: b.type, size: d.size, sel, lines: br.lines}};
}
export function lineBad(l: any): string {
  if (!l.byo) return ''; const b = bGet(l.byo.sid, l.byo.bid); if (!b) return 'is no longer offered';
  const d = {sid: l.byo.sid, size: l.byo.size, sel: l.byo.sel}, ck = bCheck(b, d);
  if (!ck.ok) return 'needs changes: ' + (ck.errs[0] || ck.conf[0]);
  if (bBreak(b, d).total !== l.p) return 'has a new price. Open Edit to review it'; return '';
}
hooks.bGet = bGet; hooks.bCheck = bCheck; hooks.bLine = bLine; (hooks as any).lineBad = lineBad;

export let BD: any = null;
export const setBD = (d: any) => {BD = d;};
const dirtyOf = (d: any) => Object.keys(d.sel).some(k => d.sel[k].length) || !!d.note || d.q > 1;
export function bDraft(b: Builder, sid: string) {
  const d: any = {sid, bid: b.id, size: null, sel: {}, note: '', q: 1, hist: [], added: null, busy: 0, leave: 0, edit: null, resumed: 0, exploded: true, assembling: 0, seasoningPulse: 0};
  const fs = b.sizes.filter(s => s.avail)[0], sv = BYO.drafts[b.id]; d.size = fs ? fs.id : null;
  if (sv && typeof sv === 'object' && sv.sid === sid) {
    if (typeof sv.size === 'string') d.size = sv.size;
    if (sv.sel && typeof sv.sel === 'object') Object.keys(sv.sel).forEach(k => {if (Array.isArray(sv.sel[k])) d.sel[k] = sv.sel[k].filter((x: any) => typeof x === 'string');});
    d.note = String(sv.note || '').slice(0, 200); d.q = Math.min(20, Math.max(1, parseInt(sv.q, 10) || 1)); d.resumed = dirtyOf(d) ? 1 : 0;
  }
  return d;
}
export function bzDirty() {
  if (!BD || BD.added) return false;
  if (BD.edit) return JSON.stringify([BD.size, BD.sel, BD.note, BD.q]) !== BD.orig;
  return dirtyOf(BD);
}
export function bDraftSave() {
  if (!BD || BD.edit || BD.added) return;
  if (bzDirty()) BYO.drafts[BD.bid] = {sid: BD.sid, size: BD.size, sel: BD.sel, note: BD.note, q: BD.q}; else delete BYO.drafts[BD.bid];
  bsave();
}
const hist = () => {BD.hist.push(JSON.stringify([BD.size, BD.sel])); if (BD.hist.length > 40) BD.hist.shift();};
const upd = () => {bDraftSave(); emit();};

export function byoOpen(sid: string, bid: string) {
  const b = bGet(sid, bid);
  if (!b || !b.enabled || !b.available || BYO.store[sid] === false) {toast('This builder is not available right now'); return;}
  if (!STB[sid].open) {toast(STB[sid].n + ' is closed right now'); return;}
  BD = bDraft(b, sid); push('byo', sid + '|' + b.id);
}
export function bzAdd(gid: string, iid: string) {
  const b = bGet(BD.sid, BD.bid), g = b && b.groups.filter(x => x.id === gid)[0], it = g && itemOf(g, iid);
  if (!it || !g || BD.added) return;
  if (!it.avail) {toast(it.name + ' is unavailable'); return;}
  const us = units(g, BD).slice();
  if (g.kind === 'one') {if (us[0] === it.id) return; hist(); BD.sel[g.id] = [it.id];}
  else {
    const q = us.filter(x => x === it.id).length;
    if (us.length >= g.max) {toast('You can choose up to ' + g.max + ' in ' + g.name); return;}
    if (q >= limitOf(g, it)) {toast('At most ' + limitOf(g, it) + ' of ' + it.name); return;}
    hist(); us.push(it.id); BD.sel[g.id] = us;
  }
  const a = (it.assetId || '').replace('burger.', '');
  if (/^(pepper|spice)_/.test(a)) BD.seasoningPulse = 1;
  upd();
}
export function bzSub(gid: string, iid: string) {
  const g = bGet(BD.sid, BD.bid)!.groups.filter(x => x.id === gid)[0], us = units(g, BD).slice(), i = us.lastIndexOf(iid);
  if (i < 0) return; hist(); us.splice(i, 1); BD.sel[g.id] = us; upd();
}
export function bzSize(id: string) {
  const b = bGet(BD.sid, BD.bid)!, z = b.sizes.filter(x => x.id === id)[0]; if (!z || !z.avail || BD.size === z.id) return; hist(); BD.size = z.id; upd();
}
export function bzUndo() {const h = BD.hist.pop(); if (!h) return; const a = JSON.parse(h); BD.size = a[0]; BD.sel = a[1]; upd();}
export function bzQty(v: number) {const n = BD.q + v; if (n < 1 || n > 20) return; BD.q = n; upd();}
export function bzNote(t: string) {BD.note = t.slice(0, 200); upd();}
export const bzResetAsk = () => ui.sheet({kind: 'byoreset'});
export function bzReset2() {const b = bGet(BD.sid, BD.bid)!; delete BYO.drafts[b.id]; bsave(); BD = bDraft(b, BD.sid); ui.close(); emit();}
export function bzLeave() {bDraftSave(); BD.leave = 1; ui.close(); navBack();}
export function bzDiscard() {if (!BD.edit) {delete BYO.drafts[BD.bid]; bsave();} BD.leave = 1; ui.close(); navBack();}
export function bzCancel() {BD.leave = 1; navBack();}
export function bzAnother() {const b = bGet(BD.sid, BD.bid)!; delete BYO.drafts[b.id]; BD = bDraft(b, BD.sid); emit();}
export function bzShop() {
  const sid = BD ? BD.sid : cur().p.split('|')[0]; BD = null; let i = -1; S.stack.forEach((x: any, k: number) => {if (x.r === 'store' && x.p === sid) i = k;});
  if (i >= 0) S.stack = S.stack.slice(0, i + 1); else S.stack = [{r: 'home', u: Date.now()}, {r: 'store', p: sid, u: Date.now() + 1}]; emit();
}
export function bzEdit(k: string) {
  const l = S.cart.lines.filter((x: any) => x.k === k)[0]; if (!l || !l.byo) return;
  const b = bGet(l.byo.sid, l.byo.bid);
  if (!b || !b.enabled || BYO.store[l.byo.sid] === false) {toast('This item can no longer be customized. You can remove it from your cart.'); return;}
  BD = {sid: l.byo.sid, bid: b.id, size: l.byo.size, sel: cl(l.byo.sel), note: l.nt || '', q: l.q, hist: [], added: null, busy: 0, leave: 0, edit: l.k, snap: l.p, resumed: 0, exploded: true, assembling: 0, seasoningPulse: 0};
  BD.orig = JSON.stringify([BD.size, BD.sel, BD.note, BD.q]); push('byo', l.byo.sid + '|' + b.id);
}
export function bzRemove(k: string) {
  const c = S.cart, i = c.lines.findIndex((x: any) => x.k === k); if (i < 0) return;
  c.lines.splice(i, 1); if (!c.lines.length) {c.sid = null; S.promo = '';} toast('Removed from your cart'); save(); emit();
}
function bzCommit(b: Builder, ln: any) {
  const c = S.cart; c.sid = BD.sid;
  if (BD.edit) {
    const i = c.lines.findIndex((x: any) => x.k === BD.edit);
    if (i < 0) {toast('That item is no longer in your cart'); BD = null; navBack(); return;}
    c.lines.splice(i, 1); const ex = c.lines.filter((x: any) => x.k === ln.k)[0]; if (ex) ex.q += ln.q; else c.lines.splice(i, 0, ln);
    BD = null; toast('Item updated'); save(); navBack(); return;
  }
  const ex2 = c.lines.filter((x: any) => x.k === ln.k)[0]; if (ex2) ex2.q += ln.q; else c.lines.push(ln);
  delete BYO.drafts[b.id]; bsave(); BD.added = {n: ln.n, q: ln.q, p: ln.p}; BD.busy = 0; S.bump = 1; toast('Added to your order!'); save(); emit();
}
function animateCommit(b: Builder, ln: any) {
  if (!BD || BD.added) return;
  if (b.type !== 'burger') {bzCommit(b, ln); return;}
  BD.busy = 1; BD.assembling = 1; BD.exploded = false; emit();
  setTimeout(() => {if (BD && BD.busy && !BD.added) {BD.assembling = 0; bzCommit(b, ln);}}, 1050);
}
export function bzAddOrder() {
  const b = BD && bGet(BD.sid, BD.bid); if (!b || BD.added || BD.busy) return;
  const ck = bCheck(b, BD); if (!ck.ok) {toast(ck.errs[0] || ck.conf[0]); return;}
  BD.busy = 1; const ln = bLine(b, BD, BD.q), c = S.cart;
  if (!BD.edit && c.sid && c.sid !== BD.sid && c.lines.length) {
    BD.busy = 0; S.pend = [null, null, () => {S.cart = {sid: null, lines: []}; S.promo = ''; ui.close(); animateCommit(b, ln);}];
    ui.sheet({kind: 'newcart', from: STB[c.sid].n, to: STB[BD.sid].n}); return;
  }
  animateCommit(b, ln);
}
hooks.byoGuard = () => {
  if (!BD || BD.leave || BD.added || !bzDirty()) return false;
  ui.sheet({kind: 'byoleave', edit: !!BD.edit}); return true;
};
hooks.byoClear = () => {if (BD) {bDraftSave();} BD = null;};

function TagText({text}: {text: string}) {const th = useTheme(); return <T size={13} weight="700" color={th.brd} style={{marginTop: 3}}>{text}</T>;}
export function byoTag(sid: string): React.ReactNode {
  const l = byoList(sid); if (!l.length) return null;
  return <TagText text={'Build your own ' + l.map(b => b.emoji).join(' ')} />;
}
function ByoRow({b, s}: {b: Builder; s: any}) {
  const th = useTheme(), ok = b.available && s.open;
  let mn = b.sizes.filter(z => z.avail).reduce((a, z) => Math.min(a, z.add), 1e9); if (mn === 1e9) mn = 0;
  return (
    <Pressable disabled={!ok} onPress={() => byoOpen(s.id, b.id)} style={{flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: th.line, opacity: ok ? 1 : 0.55}}>
      <Tile e={b.emoji} bg="bg3" />
      <View style={{flex: 1}}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap'}}><T weight="700">{b.name}</T><View style={{backgroundColor: th.brt, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 2}}><T size={11} weight="800" color={th.brd}>Build your own</T></View></View>
        <T size={12.5} color={th.mut}>{ok ? (b.desc || 'Customize it your way') + ' · from ' + money(b.base + mn) : 'Currently unavailable'}</T>
      </View>
      {ok ? <View style={{backgroundColor: th.br, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8}}><T size={13} weight="800" color="#fff">{BYO.drafts[b.id] ? 'Resume' : 'Build'}</T></View> : null}
    </Pressable>
  );
}
export function byoRows(sid: string, q: string): React.ReactNode {
  const s = STB[sid];
  return byoList(sid).filter(b => !q || (b.name + ' ' + b.desc + ' custom build').toLowerCase().indexOf(q) > -1).map(b => <ByoRow key={b.id} b={b} s={s} />);
}
