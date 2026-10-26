/* Shared published content provider. Draft content is never read by customer or vendor clients. */
import {fetchPublishedWantissContent} from '../lib/wantissCms';
import {tx} from './i18n';
import {contentHooks} from './store';
import type {Txt} from './data/types';

export interface Asset {u: string; w: number; h: number; ver: number}
export const ASSETS: Record<string, Asset> = {};
export const LAYOUT: Record<string, {rk: number | null; w: number | null; k: number | null; off?: boolean}> = {};
export let C: any = null; /* raw Admin export, or null = use seed */
const subs = new Set<() => void>();
export const onContent = (f: () => void) => {subs.add(f); return () => {subs.delete(f);};};

export function applyContent(json: any) {
  if (!json || json.v !== 5) throw new Error('This is not a Wantiss Admin Goodies export (version 5).');
  C = json;
  Object.keys(ASSETS).forEach(k => delete ASSETS[k]); Object.keys(LAYOUT).forEach(k => delete LAYOUT[k]);
  (json.lib || []).forEach((a: any) => {
    LAYOUT[a.id] = {rk: a.rk, w: a.w, k: a.k, off: a.st === 'off'};
    if (a.img && a.img.data && a.st !== 'off') ASSETS[a.id] = {u: a.img.data, w: a.img.w, h: a.img.h, ver: a.ver || 0};
  });
  subs.forEach(f => f());
}
export async function loadContent() {
  try {
    const remote = await fetchPublishedWantissContent('en');
    const record = remote.content.find(x => x.content_key === 'goodies.content' || x.content_key === 'goodies');
    const payload: any = record?.payload;
    if (payload && payload.v === 5) {
      const assetByKey = new Map(remote.assets.map(a => [a.asset_key, a.url]));
      (payload.lib || []).forEach((item: any) => {
        const key = item.img?.assetKey || item.img?.asset_key;
        if (key && assetByKey.has(key)) item.img.data = assetByKey.get(key);
      });
      applyContent(payload);
    } else {
      C = null;
      Object.keys(ASSETS).forEach(k => delete ASSETS[k]);
      Object.keys(LAYOUT).forEach(k => delete LAYOUT[k]);
      subs.forEach(f => f());
    }
  } catch {
    C = null;
    Object.keys(ASSETS).forEach(k => delete ASSETS[k]);
    Object.keys(LAYOUT).forEach(k => delete LAYOUT[k]);
    subs.forEach(f => f());
  }
}
export async function importContent(text: string) { const j = JSON.parse(text); applyContent(j); }
export async function clearContent() { C = null; Object.keys(ASSETS).forEach(k => delete ASSETS[k]); Object.keys(LAYOUT).forEach(k => delete LAYOUT[k]); subs.forEach(f => f()); }
export const hasContent = () => !!C;

/* ---------- accessors ---------- */
export function categories(): {id: string; name: Txt; emoji: string; art?: string | null}[] {
  if (!C) return [];
  return C.cats.filter((c: any) => c.st === 'on').sort((a: any, b: any) => a.ord - b.ord).map((c: any) => ({id: c.id, name: c.name, emoji: c.emoji, art: c.art ? c.art.data : null, home: c.home}));
}
export const catName = (id: string) => {const c = categories().find(x => x.id === id); return c ? tx(c.name) : id === 'all' ? 'All stores' : id;};
export const label = (id: string, fallback: string) => {const l = C && C.labels && C.labels.find((x: any) => x.id === id); const s = l ? tx(l.t) : ''; return s || fallback;};
const live = (r: any) => {const n = new Date().toISOString().slice(0, 10); return r.st === 'Live' && (!r.from || r.from <= n) && (!r.to || r.to >= n);};
export type PromoCard = {id: string; emoji: string; image?: string | null; color: 'plum' | 'orange' | 'green'; title: string; sub: string; btn: string; target: string; newOnly: boolean};
export function promoCards(): PromoCard[] | null {
  if (!C) return [];
  return C.promos.filter(live).sort((a: any, b: any) => a.ord - b.ord).map((p: any) => ({id: p.id, emoji: p.emoji, image: p.img?.data || p.art?.data || null, color: p.color, title: tx(p.title), sub: tx(p.sub), btn: tx(p.btn), target: p.target, newOnly: p.aud === 'New customers'}));
}
export function deals(): [string, number, number][] {
  if (!C) return [];
  return C.deals.filter((d: any) => d.st === 'Live' && d.rs !== 'alcohol').map((d: any) => [d.item, d.pct, d.left]);
}
export function dealEnd(): number | null {return C && C.dealEnd ? new Date(C.dealEnd).getTime() : null;}
export function coupons() {
  if (!C) return [];
  return C.coupons.filter(live).map((c: any) => ({c: c.code, t: tx(c.title), d: tx(c.desc), min: c.min, ty: c.kind === 'Percent' ? 'pct' : 'ship', v: c.val, st: c.store === 'All stores' ? undefined : c.store}));
}
export const fees = () => {
  const f = C ? C.fees : null;
  return {svc: Number(f?.svc ?? 0), firstFree: !!f?.first, tips: f ? String(f.tips ?? '').split(',').filter(Boolean).map(Number) : [], lead: Number(f?.lead ?? 0), step: Number(f?.step ?? 0), slots: Number(f?.slots ?? 0), far: Number(f?.far ?? 0),
    pay: f?.pay ?? {Wallet: 0, MonCash: 0, Card: 0, Cash: 0}, rfSvc: !!f?.rfSvc, rfTip: !!f?.rfTip};
};
/* alcohol minimum age by country (admin table), default elsewhere */
export function minAge(cc: string | null | undefined): number {
  if (!C) return cc === 'HT' || cc === 'DO' ? 18 : 21;
  const r = (C.ages || []).find((a: any) => a.cc === cc); return r ? r.age : C.ageDef;
}
export const rgText = (id: string, fallback: string, age: number) => {const t = C && C.rg && C.rg.texts.find((x: any) => x.id === id); return (t ? tx(t.t) || fallback : fallback).replace(/\{age\}/g, String(age));};
export const rulesLive = () => !!(C && C.rg && C.rg.live);
export const stageLabels = (pickup: boolean, fallback: string[]) => {
  if (!C) return [];
  const L = C.stages.filter((s: any) => (pickup ? /^stg\.p/ : /^stg\.d/).test(s.id)); return L.length === fallback.length ? L.map((s: any, i: number) => tx(s.t) || fallback[i]) : fallback;
};
export const faq = (_fallback: [string, string][]): [string, string][] => (C && Array.isArray(C.faq) ? C.faq.map((f: any) => [tx(f.q), tx(f.a)] as [string, string]) : []);
export const supportTopics = (_fallback: string[]) => (C && Array.isArray(C.topics) ? C.topics.map((t: any) => tx(t.t)) : []);
export function legalDoc(id: string): string | null {const d = C && C.legal && C.legal.find((x: any) => x.id === id && x.st === 'Live'); const s = d ? tx(d.t) : ''; return s || null;}

export function modes(): {emoji: string; image?: string | null; title: string; sub: string; cat: string}[] | null {
  if (!C || !C.modes) return [];
  return C.modes.filter((m: any) => m.st === 'Live').map((m: any) => ({emoji: m.emoji, image: m.img?.data || m.art?.data || null, title: tx(m.title), sub: tx(m.sub), cat: m.cat}));
}
contentHooks.coupons = coupons; contentHooks.fees = fees; contentHooks.minAge = minAge;
