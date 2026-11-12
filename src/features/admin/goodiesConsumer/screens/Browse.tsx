import {Sel,BSel,AddChip,useAssetSelectionContext} from '../editContext';
import {EditableNativeText as Text} from '../EditableNativeText';
import {CUSTOMER_NOTIFICATION_FILTER} from '../notifications';
import React, {useEffect, useRef, useState} from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {View, Text as UnusedNativeText, Pressable, ScrollView, TextInput, useWindowDimensions, RefreshControl, Image} from 'react-native';
import {Icon} from '../components/Icon';
import {T, Mut, Grad, Circ, Bar, Sh, Rail, Chip, Chips, Cta, Card, Row, Badge, Ttl, Empty, Tile, bgIdx, useTheme, heartBtn} from '../components/ui';
import {Dish, VCard, StoreCard, ItemRow} from '../components/cards';
import {S, ST, STB, IT, DEALS, PR, money, addr, cnt, unread, first, filt, FCH, emit, save, toast, ui, refreshLiveSchedules, refreshStoreDistances} from '../store';
import {categories, catName, label, promoCards, deals, dealEnd, coupons, modes, stripeColor, loadContent, onContent, hasContent, contentStatus} from '../content';
import {go, tab, back, browse, setFilter, setSub, clearFilters, usePromo as applyPromo, openNotif, readAll, heart} from '../actions';
import {byoNames} from '../builders/engine';
import {fetchGoodiesOrderForNotification} from '../serverSync';
import {t as tr, tx} from '../i18n';
import {MODE1, PROMO} from '../theme';
import {previewBackend as supabase} from '../previewRuntime';
import {friendlyError} from '../friendlyError';

const cname = (id: string) => catName(id);

function CachedContentImage({uri, style, contentFit = 'contain', onFail,onTouchEnd,onClick}: {onTouchEnd?:any;onClick?:any;uri: string; style: any; contentFit?: 'contain'|'cover'; onFail?: () => void}) {
  const [failed, setFailed] = useState(false);
  const [retried, setRetried] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => { setFailed(false); setRetried(false); setReloadKey(0); }, [uri]);
  if (failed) return null;
  return <Image onTouchEnd={onTouchEnd} {...{onClick}} key={uri + ':' + reloadKey} source={{uri}} style={style} resizeMode={contentFit}
    onError={() => {
      if (!retried) {
        setRetried(true);
        void loadContent().finally(() => setReloadKey(value => value + 1));
      } else { setFailed(true); onFail?.(); }
    }} />;
}
function Mode({contentId,title, sub, emoji, image, onPress, grad, bg, fg, small}: any) {
  const assetSelection=useAssetSelectionContext();
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [image]);
  return (
    <Pressable onPress={onPress} style={{borderRadius: 18, overflow: 'hidden', height: small ? 51 : 112}}>
      {grad ? <Grad colors={MODE1} style={{flex: 1, padding: small ? 0 : 14, paddingHorizontal: 14, justifyContent: small ? 'center' : 'flex-start'}}>{inner()}</Grad> : <View style={{flex: 1, backgroundColor: bg, paddingHorizontal: 14, padding: small ? 0 : 14, justifyContent: small ? 'center' : 'flex-start'}}>{inner()}</View>}
    </Pressable>
  );
  function inner() {
    const c = grad ? '#fff' : fg;
    return (
      <>
        <T contentTarget={contentId?{kind:'mode',id:contentId,field:'title'}:undefined} size={small ? 14.5 : 17} weight="600" color={c} style={{lineHeight: small ? undefined : 19.5, width: image && !imageFailed ? '70%' : undefined}}>{title}</T>
        {sub ? <T contentTarget={contentId?{kind:'mode',id:contentId,field:'sub'}:undefined} size={12} color={c} style={{marginTop: 3, opacity: 0.9, width: image && !imageFailed ? '70%' : undefined}}>{sub}</T> : null}
        {image && !imageFailed ? <CachedContentImage onTouchEnd={assetSelection({kind:'mode',id:contentId||'',field:'art'})} {...{onClick:assetSelection({kind:'mode',id:contentId||'',field:'art'})}} uri={image} style={{position: 'absolute', right: small ? 6 : 8, bottom: small ? 2 : -4, top: small ? 2 : undefined, width: small ? 46 : 82, height: small ? 46 : 82, opacity: 0.98}} onFail={() => setImageFailed(true)} /> : <Text onPress={assetSelection({kind:'mode',id:contentId||'',field:'art'})} {...{onClick:assetSelection({kind:'mode',id:contentId||'',field:'art'})}} style={{position: 'absolute', right: small ? 10 : 6, bottom: small ? undefined : -4, top: small ? 8 : undefined, fontSize: small ? 34 : 62, lineHeight: small ? 36 : 62}}>{emoji}</Text>}
      </>
    );
  }
}

function CategoryTile({category, onPress}: {category: {id:string; name:any; emoji:string; art?:string|null}; onPress:()=>void}) {
  const assetSelection=useAssetSelectionContext();
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [category.art]);
  return (
    <Pressable onPress={onPress} style={{width:68,alignItems:'center'}}>
      {category.art && !failed
        ? <CachedContentImage onTouchEnd={assetSelection({kind:'category',id:category.id,field:'art'})} {...{onClick:assetSelection({kind:'category',id:category.id,field:'art'})}} uri={category.art} style={{width:42,height:42}} onFail={() => setFailed(true)} />
        : <View style={{width:42,height:42,alignItems:'center',justifyContent:'center'}}><Text onPress={assetSelection({kind:'category',id:category.id,field:'art'})} {...{onClick:assetSelection({kind:'category',id:category.id,field:'art'})}} style={{fontSize:30}}>{category.emoji}</Text></View>}
      <T contentTarget={{kind:'category',id:category.id,field:'title'}} size={11.5} weight="600" align="center" style={{marginTop:6,lineHeight:14}}>{tx(category.name)}</T>
    </Pressable>
  );
}

function promoGradient(kind: string): [string, string] {
  const preset = PROMO[kind as keyof typeof PROMO];
  if (preset) return [preset[0], preset[1]];
  if (!/^#[0-9a-fA-F]{6}$/.test(kind)) return [PROMO.plum[0], PROMO.plum[1]];
  const hex = kind.slice(1);
  const rgb = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
  const lighter = rgb.map(v => Math.round(v + (255 - v) * 0.24));
  return [kind, '#' + lighter.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase()];
}

function PromoCard({contentId,kind, title, sub, btn, emoji, image, target}: {contentId?:string;kind: string; title: string; sub: string; btn: string; emoji: string; image?: string | null; target?: string}) {
  const assetSelection=useAssetSelectionContext();
  const [imageFailed, setImageFailed] = useState(false);
  const gradient = promoGradient(kind);
  useEffect(() => setImageFailed(false), [image]);
  return (
    <Pressable onPress={() => ui.sheet({kind: 'promo', p: kind === 'plum' ? 'free' : kind === 'orange' ? 'points' : 'produce', custom: {title, sub, btn, emoji, target}})}>
      <Grad colors={gradient} angle={110} style={{width: 300, height: 124, borderRadius: 18, padding: 12, overflow: 'hidden'}}>
        <T contentTarget={contentId?{kind:'promo',id:contentId,field:'title'}:undefined} size={18} weight="600" color="#fff" lines={2} style={{width: 170, lineHeight: 21}}>{title}</T>
        <T contentTarget={contentId?{kind:'promo',id:contentId,field:'sub'}:undefined} size={11.5} color="#fff" lines={2} style={{marginTop: 3, width: 170, lineHeight: 14, opacity: 0.92}}>{sub}</T>
        <View style={{position: 'absolute', left: 16, bottom: 8, backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7}}><T contentTarget={contentId?{kind:'promo',id:contentId,field:'btn'}:undefined} size={12.5} weight="600" color="#1B1B1F">{btn}</T></View>
        {image && !imageFailed ? <CachedContentImage onTouchEnd={assetSelection({kind:'promo',id:contentId||'',field:'art'})} {...{onClick:assetSelection({kind:'promo',id:contentId||'',field:'art'})}} uri={image} style={{position: 'absolute', right: 8, bottom: 2, width: 92, height: 92}} onFail={() => setImageFailed(true)} /> : <Text onPress={assetSelection({kind:'promo',id:contentId||'',field:'art'})} {...{onClick:assetSelection({kind:'promo',id:contentId||'',field:'art'})}} style={{position: 'absolute', right: 8, bottom: 0, fontSize: 78, lineHeight: 78}}>{emoji}</Text>}
      </Grad>
    </Pressable>
  );
}

function Countdown() {
  const th = useTheme(), end = dealEnd();
  const [s, setS] = useState(() => end && end > Date.now() ? Math.max(0, Math.floor((end - Date.now()) / 1000)) : 0);
  useEffect(() => {
    if (!end || end <= Date.now()) { setS(0); return; }
    const id = setInterval(() => setS(Math.max(0, Math.floor((end - Date.now()) / 1000))), 1000);
    return () => clearInterval(id);
  }, [end]);
  if (!end || end <= Date.now()) return null;
  const p = (n: number) => String(n).padStart(2, '0');
  return <View style={{backgroundColor: th.red, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4}}><T cmsKey={'lbl.browseCountdown'} size={12} weight="600" color="#fff">{label('lbl.browseCountdown', 'Ends in {time}').replace('{time}', p(Math.floor(s / 3600)) + ':' + p(Math.floor((s % 3600) / 60)) + ':' + p(s % 60))}</T></View>;
}

export function Home({onExit}: {onExit?: () => void}) {
  const th = useTheme(), ins = useSafeAreaInsets(), address = addr();
  const [contentReady, setContentReady] = useState(hasContent());
  const [, setContentVersion] = useState(0);
  useEffect(() => {
    let active = true;
    const off = onContent(() => { setContentReady(hasContent()); setContentVersion(value => value + 1); });
    void loadContent().finally(() => { if (active) setContentReady(true); });
    return () => { active = false; off(); };
  }, []);
  useEffect(() => {
    if (!contentReady) return;
    const urls = categories().map(category => category.art).filter((url): url is string => typeof url === 'string' && !!url);
    if (urls.length) void Promise.all(urls.map(url => Image.prefetch(url).catch(() => false)));
  }, [contentReady]);
  useEffect(() => {
    if (S.f !== 'near' || !address?.t) return;
    void refreshStoreDistances(ST.filter(store => store.live).map(store => store.id), address).catch(() => null);
  }, [S.f, address?.id, address?.t, address?.apt, address?.inst, address?.city, address?.department, address?.country]);
  const seen: any = {}, os = S.orders.filter((o: any) => {if (seen[o.sid]) return false; seen[o.sid] = 1; return true;}).slice(0, 6);
  const cat = (c: string) => ST.filter(s => s.c === c).flatMap(s => s.it), cats = categories();
  const rv = S.rv.filter((id: string) => IT[id]).slice(0, 6), md = modes(), pc = promoCards(), dl = deals(), activeDeals = dl.filter(d => IT[d[0]]);
  return (
    <View>
      <View style={{height: 100, justifyContent: 'flex-end', paddingTop: ins.top, paddingBottom: 10, paddingHorizontal: 16}}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
        <Circ icon="chevL" label={tr('back')} onPress={onExit || back} />
        <Pressable onPress={() => go('addresses')} style={{flex: 1, minWidth: 0}}>
          <T cmsKey={"lbl.interface.deliverTo"} size={11.5} color={th.mut}>{tr('deliverTo')}</T>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}><T cmsKey={'lbl.browseChooseLocation'} size={15.5} weight="600" lines={1} style={{flexShrink: 1}}>{addr()?.t || label('lbl.browseChooseLocation', 'Choose your location')}</T><Icon name="chevD" size={14} color={th.ink} /></View>
        </Pressable>
      </View>
      </View>
      {S.catalogLoading ? <View style={{paddingHorizontal:16,paddingVertical:12}}><View style={{height:72,borderRadius:14,backgroundColor:th.soft}} /><T cmsKey={'lbl.catalogLoading'} color={th.mut}>{label('lbl.catalogLoading', 'Loading stores…')}</T></View> : null}
      {contentStatus==='error'?<Empty title={label('lbl.contentLoadFailed','Goodies content is temporarily unavailable')} text={label('lbl.contentRetryHint','Check your connection and try again.')} button={label('lbl.retry','Try again')} onPress={()=>void loadContent()} />:null}
      {S.catalogError ? <Empty title={label('lbl.catalogFailed', 'Could not load stores')} text={label('lbl.catalogRetryHint', 'Check your connection and try again.')} button={label('lbl.retry', 'Try again')} onPress={() => void refreshLiveSchedules()} /> : null}
      <Pressable onPress={() => go('search')} style={{marginTop: 14, marginHorizontal: 16, height: 48, borderRadius: 24, backgroundColor: th.soft, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16}}>
        <Icon name="search" size={18} color={th.mut} /><T cmsKey={'lbl.search'} size={14.5} color={th.mut}>{label('lbl.search', tr('searchPh'))}</T>
      </Pressable>
      <View style={{flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 16}}>
        <View style={{flex: 1.25}}><Mode contentId={md?.[0]?.id} grad title={(md && md[0] ? md[0].title : tr('foodDelivery')).replace(' ', '\n')} sub={md && md[0] ? md[0].sub : tr('hotFresh')} emoji={md && md[0] ? md[0].emoji : '🍛'} image={md?.[0]?.image} onPress={() => go('catlist', md && md[0] ? md[0].cat : 'restaurants')} /></View>
        <View style={{flex: 1, gap: 10}}>
          <Mode contentId={md?.[1]?.id} small bg={th.m2bg} fg={th.m2fg} title={md && md[1] ? md[1].title : tr('groceries')} emoji={md && md[1] ? md[1].emoji : '🛒'} image={md?.[1]?.image} onPress={() => go('catlist', md && md[1] ? md[1].cat : 'groceries')} />
          <Mode contentId={md?.[2]?.id} small bg={th.m3bg} fg={th.m3fg} title={md && md[2] ? md[2].title : tr('drugstore')} emoji={md && md[2] ? md[2].emoji : '💊'} image={md?.[2]?.image} onPress={() => go('catlist', md && md[2] ? md[2].cat : 'drugstore')} />
        </View>
      </View>
      <View style={{marginTop: 18}}>
        {contentReady ? <Rail gap={14}>{cats.map(c => <CategoryTile key={c.id} category={c} onPress={() => go('catlist', c.id)} />)}</Rail> : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:10,paddingHorizontal:16}}>{Array.from({length:6},(_,i)=><View key={i} style={{width:68,alignItems:'center'}}><View style={{width:42,height:42,borderRadius:24,backgroundColor:th.soft}}/><View style={{width:42,height:7,borderRadius:4,backgroundColor:th.soft,marginTop:7}}/></View>)}</ScrollView>}
      </View>
      <View style={{marginTop: 20}}>
        {contentReady ? <Rail>{pc ? pc.filter(x => !x.newOnly || first()).map(x => <PromoCard contentId={x.id} key={x.id} kind={x.color} title={x.title} sub={x.sub} btn={x.btn} emoji={x.emoji} image={x.image} target={x.target} />) : null}</Rail> : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:12,paddingHorizontal:16}}>{[0,1].map(i=><View key={i} style={{width:300,height:124,borderRadius:18,backgroundColor:th.soft}}/>)}</ScrollView>}
      </View>
      <View style={{paddingHorizontal: 16, marginTop: 10}}>
        <Pressable onPress={() => go('promos')} style={{flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 0.5, borderColor: th.line, borderRadius: 16}}>
          <View style={{flex: 1}}><T cmsKey={'lbl.coupons'} weight="600">{label('lbl.coupons', tr('couponsOffers'))}</T><T cmsKey={'lbl.coupons2'} size={12.5} color={th.mut}>{label('lbl.coupons2', tr('codesCheckout'))}</T></View>
          <Icon name="chevR" size={16} color={th.ink} />
        </Pressable>
      </View>
      <Sh cmsKey={'lbl.flash'} title={'⚡ ' + label('lbl.flash', tr('flashDeals'))} right={<Row style={{gap:10}}><Countdown /><Pressable accessibilityRole="button" onPress={() => go('flashdeals')}><T cmsKey={"lbl.interface.seeAll"} size={13} weight="600" color={th.br}>{tr('seeAll')}</T></Pressable></Row>} />{activeDeals.length ? <Rail>{activeDeals.map(d => <Dish key={d[0]} i={IT[d[0]]} off={d[1]} left={d[2]} />)}</Rail> : null}
      {os.length ? (<>
        <Sh cmsKey={'lbl.again'} cmsLinkKey={"lbl.cms.1be106e7ef9c"} title={label('lbl.again', tr('orderAgain'))} link={label("lbl.cms.1be106e7ef9c", "History")} onLink={() => tab('orders')} />
        <Rail>{os.map((o: any) => {
          const s = STB[o.sid];
          if (!s) return null;
          return (
            <Pressable key={o.id} onPress={() => require('../actions').reorder(o.id)} style={{width: 76, alignItems: 'center'}}>
              <Grad idx={bgIdx(s.bg)} style={{width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: th.br, overflow: 'hidden'}}>
                {s.logo || s.thumbnail || s.cover ? <CachedContentImage uri={s.logo || s.thumbnail || s.cover || ''} contentFit="cover" style={{width: 60, height: 60, borderRadius: 30}} /> : <Text style={{fontSize: 30}}>{s.e}</Text>}
                <View style={{position: 'absolute', bottom: -5, backgroundColor: th.br, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2}}><T cmsKey={'lbl.browseReorder'} size={9.5} weight="600" color="#fff">{label('lbl.browseReorder', 'Reorder')}</T></View>
              </Grad>
              <T size={11.5} weight="600" align="center" style={{marginTop: 10}}>{s.n}</T>
            </Pressable>
          );
        })}</Rail>
      </>) : null}
      {rv.length ? (<><Sh cmsKey={'lbl.recent'} title={label('lbl.recent', tr('recentlyViewed'))} /><Rail>{rv.map((id: string) => <Dish key={id} i={IT[id]} />)}</Rail></>) : null}
      <Sh cmsKey={'lbl.popular'} cmsLinkKey={"lbl.interface.seeAll"} title={label('lbl.popular', tr('popularVendors'))} link={tr('seeAll')} onLink={() => go('catlist', 'all')} />
      <Rail>{ST.slice().sort((a, b) => b.rv - a.rv).slice(0, 6).map(s => <VCard key={s.id} s={s} />)}</Rail>
      <Sh cmsKey={'lbl.produce'} cmsLinkKey={"lbl.interface.seeAll"} title={'🥭 ' + label('lbl.produce', tr('freshProduce'))} link={tr('seeAll')} onLink={() => go('catlist', 'produce')} />
      <Rail>{cat('produce').map(i => <Dish key={i.id} i={i} />)}</Rail>
      <Sh cmsKey={'lbl.haitian'} cmsLinkKey={"lbl.interface.seeAll"} title={'🇭🇹 ' + label('lbl.haitian', tr('haitianSpecialties'))} link={tr('seeAll')} onLink={() => go('catlist', 'haitian')} />
      <Rail>{cat('haitian').map(i => <Dish key={i.id} i={i} />)}</Rail>
      {(() => {const trending = ['s1_1', 's4_0', 's5_0', 's6_0'].map(id => IT[id]).filter(Boolean); return trending.length ? <><Sh cmsKey={'lbl.trending'} title={'🔥 ' + label('lbl.trending', tr('trending'))} /><View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16}}>{trending.map(i => <Dish key={i.id} i={i} grid />)}</View></> : null;})()}
      <Sh cmsKey={"lbl.interface.restaurantsNear"} cmsLinkKey={"lbl.interface.seeAll"} title={tr('restaurantsNear')} link={tr('seeAll')} onLink={() => go('catlist', 'all')} />
      <Chips list={FCH} on={S.f} onPick={setFilter} />
      <View style={{gap: 22, paddingTop: 12, paddingHorizontal: 16}}>{filt(ST).slice(0, 5).map(s => <StoreCard key={s.id} s={s} />)}</View>
    </View>
  );
}


/* Explore is the discovery destination for an empty cart. It keeps location,
   availability, category and product discovery together in one scrollable feed. */
export function Explore() {
  const th = useTheme();
  const [scope, setScope] = useState('all');
  const [category, setCategory] = useState('all');
  const selectedAddress = addr();
  const eligible = ST.filter(s => category === 'all' || s.c === category);
  useEffect(() => {
    if (scope !== 'closest' || !selectedAddress?.t) return;
    void refreshStoreDistances(eligible.filter(store => store.live).map(store => store.id), selectedAddress).catch(() => null);
  }, [scope, category, selectedAddress?.id, selectedAddress?.t, selectedAddress?.apt, selectedAddress?.inst, selectedAddress?.city, selectedAddress?.department, selectedAddress?.country]);
  const distanceOf = (store: (typeof ST)[number]) => store.live && !store.distanceReady ? Number.POSITIVE_INFINITY : store.km;
  const visible = eligible.filter(s => scope !== 'open' || !!s.open).slice().sort((x, y) => {
    if (scope === 'closest') return distanceOf(x) - distanceOf(y);
    if (scope === 'open') return y.r - x.r || y.rv - x.rv;
    return Number(!!y.open) - Number(!!x.open) || y.r - x.r || y.rv - x.rv;
  });
  const products = visible.flatMap(s => s.it.filter(i => !i.oos && i.stock > 0));
  const scopeOptions: [string, string][] = [['closest', label('lbl.browseScopeClosest', 'Closest')], ['open', label('lbl.browseScopeOpen', 'Open now')], ['all', label('lbl.browseScopeAll', 'All available')]];
  const categoryOptions: [string, string][] = [['all', label('lbl.browseAllCategories', 'All categories')], ...categories().map(c => [c.id, c.emoji + ' ' + tx(c.name)] as [string, string])];
  return (
    <View>
      <Bar cmsKey={'lbl.browseExploreNearby'} title={label('lbl.browseExploreNearby', 'Explore nearby')} onBack={back} />
      <View style={{paddingHorizontal: 16}}>
        <Pressable accessibilityRole="button" accessibilityLabel={label('lbl.browseChooseAddress', 'Choose browsing address')} onPress={() => go('addresses')} style={{flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, borderRadius: 16, backgroundColor: th.soft, marginBottom: 14}}>
          <View style={{width: 40, height: 40, borderRadius: 13, backgroundColor: th.brt, alignItems: 'center', justifyContent: 'center'}}><Icon name="pin" size={20} color={th.br} /></View>
          <View style={{flex: 1}}>
            <T cmsKey={'lbl.browseNearLabel'} size={11.5} color={th.mut}>{label('lbl.browseNearLabel', 'BROWSING NEAR')}</T>
            <T cmsKey={'lbl.browseChooseLocation'} weight="600" size={14.5} lines={2}>{selectedAddress?.t || label('lbl.browseChooseLocation', 'Choose your location')}</T>
            <T cmsKey={'lbl.browseChangeAddress'} size={11.5} color={th.br} style={{marginTop: 2}}>{label('lbl.browseChangeAddress', 'Change address')}</T>
          </View>
          <Icon name="chevR" color={th.ink} />
        </Pressable>
        <Ttl>{label('lbl.browseDiscover', 'Discover your options')}</Ttl>
        <Chips list={scopeOptions} on={scope} onPick={setScope} />
        <View style={{marginTop: 12}}>
          <Ttl>{label('lbl.browseCategories', 'Categories')}</Ttl>
          <Chips list={categoryOptions} on={category} onPick={setCategory} />
        </View>
        <Row sp style={{marginTop: 16, marginBottom: 8}}>
          <T cmsKeys={['lbl.browseTitleOpen','lbl.browseTitleClosest','lbl.browseTitleAll']} size={16} weight="600">{scope === 'open' ? label('lbl.browseTitleOpen', 'Open near you') : scope === 'closest' ? label('lbl.browseTitleClosest', 'Closest to you') : label('lbl.browseTitleAll', 'All available stores')}</T>
          <T cmsKey={"lbl.cms.bf089c2685f9"} size={11.5} color={th.mut}>{visible.length} {label("lbl.cms.bf089c2685f9", "stores")}</T>
        </Row>
      </View>
      {visible.length ? <View style={{paddingHorizontal: 16, gap: 14}}>
        {visible.map(s => <StoreCard key={s.id} s={s} showProducts={scope === 'open'} />)}
      </View> : <View style={{paddingHorizontal: 16}}><Empty emoji="🕒" title={label('lbl.browseNoStores', 'No stores match right now')} text={label('lbl.browseNoStoresHint', 'Try another category or show all available options.')} button={label('lbl.browseShowAll', 'Show all available')} onPress={() => {setScope('all'); setCategory('all');}} /></View>}
      <View style={{paddingHorizontal: 16, marginTop: 20}}>
        <Sh cmsKey={'lbl.browseProductsExplore'} title={label('lbl.browseProductsExplore', 'Products to explore')} />
        {products.length ? <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12}}>
          {products.map(i => <Dish key={i.id} i={i} grid />)}
        </View> : <T cmsKey={'lbl.browseNoProducts'} size={13} color={th.mut}>{label('lbl.browseNoProducts', 'No in-stock products match these filters.')}</T>}
      </View>
    </View>
  );
}

export function Cats() {
  const th = useTheme(), {width} = useWindowDimensions(), w = (width - 32 - 16) / 3;
  const all = [...categories().map(c => ({id: c.id, e: c.emoji, n: tx(c.name), art: c.art})), {id: 'all', e: '🏪', n: label('lbl.catAllStores', 'All stores'), art: null as any}];
  return (
    <View style={{paddingHorizontal: 16}}><View style={{flexDirection: 'row', flexWrap: 'wrap', rowGap: 18, columnGap: 8}}>
      {all.map(c => (
        <Pressable key={c.id} onPress={() => go('catlist', c.id)} style={{width: w, alignItems: 'center'}}>
          {c.art ? <CachedContentImage uri={c.art} style={{width: 42, height: 42}} /> : <Text style={{fontSize: 30}}>{c.e}</Text>}
          <T size={11.5} weight="600" align="center" style={{marginTop: 6, lineHeight: 14}}>{c.n}</T>
        </Pressable>
      ))}
    </View></View>
  );
}

export function CatList({p}: {p: string}) {
  const th = useTheme(), address = addr();
  const base = ST.filter(s => p === 'all' || s.c === p), kinds: string[] = [];
  useEffect(() => {
    if (S.f !== 'near' || !address?.t) return;
    void refreshStoreDistances(base.filter(store => store.live).map(store => store.id), address).catch(() => null);
  }, [S.f, p, address?.id, address?.t, address?.apt, address?.inst, address?.city, address?.department, address?.country]);
  base.forEach(s => {if (kinds.indexOf(s.k) < 0) kinds.push(s.k);});
  const l = filt(base.filter(s => !S.sub || s.k === S.sub)), c = categories().find(x => x.id === p);
  const its = l.flatMap(s => s.it);
  return (
    <View>
      <View style={{paddingHorizontal: 16}}>
        <View style={{marginBottom: 12}}><Mode grad small={false} title={p === 'all' ? label('lbl.catEverythingNear', 'Everything near you') : cname(p)} sub={(l.length === 1 ? label('lbl.catStoreOne', '{n} store') : label('lbl.catStoreMany', '{n} stores')).replace('{n}', String(l.length)) + ' · ' + label('lbl.catProducts', '{n} products').replace('{n}', String(its.length))} emoji={c ? c.emoji : '🏪'} onPress={() => go('search')} /></View>
      </View>
      {p !== 'all' && kinds.length > 1 ? (<><T cmsKey={'lbl.browseSubcategories'} size={12.5} weight="600" color={th.mut} style={{paddingHorizontal: 16, paddingBottom: 6}}>{label('lbl.browseSubcategories', 'SUBCATEGORIES')}</T><Chips list={[['', label('lbl.filterAll', 'All')], ...kinds.map(k => [k, k] as [string, string])]} on={S.sub} onPick={setSub} /></>) : null}
      <Chips list={FCH} on={S.f} onPick={setFilter} />
      {l.length ? (<>
        {l.length > 1 ? (<><Sh cmsKey={'lbl.browseFeaturedVendors'} title={label('lbl.browseFeaturedVendors', 'Featured vendors')} /><Rail>{l.slice().sort((a, b) => b.r - a.r).slice(0, 4).map(s => <VCard key={s.id} s={s} />)}</Rail></>) : null}
        <Sh cmsKey={'lbl.browseAllStores'} title={label('lbl.browseAllStores', 'All stores')} />
        <View style={{gap: 22, paddingHorizontal: 16}}>{l.map(s => <StoreCard key={s.id} s={s} />)}</View>
        <Sh cmsKey={'lbl.browsePopularProducts'} title={label('lbl.browsePopularProducts', 'Popular products')} />
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16}}>{its.slice(0, 8).map(i => <Dish key={i.id} i={i} grid />)}</View>
      </>) : <Empty emoji="🔎" title={label('lbl.browseNothingMatches', 'Nothing matches')} text={label('lbl.browseClearFilterHint', 'Clear the filter to see every store.')} button={label('lbl.browseClearFilters', 'Clear filters')} onPress={clearFilters} />}
    </View>
  );
}

/* Search keeps v24's behaviour: filters, sort, suggestions, recent searches */
export function Search() {
  const th = useTheme(), ins = useSafeAreaInsets();
  const r = S.sr, q = r.q.trim().toLowerCase(), F = r.f, any = Object.keys(F).some(k => F[k]);
  const fl: [string, string][] = [['open', label('lbl.filterOpen', 'Open now')], ['top', label('lbl.filterTop', 'Rating 4.5+')], ['fast', label('lbl.filterFast', 'Under 30 min')], ['free', label('lbl.filterFree', 'Free delivery')], ['sale', label('lbl.filterSale', 'On sale')], ['p5', label('lbl.filterP5', 'Under $5')], ['p10', label('lbl.filterP10', 'Under $10')]];
  const sorts: [string, string][] = [['rel', label('lbl.sortRelevance', 'Relevance')], ['pop', label('lbl.sortPopularity', 'Popularity')], ['lo', label('lbl.sortPriceLow', 'Price: low to high')], ['hi', label('lbl.sortPriceHigh', 'Price: high to low')], ['rate', label('lbl.sortRating', 'Highest rating')], ['fast', label('lbl.sortFastest', 'Fastest delivery')]];
  const setQ = (v: string) => {S.sr.q = v; emit();};
  const rec = (x: string) => {S.rec = [x].concat(S.rec.filter((y: string) => y.toLowerCase() !== x.toLowerCase())).slice(0, 6);};
  const head = (
    <View>
      <Rail gap={8}>{fl.map(x => <Chip key={x[0]} label={x[1]} on={!!F[x[0]]} onPress={() => {F[x[0]] = !F[x[0]]; emit();}} />)}{any ? <Chip cmsKey={"lbl.browseAutoE39JIC"} label={label("lbl.browseAutoE39JIC", "Clear all")} color={th.red} onPress={() => {S.sr.f = {}; emit();}} /> : null}</Rail>
      <Rail gap={8} style={{paddingTop: 8}}>{sorts.map(x => <Chip key={x[0]} label={x[1]} on={r.sort === x[0]} onPress={() => {S.sr.sort = x[0]; emit();}} />)}</Rail>
    </View>
  );
  let body: any;
  if (!q && !any) {
    body = (
      <View style={{paddingHorizontal: 16}}>
        {S.rec.length ? (<><Ttl>{label('lbl.searchRecent', 'Recent searches')}</Ttl><View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>{S.rec.map((x: string) => <Chip key={x} label={x} onPress={() => setQ(x)} />)}</View><Pressable onPress={() => {S.rec = []; emit();}}><T cmsKey={'lbl.searchClear'} size={13} weight="600" color={th.br} style={{marginTop: 8}}>{label('lbl.searchClear', 'Clear recent')}</T></Pressable></>) : null}
        <Ttl>{label('lbl.trending', 'Browse categories')}</Ttl><View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>{categories().map(c => <Chip key={c.id} label={c.emoji + ' ' + tx(c.name)} onPress={() => go('catlist', c.id)} />)}</View>
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
      ? <Empty emoji="🤷" title={label('lbl.searchEmpty', 'No results found') + (q ? label("lbl.cms.e3168f3cd560", " for \"") + r.q + '"' : '')} text={label('lbl.searchEmptyText', 'Try another search or category.')} button={any ? label('lbl.searchClearFilters', 'Clear filters') : label('lbl.searchClearSearch', 'Clear search')} onPress={() => {if (any) S.sr.f = {}; else S.sr.q = ''; emit();}} />
      : (
        <View style={{paddingHorizontal: 16}}>
          {sug.length ? (<><Ttl>{label('lbl.browseSuggestions', 'Suggestions')}</Ttl><View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>{sug.map(x => <Chip key={x} label={x} onPress={() => setQ(x)} />)}</View></>) : null}
          {cs.length ? (<><Ttl>{label('lbl.browseCategories', 'Categories')}</Ttl><View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>{cs.map((c: any) => <Chip key={c.id} label={c.emoji + ' ' + tx(c.name)} onPress={() => go('catlist', c.id)} />)}</View></>) : null}
          {ss.length ? (<><Ttl>{label('lbl.browseStores', 'Stores')}</Ttl>{ss.map(s => (
            <View key={s.id} style={{flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: th.line}}>
              <Pressable accessibilityRole="link" onPress={() => {if (q) rec(r.q.trim()); go('store', s.id);}} style={{flex: 1, flexDirection: 'row', gap: 12, alignItems: 'center', minWidth: 0}}>
                <Tile e={s.e} bg={s.bg} />
                <View style={{flex: 1, minWidth: 0}}><View style={{flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap'}}><T weight="600">{s.n}</T>{!s.open ? <Badge cmsKey={"lbl.interface.closed"} red label={tr('closed')} /> : null}</View><T cmsKeys={["lbl.cms.29ce74d8129d",'lbl.cardNewStore']} size={13} color={th.mut}>{s.k} · {s.eta} {label("lbl.cms.29ce74d8129d", "min · ")}{s.rv > 0 ? '★ ' + s.r.toFixed(1) : label('lbl.cardNewStore', 'New store')}</T></View>
              </Pressable>
              {heartBtn(s.id, S.fav.indexOf(s.id) > -1, () => heart(s.id), S.fav.indexOf(s.id) > -1 ? label('lbl.a11yRemoveStoreFavorite', 'Remove {store}').replace('{store}', s.n) + label("lbl.page.screens.Browse.a9d3b30ba1", " from favorites") : label('lbl.a11ySaveStoreFavorite', 'Save {store}').replace('{store}', s.n) + label("lbl.page.screens.Browse.1280456fb9", " to favorites"))}
              <Pressable accessibilityRole="link" accessibilityLabel={label('lbl.a11yOpenStore', 'Open {store}').replace('{store}', s.n)} onPress={() => {if (q) rec(r.q.trim()); go('store', s.id);}}><Icon name="chevR" size={16} color={th.ink} /></Pressable>
            </View>))}</>) : null}
          {is.length ? (<><Ttl>{label("lbl.browseAuto100SEII", "Products")}</Ttl>{is.map(i => <ItemRow key={i.id} i={i} />)}</>) : null}
        </View>
      );
  }
  return (
    <View>
      <View style={{height: 100, justifyContent: 'flex-end', paddingTop: ins.top, paddingHorizontal: 16, paddingBottom: 10}}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
          <Circ icon="chevL" label={tr('back')} onPress={back} />
          <TextInput autoFocus={!r.q} value={r.q} onChangeText={setQ} placeholder={label('lbl.browseSearchPlaceholder', 'Search food, groceries, drinks')} placeholderTextColor={th.mut} accessibilityLabel={label('lbl.browseSearchAccessibility', 'Search')} style={{flex: 1, fontSize: 15, color: th.ink, backgroundColor: th.soft, borderWidth: 0.5, borderColor: th.line, borderRadius: 12, padding: 12}} />
          {r.q ? <Circ icon="x" label={label('lbl.browseClearSearch', 'Clear search')} onPress={() => setQ('')} /> : null}
        </View>
      </View>
      <View style={{height: 20, backgroundColor: stripeColor()}} />
      <View style={{height: 15}} />
      {head}
      <View style={{height: 8}} />
      {body}
    </View>
  );
}

export function FlashDeals() {
  const th = useTheme();
  const [, setContentVersion] = useState(0);
  useEffect(() => onContent(() => setContentVersion(value => value + 1)), []);
  const activeDeals = deals().filter(d => IT[d[0]]);
  return (
    <View>
      <Bar cmsKey={'lbl.flash'} title={label('lbl.flash', tr('flashDeals'))} onBack={back} />
      <View style={{paddingHorizontal:16,paddingBottom:24}}>
        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
          <T cmsKey={'lbl.flashLimitedTime'} size={13} weight="600" color={th.mut}>{label('lbl.flashLimitedTime','Limited-time offers')}</T>
          <Countdown />
        </View>
        {activeDeals.length ? <View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>
          {activeDeals.map(d => <Dish key={d[0]} i={IT[d[0]]} off={d[1]} left={d[2]} grid />)}
        </View> : <Empty title={label('lbl.flashEmptyTitle','No flash deals available')} text={label('lbl.flashEmptyBody','Check back soon for limited-time offers.')} />}
      </View>
    </View>
  );
}

export function Promos() {
  const th = useTheme();
  return (
    <View>
      <Bar cmsKey={'lbl.promosTitle'} title={label('lbl.promosTitle', 'Coupons and offers')} onBack={back} />
      <View style={{paddingHorizontal: 16}}>
        {coupons().length ? coupons().map((p: any) => (
          <Card key={p.c}>
            <Row sp><T weight="600">{p.t}</T><Badge label={p.c} /></Row>
            <T size={13.5} color={th.mut} style={{marginTop: 6, marginBottom: 10}}>{p.d}</T>
            <Row><Cta cmsKey={'lbl.promosDetails'} small ghost label={label('lbl.promosDetails', 'Details')} onPress={() => toast(p.d)} /><Cta cmsKeys={['lbl.cartApplied','lbl.promosUse']} small ghost={S.promo === p.c} label={S.promo === p.c ? label('lbl.cartApplied', 'Applied') : label('lbl.promosUse', 'Use this code')} onPress={() => applyPromo(p.c)} /></Row>
          </Card>
        )) : <Empty title={label("lbl.cms.163d8660f0f6", "No coupons or offers")} />}
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
      .select('id,title,body,read,metadata,created_at,notification_type,feature_name,destination')
      .eq('user_id', auth.user.id).ilike('feature_name', 'goodies').or(CUSTOMER_NOTIFICATION_FILTER)
      .order('created_at', {ascending: false}).limit(50);
    if (!serverMounted.current || requestId !== serverLoadId.current || serverUserId.current !== auth.user.id) return;
    if (error) { setServerError(friendlyError(error, label("lbl.cms.ce2855382c78", "Something went wrong. Please try again."))); return; }
    setServerItems((data || []).map((n: any) => ({...n, server: true, t: n.title || label('lbl.notifDefaultTitle', 'Goodies update'), d: n.body || '', u: !n.read, r: n.notification_type === 'store_message' ? 'chat' : String(n.destination || '').toLowerCase().includes('order') ? 'track' : 'other', p: n.metadata?.order_id || n.metadata?.order_code || ''})));
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
        .eq('user_id', auth.user.id).ilike('feature_name', 'goodies').or(CUSTOMER_NOTIFICATION_FILTER).eq('read', false);
      if (error) setServerError(friendlyError(error, label("lbl.cms.ce2855382c78", "Something went wrong. Please try again.")));
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
        if (error) setServerError(friendlyError(error, label("lbl.cms.ce2855382c78", "Something went wrong. Please try again.")));
        else setServerItems((prev: any[]) => prev.map((x: any) => x.id === n.id ? {...x, read: true, u: false} : x));
      }
    }
    const destination = String(n.destination || '').toLowerCase();
    const metadata = n.metadata || {};
    if (n.notification_type === 'store_message' || destination.includes('message') || destination === 'storechat') {
      let storeId = metadata.store_id || metadata.storeId;
      if (!storeId && metadata.conversation_id) {
        const {data, error} = await supabase.from('conversations').select('ref_id').eq('id', metadata.conversation_id).maybeSingle();
        if (error) { setServerError(friendlyError(error, label("lbl.cms.5152d56536a7", "Could not open this store conversation."))); return; }
        storeId = data?.ref_id;
      }
      if (storeId) { go('storechat', String(storeId)); return; }
    }
    if (destination.includes('ingredientrequest')) return;
    if (destination.includes('order') || metadata.order_id || metadata.order_code || n.notification_type === 'goodies_order_status' || n.notification_type === 'goodies_order_update') {
      let order = S.orders.find((o: any) => o.backendId && (o.backendId === metadata.order_id || o.id === metadata.order_code));
      if (!order) {
        try {
          const id = await fetchGoodiesOrderForNotification(metadata.order_id, metadata.order_code);
          if (id) order = S.orders.find((o: any) => o.id === id);
        } catch (e: any) {
          toast(friendlyError(e, label("lbl.cms.6905493e11ff", "Could not load this order.")));
          return;
        }
      }
      if (order) go('track', order.id);
      else { toast(label("lbl.cms.713a54f8696b", "This order could not be found.")); go('notifs'); }
      return;
    }
    if (destination.includes('promos') || destination.includes('promotion') || destination.includes('coupon')) { go('promos'); return; }
    if (destination.includes('address')) { go('addresses'); return; }
    if (destination.includes('wallet') || destination.includes('payment')) { go('payments'); return; }
    if (destination.includes('store') && (metadata.store_id || metadata.storeId)) { go('store', metadata.store_id || metadata.storeId); return; }
    if (destination.includes('product') && (metadata.product_id || metadata.productId)) { go('product', metadata.product_id || metadata.productId); return; }
    if (destination === 'goodies' || destination === 'goodieshome') { go('home'); return; }
    go('notifs');
  };
  return (
    <View>
      <Bar cmsKey={'lbl.notifsTitle'} title={label('lbl.notifsTitle', 'Notifications')} onBack={back} right={items.some((n: any) => n.u) ? <Pressable onPress={() => { void markAll(); }}><T cmsKey={'lbl.notifsMarkAll'} size={13.5} weight="600" color={th.br}>{label('lbl.notifsMarkAll', 'Mark all as read')}</T></Pressable> : null} />
      <View style={{paddingHorizontal: 16}}>
        {serverError ? <T size={12} color={th.red}>{serverError}</T> : null}
        {items.length ? items.map((n: any) => (
          <Pressable key={(n.server ? 'server-' : 'local-') + n.id} onPress={() => { void open(n); }} style={{flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: th.line}}>
            <View style={{width: 44, height: 44, borderRadius: 16, backgroundColor: n.u ? th.brt : th.soft, alignItems: 'center', justifyContent: 'center'}}><Text style={{fontSize: 22}}>{n.r === 'chat' ? '💬' : n.r === 'track' ? '🛵' : '🎁'}</Text></View>
            <View style={{flex: 1}}><T weight={n.u ? '800' : undefined}>{n.t}</T><T size={13} color={th.mut}>{n.d}</T></View>
            {n.u ? <View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: th.br}} /> : null}
          </Pressable>
        )) : <Empty emoji="🔔" title={label('lbl.notifsEmpty', 'You’re all caught up')} text={label('lbl.notifsEmptyText', 'Order updates and offers will appear here.')} />}
      </View>
    </View>
  );
}
