import {EditableNativeText as Text} from '../EditableNativeText';
import React from 'react';
import {View, Text as UnusedNativeText, Pressable, useWindowDimensions, Image} from 'react-native';
import {Icon} from './Icon';
import {T, Grad, Tile, bgIdx, useTheme, Badge, heartBtn} from './ui';
import {S, STB, PV, money, dp, addr} from '../store';
import {Item, Store} from '../data/types';
import {go, openProduct, quickAdd, heart, favp} from '../actions';
import {byoTag} from '../builders/engine';
import {t as tr} from '../i18n';
import {label} from '../content';

export const Stars = ({n, size = 13}: {n: string | number; size?: number}) => {
  const th = useTheme();
  return <View style={{flexDirection: 'row', alignItems: 'center', gap: 3}}><Icon name="star" size={size} color="#FFB400" fill /><T size={13} weight="600">{n}</T></View>;
};

export function Dish({i, off = 0, left, grid}: {i: Item; off?: number; left?: number; grid?: boolean}) {
  const th = useTheme(), {width} = useWindowDimensions(), s = i ? STB[i.s] : undefined;
  // The live catalog can be empty while backend products are unpublished; skip stale demo IDs safely.
  if (!i || !s) return null;
  const p = off ? dp(i, off) : i.p, w = grid ? (width - 32 - 12) / 2 : 148;
  const dis = i.oos || (!s.open && !s.acceptScheduledOrders), saved = S.favp.indexOf(i.id) > -1;
  return (
    <View style={{width: w, borderRadius: 18, backgroundColor: th.card, borderWidth: 0.5, borderColor: th.line, overflow: 'hidden'}}>
      <View>
        <Pressable accessibilityRole="link" onPress={() => openProduct(i.id, off)}>
          <Grad idx={bgIdx(s.bg)} style={{height: 108, alignItems: 'center', justifyContent: 'center'}}>
            {i.photo ? <Image source={{uri: i.photo}} style={{width: '100%', height: '100%'}} resizeMode="cover" /> : <Text style={{fontSize: 54}}>{i.e}</Text>}
            {off ? <View style={{position: 'absolute', left: 8, top: 8, backgroundColor: th.red, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 3}}><T size={11.5} weight="600" color="#fff">-{off}%</T></View> : null}
            {i.oos ? <View style={{position: 'absolute', left: 8, top: 8, backgroundColor: '#555', borderRadius: 9, paddingHorizontal: 8, paddingVertical: 3}}><T cmsKey={"lbl.interface.soldOut"} size={11.5} weight="600" color="#fff">{tr('soldOut')}</T></View> : null}
          </Grad>
        </Pressable>
        {heartBtn(i.id, saved, () => favp(i.id), (saved ? label('lbl.a11yRemoveFavorite', 'Remove {name} from favorites') : label('lbl.a11ySaveFavorite', 'Save {name} to favorites')).replace('{name}', i.n))}
      </View>
      <View style={{padding: 10}}>
        <Pressable accessibilityRole="link" onPress={() => openProduct(i.id, off)}>
          <T size={13.5} weight="600" lines={1}>{i.n}</T>
          <T size={11.5} color={th.mut} lines={1} style={{marginTop: 1}}>{s.n}</T>
          {off && !i.oos ? <T cmsKeys={["lbl.cms.6536f08ae072","lbl.cms.5621f99abe47"]} size={11} weight="600" color={th.red} style={{marginTop: 5}}>{label("lbl.cms.6536f08ae072", "Only ")}{left} {label("lbl.cms.5621f99abe47", "left")}</T> : null}
        </Pressable>
        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8}}>
          <View style={{flexDirection: 'row', alignItems: 'baseline'}}>
            <T size={15} weight="600">{money(p)}</T>
            {off ? <T size={11.5} color={th.mut} style={{marginLeft: 5, textDecorationLine: 'line-through'}}>{money(i.p)}</T> : null}
          </View>
          <Pressable accessibilityLabel={label('lbl.a11yAddToCart', 'Add {name} to cart').replace('{name}', i.n)} disabled={!!dis} onPress={() => quickAdd(i.id, off)} style={{width: 34, height: 34, borderRadius: 17, backgroundColor: th.br, alignItems: 'center', justifyContent: 'center', opacity: dis ? 0.4 : 1, shadowColor: th.br, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: {width: 0, height: 4}}}>
            <Icon name="plus" size={17} color="#fff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
const storeDistanceLabel = (s: Store) => {
  if (!s.live) return s.km.toFixed(1) + label('lbl.unitKilometers', ' km');
  if (!s.distanceReady) return !addr()?.t?.trim() ? label('lbl.storeAddAddressForDistance', 'Add address to see distance') : s.distanceError ? label("lbl.page.components.cards.04b9a4b3d2", "Distance unavailable") : '';
  const meters = Math.round(s.km * 1000);
  return meters < 1000 ? meters + ' m' : (meters / 1000).toFixed(1) + label('lbl.unitKilometers', ' km');
};

export function VCard({s}: {s: Store}) {
  const th = useTheme(), saved = S.fav.indexOf(s.id) > -1;
  return (
    <View style={{width: 148, borderRadius: 18, backgroundColor: th.card, borderWidth: 0.5, borderColor: th.line, overflow: 'hidden'}}>
      <View>
        <Pressable accessibilityRole="link" onPress={() => go('store', s.id)}>
          <Grad idx={bgIdx(s.bg)} style={{height: 108, alignItems: 'center', justifyContent: 'center'}}>{s.cover || s.thumbnail || s.logo ? <Image source={{uri: s.cover || s.thumbnail || s.logo || undefined}} style={{width: '100%', height: '100%'}} resizeMode="cover" /> : <Text style={{fontSize: 54}}>{s.e}</Text>}</Grad>
        </Pressable>
        {heartBtn(s.id, saved, () => heart(s.id), (saved ? label('lbl.a11yRemoveFavorite', 'Remove {name} from favorites') : label('lbl.a11ySaveFavorite', 'Save {name} to favorites')).replace('{name}', s.n))}
      </View>
      <Pressable onPress={() => go('store', s.id)} style={{padding: 10}}>
        <T size={13.5} weight="600" lines={1}>{s.n}</T>
        <T size={11.5} color={th.mut} lines={1}>{s.k}{storeDistanceLabel(s) ? ' · ' + storeDistanceLabel(s) : ''}</T>
        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8}}>
          {(s.ratingsAvailable===false || (s.live && s.rv===0)) ? <T cmsKeys={['lbl.ratingsUnavailable','lbl.cardNewStore']} size={11.5} color={th.mut}>{s.ratingsAvailable===false ? label('lbl.ratingsUnavailable', 'Ratings unavailable') : label('lbl.cardNewStore', 'New store')}</T> : <Stars n={s.r.toFixed(1)} />}<T cmsKey={"lbl.page.components.cards.2e75737a6b"} size={11.5} color={th.mut}>{s.eta} {label("lbl.page.components.cards.2e75737a6b", " min")}</T>
        </View>
      </Pressable>
    </View>
  );
}
export function StoreCard({s, showProducts = false}: {s: Store; showProducts?: boolean}) {
  const th = useTheme();
  const pill = (txt: string, left = 10) => <View style={{position: 'absolute', left, bottom: 10, backgroundColor: 'rgba(27,27,31,.78)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5}}><T size={11.5} weight="600" color="#fff">{txt}</T></View>;
  return (
    <View>
      <Pressable accessibilityRole="link" onPress={() => go('store', s.id)}>
        <Grad idx={bgIdx(s.bg)} style={{height: 160, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>
          {s.cover || s.thumbnail || s.logo ? <Image source={{uri: s.cover || s.thumbnail || s.logo || undefined}} style={{width: '100%', height: '100%', position: 'absolute'}} resizeMode="cover" /> : <Text style={{fontSize: 76}}>{s.e}</Text>}
          {s.pr ? <View style={{position: 'absolute', left: 0, top: 14, backgroundColor: th.br, borderTopRightRadius: 8, borderBottomRightRadius: 8, paddingVertical: 5, paddingLeft: 12, paddingRight: 10}}><T size={12} weight="600" color="#fff">{s.pr}</T></View> : null}
          {heartBtn(s.id, S.fav.indexOf(s.id) > -1, () => heart(s.id), (S.fav.indexOf(s.id) > -1 ? label('lbl.a11yRemoveFavorite', 'Remove {name} from favorites') : label('lbl.a11ySaveFavorite', 'Save {name} to favorites')).replace('{name}', s.n))}
          {!s.open ? pill(tr('closed') + ' · ' + s.nx) : s.far && !s.live ? pill(label('lbl.cardPickupOnly', 'Pickup only at this address')) : null}
          <View style={{position: 'absolute', right: 10, bottom: 10, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5}}><T cmsKey={"lbl.cms.cf6143006f14"} size={12} weight="600" color="#1B1B1F">{s.eta} {label("lbl.cms.cf6143006f14", "min")}</T></View>
        </Grad>
      </Pressable>
      {PV[s.id] || showProducts ? (
        <View style={{flexDirection: 'row', gap: 8, marginTop: 8}}>
          {s.it.slice(0, 3).map(i => (
            <Pressable key={i.id} onPress={() => openProduct(i.id)} style={{flex: 1, minWidth: 0}}>
              <Grad idx={bgIdx(s.bg)} style={{height: 72, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>{i.photo ? <Image source={{uri: i.photo}} style={{width: '100%', height: '100%'}} resizeMode="cover" /> : <Text style={{fontSize: 36}}>{i.e}</Text>}</Grad>
              <T size={13} weight="600" style={{marginTop: 5}}>{money(i.p)}</T>
              <T size={11.5} color={th.mut} lines={1}>{i.n}</T>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Pressable onPress={() => go('store', s.id)} style={{paddingTop: 10, paddingHorizontal: 2}}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8}}>
          <T size={16.5} weight="600" style={{flexShrink: 1}}>{s.n}</T>
          {(s.ratingsAvailable===false || (s.live && s.rv===0)) ? <T cmsKeys={['lbl.ratingsUnavailable','lbl.storeNoReviewsYet']} size={12} color={th.mut}>{s.ratingsAvailable===false ? label('lbl.ratingsUnavailable', 'Ratings unavailable') : label('lbl.storeNoReviewsYet', 'No reviews yet')}</T> : <View style={{flexDirection: 'row', alignItems: 'center', gap: 3}}><Icon name="star" size={13} color="#FFB400" fill /><T size={13} weight="600">{s.r.toFixed(1)} </T><T size={13} color={th.mut}>({s.rv})</T></View>}
        </View>
        <T size={13} color={th.mut} style={{marginTop: 3}}>{s.k}{storeDistanceLabel(s) ? ' · ' + storeDistanceLabel(s) : ''}</T>
        {byoTag(s.id)}
        <T cmsKeys={["lbl.interface.freeDelivery","lbl.interface.delivery","lbl.interface.minOrder"]} size={13} color={th.mut} style={{marginTop: 3}}>{s.fee === 0 ? <T cmsKey={"lbl.interface.freeDelivery"} size={13} weight="600" color={th.grn}>{tr('freeDelivery')}</T> : money(s.fee) + ' ' + tr('delivery')} · {tr('minOrder')} {money(s.min)}</T>
      </Pressable>
    </View>
  );
}

export function ItemRow({i}: {i: Item}) {
  const th = useTheme(), s = STB[i.s], dis = i.oos || (!s.open && !s.acceptScheduledOrders);
  return (
    <View style={{flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: th.line}}>
      <Pressable onPress={() => openProduct(i.id)} style={{flex: 1, flexDirection: 'row', gap: 12, alignItems: 'center', minWidth: 0}}>
        <Tile e={i.e} bg={s.bg} photo={i.photo} />
        <View style={{flex: 1, minWidth: 0}}>
          <T weight="600">{i.n}</T>
          <T cmsKey={"lbl.interface.soldOut"} size={12.5} color={th.mut}>{s.n}{i.oos ? ' · ' : ''}{i.oos ? <T cmsKey={"lbl.interface.soldOut"} size={12.5} color={th.red}>{tr('soldOut')}</T> : null}</T>
          <T size={14} weight="600">{money(i.p)}</T>
        </View>
      </Pressable>
      <Pressable accessibilityLabel={(S.favp.indexOf(i.id) > -1 ? label('lbl.a11yRemoveFavorite', 'Remove {name} from favorites') : label('lbl.a11yAddFavorite', 'Add {name} to favorites')).replace('{name}', i.n)} onPress={() => favp(i.id)} style={{width: 34, height: 34, borderRadius: 17, backgroundColor: S.favp.indexOf(i.id) > -1 ? 'rgba(253,128,46,0.12)' : th.card, borderWidth: 0.5, borderColor: S.favp.indexOf(i.id) > -1 ? '#FD802E' : th.line, alignItems: 'center', justifyContent: 'center'}}>
        <Icon name="heart" size={17} color={S.favp.indexOf(i.id) > -1 ? '#FD802E' : th.ink} fill={S.favp.indexOf(i.id) > -1} />
      </Pressable>
      <Pressable accessibilityLabel={label('lbl.a11yAddToCart', 'Add {name} to cart').replace('{name}', i.n)} disabled={!!dis} onPress={() => quickAdd(i.id)} style={{width: 34, height: 34, borderRadius: 17, backgroundColor: th.br, alignItems: 'center', justifyContent: 'center', opacity: dis ? 0.4 : 1}}>
        <Icon name="plus" size={17} color="#fff" />
      </Pressable>
    </View>
  );
}
