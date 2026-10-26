import React from 'react';
import {View, Text, Pressable, useWindowDimensions} from 'react-native';
import {Icon} from './Icon';
import {T, Grad, Tile, bgIdx, useTheme, Badge, heartBtn} from './ui';
import {S, STB, PV, money, dp} from '../store';
import {Item, Store} from '../data/types';
import {go, openProduct, quickAdd, heart, favp} from '../actions';
import {byoTag} from '../builders/engine';
import {t as tr} from '../i18n';

export const Stars = ({n, size = 13}: {n: string | number; size?: number}) => {
  const th = useTheme();
  return <View style={{flexDirection: 'row', alignItems: 'center', gap: 3}}><Icon name="star" size={size} color="#FFB400" fill /><T size={13} weight="700">{n}</T></View>;
};

export function Dish({i, off = 0, left, grid}: {i: Item; off?: number; left?: number; grid?: boolean}) {
  const th = useTheme(), {width} = useWindowDimensions(), s = STB[i.s];
  const p = off ? dp(i, off) : i.p, w = grid ? (width - 32 - 12) / 2 : 148;
  const dis = i.oos || (!s.open && !s.acceptScheduledOrders), saved = S.favp.indexOf(i.id) > -1;
  return (
    <View style={{width: w, borderRadius: 18, backgroundColor: th.card, borderWidth: 1, borderColor: th.line, overflow: 'hidden'}}>
      <View>
        <Pressable accessibilityRole="link" onPress={() => openProduct(i.id, off)}>
          <Grad idx={bgIdx(s.bg)} style={{height: 108, alignItems: 'center', justifyContent: 'center'}}>
            <Text style={{fontSize: 54}}>{i.e}</Text>
            {off ? <View style={{position: 'absolute', left: 8, top: 8, backgroundColor: th.red, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 3}}><T size={11.5} weight="800" color="#fff">-{off}%</T></View> : null}
            {i.oos ? <View style={{position: 'absolute', left: 8, top: 8, backgroundColor: '#555', borderRadius: 9, paddingHorizontal: 8, paddingVertical: 3}}><T size={11.5} weight="800" color="#fff">{tr('soldOut')}</T></View> : null}
          </Grad>
        </Pressable>
        {heartBtn(i.id, saved, () => favp(i.id), saved ? 'Remove ' + i.n + ' from favorites' : 'Save ' + i.n + ' to favorites')}
      </View>
      <View style={{padding: 10}}>
        <Pressable accessibilityRole="link" onPress={() => openProduct(i.id, off)}>
          <T size={13.5} weight="700" lines={1}>{i.n}</T>
          <T size={11.5} color={th.mut} lines={1} style={{marginTop: 1}}>{s.n}</T>
          {off && !i.oos ? <T size={11} weight="700" color={th.red} style={{marginTop: 5}}>Only {left} left</T> : null}
        </Pressable>
        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8}}>
          <View style={{flexDirection: 'row', alignItems: 'baseline'}}>
            <T size={15} weight="800">{money(p)}</T>
            {off ? <T size={11.5} color={th.mut} style={{marginLeft: 5, textDecorationLine: 'line-through'}}>{money(i.p)}</T> : null}
          </View>
          <Pressable accessibilityLabel={'Add ' + i.n + ' to cart'} disabled={!!dis} onPress={() => quickAdd(i.id, off)} style={{width: 34, height: 34, borderRadius: 17, backgroundColor: th.br, alignItems: 'center', justifyContent: 'center', opacity: dis ? 0.4 : 1, shadowColor: th.br, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: {width: 0, height: 4}}}>
            <Icon name="plus" size={17} color="#fff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
export function VCard({s}: {s: Store}) {
  const th = useTheme(), saved = S.fav.indexOf(s.id) > -1;
  return (
    <View style={{width: 148, borderRadius: 18, backgroundColor: th.card, borderWidth: 1, borderColor: th.line, overflow: 'hidden'}}>
      <View>
        <Pressable accessibilityRole="link" onPress={() => go('store', s.id)}>
          <Grad idx={bgIdx(s.bg)} style={{height: 108, alignItems: 'center', justifyContent: 'center'}}><Text style={{fontSize: 54}}>{s.e}</Text></Grad>
        </Pressable>
        {heartBtn(s.id, saved, () => heart(s.id), saved ? 'Remove ' + s.n + ' from favorites' : 'Save ' + s.n + ' to favorites')}
      </View>
      <Pressable onPress={() => go('store', s.id)} style={{padding: 10}}>
        <T size={13.5} weight="700" lines={1}>{s.n}</T>
        <T size={11.5} color={th.mut} lines={1}>{s.k}</T>
        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8}}>
          {s.live && s.rv === 0 ? <T size={11.5} color={th.mut}>New store</T> : <Stars n={s.r.toFixed(1)} />}<T size={11.5} color={th.mut}>{s.eta} min</T>
        </View>
      </Pressable>
    </View>
  );
}
export function StoreCard({s}: {s: Store}) {
  const th = useTheme();
  const pill = (txt: string, left = 10) => <View style={{position: 'absolute', left, bottom: 10, backgroundColor: 'rgba(27,27,31,.78)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5}}><T size={11.5} weight="700" color="#fff">{txt}</T></View>;
  return (
    <View>
      <Pressable accessibilityRole="link" onPress={() => go('store', s.id)}>
        <Grad idx={bgIdx(s.bg)} style={{height: 160, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>
          <Text style={{fontSize: 76}}>{s.e}</Text>
          {s.pr ? <View style={{position: 'absolute', left: 0, top: 14, backgroundColor: th.br, borderTopRightRadius: 8, borderBottomRightRadius: 8, paddingVertical: 5, paddingLeft: 12, paddingRight: 10}}><T size={12} weight="800" color="#fff">{s.pr}</T></View> : null}
          {heartBtn(s.id, S.fav.indexOf(s.id) > -1, () => heart(s.id), S.fav.indexOf(s.id) > -1 ? 'Remove ' + s.n + ' from favorites' : 'Save ' + s.n + ' to favorites')}
          {!s.open ? pill(tr('closed') + ' · ' + s.nx) : s.far && !s.live ? pill('Pickup only at this address') : s.rv > 80 ? pill('🔥 ' + Math.round(s.rv * 0.95) + ' ordered today') : null}
          <View style={{position: 'absolute', right: 10, bottom: 10, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5}}><T size={12} weight="700" color="#1B1B1F">{s.eta} min</T></View>
        </Grad>
      </Pressable>
      {PV[s.id] ? (
        <View style={{flexDirection: 'row', gap: 8, marginTop: 8}}>
          {s.it.slice(0, 3).map(i => (
            <Pressable key={i.id} onPress={() => openProduct(i.id)} style={{flex: 1, minWidth: 0}}>
              <Grad idx={bgIdx(s.bg)} style={{height: 72, borderRadius: 14, alignItems: 'center', justifyContent: 'center'}}><Text style={{fontSize: 36}}>{i.e}</Text></Grad>
              <T size={13} weight="800" style={{marginTop: 5}}>{money(i.p)}</T>
              <T size={11.5} color={th.mut} lines={1}>{i.n}</T>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Pressable onPress={() => go('store', s.id)} style={{paddingTop: 10, paddingHorizontal: 2}}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8}}>
          <T size={16.5} weight="800" style={{flexShrink: 1}}>{s.n}</T>
          {s.live && s.rv === 0 ? <T size={12} color={th.mut}>No reviews yet</T> : <View style={{flexDirection: 'row', alignItems: 'center', gap: 3}}><Icon name="star" size={13} color="#FFB400" fill /><T size={13} weight="700">{s.r.toFixed(1)} </T><T size={13} color={th.mut}>({s.rv})</T></View>}
        </View>
        <T size={13} color={th.mut} style={{marginTop: 3}}>{s.k} · {s.live ? 'Distance unavailable' : s.km.toFixed(1) + ' km'}</T>
        {byoTag(s.id)}
        <T size={13} color={th.mut} style={{marginTop: 3}}>{s.fee === 0 ? <T size={13} weight="700" color={th.grn}>{tr('freeDelivery')}</T> : money(s.fee) + ' ' + tr('delivery')} · {tr('minOrder')} {money(s.min)}</T>
      </Pressable>
    </View>
  );
}

export function ItemRow({i}: {i: Item}) {
  const th = useTheme(), s = STB[i.s], dis = i.oos || (!s.open && !s.acceptScheduledOrders);
  return (
    <View style={{flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: th.line}}>
      <Pressable onPress={() => openProduct(i.id)} style={{flex: 1, flexDirection: 'row', gap: 12, alignItems: 'center', minWidth: 0}}>
        <Tile e={i.e} bg={s.bg} />
        <View style={{flex: 1, minWidth: 0}}>
          <T weight="700">{i.n}</T>
          <T size={12.5} color={th.mut}>{s.n}{i.oos ? ' · ' : ''}{i.oos ? <T size={12.5} color={th.red}>{tr('soldOut')}</T> : null}</T>
          <T size={14} weight="800">{money(i.p)}</T>
        </View>
      </Pressable>
      <Pressable accessibilityLabel={S.favp.indexOf(i.id) > -1 ? 'Remove ' + i.n + ' from favorites' : 'Add ' + i.n + ' to favorites'} onPress={() => favp(i.id)} style={{width: 34, height: 34, borderRadius: 17, backgroundColor: S.favp.indexOf(i.id) > -1 ? 'rgba(253,128,46,0.12)' : th.card, borderWidth: 1, borderColor: S.favp.indexOf(i.id) > -1 ? '#FD802E' : th.line, alignItems: 'center', justifyContent: 'center'}}>
        <Icon name="heart" size={17} color={S.favp.indexOf(i.id) > -1 ? '#FD802E' : th.ink} fill={S.favp.indexOf(i.id) > -1} />
      </Pressable>
      <Pressable accessibilityLabel={'Add ' + i.n + ' to cart'} disabled={!!dis} onPress={() => quickAdd(i.id)} style={{width: 34, height: 34, borderRadius: 17, backgroundColor: th.br, alignItems: 'center', justifyContent: 'center', opacity: dis ? 0.4 : 1}}>
        <Icon name="plus" size={17} color="#fff" />
      </Pressable>
    </View>
  );
}
