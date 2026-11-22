import {Modal,previewShare as Share} from '../previewNative';
import {EditableNativeText as Text} from '../EditableNativeText';
import {notifyStoreReviewsChanged} from '../reviews';
import {scheduleDays, scheduleChoice, clampScheduleTime, scheduleMinimum} from '../scheduling';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {View, Text as UnusedNativeText, Pressable, Modal as UnusedNativeModal, ScrollView, KeyboardAvoidingView, Share as UnusedNativeShare, Image, Platform, TextInput, useWindowDimensions, PanResponder} from 'react-native';
import {PreviewDateTimePicker as DateTimePicker} from '../previewNative';
import {T, Cta, Row, Card, Badge, Input, Radio, Seg, SheetBox, Bar, Empty, useTheme} from './ui';
import {Icon} from './Icon';
import {CameraView, useCameraPermissions} from '../previewNative';
import QRCode from 'react-native-qrcode-svg';
import {S, STB, money, emit, save, toast, ui, addr, defAddr, done, phoneOK, fmtDay, fmtTime, alcAge, cartStoreIds, canScheduleGoodiesStore, lineStore, IT, syncGroupOrderCartLine, removeGroupOrderCartLine, refreshUserAddresses, persistGoodiesContactNumber, removeGoodiesContactNumber, clearActiveGroup} from '../store';
import * as A from '../actions';
import {previewBackend as supabase} from '../previewRuntime';
import {PROMO_DETAIL} from '../data/promoText';
import {bzLeave, bzDiscard, bzReset2} from '../builders/engine';
import {rgText, label} from '../content';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {BottomSheet, ConfirmDialog} from './Overlays';
import {friendlyError} from '../friendlyError';
import {fetchOpenHostedGoodiesGroup} from '../groupRecovery';
import {groupInviteCodeFromScan} from '../groupInviteLinks';
import {fetchGoodiesOrderForNotification} from '../serverSync';
import {push, reset} from '../store';
import {wantissLocale} from '../previewLocales';

export function Sheets({sheet, close}: {sheet: any; close: () => void}) {
  const th = useTheme(), insets = useSafeAreaInsets(), {height: windowHeight} = useWindowDimensions();
  if (!sheet) return null;
  const k = sheet.kind;
  const stars = (n: number, on: (v: number) => void) => <View style={{flexDirection: 'row', justifyContent: 'center', gap: 6, marginVertical: 10}}>{[1, 2, 3, 4, 5].map(v => <Pressable key={v} onPress={() => on(v)}><Icon name="star" size={32} color={n >= v ? '#FFB400' : th.line} fill /></Pressable>)}</View>;
  let content: any = null;
  if (k === 'newcart') content = (<><T cmsKey={'lbl.sheetStartCart'} size={20} weight="600">{label('lbl.sheetStartCart', 'Start a new cart?')}</T><T cmsKeys={["lbl.cms.adf8a6e98991","lbl.cms.5a754caad741","lbl.cms.936aefb39183","lbl.cms.516f8e8c1f07","lbl.cms.1a5decb44df8","lbl.cms.3402664551ea","lbl.cms.dd7415008f6b"]} color={th.mut} style={{marginVertical: 8, marginBottom: 18}}>{sheet.canMerge ? label("lbl.cms.adf8a6e98991", "Your cart has items from ") + sheet.from + label("lbl.cms.5a754caad741", ". Add ") + sheet.to + label("lbl.cms.936aefb39183", " to the same order, or start a new cart.") : sheet.stops >= sheet.max ? label("lbl.cms.adf8a6e98991", "Your cart has items from ") + sheet.from + label("lbl.cms.516f8e8c1f07", ". One order can include up to ") + sheet.max + label("lbl.cms.1a5decb44df8", " stores, so adding from ") + sheet.to + label("lbl.cms.3402664551ea", " replaces them.") : label("lbl.cms.adf8a6e98991", "Your cart has items from ") + sheet.from + label("lbl.cms.dd7415008f6b", ". Adding from ") + sheet.to + label("lbl.cms.3402664551ea", " replaces them.")}</T>{sheet.canMerge ? <><Cta cmsKey={"lbl.cms.ec46b728216f"} label={label("lbl.cms.ec46b728216f", "Add to this order")} onPress={A.addStop} /><View style={{height: 10}} /></> : null}<Cta cmsKeys={["lbl.cms.31fdc2bc7366",'lbl.sheetReplace']} ghost={!!sheet.canMerge} label={sheet.canMerge ? label("lbl.cms.31fdc2bc7366", "Start a new cart") : label('lbl.sheetReplace', 'Replace and add')} onPress={A.newCart} /><View style={{height: 10}} /><Cta cmsKey={'lbl.sheetKeepCart'} ghost label={label('lbl.sheetKeepCart', 'Keep current cart')} onPress={close} /></>);
  if (k === 'byoleave') content = (<><T cmsKeys={['lbl.sheetDiscardTitle','lbl.sheetLeaveTitle']} size={20} weight="600">{sheet.edit ? label('lbl.sheetDiscardTitle', 'Discard your changes?') : label('lbl.sheetLeaveTitle', 'Leave this builder?')}</T><T cmsKeys={['lbl.sheetDiscardText','lbl.sheetLeaveText']} color={th.mut} style={{marginVertical: 8, marginBottom: 18}}>{sheet.edit ? label('lbl.sheetDiscardText', 'The item in your cart stays as it was.') : label('lbl.sheetLeaveText', 'Your choices can be saved as a draft so you can pick up where you left off.')}</T>{sheet.edit ? null : <><Cta cmsKey={'lbl.sheetBuilderSave'} label={label('lbl.sheetBuilderSave', 'Save draft and leave')} onPress={bzLeave} /><View style={{height: 10}} /></>}<Pressable onPress={bzDiscard} style={{height: 52, borderRadius: 16, backgroundColor: th.red, alignItems: 'center', justifyContent: 'center'}}><T cmsKey={'lbl.sheetDiscard'} size={15.5} weight="600" color="#fff">{label('lbl.sheetDiscard', 'Discard')}</T></Pressable><View style={{height: 10}} /><Cta cmsKey={'lbl.sheetKeepEditing'} ghost label={label('lbl.sheetKeepEditing', 'Keep editing')} onPress={close} /></>);
  if (k === 'byoreset') content = (<><T cmsKey={'lbl.sheetStartOver'} size={20} weight="600">{label('lbl.sheetStartOver', 'Start over?')}</T><T cmsKey={"lbl.sheetAuto1DTRBEO"} color={th.mut} style={{marginVertical: 8, marginBottom: 18}}>{label("lbl.sheetAuto1DTRBEO", "This clears your current choices. Items already in your cart are not affected.")}</T><Cta cmsKey={"lbl.sheetAutoT5109D"} label={label("lbl.sheetAutoT5109D", "Start over")} onPress={bzReset2} /><View style={{height: 10}} /><Cta cmsKey={'lbl.sheetKeepEditing'} ghost label={label('lbl.sheetKeepEditing', 'Keep editing')} onPress={close} /></>);
  if (k === 'alcrules') { const a = alcAge(sheet.sid || (S.pend && S.pend[0] ? S.pend[0].s : null)); content = (<><View style={{alignItems: 'center', marginBottom: 6}}><Text style={{fontSize: 44}}>🪪</Text></View><T cmsKey={'lbl.sheetAlcoholRules'} size={20} weight="600">{label('lbl.sheetAlcoholRules', 'Alcohol rules')}</T><T color={th.mut} style={{marginTop: 8, lineHeight: 21}}>{rgText('rg.rules', 'Alcohol is sold only to customers aged {age} or older. Minors may not buy alcohol. Valid government photo ID is required at delivery or pickup. If the ID check fails, you are refunded to your Wantiss wallet minus the delivery fee.', a.age)}</T><Card style={{marginTop: 12}}><T cmsKey={"lbl.cms.06e2931ac98c"} size={13.5}>{label("lbl.cms.06e2931ac98c", "• Minimum age here: ")}<T weight="600">{a.age}</T></T><T cmsKey={"lbl.sheetAuto9O43A9"} size={13.5}>{label("lbl.sheetAuto9O43A9", "• The courier checks your ID at the door. At a pickup, the shop checks it.")}</T><T cmsKey={"lbl.sheetAuto1JBCM1P"} size={13.5}>{label("lbl.sheetAuto1JBCM1P", "• If it fails, you get a refund to your Wantiss wallet minus the delivery fee.")}</T></Card><View style={{height: 6}} /><Cta cmsKey={'lbl.sheetAlcoholAccept'} label={label('lbl.sheetAlcoholAccept', 'I understand')} onPress={A.alcAccept} /><View style={{height: 10}} /><Cta cmsKey={"lbl.sheetAutoWFRFF9"} ghost label={label("lbl.sheetAutoWFRFF9", "Cancel")} onPress={close} /></>); }
  if (k === 'schedule') content = <ScheduleSheet close={close} />;
  if (k === 'contacts') content = <ContactsSheet close={close} />;
  if (k === 'ctform') content = <CtForm key={sheet.id || 'new'} id={sheet.id} bottomInset={insets.bottom} />;
  if (k === 'replace') content = (<><T cmsKey={'lbl.sheetReplaceCart'} size={20} weight="600">{label('lbl.sheetReplaceCart', 'Replace your cart?')}</T><T cmsKey={"lbl.cms.adf8a6e98991"} color={th.mut} style={{marginVertical: 8, marginBottom: 18}}>{label("lbl.cms.adf8a6e98991", "Your cart has items from ")}{sheet.from}.</T><Cta cmsKey={'lbl.sheetReorder'} label={label('lbl.sheetReorder', 'Replace and reorder')} onPress={A.runReorder} /><View style={{height: 10}} /><Cta cmsKey={'lbl.sheetKeepCart'} ghost label={label('lbl.sheetKeepCart', 'Keep current cart')} onPress={close} /></>);
  if (k === 'remove-number') content = (<>
    <T cmsKey={'lbl.sheetRemoveNumberTitle'} size={20} weight="600">{label('lbl.sheetRemoveNumberTitle', 'Remove this contact number?')}</T>
    <T cmsKeys={['lbl.sheetRemoveNumberBody','lbl.sheetNumberFallback']} color={th.mut} style={{marginVertical: 8, marginBottom: 18}}>{label('lbl.sheetRemoveNumberBody', 'Remove {number} from your Goodies checkout contacts?').replace('{number}', String(sheet.numberLabel || label('lbl.sheetNumberFallback', 'this number')))}</T>
    <Cta cmsKey={'lbl.sheetRemoveNumberConfirm'} label={label('lbl.sheetRemoveNumberConfirm', 'Remove number')} onPress={() => { void sheet.onConfirm?.(); }} />
    <View style={{height: 10}} />
    <Cta cmsKey={'lbl.sheetKeepNumber'} ghost label={label('lbl.sheetKeepNumber', 'Keep number')} onPress={close} />
  </>);
  if (k === 'remove-address') content = (<>
    <T cmsKey={'lbl.sheetDeleteAddressTitle'} size={20} weight="600">{label('lbl.sheetDeleteAddressTitle', 'Delete this address?')}</T>
    <T cmsKeys={['lbl.sheetDeleteAddressBody','lbl.sheetAddressFallback']} color={th.mut} style={{marginVertical: 8, marginBottom: 18}}>{label('lbl.sheetDeleteAddressBody', 'Remove {address} from your saved addresses?').replace('{address}', String(sheet.addressLabel || label('lbl.sheetAddressFallback', 'this address')))}</T>
    <Cta cmsKey={'lbl.sheetDeleteAddressConfirm'} label={label('lbl.sheetDeleteAddressConfirm', 'Delete address')} onPress={() => { void sheet.onConfirm?.(); }} />
    <View style={{height: 10}} />
    <Cta cmsKey={'lbl.sheetKeepAddress'} ghost label={label('lbl.sheetKeepAddress', 'Keep address')} onPress={close} />
  </>);
  if (k === 'remove-item') content = (<><T cmsKey={'lbl.sheetRemoveItemTitle'} size={20} weight="600">{label('lbl.sheetRemoveItemTitle', 'Remove this item?')}</T><T cmsKeys={['lbl.sheetRemoveItemBody','lbl.sheetItemFallback']} color={th.mut} style={{marginVertical: 8, marginBottom: 18}}>{label('lbl.sheetRemoveItemBody', 'Remove {item} from your cart?').replace('{item}', String(sheet.itemName || label('lbl.sheetItemFallback', 'this item')))}</T><Cta cmsKey={'lbl.sheetRemoveItemConfirm'} label={label('lbl.sheetRemoveItemConfirm', 'Remove item')} onPress={() => { A.qty(String(sheet.lineKey), -1); close(); }} /><View style={{height: 10}} /><Cta cmsKey={'lbl.sheetKeepItem'} ghost label={label('lbl.sheetKeepItem', 'Keep item')} onPress={close} /></>);
  if (k === 'clear') content = (<><T cmsKey={'lbl.sheetClearCart'} size={20} weight="600">{label('lbl.sheetClearCart', 'Clear your cart?')}</T><T cmsKey={"lbl.sheetAuto1K2QIKR"} color={th.mut} style={{marginVertical: 8, marginBottom: 18}}>{label("lbl.sheetAuto1K2QIKR", "All items will be removed.")}</T><Pressable onPress={A.clearCart} style={{height: 52, borderRadius: 16, backgroundColor: th.red, alignItems: 'center', justifyContent: 'center'}}><T cmsKey={'lbl.sheetClearCartAction'} size={15.5} weight="600" color="#fff">{label('lbl.sheetClearCartAction', 'Clear cart')}</T></Pressable><View style={{height: 10}} /><Cta cmsKey={"lbl.sheetAutoWFRFF9"} ghost label={label("lbl.sheetAutoWFRFF9", "Cancel")} onPress={close} /></>);
  if (k === 'cancel') content = (<><T cmsKey={'lbl.sheetCancelOrder'} size={20} weight="600">{label('lbl.sheetCancelOrder', 'Cancel this order?')}</T><T cmsKey={"lbl.sheetAutoFMXIAY"} color={th.mut} style={{marginVertical: 8, marginBottom: 18}}>{label("lbl.sheetAutoFMXIAY", "You can cancel until the store finishes preparing it.")}</T><Pressable onPress={() => A.cancelOrder(sheet.id)} style={{height: 52, borderRadius: 16, backgroundColor: th.red, alignItems: 'center', justifyContent: 'center'}}><T cmsKey={'lbl.sheetCancelConfirm'} size={15.5} weight="600" color="#fff">{label('lbl.sheetCancelConfirm', 'Yes, cancel order')}</T></Pressable><View style={{height: 10}} /><Cta cmsKey={"lbl.sheetAuto81YEJ2"} ghost label={label("lbl.sheetAuto81YEJ2", "Keep order")} onPress={close} /></>);
  if (k === 'promo') {
    const d = PROMO_DETAIL[sheet.p as 'free' | 'points' | 'produce'], custom = sheet.custom || {};
    content = (<>
      <View style={{height: 150, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: d.bg, marginBottom: 12}}><Text style={{fontSize: 78}}>{custom.emoji || d.e}</Text></View>
      <T cmsKey={'lbl.promoDetailsUnavailable'} size={21} weight="600">{custom.title ?? label('lbl.promoDetailsUnavailable', 'Offer details are unavailable')}</T>
      <T cmsKey={'lbl.promoDetailsUnavailableBody'} color={th.mut} style={{marginVertical: 8, marginBottom: 18, lineHeight: 21}}>{custom.sub ?? label('lbl.promoDetailsUnavailableBody', 'Browse the current offers for up-to-date details.')}</T>
      <Cta cmsKey={'lbl.promoBrowseOffers'} label={custom.btn ?? label('lbl.promoBrowseOffers', 'Browse offers')} onPress={() => {
        const target = String(custom.target || '');
        if (target.startsWith('category:')) A.promoGo(target.slice(9));
        else if (target === 'screen:wallet') {close(); A.go('payments');}
        else if (target === 'screen:promos') {close(); A.go('promos');}
        else if (target) {close(); A.go('catlist', 'all');}
        else A.promoGo(d.go);
      }} />
    </>);
  }
  if (k === 'sinfo') {
    const s = STB[sheet.id];
    const row = (a: string, b: string) => <View key={a} style={{flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 11, borderBottomWidth: 0.5, borderBottomColor: th.line}}><T color={th.mut} style={{width: '38%'}}>{a}</T><T color={th.ink} weight="600" style={{flex: 1, textAlign: 'right'}}>{b}</T></View>;
    content = !s ? <Empty title={label('lbl.storeNotFound', 'Store not found')} button={label('lbl.storeBackToStores', 'Back to stores')} onPress={() => {close(); A.browse();}} /> : (<>
      <T size={23} weight="600">{s.businessName || s.n}</T>
      <T color={th.mut} style={{marginTop: 6, marginBottom: 14, lineHeight: 21}}>{s.businessDescription || s.k}</T>
      <Card style={{padding: 16}}>
        <Row style={{gap: 10, alignItems: 'center', marginBottom: 10}}>
          <Pressable accessibilityRole="button" accessibilityLabel={label("lbl.sheetAutoC0Z21F", "Read store reviews")} onPress={() => {close(); A.go('reviews', sheet.id);}} style={{flex: 1}}><T cmsKey={'lbl.storeCustomerReviews'} size={13} color={th.br}>{label('lbl.storeCustomerReviews', 'Customer reviews').toUpperCase()}</T><T cmsKeys={['lbl.sheetRatingSummary','lbl.storeNoReviewsYet']} size={18} weight="600">{s.rv > 0 ? label('lbl.sheetRatingSummary', '★ {rating} ({n} reviews)').replace('{rating}', s.r.toFixed(1)).replace('{n}', String(s.rv)) : label('lbl.storeNoReviewsYet', 'No reviews yet')}</T></Pressable>
          <Badge label={s.open ? label('lbl.sheetOpenNow', 'Open now') : label('lbl.sheetClosedNow', 'Closed now')} />
        </Row>
        {row(label('lbl.storeOpeningHours', 'Opening hours'), s.h)}
        {row(label('lbl.storeCurrentStatus', 'Current status'), s.open ? label('lbl.sheetAcceptingOrders', 'Accepting orders') : s.nx || label('lbl.storeCurrentlyClosed', 'Currently closed'))}
        {s.businessAddress ? row(label('lbl.storeAddress', 'Address'), [s.businessAddress, s.businessCity, s.businessCountry].filter(Boolean).join(', ')) : null}
        {s.businessPhone ? row(label('lbl.storePhone', 'Phone'), s.businessPhone) : null}
        {s.businessEmail ? row(label('lbl.storeEmail', 'Email'), s.businessEmail) : null}
        {s.businessWebsite ? row(label('lbl.storeWebsite', 'Website'), s.businessWebsite) : null}
        {s.businessDeliveryModes?.length ? row(label('lbl.storeServices', 'Available services'), s.businessDeliveryModes.join(' and ')) : null}
        {row(label('lbl.storeDeliveryFee', 'Delivery fee'), s.fee === 0 ? label('lbl.filterFree', 'Free delivery') : money(s.fee))}
        {row(label('lbl.storeMinimumOrder', 'Minimum order'), money(s.min))}
        {s.live ? (s.distanceReady ? row(label('lbl.storeDistance', 'Distance'), label('lbl.storeDistanceFromAddress', '{km} km from your address').replace('{km}', s.km.toFixed(1))) : !addr()?.t?.trim() ? row(label('lbl.storeDistance', 'Distance'), label('lbl.storeAddAddressForDistance', 'Add address to see distance')) : null) : row(label('lbl.storeDistance', 'Distance'), label('lbl.sheetKmAway', '{km} km away').replace('{km}', s.km.toFixed(1)))}
        {row(label('lbl.storeEstimatedDelivery', 'Estimated delivery'), s.eta + label('lbl.unitMinutes', ' min'))}
        {row(label('lbl.storeOrderMethods', 'Order methods'), label('lbl.sheetDeliveryAndPickup', 'Delivery and pickup'))}
        {row(label('lbl.storeScheduledOrders', 'Scheduled orders'), s.acceptScheduledOrders ? label('lbl.sheetScheduledAvailable', 'Available while closed') : label('lbl.sheetScheduledOnlyOpen', 'Only while open'))}
        {s.acceptScheduledOrders ? row(label('lbl.storeAdvanceTime', 'Earliest order time'), String(s.scheduledOrderStartTime || '10:00').slice(0,5)) : null}
      </Card>
    </>);
  }
  if (k === 'review' || k === 'driver-review') content = <ReviewSheet key={String(sheet.id) + ':' + k} id={sheet.id} stars={stars} driver={k === 'driver-review'} initialStars={sheet.initialStars} />;
  if (k === 'addr') content = (<><T cmsKey={'lbl.sheetDeliverToTitle'} size={20} weight="600" style={{marginBottom: 4}}>{label('lbl.sheetDeliverToTitle', 'Deliver to')}</T><T cmsKey={'lbl.sheetAddressScope'} size={12.5} color={th.mut} style={{marginBottom: 12}}>{label('lbl.sheetAddressScope', 'Choosing an address here only changes Goodies. Your Wantiss default stays the same.')}</T>{S.addr.map((a: any) => <Radio key={a.id} on={a.id === S.as} onPress={() => A.selectAddr(a.id)}><Row style={{gap: 6}}><T weight="600">{a.l}</T>{a.def ? <Badge cmsKey={"lbl.sheetAutoCKTN2B"} green label={label("lbl.sheetAutoCKTN2B", "Wantiss default")} /> : null}{a.goodiesDefault ? <View style={{backgroundColor: '#FD802E', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3}}><T cmsKey={"lbl.cms.7f7b502a8d5a"} size={10} weight="600" color="#fff">{label("lbl.cms.7f7b502a8d5a", "GOODIES")}</T></View> : null}</Row><T size={12.5} color={th.mut}>{a.t}</T></Radio>)}<Cta cmsKey={"lbl.sheetAuto16NJT2W"} ghost label={label("lbl.sheetAuto16NJT2W", "Manage addresses")} onPress={() => {close(); A.go('addresses');}} /></>);

  if (k === 'group-order') return <GroupOrderModal close={close} storeId={String(sheet.storeId || '')} />;
  const isRatingSheet = k === 'review' || k === 'driver-review';
  const isCenteredSheet = ['remove-item','remove-address','remove-number','clear','cancel','newcart','replace','byoleave','byoreset','alcrules'].includes(k);
  const sheetBody = (
    <View style={{width:'100%', height: k==='promo' ? 370 : isRatingSheet ? Math.min(430, windowHeight * 0.68) : k==='schedule' ? Math.min(560, windowHeight * 0.72) : k==='ctform' || k==='contacts' ? Math.min(600, windowHeight * 0.84) : undefined, maxHeight: k==='schedule' ? Math.min(560, windowHeight * 0.72) : k==='ctform' || k==='contacts' ? '94%' : isRatingSheet ? windowHeight * 0.68 : k==='promo' ? 370 : k==='sinfo' ? '92%' : isCenteredSheet?'90%':'90%', flexShrink:1, minHeight: isCenteredSheet ? 360 : k==='ctform' || k==='contacts' ? 400 : 0, marginBottom:0}}>
      <SheetBox centered={isCenteredSheet || k === 'contacts' || k === 'ctform'} large={isRatingSheet || k === 'sinfo' || k === 'schedule' || k === 'ctform' || k === 'contacts' } compact={false} onClose={close}>{k === 'ctform' ? content : <ScrollView style={k === 'promo' ? {flexGrow:0,flexShrink:1} : {flex:1,minHeight:0}} contentContainerStyle={k === 'promo' ? {paddingBottom:0} : {paddingBottom:Math.max(16,insets.bottom),flexGrow:1}} nestedScrollEnabled keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" showsVerticalScrollIndicator={false}>{content}</ScrollView>}</SheetBox>
    </View>
  );
  if (isCenteredSheet) {
    return <ConfirmDialog visible onClose={close} accessibilityLabel={label("lbl.sheetAutoKDBKGE", "Close dialog")}>{sheetBody}</ConfirmDialog>;
  }
  return <BottomSheet visible onClose={close} keyboardAware={k === 'contacts' || k === 'ctform'} maxHeight={k==='schedule' ? Math.max(0, windowHeight - insets.top) : k==='ctform' || k==='contacts' ? '94%' : k==='promo' ? 370 : k==='sinfo' ? '92%' : isRatingSheet ? windowHeight * 0.68 : '90%'}>{sheetBody}</BottomSheet>;
}

function isAvailableInstant(instant: Date) {
  const stores = cartStoreIds();
  return stores.length > 0 && stores.every(storeId => canScheduleGoodiesStore(storeId, instant.getTime()));
}

function ScheduleSheet({close, inline = false, autoApply = false}: {close: () => void; inline?: boolean; autoApply?: boolean}) {
  const th = useTheme(), store: any = STB[S.cart.sid];
  const customerZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Etc/GMT';
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(timer); }, []);
  const scheduleKey = JSON.stringify(cartStoreIds().map(id => ({id, live: STB[id]?.live, enabled: STB[id]?.acceptScheduledOrders, hours: STB[id]?.scheduleHours, start: STB[id]?.scheduledOrderStartTime, zone: STB[id]?.scheduledOrderTimezone})));
  const days = useMemo(() => scheduleDays(now, isAvailableInstant), [now, scheduleKey]);
  const [selection, setSelection] = useState(() => scheduleChoice(days, S.sch || 0, now)?.getTime() || 0);
  const [dayOffset, setDayOffset] = useState(() => Math.max(0, days.findIndex(day => day.slots.some(slot => slot.getTime() === selection))));
  const [deliveryMode, setDeliveryMode] = useState(S.mode === 'pickup' || store?.far ? 'pickup' : 'delivery');
  const [pickerRevision, setPickerRevision] = useState(0);
  const day = days[dayOffset] || days[0], availableSlots = day.slots;
  const selected = availableSlots.find(slot => slot.getTime() === selection && slot.getTime() >= scheduleMinimum(now)) || null;
  const earliestInstant = availableSlots[0] || null;
  useEffect(() => {
    const next = scheduleChoice(days, selection, Date.now());
    const timestamp = next?.getTime() || 0;
    if (timestamp !== selection) setSelection(timestamp);
    const offset = next ? days.findIndex(candidate => candidate.slots.some(slot => slot.getTime() === timestamp)) : 0;
    if (offset !== dayOffset) setDayOffset(Math.max(0, offset));
    if (autoApply && S.sch !== timestamp) A.setSch(timestamp);
  }, [days, selection, dayOffset, now, autoApply]);
  const pick = (instant: Date, offset = dayOffset) => {
    const bounded = clampScheduleTime(days[offset], instant, Date.now());
    if (!bounded) { setNow(Date.now()); return; }
    setDayOffset(offset); setSelection(bounded.getTime());
    if (autoApply && S.sch !== bounded.getTime()) A.setSch(bounded.getTime());
  };
  const formatCustomer = (timestamp: number, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(wantissLocale(S.lang) === 'ht' ? 'fr-HT' : wantissLocale(S.lang), {...options, timeZone: customerZone}).format(new Date(timestamp));
  const choose = () => {
    if (!store) { toast(label('lbl.sheetChooseStore', 'Choose a store before scheduling.')); return; }
    if (!store.acceptScheduledOrders) { toast(label('lbl.sheetNoScheduleClosed', 'This store does not accept scheduled orders.')); return; }
    const bounded = selected && clampScheduleTime(day, selected, Date.now());
    if (!bounded || !isAvailableInstant(bounded)) { setNow(Date.now()); toast(label('lbl.sheetScheduleUnavailable', 'No scheduled times are available.')); return; }
    A.setSch(bounded.getTime()); A.setMode(deliveryMode);
    toast(label('lbl.sheetScheduledFor','Scheduled for {day}, {time}').replace('{day}',formatCustomer(bounded.getTime(),{weekday:'short',month:'short',day:'numeric'})).replace('{time}',formatCustomer(bounded.getTime(),{hour:'numeric',minute:'2-digit',timeZoneName:'short'})));
    close();
  };
  return <View style={inline ? {paddingTop:12,paddingBottom:12,borderTopWidth:0.5,borderTopColor:th.line,marginTop:10} : undefined}>
    {inline ? null : <T cmsKey={'lbl.sheetScheduleTitle'} size={21} weight='600'>{label('lbl.sheetScheduleTitle', 'Schedule your order')}</T>}
    <SegSchedule value={deliveryMode} onChange={value => {setDeliveryMode(value); if (autoApply) A.setMode(value);}} />
    <T cmsKey={'lbl.sheetChooseDay'} size={14} weight='600' style={{marginTop:12,marginBottom:8}}>{label('lbl.sheetChooseDay', 'Choose a day')}</T>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8,paddingBottom:8}}>
      {days.map(({date, slots}, i) => {const active = dayOffset === i; return <Pressable key={date.getTime()} disabled={!slots.length} accessibilityState={{disabled:!slots.length,selected:active}} onPress={() => {if (slots[0]) pick(slots[0], i);}} style={{minWidth:74,paddingVertical:10,paddingHorizontal:10,borderRadius:14,backgroundColor:active?th.br:th.soft,alignItems:'center',borderWidth:0.5,borderColor:active?th.br:th.line,opacity:slots.length?1:0.45}}>
        <T cmsKeys={["lbl.cms.acf78f33a391","lbl.cms.8548c22a9780"]} size={11.5} weight='600' color={active?'#fff':th.mut}>{i===0?label("lbl.cms.acf78f33a391", "Today"):i===1?label("lbl.cms.8548c22a9780", "Tomorrow"):date.toLocaleDateString(S.lang,{weekday:'short'})}</T><T size={15} weight='600' color={active?'#fff':th.ink}>{date.getDate()}</T><T size={10.5} color={active?'#fff':th.mut}>{date.toLocaleDateString(S.lang,{month:'short'})}</T>
      </Pressable>;})}
    </ScrollView>
    {earliestInstant ? <>
      <T cmsKey={'lbl.sheetExactTime'} size={13} weight='600' style={{marginTop:12,marginBottom:6}}>{label('lbl.sheetExactTime', 'Choose a time')}</T>
      {inline ? <DateTimePicker key={pickerRevision} value={selected || earliestInstant} minimumDate={earliestInstant} maximumDate={availableSlots[availableSlots.length - 1]} mode='time' display={Platform.OS==='ios'?'spinner':'clock'} minuteInterval={5} onChange={(event, date) => {
        if (event.type === 'dismissed' || !date) return;
        const bounded = clampScheduleTime(day, date, Date.now());
        if (!bounded) return;
        pick(bounded);
        if (Platform.OS === 'ios' && bounded.getTime() !== date.getTime()) setPickerRevision(value => value + 1);
      }} /> : <ScrollView style={{maxHeight:156,marginTop:6}} nestedScrollEnabled showsVerticalScrollIndicator={false} contentContainerStyle={{flexDirection:'row',flexWrap:'wrap',gap:8,paddingBottom:4}}>
        {availableSlots.filter((_, i) => i % 3 === 0 || availableSlots.length < 24).map(slot => {const active = selection === slot.getTime(); return <Pressable key={slot.getTime()} onPress={() => pick(slot)} style={{width:'23%',minHeight:38,borderRadius:10,alignItems:'center',justifyContent:'center',backgroundColor:active?th.br:th.soft,borderWidth:active?0.5:0,borderColor:th.br}}><T size={12.5} weight='600' color={active?'#fff':th.ink}>{String(slot.getHours()).padStart(2,'0')+':'+String(slot.getMinutes()).padStart(2,'0')}</T></Pressable>;})}
      </ScrollView>}
    </> : <T cmsKey={'lbl.sheetScheduleUnavailable'} size={12.5} color={th.mut} style={{marginTop:8}}>{label('lbl.sheetScheduleUnavailable', 'No scheduled times are available.')}</T>}
    {selected ? <T cmsKey={"lbl.cms.6646922f6eaf"} size={12.5} color={th.br} style={{marginTop:8}}>{label("lbl.cms.6646922f6eaf", "Selected: ")}{formatCustomer(selected.getTime(),{weekday:'short',month:'short',day:'numeric'})}, {formatCustomer(selected.getTime(),{hour:'numeric',minute:'2-digit',timeZoneName:'short'})}</T> : null}
    {!autoApply ? <><View style={{height:12}}/><Cta cmsKey={'lbl.sheetApply'} label={label('lbl.sheetApply','Apply')} disabled={!selected} onPress={choose}/></> : null}
  </View>;
}
export function ScheduleInline({close, autoApply = false}: {close: () => void; autoApply?: boolean}) { return <ScheduleSheet close={close} inline autoApply={autoApply} />; }

function SegSchedule({value,onChange}:{value:string;onChange:(v:string)=>void}) {
  const th=useTheme();
  return <View style={{flexDirection:'row',gap:8}}>
    {(['delivery','pickup'] as const).map(v=><Pressable key={v} onPress={()=>onChange(v)} style={{flex:1,paddingVertical:11,borderRadius:13,alignItems:'center',backgroundColor:value===v?th.brt:th.soft,borderWidth:value===v?1:0,borderColor:th.br}}><T cmsKeys={["lbl.cms.481e4a34263a","lbl.cms.cc823e1a0b52"]} weight="600" color={value===v?th.br:th.ink}>{v==='delivery'?label("lbl.cms.481e4a34263a", "Delivery"):label("lbl.cms.cc823e1a0b52", "Pick-up")}</T></Pressable>)}
  </View>;
}

/** The single group-order surface: empty cart, filled cart, store page and invite links all open this. It closes only from the handle, the X or Done. */
export function GroupOrderModal({close, storeId = ''}: {close: () => void; storeId?: string}) {
  const th = useTheme(), insets = useSafeAreaInsets(), {height: windowHeight} = useWindowDimensions();
  const height = Math.round(Math.min(windowHeight - insets.top - 8, windowHeight * 0.94));
  const handlePan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_: any, g: any) => g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderRelease: (_: any, g: any) => { if (g.dy > 65 || g.vy > 1.1) close(); },
  }), [close]);
  return <BottomSheet visible onClose={close} dismissOnBackdrop={false} keyboardAware maxHeight={height}>
    <View style={{height, backgroundColor: th.card, borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden'}}>
      <Pressable {...handlePan.panHandlers} accessibilityRole="button" accessibilityLabel={label("lbl.cms.262630160acf", "Close group order")} onPress={close} hitSlop={{top: 8, bottom: 14, left: 80, right: 80}} style={{alignItems: 'center', paddingTop: 10, paddingBottom: 6}}>
        <View style={{width: 44, height: 5, borderRadius: 3, backgroundColor: th.line}} />
      </Pressable>
      <View style={{flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingTop: 8, paddingBottom: 14}}>
        <T cmsKey={'lbl.sheetGroupTitle'} size={22} weight="800" style={{flex: 1}}>{label('lbl.sheetGroupTitle', 'Group order')}</T>
        <Pressable accessibilityRole="button" accessibilityLabel={label("lbl.cms.4895f0308d1a", "Close")} onPress={close} hitSlop={12} style={{width: 36, height: 36, borderRadius: 18, backgroundColor: th.soft, alignItems: 'center', justifyContent: 'center'}}><Icon name="x" size={18} color={th.ink} /></Pressable>
      </View>
      <ScrollView style={{flex: 1}} contentContainerStyle={{paddingHorizontal: 22, paddingTop: 4, paddingBottom: insets.bottom + 28}} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <GroupOrderSheet key={S.accountId || 'signed-out'} close={close} showTitle={false} showDone storeId={storeId} />
      </ScrollView>
    </View>
  </BottomSheet>;
}

function GroupOrderSheet({close, showTitle = true, showDone = true, storeId = ''}: {close: () => void; showTitle?: boolean; showDone?: boolean; storeId?: string}) {
  const th = useTheme();
  const accountId=S.accountId;
  const mounted=useRef(true),groupActionLock=useRef(false),friendsActionLock=useRef(false);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const incomingInviteCode = String((S as any).pendingGroupInviteCode || '');
  delete (S as any).pendingGroupInviteCode;
  const [inviteCode, setInviteCode] = useState(incomingInviteCode);
  const [groupBusy, setGroupBusy] = useState(false);
  const [sharedItems, setSharedItems] = useState<any[]>([]);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [membershipError, setMembershipError] = useState('');
  const [sharedError,setSharedError]=useState(''),[statusError,setStatusError]=useState('');
  const [sharedLoading,setSharedLoading]=useState(false),[membersLoading,setMembersLoading]=useState(false);
  const [groupReload,setGroupReload]=useState(0);
  const [checkoutPreview, setCheckoutPreview] = useState<any>(null);
  const [checkoutEstimate, setCheckoutEstimate] = useState<any>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [groupCheckoutBusy, setGroupCheckoutBusy] = useState(false);
  const [groupCheckoutType, setGroupCheckoutType] = useState<'pickup'|'delivery'>('pickup');
  const [groupAddressId, setGroupAddressId] = useState<string|number>(()=>addr()?.id ?? '');
  const [groupDeliveryQuote, setGroupDeliveryQuote] = useState<any>(null);
  const [groupQuoteBusy, setGroupQuoteBusy] = useState(false);
  useEffect(() => {
    if(groupCheckoutType!=='delivery') return;
    let active=true;
    const owner=accountId;
    void refreshUserAddresses().then((addresses:any[])=>{
      if(!active||S.accountId!==owner||!addresses?.length) return;
      setGroupAddressId((current:any)=>addresses.some((item:any)=>String(item.id)===String(current))?current:addresses.find((item:any)=>item.def)?.id??addresses[0].id);
    }).catch(()=>{if(active&&S.accountId===owner)toast(label("lbl.cms.0f3e6a48b781", "Could not load saved delivery addresses."));});
    return ()=>{active=false;};
  },[groupCheckoutType,accountId]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [group, setGroup] = useState(() => {
    if (incomingInviteCode) return {code: '', host: S.pf.n || label('lbl.groupYou', 'You'), members: [], serverBacked: false};
    const saved = S.groupOrder;
    if (saved && typeof saved.code === 'string' && Array.isArray(saved.members)) return saved;
    const next = {code: '', host: S.pf.n || label('lbl.groupYou', 'You'), members: [], serverBacked: false};
    S.groupOrder = next; save(); return next;
  });
  const groupSource=useRef(S.groupOrder);
  const activeGroup=useRef('');activeGroup.current=String(group.groupId||'');
  const current=(owner:any,groupId?:string)=>mounted.current&&S.accountId===owner&&S.groupOrder===groupSource.current&&(groupId===undefined||activeGroup.current===groupId);
  const requireAccount=async(owner:any)=>{
    if(!current(owner))return false;
    const {data,error}=await supabase.auth.getUser();
    if(!current(owner))return false;
    if(error||!owner||data.user?.id!==owner)throw new Error('Group account unavailable');
    return true;
  };
  const saveGroup = (next: any) => { activeGroup.current=String(next.groupId||'');groupSource.current=next;setGroup(next); S.groupOrder = next; save(); emit(); };
  useEffect(()=>{
    // A group belongs to the server. Recover the host's open group when this
    // device has no local selection; do not override an incoming invite.
    if(group.serverBacked||incomingInviteCode||inviteCode.trim())return;
    const owner=accountId;let active=true;
    void (async()=>{
      if(!owner||!current(owner,''))return;
      const recovered=await fetchOpenHostedGoodiesGroup(supabase,owner);
      if(!active||!recovered||!current(owner,'')||groupActionLock.current)return;
      saveGroup({...group,code:recovered.code,groupId:recovered.id,storeId:recovered.storeId,
        expiresAt:recovered.expiresAt,serverBacked:true});
    })().catch(()=>{/* Keep the join/create controls available while offline. */});
    return()=>{active=false;};
  },[accountId,group.serverBacked,inviteCode]);
  const createServerGroup = async () => {
    if(groupActionLock.current||groupCheckoutLock.current)return;
    const targetStoreId = storeId || S.cart.sid || group.storeId || '';
    if (!targetStoreId) {toast(label("lbl.cms.9ad0840772c3", "Open a store first to create its group invitation."));return;}
    if (S.cart.lines.some((line:any)=>lineStore(line)!==targetStoreId)) {
      toast(label("lbl.cms.a6b2201002c6", "Your current cart belongs to another store. Clear it before creating this group."));
      return;
    }
    if (S.cart.lines.some((line:any)=>!IT[line.id])) {
      toast(label("lbl.cms.a9d496a784b4", "Could not create the group invitation. Please try again."));
      return;
    }
    const owner=accountId,previousGroupId=String(group.groupId||''),cartLines=JSON.parse(JSON.stringify(S.cart.sid===targetStoreId?S.cart.lines:[]));
    groupActionLock.current=true;setGroupBusy(true);let created=false;
    try {
      if(!await requireAccount(owner)||!current(owner,previousGroupId))return;
      const {data,error}=await supabase.rpc('goodies_group_order_create',{p_store_id:targetStoreId});
      if(!current(owner,previousGroupId))return;
      const row=Array.isArray(data)?data[0]:data;
      if(error||typeof row?.group_id!=='string'||!row.group_id||typeof row?.invite_code!=='string'||!row.invite_code) throw error || new Error(label("lbl.page.components.Sheets.a686a8f76f", "Could not create the group invitation."));
      saveGroup({...group,code:row.invite_code,groupId:row.group_id,storeId:targetStoreId,expiresAt:row.expires_at,serverBacked:true});
      created=true;
      const synced=await Promise.all(cartLines.map((line:any)=>syncGroupOrderCartLine(row.group_id,line)));
      if(!current(owner)||S.groupOrder?.groupId!==row.group_id)return;
      const failed=synced.find((result:any)=>result.error);
      if(failed)toast(label("lbl.cms.184f5c8af282", "Group created, but one or more cart items could not be shared."));
      else toast(label("lbl.cms.9e385df54370", "A new group invitation is ready."));
    } catch(error:any) {
      if(current(owner))toast(created?label("lbl.cms.184f5c8af282", "Group created, but one or more cart items could not be shared."):label("lbl.cms.a9d496a784b4", "Could not create the group invitation. Please try again."));
    } finally {
      groupActionLock.current=false;if(current(owner))setGroupBusy(false);
    }
  };
  const joinGroup = async (rawCode:string) => {
    if(groupActionLock.current||groupCheckoutLock.current)return;
    const code=rawCode.trim().toUpperCase();
    if(!code){toast(label("lbl.cms.949b8e0d1bea", "Enter a group invite code."));return;}
    const owner=accountId,previousGroupId=String(group.groupId||'');
    groupActionLock.current=true;setGroupBusy(true);
    try {
      if(!await requireAccount(owner)||!current(owner,previousGroupId))return;
      const {data,error}=await supabase.rpc('goodies_group_order_join',{p_invite_code:code});
      if(!current(owner,previousGroupId))return;
      const row=Array.isArray(data)?data[0]:data;
      if(error||typeof row?.group_id!=='string'||!row.group_id||typeof row?.invite_code!=='string'||!row.invite_code||typeof row?.store_id!=='string'||!row.store_id) throw error || new Error(label("lbl.page.components.Sheets.e947050714", "Could not join this group order."));
      saveGroup({code:row.invite_code,groupId:row.group_id,storeId:row.store_id,expiresAt:row.expires_at,host:S.pf.n||label('lbl.groupYou', 'You'),members:group.members||[],serverBacked:true});
      toast(label("lbl.cms.9d2f3e3ff6a8", "You joined the group order."));
    } catch(error:any) {
      if(current(owner))toast(label("lbl.cms.b7c7f9985055", "Could not join this group order. Check the invite code and try again."));
    } finally {
      groupActionLock.current=false;if(current(owner))setGroupBusy(false);
    }
  };
  const joinServerGroup=()=>joinGroup(inviteCode);
  useEffect(() => {
    let active=true,itemsRequest=0,membersRequest=0,statusRequest=0;
    const owner=accountId,groupId=String(group.groupId||''),valid=()=>active&&current(owner,groupId);
    void supabase.auth.getUser().then(({data,error})=>{if(valid()){setCurrentUserId(!error&&data.user?.id===owner?owner:'');if(error||data.user?.id!==owner)setMembershipError(label('lbl.groupRefreshFailed','Could not refresh this group order. Please try again.'));}},()=>{if(valid()){setCurrentUserId('');setMembershipError(label('lbl.groupRefreshFailed','Could not refresh this group order. Please try again.'));}});
    if (!group.serverBacked || !group.groupId) {setSharedItems([]);setGroupMembers([]);setMembershipError('');setSharedError('');setStatusError('');setSharedLoading(false);setMembersLoading(false);return ()=>{active=false;};}
    const loadItems=async () => {
      const request=++itemsRequest;setSharedLoading(true);setSharedError('');setCheckoutPreview(null);setCheckoutEstimate(null);
      try{
        if(!await requireAccount(owner)||!valid())return;
        const {data,error}=await supabase.from('goodies_group_order_items')
          .select('id,user_id,line_key,quantity,options,note,product:goodies_products(name,price,photo_url,emoji)')
          .eq('group_id',groupId).order('created_at',{ascending:true});
        if(!valid()||request!==itemsRequest)return;
        if(error||!Array.isArray(data))throw error||new Error('Group cart unavailable');
        setSharedItems(data);
      }catch{if(valid()&&request===itemsRequest)setSharedError(label("lbl.cms.725f5d75b162", "Could not refresh the shared cart."));}
      finally{if(valid()&&request===itemsRequest)setSharedLoading(false);}
    };
    const loadMembers=async () => {
      const request=++membersRequest;setMembersLoading(true);setMembershipError('');
      try{
        if(!await requireAccount(owner)||!valid())return;
        const {data,error}=await supabase.rpc('goodies_group_order_list_members',{p_group_id:groupId});
        if(!valid()||request!==membersRequest)return;
        if(error||!Array.isArray(data))throw error||new Error('Group members unavailable');
        setGroupMembers(data);
      }catch{if(valid()&&request===membersRequest){setGroupMembers([]);setMembershipError(label("lbl.cms.91ec9baa31db", "Could not load group members. Try again."));}}
      finally{if(valid()&&request===membersRequest)setMembersLoading(false);}
    };
    const refreshGroupStatus=async () => {
      const request=++statusRequest;
      try{
        if(!await requireAccount(owner)||!valid())return;
        const {data,error}=await supabase.rpc('goodies_group_order_get_status',{p_group_id:groupId});
        if(!valid()||request!==statusRequest)return;
        if(error)throw error;
        setStatusError('');
        const statusRow=Array.isArray(data)?data[0]:data;
        if(statusRow&&(statusRow.group_id!==groupId||!['open','locked','checked_out','closed','expired','cancelled'].includes(statusRow.status)||!Number.isFinite(Date.parse(statusRow.expires_at))))throw new Error('Group status unavailable');
        if(!statusRow||statusRow.status!=='open'||new Date(statusRow.expires_at).getTime()<=Date.now()){
          saveGroup({code:'',host:S.pf.n||label('lbl.groupYou', 'You'),members:[],serverBacked:false});
          setSharedItems([]);setGroupMembers([]);setCheckoutPreview(null);setCheckoutEstimate(null);
          toast(statusRow?.status==='cancelled'?label("lbl.cms.7c7eb6fad354", "The group host ended this group order."):label("lbl.cms.984dfaf4f0b3", "This group order has closed or expired."));
        }
      }catch{if(valid()&&request===statusRequest)setStatusError(label('lbl.groupRefreshFailed','Could not refresh this group order. Please try again.'));}
    };
    void loadItems(); void loadMembers(); void refreshGroupStatus();
    // A group can expire without any database UPDATE or Realtime event.
    // Refresh the server-owned status while this sheet is open.
    const statusPoll=setInterval(()=>{if(active)void refreshGroupStatus();},30000);
    const channel=supabase.channel('goodies-group-live-'+group.groupId)
      .on('postgres_changes',{event:'*',schema:'public',table:'goodies_group_order_items',filter:'group_id=eq.'+group.groupId},()=>{void loadItems();})
      .on('postgres_changes',{event:'*',schema:'public',table:'goodies_group_order_members',filter:'group_id=eq.'+group.groupId},()=>{void loadMembers();})
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'goodies_group_orders',filter:'id=eq.'+group.groupId},()=>{void refreshGroupStatus();})
      .subscribe();
    return ()=>{active=false;clearInterval(statusPoll);void supabase.removeChannel(channel);};
  },[group.serverBacked,group.groupId,accountId,groupReload]);

  /* Friends picker (host) and invitations from friends (guest). */
  const [friends, setFriends] = useState<any[]>([]);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [pickedFriends, setPickedFriends] = useState<string[]>([]);
  const [friendsBusy, setFriendsBusy] = useState(false);
  const [friendsError,setFriendsError]=useState('');
  const [myInvites, setMyInvites] = useState<any[]>([]);
  const [invitesLoading,setInvitesLoading]=useState(false),[invitesError,setInvitesError]=useState('');
  const invitesLoadId=useRef(0);
  const loadInvites=async()=>{
    if(group.serverBacked)return;
    const owner=accountId,request=++invitesLoadId.current;
    setInvitesLoading(true);setInvitesError('');
    try{
      if(!await requireAccount(owner)||!current(owner,''))return;
      const {data,error}=await supabase.rpc('goodies_group_order_my_invites');
      if(!current(owner,'')||request!==invitesLoadId.current)return;
      if(error||!Array.isArray(data))throw error||new Error('Invitations unavailable');
      setMyInvites(data);
    }catch{if(current(owner,'')&&request===invitesLoadId.current)setInvitesError(label('lbl.groupInvitesFailed','Could not load invitations. Please try again.'));}
    finally{if(current(owner,'')&&request===invitesLoadId.current)setInvitesLoading(false);}
  };
  useEffect(() => {
    setMyInvites([]);setInvitesError('');
    if(!group.serverBacked)void loadInvites();
    return()=>{invitesLoadId.current++;};
  }, [group.serverBacked,accountId]);
  const openFriends = async () => {
    if (!group.groupId||friendsActionLock.current) return;
    const owner=accountId,groupId=String(group.groupId);
    friendsActionLock.current=true;setFriendsOpen(true);setFriendsBusy(true);setFriendsError('');
    try{
      if(!await requireAccount(owner)||!current(owner,groupId))return;
      const {data,error}=await supabase.rpc('goodies_group_order_list_friends',{p_group_id:groupId});
      if(!current(owner,groupId))return;
      if(error||!Array.isArray(data))throw error||new Error('Friends unavailable');
      setFriends(data);setPickedFriends([]);
    }catch{if(current(owner,groupId)){setFriends([]);setFriendsError(label("lbl.cms.fee6cf252c06", "Could not load your friends. Please try again."));}}
    finally{friendsActionLock.current=false;if(current(owner))setFriendsBusy(false);}
  };
  const sendFriendInvites = async () => {
    if (!group.groupId || !pickedFriends.length||friendsActionLock.current) return;
    const owner=accountId,groupId=String(group.groupId),users=[...pickedFriends];
    friendsActionLock.current=true;setFriendsBusy(true);setFriendsError('');
    try{
      if(!await requireAccount(owner)||!current(owner,groupId))return;
      const {data,error}=await supabase.rpc('goodies_group_order_invite_friends',{p_group_id:groupId,p_user_ids:users});
      if(!current(owner,groupId))return;
      if(error||typeof data!=='number'||!Number.isSafeInteger(data)||data<0||data>users.length)throw error||new Error('Invitation receipt unavailable');
      toast(data>0?label("lbl.cms.9cf703554060", "Invitation sent."):label("lbl.cms.c8c0ebe1e4a9", "Nothing to send."));
      setFriendsOpen(false);setPickedFriends([]);
    }catch{if(current(owner,groupId))setFriendsError(label("lbl.cms.e1b4808b8c09", "Could not send the invitations. Please try again."));}
    finally{friendsActionLock.current=false;if(current(owner))setFriendsBusy(false);}
  };
  const joinFromInvite = async (code: string) => {
    if(groupActionLock.current)return;
    setInviteCode(code);await joinGroup(code);
  };
  const declineInvite = async (groupId: string) => {
    if(groupActionLock.current)return;
    const owner=accountId;
    groupActionLock.current=true;setGroupBusy(true);setInvitesError('');
    try{
      if(!await requireAccount(owner)||!current(owner,''))return;
      const {error}=await supabase.rpc('goodies_group_order_decline_invite',{p_group_id:groupId});
      if(!current(owner,''))return;
      if(error)throw error;
      setMyInvites(list=>list.filter(i=>i.group_id!==groupId));
    }catch{if(current(owner,''))setInvitesError(label('lbl.groupDeclineFailed','Could not decline this invitation. Please try again.'));}
    finally{groupActionLock.current=false;if(current(owner))setGroupBusy(false);}
  };
  const invite = async () => {
    if(!group.serverBacked||!group.code){toast(label("lbl.cms.e0747408b56f", "Create a group invitation first."));return;}
    const inviteLink='wantiss://goodies/group?code='+encodeURIComponent(group.code);
    try {await Share.share({message:label("lbl.page.components.Sheets.a54b07b29c", "Join my Wantiss Goodies group order.\n\nOpen this invite in Wantiss: ")+inviteLink+label("lbl.page.components.Sheets.c4af5f55a9", "\n\nOr enter invite code: ")+group.code});}
    catch (_) {toast(label("lbl.cms.2299e372cc22", "Invite code: ")+group.code);}
  };
  const previewLock=useRef(false),quoteLock=useRef(false),estimateVersion=useRef(0);
  const selection=useRef('');selection.current=JSON.stringify([group.groupId,groupCheckoutType,String(groupAddressId)]);
  const groupAmount=(value:any)=>{
    if(typeof value!=='number'&&!(typeof value==='string'&&/^-?\d+(?:\.\d+)?$/.test(value.trim())))return null;
    const amount=Number(value);return Number.isFinite(amount)&&amount>=0?amount:null;
  };
  const validEstimate=(value:any)=>!!value&&value.group_id===group.groupId&&value.currency==='USD'&&['pickup','delivery'].includes(value.order_type)
    &&['subtotal','delivery_fee','service_fee','estimated_total'].every(key=>groupAmount(value[key])!==null)
    &&Number(value.estimated_total)>0
    &&['subtotal','delivery_fee','service_fee','estimated_total'].every(key=>Number.isSafeInteger(Math.round(Number(value[key])*100))&&Math.abs(Number(value[key])*100-Math.round(Number(value[key])*100))<0.00001)
    &&Math.round(Number(value.estimated_total)*100)===Math.round(Number(value.subtotal)*100)+Math.round(Number(value.delivery_fee)*100)+Math.round(Number(value.service_fee)*100);
  const loadGroupEstimate=async(type:'pickup'|'delivery',address:any={})=>{
    const owner=accountId,groupId=String(group.groupId||''),request=++estimateVersion.current,selected=selection.current;
    if(!await requireAccount(owner)||!current(owner,groupId)||request!==estimateVersion.current||selection.current!==selected)return;
    const {data,error}=await supabase.rpc('goodies_group_order_checkout_estimate',{p_group_id:groupId,p_order_type:type,p_address:address});
    if(!current(owner,groupId)||request!==estimateVersion.current||selection.current!==selected)return;
    if(error||!validEstimate(data)||data.order_type!==type)throw error||new Error('Group estimate unavailable');
    setCheckoutEstimate(data);
  };
  const selectGroupCheckoutType=async(value:string)=>{
    if(groupCheckoutLock.current)return;
    setGroupCheckoutType(value as 'pickup'|'delivery');setGroupDeliveryQuote(null);setCheckoutEstimate(null);
    estimateVersion.current++;
    // Selection is updated synchronously before a request can resolve.
    selection.current=JSON.stringify([group.groupId,value,String(groupAddressId)]);
    if(value!=='pickup')return;
    const owner=accountId,groupId=String(group.groupId||'');
    try{await loadGroupEstimate('pickup');}catch{if(current(owner,groupId))toast(label("lbl.cms.a8b8e5886e88", "Could not calculate the payment estimate."));}
  };
  const calculateGroupDeliveryQuote = async () => {
    if(quoteLock.current||groupCheckoutLock.current||groupActionLock.current||!group.groupId)return;
    const owner=accountId,groupId=String(group.groupId),selectedScope=selection.current;
    quoteLock.current=true;setGroupQuoteBusy(true);setCheckoutEstimate(null);
    try {
      if(!await requireAccount(owner)||!current(owner,groupId)||selection.current!==selectedScope)return;
      let addresses=S.addr||[];
      if(!addresses.length)addresses=await refreshUserAddresses();
      if(!current(owner,groupId)||selection.current!==selectedScope)return;
      const selected=addresses.find((item:any)=>String(item.id)===String(groupAddressId))||addresses.find((item:any)=>item.id===S.as)||addresses[0];
      if(!selected?.t){toast(label("lbl.cms.0a46732ca884", "Add or select a complete delivery address first."));return;}
      const addressPayload={l:selected.l,t:selected.t,apt:selected.apt||'',inst:selected.inst||'',city:selected.city||'',department:selected.department||'',country:selected.country||''};
      const quote=await supabase.functions.invoke('goodies-delivery-quote',{body:{store_id:group.storeId||checkoutPreview?.store_id,address:addressPayload}});
      if(!current(owner,groupId)||selection.current!==selectedScope)return;
      if(quote.error||typeof quote.data?.quote_id!=='string'||!quote.data.quote_id){setGroupDeliveryQuote(null);toast(label("lbl.cms.9957e5f281b7", "Could not calculate delivery for this address."));return;}
      if(groupAmount(quote.data.fee)===null||groupAmount(quote.data.distance_km)===null)throw new Error('Delivery estimate unavailable');
      const quoteState={addressId:String(selected.id),quoteId:String(quote.data.quote_id),fee:Number(quote.data.fee),distanceKm:Number(quote.data.distance_km),expiresAt:Date.now()+4*60*1000};
      setGroupDeliveryQuote(quoteState);
      await loadGroupEstimate('delivery',{...addressPayload,delivery_quote_id:quoteState.quoteId});
    } catch(e:any) {
      if(current(owner,groupId)&&selection.current===selectedScope){setGroupDeliveryQuote(null);setCheckoutEstimate(null);toast(label("lbl.cms.fa36fe77f660", "Could not calculate delivery."));}
    } finally {quoteLock.current=false;if(current(owner))setGroupQuoteBusy(false);}
  };
  const groupCheckoutLock=useRef(false);
  const checkoutGroupOrder = async () => {
    if(groupCheckoutLock.current||groupActionLock.current||quoteLock.current||previewLock.current||itemLocks.current.size)return;
    if(!group.serverBacked||!group.groupId){toast(label('lbl.groupCreateFirst','Create or join a group order first.'));return;}
    if(!groupMembers.some((member:any)=>member.user_id===currentUserId&&member.role==='host')){toast(label("lbl.cms.540c5531f480", "Only the group host can check out."));return;}
    if(!Array.isArray(checkoutPreview?.items)||!checkoutPreview.items.length){toast(label("lbl.cms.6e9eb3a9a0bb", "Review and validate the combined cart first."));return;}
    if(!validEstimate(checkoutEstimate) || checkoutEstimate.order_type!==groupCheckoutType){toast(label("lbl.cms.d2905bdbca8c", "Review the current group-order total before placing the order."));return;}
    if(!S.pf.ph||!phoneOK(S.pf.ph)){toast(label("lbl.cms.fdc79fde4a45", "Add a valid contact phone number in your profile before checkout."));return;}
    const owner=accountId,submittedGroupId=String(group.groupId),submittedSelection=selection.current,submittedOrderType=groupCheckoutType;
    const submittedAddress=JSON.parse(JSON.stringify((S.addr||[]).find((item:any)=>String(item.id)===String(groupAddressId))||(S.addr||[]).find((item:any)=>item.id===S.as)||(S.addr||[])[0]||null));
    const submittedEstimate=JSON.parse(JSON.stringify(checkoutEstimate)),submittedItems=JSON.parse(JSON.stringify(checkoutPreview.items)),submittedQuote=groupDeliveryQuote?{...groupDeliveryQuote}:null,contactPhone=S.pf.ph;
    groupCheckoutLock.current=true;
    const paidLines=new Map(S.cart.lines.filter((line:any)=>sharedItems.some((item:any)=>item.user_id===currentUserId&&item.line_key===line.k)).map((line:any)=>[line.k,JSON.stringify(line)]));
    setGroupCheckoutBusy(true);
    try {
      if(!await requireAccount(owner)||!current(owner,submittedGroupId))return;
      const walletVerified=await A.refreshPaymentOptions();
      if(!current(owner,submittedGroupId))return;
      if(selection.current!==submittedSelection){toast(label('lbl.groupQuoteChanged','The group cart or total changed. Review it again before paying.'));return;}
      if(!walletVerified){toast(label("lbl.cms.c21b6431da9c", "Could not verify your live Wantiss Wallet balance. Please retry."));return;}
      if(!S.hasWallet){toast(label("lbl.cms.fa32c0873181", "Your Wantiss Wallet is not available. Create a wallet before placing this group order."));return;}
      const estimatedTotal=Number(submittedEstimate.estimated_total);
      if(estimatedTotal>0&&S.wallet<estimatedTotal){toast(label("lbl.cms.9da7b95cc86d", "Insufficient Wantiss Wallet balance. Add ")+money(estimatedTotal-S.wallet)+label("lbl.cms.66e750d050b2", " or choose another payment method."));return;}
      if(!Number.isFinite(estimatedTotal)||estimatedTotal<=0){toast(label('lbl.groupQuoteChanged','The group cart or total changed. Review it again before paying.'));return;}
      const reviewed={_goodies_expected_total:estimatedTotal,_goodies_expected_items:submittedItems};
      let addressPayload:any={...reviewed};
      if(submittedOrderType==='delivery'){
        const selected=submittedAddress;
        if(!selected?.t){toast(label("lbl.cms.0a46732ca884", "Add or select a complete delivery address first."));return;}
        if(!submittedQuote||submittedQuote.addressId!==String(selected.id)||submittedQuote.expiresAt<=Date.now()){
          toast(label("lbl.cms.ce7c584db7be", "Calculate the delivery fee and review it before placing the order."));return;
        }
        addressPayload={l:selected.l,t:selected.t,apt:selected.apt||'',inst:selected.inst||'',city:selected.city||'',department:selected.department||'',country:selected.country||'',delivery_quote_id:submittedQuote.quoteId,...reviewed};
      }
      const {data,error}=await supabase.rpc('goodies_group_order_checkout',{
        p_idempotency_key:'group-'+submittedGroupId+'-checkout',
        p_group_id:submittedGroupId,
        p_order_type:submittedOrderType,
        p_scheduled_for:null,
        p_address:addressPayload,
        p_contact_phone:contactPhone,
        p_tip:0,
        p_notes:null
      });
      if(!current(owner,submittedGroupId))return;
      const order=Array.isArray(data)?data[0]:data;
      if(error||typeof order?.id!=='string'||!order.id){if(error?.code==='P4210'){setCheckoutPreview(null);setCheckoutEstimate(null);}toast(error?.code==='P4210'?label('lbl.groupQuoteChanged','The group cart or total changed. Review it again before paying.'):label("lbl.cms.1be63d4ce4d0", "Group order checkout failed."));return;}
      if(['cancelled','declined','expired'].includes(order.status)){
        clearActiveGroup();close();toast(label('lbl.groupOrderClosed','This group order is no longer active. Check Orders for its payment status.'));reset('orders');
        return;
      }
      if(!['placed','scheduled','accepted','preparing','ready','courier_assigned','picked_up','completed'].includes(order.status))throw new Error('Group order receipt unavailable');
      S.cart.lines=S.cart.lines.filter((line:any)=>paidLines.get(line.k)!==JSON.stringify(line));
      if(!S.cart.lines.length)S.cart.sid=null;
      const ownsScreen=current(owner,submittedGroupId);
      if(S.groupOrder?.groupId===submittedGroupId)clearActiveGroup();
      save();emit();if(ownsScreen)close();
      let orderId:string|null=null;
      try {orderId=await fetchGoodiesOrderForNotification(order.id);} catch (_) { /* The payment succeeded; order details can be retried from Orders. */ }
      if(S.accountId!==owner)return;
      toast(label("lbl.cms.29fb7a3efa6b", "Group order placed. Order ")+(order.order_code||order.id)+label("lbl.cms.df836d557f92", ". Paid with Wantiss Wallet."));
      if(ownsScreen&&!S.groupOrder?.serverBacked){reset(orderId?'home':'orders');if(orderId)push('confirm',orderId);}
      void A.refreshPaymentOptions().catch(()=>{});
    } catch(e:any) {
      if(current(owner,submittedGroupId))toast(label("lbl.cms.8eeb9fd8177f", "Could not complete group order checkout."));
    } finally {groupCheckoutLock.current=false;if(mounted.current&&S.accountId===owner)setGroupCheckoutBusy(false);}
  };
  const reviewSharedOrder = async () => {
    if(previewLock.current||groupActionLock.current||groupCheckoutLock.current)return;
    if(!group.serverBacked||!group.groupId){toast(label("lbl.page.components.Sheets.59297174fd", "Create or join a group order first."));return;}
    const owner=accountId,groupId=String(group.groupId),selected=selection.current;
    previewLock.current=true;setPreviewBusy(true);setCheckoutPreview(null);setCheckoutEstimate(null);
    try{
      if(!await requireAccount(owner)||!current(owner,groupId))return;
      const {data,error}=await supabase.rpc('goodies_group_order_checkout_preview',{p_group_id:groupId});
      if(!current(owner,groupId)||selection.current!==selected)return;
      if(error||!data||!Array.isArray(data.items)||groupAmount(data.subtotal)===null)throw error||new Error('Combined cart unavailable');
      setCheckoutPreview(data);
      if(groupCheckoutType==='pickup')await loadGroupEstimate('pickup');
    }catch{if(current(owner,groupId)&&selection.current===selected){setCheckoutPreview(null);setCheckoutEstimate(null);toast(label("lbl.cms.7143ec373461", "Could not validate the shared cart."));}}
    finally{previewLock.current=false;if(current(owner))setPreviewBusy(false);}
  };
  const endGroupOrder=async()=>{
    if(groupActionLock.current||groupCheckoutLock.current)return;
    if(!group.serverBacked||!group.groupId){toast(label('lbl.groupInviteUnavailable','This group invitation is unavailable. Create or join a group order again.'));return;}
    const owner=accountId,groupId=String(group.groupId);
    groupActionLock.current=true;setGroupBusy(true);
    try{
      if(!await requireAccount(owner)||!current(owner,groupId))return;
      const {data,error}=await supabase.rpc('goodies_group_order_end',{p_group_id:groupId});
      if(!current(owner,groupId))return;
      const row=Array.isArray(data)?data[0]:data;
      if(error||row?.group_id!==groupId||row?.status!=='cancelled')throw error||new Error('Group end receipt unavailable');
      clearActiveGroup();close();toast(label("lbl.cms.e12b8e635219", "Group order ended."));
    }catch{if(current(owner,groupId))toast(label("lbl.cms.5c58c7dec596", "Could not end this group order."));}
    finally{groupActionLock.current=false;if(current(owner))setGroupBusy(false);}
  };
  const itemLocks=useRef(new Set<string>());
  useEffect(()=>{
    if(S.groupOrder===groupSource.current)return;
    const next=S.groupOrder;
    groupSource.current=next;activeGroup.current=String(next?.groupId||'');
    setGroup(next&&typeof next.code==='string'&&Array.isArray(next.members)?next:{code:'',host:S.pf.n||label('lbl.groupYou','You'),members:[],serverBacked:false});
    setSharedItems([]);setGroupMembers([]);setCheckoutPreview(null);setCheckoutEstimate(null);setGroupDeliveryQuote(null);
    setFriends([]);setPickedFriends([]);setFriendsOpen(false);setFriendsError('');
    setGroupBusy(false);setFriendsBusy(false);setPreviewBusy(false);setGroupCheckoutBusy(false);setGroupQuoteBusy(false);
    setSharedLoading(false);setMembersLoading(false);setSharedError('');setMembershipError('');setStatusError('');
    setGroupReload(value=>value+1);
    estimateVersion.current++;
  },[S.groupOrder]);
  const removeSharedItem=async(item:any)=>{
    const owner=accountId,groupId=String(group.groupId||''),key=String(item.line_key||'');
    if(!groupId||!key||String(item.user_id)!==currentUserId||itemLocks.current.has(key)||groupCheckoutLock.current||groupActionLock.current)return;
    const line=S.cart.lines.find((entry:any)=>entry.k===key),snapshot=line?JSON.stringify(line):'';
    itemLocks.current.add(key);
    try{
      if(!await requireAccount(owner)||!current(owner,groupId))return;
      const {error}=await removeGroupOrderCartLine(groupId,key);
      if(!current(owner,groupId))return;
      if(error)throw error;
      S.cart.lines=S.cart.lines.filter((entry:any)=>entry.k!==key||JSON.stringify(entry)!==snapshot);
      if(!S.cart.lines.length)S.cart.sid=null;
      setSharedItems(list=>list.filter(row=>row.id!==item.id));setCheckoutPreview(null);setCheckoutEstimate(null);save();emit();
    }catch{if(current(owner,groupId))toast(label("lbl.cms.5954ff29d7a5", "Could not remove this shared item."));}
    finally{itemLocks.current.delete(key);}
  };
  const sharedSubtotal=sharedLoading||sharedError?null:sharedItems.reduce<number|null>((sum,item:any)=>{
    const product=Array.isArray(item.product)?item.product[0]:item.product,price=groupAmount(product?.price),quantity=groupAmount(item.quantity);
    return sum===null||price===null||quantity===null||quantity<1||!Number.isSafeInteger(quantity)||!Number.isFinite(sum+price*quantity)?null:sum+price*quantity;
  },0);
  return <>
    {showTitle ? <T cmsKey={'lbl.sheetGroupTitle'} size={19} weight="600">{label('lbl.sheetGroupTitle', 'Group order')}</T> : null}
    {!group.serverBacked ? <View>
      {invitesLoading?<T cmsKey={'lbl.groupInvitesLoading'} size={13} color={th.mut}>{label('lbl.groupInvitesLoading','Loading invitations…')}</T>:null}
      {invitesError?<View style={{marginBottom:12}}><T size={12} color={th.red}>{invitesError}</T><Cta cmsKey={'lbl.retry'} small ghost label={label('lbl.retry','Try again')} onPress={()=>void loadInvites()} disabled={invitesLoading||groupBusy}/></View>:null}
      {myInvites.length ? <View style={{marginBottom:22}}>
        <T cmsKey={"lbl.cms.48ba64bb290c"} size={16} weight="800">{label("lbl.cms.48ba64bb290c", "Invitations from friends")}</T>
        {myInvites.map((inv:any)=><Row key={inv.group_id} style={{gap:10,alignItems:'center',marginTop:12,padding:12,borderRadius:14,backgroundColor:th.soft}}>
          <View style={{flex:1}}><T weight="600">{inv.host_name}</T><T cmsKey={"lbl.cms.374da0d6b308"} size={12} color={th.mut}>{label("lbl.cms.374da0d6b308", "invited you to a group order")}</T></View>
          <Pressable accessibilityRole="button" disabled={groupBusy} onPress={()=>void declineInvite(inv.group_id)} hitSlop={8}><T cmsKey={"lbl.cms.fbab10af6bec"} size={13} color={th.mut}>{label("lbl.cms.fbab10af6bec", "Decline")}</T></Pressable>
          <Cta cmsKey={"lbl.cms.f889c94501e8"} small label={label("lbl.cms.f889c94501e8", "Join")} onPress={()=>void joinFromInvite(inv.invite_code)} disabled={groupBusy} />
        </Row>)}
      </View> : null}
      <T cmsKey={'lbl.sheetJoinGroup'} size={16} weight="800">{label('lbl.sheetJoinGroup', 'Join a group order')}</T>
      <T cmsKey={'lbl.sheetJoinGroupHint'} size={13} color={th.mut} style={{marginTop:6,marginBottom:16,lineHeight:19}}>{label('lbl.sheetJoinGroupHint', 'Enter the invite code, or scan the QR code your friend shared.')}</T>
      <Input cmsPlaceholderKey={"lbl.cms.84b73ab53834"} value={inviteCode} onChange={setInviteCode} placeholder={label("lbl.cms.84b73ab53834", "Enter group invite code")} />
      <Row style={{gap:12,marginTop:16}}>
        <Pressable accessibilityRole="button" accessibilityLabel={label("lbl.cms.8f0e0fdf8784", "Scan group invite QR code")} disabled={groupBusy} onPress={async()=>{
          if(!cameraPermission?.granted){const result=await requestCameraPermission();if(!result.granted){toast(label("lbl.cms.0f8d0013465b", "Camera permission is needed to scan a group QR code."));return;}}
          setScannerOpen(true);
        }} style={{width:52,height:48,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:th.soft,opacity:groupBusy?0.45:1}}>
          <Icon name="scan" size={22} color={th.ink}/>
        </Pressable>
        <View style={{flex:1}}><Cta cmsKeys={["lbl.cms.0d7c6ad747ae","lbl.cms.4d1a2e311885"]} label={groupBusy?label("lbl.cms.0d7c6ad747ae", "Joining…"):label("lbl.cms.4d1a2e311885", "Join group order")} onPress={()=>void joinServerGroup()} disabled={groupBusy} /></View>
      </Row>
      <View style={{flexDirection:'row',alignItems:'center',gap:12,marginTop:30,marginBottom:26}}>
        <View style={{flex:1,height:1,backgroundColor:th.line}} /><T cmsKey={'lbl.sheetGroupOr'} size={12} color={th.mut}>{label('lbl.sheetGroupOr', 'or start your own')}</T><View style={{flex:1,height:1,backgroundColor:th.line}} />
      </View>
      <T cmsKey={'lbl.sheetStartGroupTitle'} size={16} weight="800">{label('lbl.sheetStartGroupTitle', 'Start a group order')}</T>
      <T cmsKey={'lbl.sheetStartGroupHint'} size={13} color={th.mut} style={{marginTop:6,marginBottom:16,lineHeight:19}}>{label('lbl.sheetStartGroupHint', 'You pay for the whole order. Friends add their items from their own phones.')}</T>
      <Cta cmsKeys={["lbl.cms.f61a88208368","lbl.cms.430e970103b4"]} label={groupBusy?label("lbl.cms.f61a88208368", "Please wait…"):label("lbl.cms.430e970103b4", "Create group invite")} onPress={()=>void createServerGroup()} disabled={groupBusy} />
    {S.cart.lines.length > 0 && !group.serverBacked ? <View>
      <T cmsKey={'lbl.sheetSharedCart'} size={14} weight="600" style={{marginTop:24}}>{label('lbl.sheetSharedCart', 'Items in this group')}</T>
      {S.cart.lines.length ? S.cart.lines.map((line:any)=><Row key={line.k} sp style={{marginTop:8,alignItems:'flex-start'}}><View style={{flex:1}}><T size={13} weight="600">{line.q}× {line.n}</T>{line.d ? <T size={11.5} color={th.mut}>{line.d}</T> : null}</View><T size={13} weight="600">{money(line.p*line.q)}</T></Row>) : null}
      <Row sp style={{marginTop:12,paddingTop:10,borderTopWidth: 0.5,borderTopColor:th.line}}><T cmsKey={'lbl.sheetSubtotal'} weight="600">{label('lbl.sheetSubtotal', 'Subtotal')}</T><T weight="600">{money(S.cart.lines.reduce((sum:number,line:any)=>sum+line.p*line.q,0))}</T></Row>


    </View> : null}
    </View> : null}
    {group.serverBacked ? <View>
      {statusError||sharedError||membershipError?<View style={{marginBottom:12}}><T size={12} color={th.red}>{statusError||sharedError||membershipError}</T><Cta cmsKey={'lbl.retry'} small ghost label={label('lbl.retry','Try again')} onPress={()=>setGroupReload(value=>value+1)} disabled={sharedLoading||membersLoading}/></View>:null}
      <Row sp><View style={{flex:1}}><T cmsKey={'lbl.sheetInviteCode'} size={11.5} weight="600" color={th.mut}>{label('lbl.sheetInviteCode', 'GROUP INVITE CODE')}</T><T size={24} weight="800" style={{marginTop:4}}>{group.code}</T></View><Cta cmsKey={'lbl.sheetInvitePeople'} small label={label('lbl.sheetInvitePeople', 'Invite people')} onPress={invite} /></Row>
      {group.code ? <View style={{alignItems:'center',paddingVertical:20,marginTop:18,marginBottom:8,borderRadius:18,backgroundColor:th.soft}}>
        <QRCode value={'wantiss://goodies/group?code='+encodeURIComponent(group.code)} size={168} backgroundColor="#FFFFFF" color="#111111"/>
        <T cmsKey={"lbl.cms.93357aaf2861"} size={12.5} weight="600" style={{marginTop:12}}>{label("lbl.cms.93357aaf2861", "Scan to join this group")}</T>
        <T cmsKey={"lbl.cms.2299e372cc22"} size={12} color={th.mut} style={{marginTop:4}}>{label("lbl.cms.2299e372cc22", "Invite code: ")}{group.code}</T>
      </View> : null}
      <View style={{height:14}}/>
      <Cta cmsKey={"lbl.cms.90a979b54f01"} small ghost label={label("lbl.cms.90a979b54f01", "Share invite code")} onPress={()=>void invite()} />
      {groupMembers.some((member:any)=>member.user_id===currentUserId) ? <View style={{marginTop:12}}>
        <Cta cmsKeys={["lbl.cms.843cf2cc36fc","lbl.cms.6bb993f5d3e9"]} small ghost label={friendsOpen?label("lbl.cms.843cf2cc36fc", "Hide friends"):label("lbl.cms.6bb993f5d3e9", "Invite friends")} onPress={()=>{if(friendsOpen)setFriendsOpen(false);else void openFriends();}} />
        {friendsOpen ? <View style={{marginTop:10}}>
          {friendsBusy&&!friends.length ? <T cmsKey={"lbl.cms.5bebcc4de709"} size={13} color={th.mut}>{label("lbl.cms.5bebcc4de709", "Loading friends…")}</T> : null}
          {friendsError?<View><T size={12} color={th.red}>{friendsError}</T>{!friends.length?<Cta cmsKey={'lbl.retry'} small ghost label={label('lbl.retry','Try again')} onPress={()=>void openFriends()} disabled={friendsBusy}/>:null}</View>:null}
          {!friendsBusy&&!friendsError&&!friends.length ? <T cmsKey={"lbl.cms.0ba8a61c181a"} size={13} color={th.mut}>{label("lbl.cms.0ba8a61c181a", "No friends to invite yet.")}</T> : null}
          {friends.map((f:any)=>{
            const uid=String(f.user_id), blocked=!!f.already_member || !!f.already_invited, picked=pickedFriends.includes(uid);
            return <Pressable key={uid} disabled={blocked||friendsBusy} accessibilityRole="checkbox" accessibilityState={{checked:picked,disabled:blocked||friendsBusy}} onPress={()=>setPickedFriends(list=>picked?list.filter(x=>x!==uid):[...list,uid])} style={{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:9,opacity:blocked?0.5:1}}>
              <View style={{width:38,height:38,borderRadius:19,backgroundColor:th.soft,alignItems:'center',justifyContent:'center',overflow:'hidden'}}>{f.avatar_url?<Image source={{uri:f.avatar_url}} style={{width:38,height:38}} />:<Icon name="user" color={th.mut}/>}</View>
              <View style={{flex:1}}><T weight="600">{f.display_name}</T>{f.already_member?<T cmsKey={"lbl.cms.ce694de2c6e7"} size={12} color={th.mut}>{label("lbl.cms.ce694de2c6e7", "Joined")}</T>:f.already_invited?<T cmsKey={"lbl.cms.409175174430"} size={12} color={th.mut}>{label("lbl.cms.409175174430", "Invited")}</T>:f.invite_status==='declined'?<T cmsKey={"lbl.cms.c123cfeda157"} size={12} color={th.mut}>{label("lbl.cms.c123cfeda157", "Declined")}</T>:null}</View>
              <View style={{width:22,height:22,borderRadius:7,borderWidth:1.5,borderColor:picked?th.br:th.line,backgroundColor:picked?th.br:'transparent',alignItems:'center',justifyContent:'center'}}>{picked?<Icon name="check" size={14} color="#FFF"/>:null}</View>
            </Pressable>;
          })}
          {friends.length ? <View style={{marginTop:10}}><Cta cmsKeys={["lbl.cms.3cb5b5afda95","lbl.cms.9a867e4ff86a"]} label={friendsBusy?label("lbl.cms.3cb5b5afda95", "Sending…"):label("lbl.cms.9a867e4ff86a", "Send invitation")+(pickedFriends.length?' ('+pickedFriends.length+')':'')} onPress={()=>void sendFriendInvites()} disabled={friendsBusy||!pickedFriends.length} /></View> : null}
        </View> : null}
      </View> : null}
      <View style={{height:24}}/>
    </View> : null}
    {group.serverBacked ? <>
    <T cmsKey={'lbl.sheetGroupMembers'} size={15} weight="600" style={{marginBottom:7}}>{label('lbl.sheetGroupMembers', 'Group members')}</T>
    <View>
      {membersLoading?<T cmsKey={'lbl.loading'} size={12} color={th.mut}>{label('lbl.loading','Loading…')}</T>:null}
      {groupMembers.map((member:any)=>{
        const uid=String(member.user_id||'');
        const isYou=uid===currentUserId;
        return <Row key={uid} style={{gap:10,alignItems:'center',paddingVertical:9}}>
          <View style={{width:38,height:38,borderRadius:19,backgroundColor:th.soft,alignItems:'center',justifyContent:'center'}}><Icon name="user" color={th.mut}/></View>
          <View style={{flex:1}}><T cmsKey={"lbl.cms.72a4f8f6ae2b"} weight="600">{isYou?label("lbl.cms.72a4f8f6ae2b", "You"):member.display_name}</T><T cmsKeys={["lbl.cms.e1d2a0acc58b","lbl.cms.a643f4c6e0ad"]} size={12} color={th.mut}>{member.is_host?label("lbl.cms.e1d2a0acc58b", "Host"):label("lbl.cms.a643f4c6e0ad", "Joined group order")}</T></View>
          {isYou?<Badge cmsKey={"lbl.cms.72a4f8f6ae2b"} green label={label("lbl.cms.72a4f8f6ae2b", "You")}/>:null}
        </Row>;
      })}

    </View>
    <View style={{height:12}}/>
    <T cmsKey={"lbl.cms.6e3098d0c1da"} size={15} weight="600" style={{marginBottom:7}}>{label("lbl.cms.6e3098d0c1da", "Shared items")}</T>
    <View>
      {sharedLoading?<T cmsKey={'lbl.loading'} size={12} color={th.mut}>{label('lbl.loading','Loading…')}</T>:null}
      {sharedItems.length ? sharedItems.map((item:any)=>{
        const product=Array.isArray(item.product)?item.product[0]:item.product;
        return <Row key={item.id} sp style={{paddingVertical:8,alignItems:'flex-start'}}>
          <View style={{flex:1}}><T cmsKey={"lbl.cms.3ff260e4c8e9"} weight="600">{item.quantity}× {product?.name || label("lbl.cms.3ff260e4c8e9", "Unavailable product")}</T>{item.note ? <T size={11.5} color={th.mut}>{item.note}</T> : null}</View>
          <View style={{alignItems:'flex-end',gap:7}}>
            <T weight="600">{product?.price!=null?money(Number(product.price)*Number(item.quantity)):'—'}</T>
            {group.serverBacked && String(item.user_id)===currentUserId ? <Pressable accessibilityRole="button" accessibilityLabel={label("lbl.cms.678971e91d3f", "Remove my shared cart item")} disabled={groupCheckoutBusy} onPress={()=>void removeSharedItem(item)}><Icon name="trash-2" size={17} color={th.red}/></Pressable> : null}
          </View>
        </Row>;
      }) : null}
      <View style={{borderTopWidth: 0.5,borderTopColor:th.line,marginTop:5,paddingTop:10}}>
        <Row sp><T cmsKey={"lbl.cms.2eb3747e6fda"} weight="600">{label("lbl.cms.2eb3747e6fda", "Items subtotal")}</T><T weight="600">{sharedSubtotal===null?'—':money(sharedSubtotal)}</T></Row>
       </View>
      <View style={{height:10}}/>
      {groupMembers.some((member:any)=>member.user_id===currentUserId&&member.role==='host')
        ? <Cta cmsKeys={["lbl.cms.c18a37461b0a","lbl.cms.15aa7cafd092"]} label={previewBusy?label("lbl.cms.c18a37461b0a", "Checking shared cart…"):label("lbl.cms.15aa7cafd092", "Review combined cart")} onPress={()=>void reviewSharedOrder()} disabled={previewBusy||sharedLoading||membersLoading||!!sharedError||!!statusError||!!membershipError||sharedSubtotal===null||!group.serverBacked}/>
        : null}
    </View>
    </> : null}
    {checkoutPreview ? <View>
      <T cmsKey={"lbl.cms.f2e22e470687"} size={15} weight="600">{label("lbl.cms.f2e22e470687", "Combined cart")}</T>
      <T cmsKey={"lbl.cms.4f071bdfe18b"} size={12} color={th.mut} style={{marginTop:4}}>{checkoutPreview.store_name} · {checkoutPreview.item_count} {label("lbl.cms.4f071bdfe18b", "items from everyone")}</T>

      <Row sp style={{borderTopWidth: 0.5,borderTopColor:th.line,paddingTop:10,marginTop:4}}><T cmsKey={"lbl.cms.2eb3747e6fda"} weight="600">{label("lbl.cms.2eb3747e6fda", "Items subtotal")}</T><T weight="600">{money(Number(checkoutPreview.subtotal||0))}</T></Row>

    </View>:null}
    {checkoutPreview && groupMembers.some((member:any)=>member.user_id===currentUserId&&member.role==='host') ? <View>
      <T cmsKey={"lbl.cms.365120540556"} size={15} weight="600">{label("lbl.cms.365120540556", "Checkout")}</T>

      <View style={{height:10}}/>
      <Seg list={[['pickup',label('lbl.checkoutPickup','Pickup')],['delivery',label('lbl.checkoutDelivery','Delivery')]]} on={groupCheckoutType} onPick={value=>void selectGroupCheckoutType(value)} />
      {groupCheckoutType==='delivery' ? <View style={{marginTop:10}}>
        <T cmsKey={"lbl.cms.d1be960df332"} size={12} weight="600" style={{marginBottom:6}}>{label("lbl.cms.d1be960df332", "Deliver to")}</T>
        {S.addr.map((item:any)=><Radio key={String(item.id)} on={String(groupAddressId)===String(item.id)} onPress={()=>{if(groupCheckoutLock.current)return;selection.current=JSON.stringify([group.groupId,groupCheckoutType,String(item.id)]);estimateVersion.current++;setGroupAddressId(item.id);setGroupDeliveryQuote(null);setCheckoutEstimate(null);}}>
          <View style={{flex:1}}><T cmsKey={"lbl.cms.85133da20cde"} size={13} weight="600">{item.l}{item.def?label("lbl.cms.85133da20cde", " · Default"):''}</T><T size={11.5} color={th.mut}>{item.t}</T></View>
        </Radio>)}
        {!S.addr.length ? <T cmsKey={"lbl.cms.7bb9755afe95"} size={12} color={th.mut}>{label("lbl.cms.7bb9755afe95", "No saved addresses found. Add a delivery address to your profile first.")}</T> : null}
        <Cta cmsKeys={["lbl.cms.cbc60fe888d9","lbl.cms.92e9fad36618"]} ghost small label={groupQuoteBusy?label("lbl.cms.cbc60fe888d9", "Calculating delivery…"):label("lbl.cms.92e9fad36618", "Calculate delivery fee")} onPress={()=>void calculateGroupDeliveryQuote()} disabled={groupQuoteBusy||!S.addr.length}/>
        {groupDeliveryQuote&&groupDeliveryQuote.addressId===String(groupAddressId)&&groupDeliveryQuote.expiresAt>Date.now() ? <View style={{marginTop:8,padding:10,borderRadius:10,backgroundColor:th.soft}}>
          <Row sp><T cmsKey={"lbl.cms.580cf27d049f"} size={12} color={th.mut}>{label("lbl.cms.580cf27d049f", "Delivery fee")}</T><T size={13} weight="600">{money(groupDeliveryQuote.fee)}</T></Row>


        </View> : null}
        <Cta cmsKey={"lbl.cms.80852e133373"} ghost small label={label("lbl.cms.80852e133373", "Manage delivery addresses")} onPress={()=>{close();A.go('addresses');}}/>
      </View> : null}
      {checkoutEstimate ? <View style={{marginTop:12,padding:11,borderRadius:11,backgroundColor:th.soft}}>
        <T cmsKey={"lbl.cms.8299ae70ae45"} size={12} weight="600" style={{marginBottom:7}}>{label("lbl.cms.8299ae70ae45", "Payment estimate")}</T>
        <Row sp><T cmsKey={"lbl.cms.a55fd7ae1c97"} size={12} color={th.mut}>{label("lbl.cms.a55fd7ae1c97", "Combined cart subtotal")}</T><T size={12} weight="600">{money(Number(checkoutEstimate.subtotal||0))}</T></Row>
        {groupCheckoutType==='delivery' ? <Row sp style={{marginTop:5}}><T cmsKey={"lbl.cms.580cf27d049f"} size={12} color={th.mut}>{label("lbl.cms.580cf27d049f", "Delivery fee")}</T><T size={12} weight="600">{money(Number(checkoutEstimate.delivery_fee||0))}</T></Row> : null}
        <Row sp style={{marginTop:5}}><T cmsKey={"lbl.cms.e25611cb9017"} size={12} color={th.mut}>{label("lbl.cms.e25611cb9017", "Service fee")}</T><T size={12} weight="600">{money(Number(checkoutEstimate.service_fee||0))}</T></Row>
        <View style={{height:1,backgroundColor:th.line,marginVertical:8}}/>
        <Row sp><T cmsKey={"lbl.cms.58f9d30aae7a"} size={13} weight="600">{label("lbl.cms.58f9d30aae7a", "Estimated total")}</T><T size={15} weight="600">{money(Number(checkoutEstimate.estimated_total||0))}</T></Row>


      </View> : null}
      <Row sp style={{marginTop:10}}><T cmsKey={"lbl.cms.d15afce772c7"} size={12} color={th.mut}>{label("lbl.cms.d15afce772c7", "Host Wallet balance")}</T><T weight="600">{S.paymentOptionsStatus==='ready'&&groupAmount(S.wallet)!==null?money(Number(S.wallet)):'—'}</T></Row>

      <View style={{height:9}}/>
      <Cta cmsKeys={["lbl.cms.5763c91a2cc0","lbl.cms.91e196e0db97"]} label={groupCheckoutBusy?label("lbl.cms.5763c91a2cc0", "Placing group order…"):label("lbl.cms.91e196e0db97", "Place group order · Wallet")} onPress={()=>void checkoutGroupOrder()} disabled={groupCheckoutBusy||(groupCheckoutType==='delivery'&&(!S.addr.length||!groupDeliveryQuote||groupDeliveryQuote.addressId!==String(groupAddressId)||groupDeliveryQuote.expiresAt<=Date.now()))}/>
    </View> : null}
    {showDone ? <><View style={{height:12}} /><Cta cmsKey={'lbl.sheetDone'} label={label('lbl.sheetDone', 'Done')} onPress={close} /><View style={{height:8}} /></> : null}
    {group.serverBacked && group.groupId && groupMembers.some((member:any)=>member.user_id===currentUserId&&member.role==='host') ? <Cta cmsKey={'lbl.sheetEndGroup'} ghost label={label('lbl.sheetEndGroup', 'End group order')} disabled={groupBusy||groupCheckoutBusy} onPress={()=>void endGroupOrder()} /> : null}
    <Modal visible={scannerOpen} animationType="slide" onRequestClose={()=>setScannerOpen(false)}>
      <View style={{flex:1,backgroundColor:'#000000'}}>
        <CameraView style={{flex:1}} facing="back" barcodeScannerSettings={{barcodeTypes:['qr']}} onBarcodeScanned={({data})=>{
          setScannerOpen(false);
          const code=groupInviteCodeFromScan(data);
          if(!code){toast(label('lbl.groupInviteUnavailable','This group invitation is unavailable. Create or join a group order again.'));return;}
          setInviteCode(code);
          toast(label("lbl.cms.c90943bbdf87", "QR code scanned. Tap Join group order to continue."));
        }}/>
        <View style={{padding:18,backgroundColor:'#111111'}}>
          <T cmsKey={"lbl.cms.45162ba8dd3a"} color="#FFFFFF" weight="600" align="center">{label("lbl.cms.45162ba8dd3a", "Scan a Wantiss group invite QR code")}</T>
          <Cta cmsKey={"lbl.cms.b5e1b0b2d344"} label={label("lbl.cms.b5e1b0b2d344", "Close scanner")} onPress={()=>setScannerOpen(false)}/>
        </View>
      </View>
    </Modal>
  </>;
}

export function GroupOrderPage({onBack, storeId = ''}: {onBack: () => void; storeId?: string}) {
  const th = useTheme();
  return <View style={{flex: 1, backgroundColor: th.bg}}>
    <Bar cmsKey={'lbl.sheetGroupTitle'} title={label('lbl.sheetGroupTitle', 'Group order')} onBack={onBack} />
    <ScrollView style={{flex: 1}} contentContainerStyle={{paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32}} keyboardShouldPersistTaps="handled"><GroupOrderSheet key={S.accountId || 'signed-out'} close={onBack} showTitle={false} showDone={false} storeId={storeId} /></ScrollView>
  </View>;
}

function ReviewSheet({id, stars, driver = false, initialStars = 0}: {id: string; stars: any; driver?: boolean; initialStars?: number}) {
  const [n, setN] = useState(initialStars || S.rt || 0), [t, setT] = useState('');
  const [saving, setSaving] = useState(false);
  const submitLock = useRef(false);
  return (<>
    <T cmsKeys={['lbl.orderRateDriver','lbl.orderRate']} size={20} weight="600">{driver ? label('lbl.orderRateDriver', 'Rate your driver') : label('lbl.orderRate', 'Rate your order')}</T>{stars(n, setN)}
    <Input cmsPlaceholderKey={'lbl.sheetReviewComment'} value={t} onChange={setT} placeholder={label('lbl.sheetReviewComment', 'Add a comment (optional)')} multiline />
    <View style={{height: 12}} />
    <Cta cmsKeys={['lbl.reviewSaving','lbl.sheetSubmitReview']} disabled={saving} label={saving ? label('lbl.reviewSaving', 'Submitting…') : label('lbl.sheetSubmitReview', 'Submit review')} onPress={async () => {
      if (submitLock.current) return;
      const o = S.orders.filter((x: any) => x.id === id)[0];
      if (!o) {toast(label('lbl.sheetOrderNotFound', 'Order not found')); return;}
      if (t.trim().length > 1000) {toast(label('lbl.reviewTooLong', 'Keep your review under 1,000 characters.'));return;}
      if (!n) {toast(label('lbl.sheetPickRating', 'Pick a star rating')); return;}
      if (!o.backendId||o.serverStatus!=='completed'||(driver&&(!o.courierId||o.selfDelivery||o.pk))) {toast(label('lbl.sheetOrderNotFound', 'Order not found'));return;}
      const account = S.accountId;
      submitLock.current = true;setSaving(true);
      try {
        const {data,error} = await supabase.rpc('goodies_submit_order_review', {p_order_id: o.backendId, p_review_target: driver ? 'courier' : 'store', p_rating: n, p_comment: t.trim()});
        if (error||typeof data!=='string'||!data) throw error||Error('Review not confirmed');
        if (S.accountId !== account) return;
      } catch {toast(label('lbl.reviewSaveFailed', 'Could not submit your review. Please try again.'));return;}
      finally {submitLock.current = false;setSaving(false);}
      if (driver) {
        S.driverRev = S.driverRev || {};
        S.driverRev[id] = {n: S.pf.n, r: n, t: t.trim(), d: label("lbl.page.components.Sheets.66f53417d3", "Just now"), orderId: id};
        o.driverRated = n;
        o.driverReview = {r: n, t: t.trim(), d: label("lbl.page.components.Sheets.66f53417d3", "Just now")};
      } else {
        S.rev[o.sid] = (S.rev[o.sid] || []).filter((review: any) => review.orderId !== id);
        S.rev[o.sid].unshift({n: S.pf.n, r: n, t: t.trim(), d: label("lbl.page.components.Sheets.66f53417d3", "Just now"), you: 1, orderId: id});
        o.rated = n;
        o.orderReview = {r: n, t: t.trim(), d: label("lbl.page.components.Sheets.66f53417d3", "Just now")};
      }
      if (!driver) void notifyStoreReviewsChanged(o.sid);
      S.rt = 0; ui.close(); toast((driver ? label('lbl.sheetDriverReviewThanks', 'Thanks for rating your driver!') : label('lbl.sheetReviewThanks', 'Thanks for your review!'))+' '+label('lbl.reviewPending','Your review is awaiting approval.')); save(); emit();
    }} />
  </>);
}

function ContactsSheet({close}: {close: () => void}) {
  const th = useTheme();
  const rows = [{id: 'w', ph: S.pf.ph, l: label('lbl.sheetDefaultNumber', 'Default Wantiss number'), w: 1}].concat(S.gc.map((c: any) => ({id: c.id, ph: c.ph, l: c.l || label('lbl.sheetGoodiesNumber', 'Goodies number'), w: 0})));
  return (<>
    <T cmsKey={'lbl.sheetContactNumber'} size={20} weight="600" style={{marginBottom: 4}}>{label('lbl.sheetContactNumber', 'Contact number')}</T>
    <T cmsKey={'lbl.sheetContactNumberHint'} size={12.5} color={th.mut} style={{marginBottom: 12}}>{label('lbl.sheetContactNumberHint', 'We use this number for this order only. Your Wantiss account number is never changed here.')}</T>
    {rows.map((r: any) => (
      <View key={r.id} style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
        <View style={{flex: 1}}><Radio on={S.cc === r.id} onPress={() => {S.cc = r.id; close(); save(); emit();}}><T weight="600">{r.ph}</T><View style={{marginTop: 3}}>{r.w ? <Badge cmsKey={"lbl.sheetAuto1UP0O00"} green label={label("lbl.sheetAuto1UP0O00", "Default Wantiss number")} /> : <T cmsKey={"lbl.cms.a230877fe597"} size={12.5} color={th.mut}>{label("lbl.cms.a230877fe597", "Goodies checkout number · ")}{r.l}</T>}</View></Radio></View>
        {r.w ? null : <><Pressable accessibilityLabel={label('lbl.sheetEditNumber', 'Edit number')} onPress={() => ui.sheet({kind: 'ctform', id: r.id})}><T cmsKey={"lbl.sheetAuto1CISXZJ"} size={13} weight="600" color={th.br}>{label("lbl.sheetAuto1CISXZJ", "Edit")}</T></Pressable>
        <Pressable accessibilityLabel={label('lbl.sheetRemoveNumber', 'Remove number')} onPress={() => {if (S.orders.some((o: any) => !done(o) && o.cid == r.id)) {toast(label('lbl.sheetPhoneInUse', 'This number is used by an active order')); return;} ui.sheet({kind: 'remove-number', numberLabel: r.l || r.ph, onConfirm: () => {void removeGoodiesContactNumber(String(r.id)).then(()=>{toast(label('lbl.sheetNumberRemoved', 'Number removed'));ui.sheet({kind:'contacts'});}).catch((e:any)=>toast(friendlyError(e,label('lbl.contactRemoveFailed','Could not remove this number. Please retry.'))));}});}}><Icon name="trash" size={18} color={th.red} /></Pressable></>}
      </View>
    ))}
    <Cta cmsKey={"lbl.sheetAutoQWFBNT"} ghost label={label("lbl.sheetAutoQWFBNT", "+ Add another number")} onPress={() => ui.sheet({kind: 'ctform', id: ''})} />
  </>);
}
function CtForm({id,bottomInset=0}: {id: any; bottomInset?: number}) {
  const th = useTheme(), c = S.gc.filter((x: any) => x.id == id)[0] || {l: '', ph: ''};
  const [l, setL] = useState(c.l || ''), [ph, setPh] = useState(c.ph || '');
  const [saving,setSaving]=useState(false);
  const save_ = async () => {
    if(saving)return;
    const p = ph.trim();
    if (!phoneOK(p)) return toast(label('lbl.sheetPhoneInvalid', 'Enter a valid phone number (8 to 15 digits)'));
    const dg = p.replace(/\D/g, '');
    if (dg === S.pf.ph.replace(/\D/g, '')) return toast(label('lbl.sheetSameWantissPhone', 'That is already your Wantiss number'));
    if (S.gc.some((x: any) => x.id != id && String(x.ph).replace(/\D/g, '') === dg)) return toast(label('lbl.sheetDuplicateNumber', 'You already saved that number'));
    const accountId=S.accountId;setSaving(true);
    try {
      await persistGoodiesContactNumber(p,l.trim(),typeof id==='string'&&/^[0-9a-f-]{36}$/i.test(id)?id:undefined);
      if(S.accountId!==accountId)return;
      toast(label('lbl.sheetNumberSaved', 'Number saved for Goodies checkout'));
      ui.sheet({kind:'contacts'});
    } catch(e:any) {if(S.accountId===accountId)toast(friendlyError(e,label('lbl.contactSaveFailed','Could not save this number. Please retry.')));}
    finally {setSaving(false);}
  };
  return <View style={{flex:1,minHeight:0,paddingBottom:Math.max(0,bottomInset-20)}}>
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:12}}>
      <T cmsKeys={['lbl.sheetEditContactNumber','lbl.sheetAddContactNumber']} size={20} weight="600">{id ? label('lbl.sheetEditContactNumber','Edit contact number') : label('lbl.sheetAddContactNumber','Add contact number')}</T>
      <T cmsKey={"lbl.sheetAutoLZBAF5"} size={12.5} color={th.mut} style={{marginTop:3,marginBottom:10}}>{label("lbl.sheetAutoLZBAF5", "Saved for Goodies checkout only. Your Wantiss account number is not changed here. Country-code management will be handled in Wantiss settings.")}</T>
      <Input cmsKey={"lbl.sheetAuto5601C6"} cmsPlaceholderKey={"lbl.sheetAutoBBS3LN"} label={label("lbl.sheetAuto5601C6", "Label (optional)")} value={l} onChange={setL} placeholder={label("lbl.sheetAutoBBS3LN", "e.g. Partner, Office")} />
      <Input cmsKey={"lbl.sheetAutoSTYZV6"} cmsPlaceholderKey={"lbl.sheetAuto1JJXA6W"} label={label("lbl.sheetAutoSTYZV6", "Phone number")} value={ph} onChange={setPh} placeholder={label("lbl.sheetAuto1JJXA6W", "Enter phone number")} keyboard="phone-pad" />
    </ScrollView>
    <View style={{paddingTop:8,borderTopWidth: 0.5,borderTopColor:th.line}}>
      <Cta cmsKeys={["lbl.sharedPay.23e39291d613","lbl.sheetAuto9HY80N"]} label={saving?label("lbl.sharedPay.23e39291d613", "Saving…"):label("lbl.sheetAuto9HY80N", "Save number")} disabled={saving} onPress={()=>void save_()} />
      <View style={{height:8}}/><Cta cmsKey={"lbl.sheetAuto1LJ92XO"} ghost label={label("lbl.sheetAuto1LJ92XO", "Back")} onPress={() => ui.sheet({kind: 'contacts'})} />
    </View>
  </View>;
}
