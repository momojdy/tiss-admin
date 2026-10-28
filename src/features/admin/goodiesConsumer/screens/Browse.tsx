import React, {useEffect, useRef, useState} from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {View, Text, Pressable, ScrollView, TextInput, useWindowDimensions} from 'react-native';
import {Icon} from '../components/Icon';
import {T, Mut, Grad, Circ, Bar, Sh, Rail, Chip, Chips, Cta, Card, Row, Badge, Ttl, Empty, Tile, bgIdx, useTheme, heartBtn} from '../components/ui';
import {Dish, VCard, StoreCard, ItemRow} from '../components/cards';
import {S, ST, STB, IT, DEALS, PR, money, addr, cnt, unread, first, filt, FCH, emit, save, toast, ui} from '../store';
import {categories, catName, label, promoCards, deals, dealEnd, coupons, modes} from '../content';
import {DEFAULT_PROMOS} from '../data/defaultPromos';
import {Image} from 'react-native';
import {go, tab, back, browse, setFilter, setSub, clearFilters, usePromo, openNotif, readAll, heart} from '../actions';
import {byoNames} from '../builders/engine';
import {Sel, useEditing} from '../editContext';
import {t as tr, tx} from '../i18n';
import {MODE1, PROMO} from '../theme';
import {supabase} from '../../lib/supabase';

const cname = (id: string) => catName(id);
function Mode({id, title, sub, emoji, image, onPress, grad, bg, fg, small}: any) {
  const ed = useEditing();
  return (
    <Pressable onPress={onPress} style={{borderRadius: 18, overflow: 'hidden', height: small ? 51 : 112}}>
      {grad ? <Grad colors={MODE1} style={{flex: 1, padding: small ? 0 : 14, paddingHorizontal: 14, justifyContent: small ? 'center' : 'flex-start'}}>{inner()}</Grad> : <View style={{flex: 1, backgroundColor: bg, paddingHorizontal: 14, padding: small ? 0 : 14, justifyContent: small ? 'center' : 'flex-start'}}>{inner()}</View>}
    </Pressable>
  );
  function inner() {
    const c = grad ? '#fff' : fg;
    /* Editable elements are wrapped only when the admin editor provides a mode id. */
    const wrap = (field: 'title' | 'sub', node: any) => id ? <Sel sel={{kind: 'mode', id, field}}>{node}</Sel> : node;
    const imgBox: any = {position: 'absolute', right: small ? 7 : 4, bottom: small ? 2 : -4, top: small ? 4 : undefined, width: small ? 38 : 76, height: small ? 38 : 76};
    const fs = small ? 34 : 62, lh = small ? 36 : 62;
    const emojiBox: any = {position: 'absolute', right: small ? 10 : 6, bottom: small ? undefined : -4, top: small ? 8 : undefined, fontSize: fs, lineHeight: lh};
    const art = image
      ? <Image source={{uri: image}} style={ed && id ? {width: '100%', height: '100%'} : imgBox} resizeMode="contain" />
      : <Text style={ed && id ? {fontSize: fs, lineHeight: lh, textAlign: 'center'} : emojiBox}>{emoji}</Text>;
    const artBox: any = image ? imgBox : {position: 'absolute', right: emojiBox.right, bottom: emojiBox.bottom, top: emojiBox.top, width: Math.round(fs * 1.25), height: lh};
    return (
      <>
        {wrap('title', <T size={small ? 14.5 : 17} weight="800" color={c} style={{lineHeight: small ? undefined : 19.5}}>{title}</T>)}
        {sub ? wrap('sub', <T size={12} color={c} style={{marginTop: 3, opacity: 0.9}}>{sub}</T>) : null}
        {id ? <Sel sel={{kind: 'mode', id, field: 'art'}} style={artBox}>{art}</Sel> : art}
      </>
    );
  }
}

function PromoCard({id, kind, title, sub, btn, emoji, image, target}: {id?: string; kind: keyof typeof PROMO; title: string; sub: string; btn: string; emoji: string; image?: string | null; target?: string}) {
  const ed = useEditing() && !!id;
  const wrap = (field: 'title' | 'sub' | 'btn' | 'art', node: any, style?: any) => id ? <Sel sel={{kind: 'promo', id, field}} style={style}>{node}</Sel> : node;
  const btnBox: any = {position: 'absolute', left: 16, bottom: 8};
  const btnStyle: any = {backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7};
  const imgBox: any = {position: 'absolute', right: 5, bottom: 2, width: 88, height: 88};
  const emojiBox: any = {position: 'absolute', right: 8, bottom: 0, fontSize: 78, lineHeight: 78};
  const art = image
    ? <Image source={{uri: image}} style={ed ? {width: '100%', height: '100%'} : imgBox} resizeMode="contain" />
    : <Text style={ed ? {fontSize: 78, lineHeight: 78, textAlign: 'center'} : emojiBox}>{emoji}</Text>;
  const artBox: any = image ? imgBox : {position: 'absolute', right: 8, bottom: 0, width: 98, height: 78};
  return (
    <Pressable onPress={() => ui.sheet({kind: 'promo', p: kind === 'plum' ? 'free' : kind === 'orange' ? 'points' : 'produce', custom: {title, sub, btn, emoji, target}})}>
      <Grad colors={PROMO[kind]} angle={110} style={{width: 300, height: 124, borderRadius: 18, padding: 12, overflow: 'hidden'}}>
        {wrap('title', <T size={18} weight="800" color="#fff" lines={2} style={{width: 170, lineHeight: 21}}>{title}</T>)}
        {wrap('sub', <T size={11.5} color="#fff" lines={2} style={{marginTop: 3, width: 170, lineHeight: 14, opacity: 0.92}}>{sub}</T>)}
        {id
          ? <Sel sel={{kind: 'promo', id, field: 'btn'}} style={btnBox}><View style={btnStyle}><T size={12.5} weight="800" color="#1B1B1F">{btn}</T></View></Sel>
          : <View style={{...btnBox, ...btnStyle}}><T size={12.5} weight="800" color="#1B1B1F">{btn}</T></View>}
        {id ? <Sel sel={{kind: 'promo', id, field: 'art'}} style={artBox}>{art}</Sel> : art}
      </Grad>
    </Pressable>
  );
}

function Countdown() {
  const th = useTheme();
  const end = dealEnd(), [s, setS] = useState(end ? Math.max(0, Math.floor((end - Date.now()) / 1000)) : 2 * 3600 + 14 * 60 + 37);
  useEffect(() => {const id = setInterval(() => setS(x => (end ? Math.max(0, Math.floor((end - Date.now()) / 1000)) : x > 0 ? x - 1 : 0)), 1000); return () => clearInterval(id);}, []);
  const p = (n: number) => String(n).padStart(2, '0');
  return <View style={{backgroundColor: th.red, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4}}><T size={12} weight="800" color="#fff">Ends in {p(Math.floor(s / 3600))}:{p(Math.floor((s % 3600) / 60))}:{p(s % 60)}</T></View>;
}

export function Home({onExit}: {onExit?: () => void}) {
  const th = useTheme(), ins = useSafeAreaInsets(), CATS = categories();
  const seen: any = {}, os = S.orders.filter((o: any) => {if (seen[o.sid]) return false; seen[o.sid] = 1; return true;}).slice(0, 6);
  const cat = (c: string) => ST.filter(s => s.c === c).flatMap(s => s.it);
  const rv = S.rv.filter((id: string) => IT[id]).slice(0, 6), md = modes(), pc = promoCards(), dl = deals();
  return (
    <View>
      <View style={{height: 100, justifyContent: 'flex-end', paddingTop: ins.top, paddingBottom: 10, paddingHorizontal: 16}}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
        <Circ icon="chevL" label={tr('back')} onPress={onExit || back} />
        <Pressable onPress={() => go('addresses')} style={{flex: 1, minWidth: 0}}>
          <T size={11.5} color={th.mut}>{tr('deliverTo')}</T>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}><T size={15.5} weight="800" lines={1} style={{flexShrink: 1}}>{addr()?.t || 'Choose your location'}</T><Icon name="chevD" size={14} color={th.ink} /></View>
        </Pressable>
        <Circ icon="heart" label="Customer favorites" color="#FD802E" onPress={() => go('favs')} />
        <Circ icon="bell" label="Notifications" dot={unread()} onPress={() => go('notifs')} />
        <Circ icon="gear" label={tr('settings')} onPress={() => go('settings')} />
      </View>
      </View>
      <Pressable onPress={() => go('search')} style={{marginTop: 14, marginHorizontal: 16, height: 48, borderRadius: 24, backgroundColor: th.soft, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16}}>
        <Icon name="search" size={18} color={th.mut} /><Sel sel={{kind: 'label', id: 'lbl.search', field: 'text'}}><T size={14.5} color={th.mut}>{label('lbl.search', tr('searchPh'))}</T></Sel>
      </Pressable>
      <View style={{flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 16}}>
        <View style={{flex: 1.25}}><Mode id={md && md[0] ? md[0].id : undefined} grad title={(md && md[0] ? md[0].title : tr('foodDelivery')).replace(' ', '\n')} sub={md && md[0] ? md[0].sub : tr('hotFresh')} emoji={md && md[0] ? md[0].emoji : '🍛'} image={md && md[0] ? md[0].image : null} onPress={() => go('catlist', md && md[0] ? md[0].cat : 'restaurants')} /></View>
        <View style={{flex: 1, gap: 10}}>
          <Mode id={md && md[1] ? md[1].id : undefined} small bg={th.m2bg} fg={th.m2fg} title={md && md[1] ? md[1].title : tr('groceries')} emoji={md && md[1] ? md[1].emoji : '🛒'} image={md && md[1] ? md[1].image : null} onPress={() => go('catlist', md && md[1] ? md[1].cat : 'groceries')} />
          <Mode id={md && md[2] ? md[2].id : undefined} small bg={th.m3bg} fg={th.m3fg} title={md && md[2] ? md[2].title : tr('drugstore')} emoji={md && md[2] ? md[2].emoji : '💊'} image={md && md[2] ? md[2].image : null} onPress={() => go('catlist', md && md[2] ? md[2].cat : 'drugstore')} />
        </View>
      </View>
      <View style={{marginTop: 18}}><Rail gap={14}>
        {CATS.map(c => (
          <Pressable key={c.id} onPress={() => go('catlist', c.id)} style={{width: 68, alignItems: 'center'}}>
            <Sel sel={{kind: 'category', id: c.id, field: 'art'}}><View style={{width: 62, height: 62, borderRadius: 31, backgroundColor: th.soft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>{c.art ? <Image source={{uri: c.art}} style={{width: 62, height: 62}} resizeMode="cover" /> : <Text style={{fontSize: 30}}>{c.emoji}</Text>}</View></Sel>
            <Sel sel={{kind: 'category', id: c.id, field: 'title'}}><T size={11.5} weight="600" align="center" style={{marginTop: 6, lineHeight: 14}}>{tx(c.name)}</T></Sel>
          </Pressable>
        ))}
      </Rail></View>
      <View style={{marginTop: 20}}><Rail>
        {pc ? pc.filter(x => !x.newOnly || first()).map(x => <PromoCard key={x.id} id={x.id} kind={x.color} title={x.title} sub={x.sub} btn={x.btn} emoji={x.emoji} image={x.image} target={x.target} />) : DEFAULT_PROMOS.filter((promo) => promo.aud !== 'New customers' || first()).map((promo) => <PromoCard key={promo.id} kind={promo.color} title={promo.title} sub={promo.sub} btn={promo.btn} emoji={promo.emoji} />)}
      </Rail></View>
      <View style={{paddingHorizontal: 16, marginTop: 10}}>
        <Pressable onPress={() => go('promos')} style={{flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1.5, borderColor: th.line, borderRadius: 16}}>
          <View style={{flex: 1}}><Sel sel={{kind: 'label', id: 'lbl.coupons', field: 'text'}}><T weight="700">{label('lbl.coupons', tr('couponsOffers'))}</T></Sel><Sel sel={{kind: 'label', id: 'lbl.coupons2', field: 'text'}}><T size={12.5} color={th.mut}>{label('lbl.coupons2', tr('codesCheckout'))}</T></Sel></View>
          <Icon name="chevR" size={16} color={th.ink} />
        </Pressable>
      </View>
      <Sh sel={{kind: 'label', id: 'lbl.flash', field: 'text'}} title={'⚡ ' + label('lbl.flash', tr('flashDeals'))} right={<Countdown />} />
      <Rail>{dl.filter(d => IT[d[0]]).map(d => <Dish key={d[0]} i={IT[d[0]]} off={d[1]} left={d[2]} />)}</Rail>
      {os.length ? (<>
        <Sh sel={{kind: 'label', id: 'lbl.again', field: 'text'}} title={label('lbl.again', tr('orderAgain'))} link="History" onLink={() => tab('orders')} />
        <Rail>{os.map((o: any) => {
          const s = STB[o.sid];
          return (
            <Pressable key={o.id} onPress={() => require('../actions').reorder(o.id)} style={{width: 76, alignItems: 'center'}}>
              <Grad idx={bgIdx(s.bg)} style={{width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: th.br}}>
                <Text style={{fontSize: 30}}>{s.e}</Text>
                <View style={{position: 'absolute', bottom: -5, backgroundColor: th.br, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2}}><T size={9.5} weight="800" color="#fff">Reorder</T></View>
              </Grad>
              <T size={11.5} weight="600" align="center" style={{marginTop: 10}}>{s.n}</T>
            </Pressable>
          );
        })}</Rail>
      </>) : null}
      {rv.length ? (<><Sh sel={{kind: 'label', id: 'lbl.recent', field: 'text'}} title={label('lbl.recent', tr('recentlyViewed'))} /><Rail>{rv.map((id: string) => <Dish key={id} i={IT[id]} />)}</Rail></>) : null}
      <Sh sel={{kind: 'label', id: 'lbl.popular', field: 'text'}} title={label('lbl.popular', tr('popularVendors'))} link={tr('seeAll')} onLink={() => go('catlist', 'all')} />
      <Rail>{ST.slice().sort((a, b) => b.rv - a.rv).slice(0, 6).map(s => <VCard key={s.id} s={s} />)}</Rail>
      <Sh sel={{kind: 'label', id: 'lbl.produce', field: 'text'}} title={'🥭 ' + label('lbl.produce', tr('freshProduce'))} link={tr('seeAll')} onLink={() => go('catlist', 'produce')} />
      <Rail>{cat('produce').map(i => <Dish key={i.id} i={i} />)}</Rail>
      <Sh sel={{kind: 'label', id: 'lbl.haitian', field: 'text'}} title={'🇭🇹 ' + label('lbl.haitian', tr('haitianSpecialties'))} link={tr('seeAll')} onLink={() => go('catlist', 'haitian')} />
      <Rail>{cat('haitian').map(i => <Dish key={i.id} i={i} />)}</Rail>
      <Sh sel={{kind: 'label', id: 'lbl.trending', field: 'text'}} title={'🔥 ' + label('lbl.trending', tr('trending'))} />
      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16}}>{['s1_1', 's4_0', 's5_0', 's6_0'].map(id => <Dish key={id} i={IT[id]} grid />)}</View>
      <Sh title={tr('restaurantsNear')} link={tr('seeAll')} onLink={() => go('catlist', 'all')} />
      <Chips list={FCH} on={S.f} onPick={setFilter} />
      <View style={{gap: 22, paddingTop: 12, paddingHorizontal: 16}}>{filt(ST).slice(0, 5).map(s => <StoreCard key={s.id} s={s} />)}</View>
    </View>
  );
}


/* Explore is the discovery destination for an empty cart. It keeps location,
   availability, category and product discovery together in one scrollable feed. */
export function Explore() {
  const th = useTheme();
  const [scope, setScope] = useState('closest');
  const [category, setCategory] = useState('all');
  const selectedAddress = addr();
  const eligible = ST.filter(s => category === 'all' || s.c === category);
  const visible = eligible.filter(s => scope !== 'open' || !!s.open).slice().sort((x, y) => {
    if (scope === 'closest') return x.km - y.km;
    if (scope === 'open') return x.km - y.km;
    return Number(!!y.open) - Number(!!x.open) || x.km - y.km;
  });
  const products = visible.flatMap(s => s.it.filter(i => !i.oos && i.stock > 0));
  const scopeOptions: [string, string][] = [['closest', 'Closest'], ['open', 'Open now'], ['all', 'All available']];
  const categoryOptions: [string, string][] = [['all', 'All categories'], ...categories().map(c => [c.id, c.emoji + ' ' + tx(c.name)] as [string, string])];
  return (
    <View>
      <Bar title="Explore nearby" onBack={back} />
      <View style={{paddingHorizontal: 16}}>
        <Pressable accessibilityRole="button" accessibilityLabel="Choose browsing address" onPress={() => go('addresses')} style={{flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, borderRadius: 16, backgroundColor: th.soft, marginBottom: 14}}>
          <View style={{width: 40, height: 40, borderRadius: 13, backgroundColor: th.brt, alignItems: 'center', justifyContent: 'center'}}><Icon name="pin" size={20} color={th.br} /></View>
          <View style={{flex: 1}}>
            <T size={11.5} color={th.mut}>BROWSING NEAR</T>
            <T weight="800" size={14.5} lines={2}>{selectedAddress?.t || 'Choose your location'}</T>
            <T size={11.5} color={th.br} style={{marginTop: 2}}>Change address</T>
          </View>
          <Icon name="chevR" color={th.ink} />
        </Pressable>
        <Ttl>Discover your options</Ttl>
        <Chips list={scopeOptions} on={scope} onPick={setScope} />
        <View style={{marginTop: 12}}>
          <Ttl>Categories</Ttl>
          <Chips list={categoryOptions} on={category} onPick={setCategory} />
        </View>
        <Row sp style={{marginTop: 16, marginBottom: 8}}>
          <T size={16} weight="800">{scope === 'open' ? 'Open near you' : scope === 'closest' ? 'Closest to you' : 'All available stores'}</T>
          <T size={11.5} color={th.mut}>{visible.length} stores</T>
        </Row>
      </View>
      {visible.length ? <View style={{paddingHorizontal: 16, gap: 14}}>
        {visible.map(s => <StoreCard key={s.id} s={s} />)}
      </View> : <View style={{paddingHorizontal: 16}}><Empty emoji="🕒" title="No stores match right now" text="Try another category or show all available options." button="Show all available" onPress={() => {setScope('all'); setCategory('all');}} /></View>}
      <View style={{paddingHorizontal: 16, marginTop: 20}}>
        <Sh title="Products to explore" />
        {products.length ? <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12}}>
          {products.map(i => <Dish key={i.id} i={i} grid />)}
        </View> : <T size={13} color={th.mut}>No in-stock products match these filters.</T>}
        <View style={{alignItems: 'center', paddingVertical: 24, gap: 5}}>
          <View style={{width: 36, height: 3, borderRadius: 2, backgroundColor: th.line}} />
          <T size={12} color={th.mut}>You've reached the end of the currently available options.</T>
          <T size={11} color={th.mut}>More stores and products will appear here as the catalog grows.</T>
        </View>
      </View>
    </View>
  );
}

export function Cats() {
  const th = useTheme(), {width} = useWindowDimensions(), w = (width - 32 - 16) / 3;
  const all = [...categories().map(c => ({id: c.id, e: c.emoji, n: tx(c.name), art: c.art})), {id: 'all', e: '🏪', n: 'All stores', art: null as any}];
  return (
    <View style={{paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', rowGap: 18, columnGap: 8}}>
      {all.map(c => (
        <Pressable key={c.id} onPress={() => go('catlist', c.id)} style={{width: w, alignItems: 'center'}}>
          <View style={{width: 62, height: 62, borderRadius: 31, backgroundColor: th.soft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>{c.art ? <Image source={{uri: c.art}} style={{width: 62, height: 62}} resizeMode="cover" /> : <Text style={{fontSize: 30}}>{c.e}</Text>}</View>
          <T size={11.5} weight="600" align="center" style={{marginTop: 6, lineHeight: 14}}>{c.n}</T>
        </Pressable>
      ))}
    </View>
  );
}

export function CatList({p}: {p: string}) {
  const th = useTheme();
  const base = ST.filter(s => p === 'all' || s.c === p), kinds: string[] = [];
  base.forEach(s => {if (kinds.indexOf(s.k) < 0) kinds.push(s.k);});
  const l = filt(base.filter(s => !S.sub || s.k === S.sub)), c = categories().find(x => x.id === p);
  const its = l.flatMap(s => s.it);
  return (
    <View>
      <View style={{paddingHorizontal: 16}}>
        <View style={{marginBottom: 12}}><Mode grad small={false} title={p === 'all' ? 'Everything near you' : cname(p)} sub={l.length + ' store' + (l.length === 1 ? '' : 's') + ' · ' + its.length + ' products'} emoji={c ? c.emoji : '🏪'} onPress={() => {}} /></View>
      </View>
      {p !== 'all' && kinds.length > 1 ? (<><T size={12.5} weight="700" color={th.mut} style={{paddingHorizontal: 16, paddingBottom: 6}}>SUBCATEGORIES</T><Chips list={[['', 'All'], ...kinds.map(k => [k, k] as [string, string])]} on={S.sub} onPick={setSub} /></>) : null}
      <Chips list={FCH} on={S.f} onPick={setFilter} />
      {l.length ? (<>
        {l.length > 1 ? (<><Sh title="Featured vendors" /><Rail>{l.slice().sort((a, b) => b.r - a.r).slice(0, 4).map(s => <VCard key={s.id} s={s} />)}</Rail></>) : null}
        <Sh title="All stores" />
        <View style={{gap: 22, paddingHorizontal: 16}}>{l.map(s => <StoreCard key={s.id} s={s} />)}</View>
        <Sh title="Popular products" />
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16}}>{its.slice(0, 8).map(i => <Dish key={i.id} i={i} grid />)}</View>
      </>) : <Empty emoji="🔎" title="Nothing matches" text="Clear the filter to see every store." button="Clear filters" onPress={clearFilters} />}
    </View>
  );
}

/* Search keeps v24's behaviour: filters, sort, suggestions, recent searches */
export function Search() {
  const th = useTheme(), ins = useSafeAreaInsets();
  const r = S.sr, q = r.q.trim().toLowerCase(), F = r.f, any = Object.keys(F).some(k => F[k]);
  const fl: [string, string][] = [['open', 'Open now'], ['top', 'Rating 4.5+'], ['fast', 'Under 30 min'], ['free', 'Free delivery'], ['sale', 'On sale'], ['p5', 'Under $5'], ['p10', 'Under $10']];
  const sorts: [string, string][] = [['rel', 'Relevance'], ['pop', 'Popularity'], ['lo', 'Price: low to high'], ['hi', 'Price: high to low'], ['rate', 'Highest rating'], ['fast', 'Fastest delivery']];
  const setQ = (v: string) => {S.sr.q = v; emit();};
  const rec = (x: string) => {S.rec = [x].concat(S.rec.filter((y: string) => y.toLowerCase() !== x.toLowerCase())).slice(0, 6);};
  const head = (
    <View>
      <Rail gap={8}>{fl.map(x => <Chip key={x[0]} label={x[1]} on={!!F[x[0]]} onPress={() => {F[x[0]] = !F[x[0]]; emit();}} />)}{any ? <Chip label="Clear all" color={th.red} onPress={() => {S.sr.f = {}; emit();}} /> : null}</Rail>
      <Rail gap={8} style={{paddingTop: 8}}>{sorts.map(x => <Chip key={x[0]} label={x[1]} on={r.sort === x[0]} onPress={() => {S.sr.sort = x[0]; emit();}} />)}</Rail>
    </View>
  );
  let body: any;
  if (!q && !any) {
    body = (
      <View style={{paddingHorizontal: 16}}>
        {S.rec.length ? (<><Ttl>Recent searches</Ttl><View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>{S.rec.map((x: string) => <Chip key={x} label={x} onPress={() => setQ(x)} />)}</View><Pressable onPress={() => {S.rec = []; emit();}}><T size={13} weight="700" color={th.br} style={{marginTop: 8}}>Clear recent</T></Pressable></>) : null}
        <Ttl>Popular searches</Ttl><View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>{['Poulet frit', 'Mango', 'Pain patate', 'Riz', 'Pharmacy', 'Jus', 'Seafood'].map(x => <Chip key={x} label={x} onPress={() => setQ(x)} />)}</View>
        <Ttl>Browse categories</Ttl><View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>{categories().map(c => <Chip key={c.id} label={c.emoji + ' ' + tx(c.name)} onPress={() => go('catlist', c.id)} />)}</View>
      </View>
    );
  } else {
    const inQ = (t: string) => !q || t.toLowerCase().indexOf(q) > -1, sale = (i: any) => deals().some(d => d[0] === i.id);
    const ss = ST.filter(s => inQ(s.n + ' ' + s.k + ' ' + cname(s.c) + ' ' + byoNames(s.id)) && (!F.open || s.open) && (!F.top || s.r >= 4.5) && (!F.fast || parseInt(s.eta.split('–')[1], 10) <= 30) && (!F.free || s.fee === 0) && (!F.sale || s.pr) && !F.p5 && !F.p10);
    let is = ST.flatMap(s => s.it.filter(i => inQ(i.n) && (!F.open || s.open) && (!F.top || s.r >= 4.5) && (!F.fast || parseInt(s.eta.split('–')[1], 10) <= 30) && (!F.free || s.fee === 0) && (!F.sale || sale(i)) && (!F.p5 || i.p < 5) && (!F.p10 || i.p < 10)));
    const so = r.sort, e = (s: any) => parseInt(s.eta, 10);
    if (so === 'lo') is.sort((a, b) => a.p - b.p); if (so === 'hi') is.sort((a, b) => b.p - a.p);
    if (so === 'rate') {ss.sort((a, b) => b.r - a.r); is.sort((a, b) => STB[b.s].r - STB[a.s].r);}
    if (so === 'fast') {ss.sort((a, b) => e(a) - e(b)); is.sort((a, b) => e(STB[a.s]) - e(STB[b.s]));}
    if (so === 'pop') {ss.sort((a, b) => b.rv - a.rv); is.sort((a, b) => STB[b.s].rv - STB[a.s].rv);}
    const cs = q ? categories().filter(c => String(tx(c.name)).toLowerCase().indexOf(q) > -1) : [];
    const set: string[] = [];
    if (q) ST.forEach(s => {if (s.n.toLowerCase().indexOf(q) === 0 && set.indexOf(s.n) < 0) set.push(s.n); s.it.forEach(i => {const w = i.n.toLowerCase(); if ((w.indexOf(q) === 0 || w.indexOf(' ' + q) > -1) && set.indexOf(i.n) < 0) set.push(i.n);});});
    const sug = set.filter(x => x.toLowerCase() !== q).slice(0, 5);
    body = (!ss.length && !is.length && !cs.length)
      ? <Empty emoji="🤷" title={'No results' + (q ? ' for "' + r.q + '"' : '')} text="Try another word, or remove a filter." button={any ? 'Clear filters' : 'Clear search'} onPress={() => {if (any) S.sr.f = {}; else S.sr.q = ''; emit();}} />
      : (
        <View style={{paddingHorizontal: 16}}>
          {sug.length ? (<><Ttl>Suggestions</Ttl><View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>{sug.map(x => <Chip key={x} label={x} onPress={() => setQ(x)} />)}</View></>) : null}
          {cs.length ? (<><Ttl>Categories</Ttl><View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>{cs.map((c: any) => <Chip key={c.id} label={c.emoji + ' ' + tx(c.name)} onPress={() => go('catlist', c.id)} />)}</View></>) : null}
          {ss.length ? (<><Ttl>Stores</Ttl>{ss.map(s => (
            <View key={s.id} style={{flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: th.line}}>
              <Pressable accessibilityRole="link" onPress={() => {if (q) rec(r.q.trim()); go('store', s.id);}} style={{flex: 1, flexDirection: 'row', gap: 12, alignItems: 'center', minWidth: 0}}>
                <Tile e={s.e} bg={s.bg} />
                <View style={{flex: 1, minWidth: 0}}><View style={{flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap'}}><T weight="700">{s.n}</T>{!s.open ? <Badge red label={tr('closed')} /> : null}</View><T size={13} color={th.mut}>{s.k} · {s.eta} min · {s.rv > 0 ? '★ ' + s.r.toFixed(1) : 'New store'}</T></View>
              </Pressable>
              {heartBtn(s.id, S.fav.indexOf(s.id) > -1, () => heart(s.id), S.fav.indexOf(s.id) > -1 ? 'Remove ' + s.n + ' from favorites' : 'Save ' + s.n + ' to favorites')}
              <Pressable accessibilityRole="link" accessibilityLabel={'Open ' + s.n} onPress={() => {if (q) rec(r.q.trim()); go('store', s.id);}}><Icon name="chevR" size={16} color={th.ink} /></Pressable>
            </View>))}</>) : null}
          {is.length ? (<><Ttl>Products</Ttl>{is.map(i => <ItemRow key={i.id} i={i} />)}</>) : null}
        </View>
      );
  }
  return (
    <View>
      <View style={{height: 100, justifyContent: 'flex-end', paddingTop: ins.top, paddingHorizontal: 16, paddingBottom: 10}}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
          <Circ icon="chevL" label={tr('back')} onPress={back} />
          <TextInput autoFocus={!r.q} value={r.q} onChangeText={setQ} placeholder="Search food, groceries, drinks" placeholderTextColor={th.mut} accessibilityLabel="Search" style={{flex: 1, fontSize: 15, color: th.ink, backgroundColor: th.soft, borderWidth: 1, borderColor: th.line, borderRadius: 12, padding: 12}} />
          {r.q ? <Circ icon="x" label="Clear search" onPress={() => setQ('')} /> : null}
        </View>
      </View>
      <View style={{height: 20, backgroundColor: '#FD802E'}} />
      <View style={{height: 15}} />
      {head}
      <View style={{height: 8}} />
      {body}
    </View>
  );
}

export function Promos() {
  const th = useTheme();
  return (
    <View>
      <Bar title="Coupons and offers" onBack={back} />
      <View style={{paddingHorizontal: 16}}>
        {coupons().map((p: any) => (
          <Card key={p.c}>
            <Row sp><T weight="700">{p.t}</T><Badge label={p.c} /></Row>
            <T size={13.5} color={th.mut} style={{marginTop: 6, marginBottom: 10}}>{p.d}</T>
            <Row><Cta small ghost label="Details" onPress={() => toast(p.d)} /><Cta small ghost={S.promo === p.c} label={S.promo === p.c ? 'Applied' : 'Use this code'} onPress={() => usePromo(p.c)} /></Row>
          </Card>
        ))}
      </View>
    </View>
  );
}

export function Notifs() {
  const th = useTheme();
  const [serverItems, setServerItems] = useState<any[]>([]);
  const [serverError, setServerError] = useState('');
  const serverLoadId = useRef(0);
  const serverMounted = useRef(false);
  const serverUserId = useRef<string | null>(null);
  const loadServer = async () => {
    const requestId = ++serverLoadId.current;
    const {data: auth} = await supabase.auth.getUser();
    if (!serverMounted.current || requestId !== serverLoadId.current) return;
    if (!auth.user) { serverUserId.current = null; setServerItems([]); return; }
    if (serverUserId.current && serverUserId.current !== auth.user.id) return;
    serverUserId.current = auth.user.id;
    const {data, error} = await supabase.from('notifications')
      .select('id,title,body,read,metadata,created_at,notification_type,feature_name')
      .eq('user_id', auth.user.id).ilike('feature_name', 'goodies')
      .order('created_at', {ascending: false}).limit(50);
    if (!serverMounted.current || requestId !== serverLoadId.current || serverUserId.current !== auth.user.id) return;
    if (error) { setServerError(error.message); return; }
    setServerItems((data || []).map((n: any) => ({...n, server: true, t: n.title || 'Goodies update', d: n.body || '', u: !n.read, r: 'track', p: n.metadata?.order_id || n.metadata?.order_code || ''})));
    setServerError('');
  };
  useEffect(() => {
    let active = true;
    let authEpoch = 0;
    let authTimer: ReturnType<typeof setTimeout> | null = null;
    serverMounted.current = true;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    const connect = (userId: string | null) => {
      if (!active) return;
      if (channel && serverUserId.current === userId) { void loadServer(); return; }
      if (channel) { void supabase.removeChannel(channel); channel = undefined; }
      serverLoadId.current++;
      serverUserId.current = userId;
      if (!userId) { setServerItems([]); setServerError(''); return; }
      void loadServer();
      channel = supabase.channel('goodies-notifications-' + userId)
        .on('postgres_changes', {event: '*', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + userId}, () => { void loadServer(); })
        .subscribe();
    };
    const {data: authListener} = supabase.auth.onAuthStateChange((_event, session) => {
      authEpoch++;
      if (authTimer) clearTimeout(authTimer);
      const nextUserId = session?.user?.id || null;
      authTimer = setTimeout(() => { authTimer = null; connect(nextUserId); }, 0);
    });
    const initialAuthEpoch = authEpoch;
    void supabase.auth.getSession().then(({data}) => {
      if (active && initialAuthEpoch === authEpoch) connect(data.session?.user?.id || null);
    }).catch(() => {});
    return () => {
      active = false;
      serverMounted.current = false;
      serverLoadId.current++;
      if (authTimer) clearTimeout(authTimer);
      authListener.subscription.unsubscribe();
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);
  const localItems = S.notifs.filter((n: any) => !serverItems.some((s: any) => String(s.t) === String(n.t) && String(s.d) === String(n.d)));
  const items = [...serverItems, ...localItems];
  const markAll = async () => {
    readAll();
    const {data: auth} = await supabase.auth.getUser();
    if (auth.user) {
      const {error} = await supabase.from('notifications').update({read: true})
        .eq('user_id', auth.user.id).ilike('feature_name', 'goodies').eq('read', false);
      if (error) setServerError(error.message);
      else await loadServer();
    }
  };
  const open = async (n: any) => {
    if (!n.server) { openNotif(n.id); return; }
    if (!n.read) {
      const {data: auth} = await supabase.auth.getUser();
      if (auth.user) {
        const {error} = await supabase.from('notifications').update({read: true})
          .eq('id', n.id).eq('user_id', auth.user.id);
        if (error) setServerError(error.message);
        else setServerItems((prev: any[]) => prev.map((x: any) => x.id === n.id ? {...x, read: true, u: false} : x));
      }
    }
    const order = S.orders.find((o: any) => o.backendId && o.backendId === n.metadata?.order_id);
    if (order) go('track', order.id);
    else tab('orders');
  };
  return (
    <View>
      <Bar title="Notifications" onBack={back} right={items.some((n: any) => n.u) ? <Pressable onPress={() => { void markAll(); }}><T size={13.5} weight="700" color={th.br}>Mark all read</T></Pressable> : null} />
      <View style={{paddingHorizontal: 16}}>
        {serverError ? <T size={12} color={th.red}>{serverError}</T> : null}
        {items.length ? items.map((n: any) => (
          <Pressable key={(n.server ? 'server-' : 'local-') + n.id} onPress={() => { void open(n); }} style={{flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: th.line}}>
            <View style={{width: 44, height: 44, borderRadius: 16, backgroundColor: n.u ? th.brt : th.soft, alignItems: 'center', justifyContent: 'center'}}><Text style={{fontSize: 22}}>{n.r === 'track' ? '🛵' : '🎁'}</Text></View>
            <View style={{flex: 1}}><T weight={n.u ? '800' : undefined}>{n.t}</T><T size={13} color={th.mut}>{n.d}</T></View>
            {n.u ? <View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: th.br}} /> : null}
          </Pressable>
        )) : <Empty emoji="🔔" title="All caught up" text="New offers and order updates appear here." />}
      </View>
    </View>
  );
}
