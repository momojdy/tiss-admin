import {EditableNativeText as Text} from '../EditableNativeText';
/* Account screens: settings, profile, addresses, payments, policies, support. Ported from v24. */
import React, {useState, useEffect, useRef} from 'react';
import {View, Text as UnusedNativeText, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform, Image, Alert} from 'react-native';
import {previewLocation as Location} from '../previewNative';
import {Icon} from '../components/Icon';
import {T, Bar, Cta, Card, Row, Badge, Ttl, Empty, Switch, Input, Chip, useTheme, Tile} from '../components/ui';
import {S, defAddr, money, emit, save, toast, ui, push, reset, STB, refreshUserAddresses} from '../store';
import {back, go, tab, togglePref} from '../actions';
import {setTheme} from '../store';
import {t as tr} from '../i18n';
import {Home} from './Browse';
import {LivePayments} from './Payments';
import {previewBackend as supabase} from '../previewRuntime';
import {legalDoc, supportTopics, label} from '../content';
import {friendlyError} from '../friendlyError';

const POL: Record<string, [string, string]> = {
  terms: ['Terms of use', 'legal.terms'],
  privacy: ['Privacy policy', 'legal.privacy'],
  refund: ['Refund and cancellation policy', 'legal.refund'],
};

const POL_LABELS: Record<string, [string, string]> = {
  terms: ['lbl.legalTermsTitle', 'lbl.legalTermsBody'],
  privacy: ['lbl.legalPrivacyTitle', 'lbl.legalPrivacyBody'],
  refund: ['lbl.legalRefundTitle', 'lbl.legalRefundBody'],
};

const LRow = ({icon, title, sub, onPress, right}: {icon: string; title: string; sub?: string; onPress: () => void; right?: any}) => {
  const th = useTheme();
  return (
    <Pressable onPress={onPress} style={{flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: th.line}}>
      <View style={{width: 38, height: 38, borderRadius: 12, backgroundColor: th.soft, alignItems: 'center', justifyContent: 'center'}}><Icon name={icon} size={19} color={th.ink} /></View>
      <View style={{flex: 1}}><T size={14.5} weight="600">{title}</T>{sub ? <T size={12.5} color={th.mut}>{sub}</T> : null}</View>
      {right || <Icon name="chevR" size={16} color={th.ink} />}
    </Pressable>
  );
};
const Avatar = ({z}: {z: number}) => {const th = useTheme(); return <View style={{width: z, height: z, borderRadius: z / 2, backgroundColor: th.br, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>{S.pf.av ? <Image source={{uri: S.pf.av}} style={{width: z, height: z, borderRadius: z / 2}} resizeMode="cover" /> : <T size={Math.round(z * 0.45)} weight="600" color="#fff">{String(S.pf.n).charAt(0).toUpperCase()}</T>}</View>;};

function Settings() {
  const th = useTheme(), d = S.theme === 'dark', address = defAddr();
  return (<View>
    <Bar cmsKey={"lbl.interface.settings"} title={tr('settings')} onBack={back} />
    <View style={{paddingHorizontal: 16}}>
      <Ttl>{label('lbl.notifsTitle', 'Notifications')}</Ttl>
      <Row sp style={{paddingVertical: 8, paddingHorizontal: 4}}><T cmsKey={'lbl.settingsOrderUpdates'}>{label('lbl.settingsOrderUpdates', 'Order updates')}</T><Switch on={!!S.np.orders} label={label('lbl.settingsOrderUpdates', 'Order updates')} onPress={() => togglePref('orders')} /></Row>
      <Row sp style={{paddingVertical: 8, paddingHorizontal: 4}}><T cmsKey={'lbl.settingsOffers'}>{label('lbl.settingsOffers', 'Offers and deals')}</T><Switch on={!!S.np.promos} label={label('lbl.settingsOffers', 'Offers and deals')} onPress={() => togglePref('promos')} /></Row>
      <Ttl>{label('lbl.settingsAccount', 'Account')}</Ttl>
      <LRow icon="pin" title={label('lbl.settingsAddresses', 'Saved addresses')} sub={address?.t ? label('lbl.settingsAddressDefault', '{address} · Wantiss default').replace('{address}', address.t) : label('lbl.settingsAddAddressHint', 'Add a delivery address')} onPress={() => go('addresses')} />
      <LRow icon="heart" title={label('lbl.settingsFavorites', 'Favorites')} sub={label('lbl.accountSavedCount', '{count} saved').replace('{count}', String(S.fav.length + S.favp.length))} onPress={() => go('favs')} />
      <LRow icon="tag" title={label('lbl.settingsCoupons', 'Coupons and offers')} onPress={() => go('promos')} />

      <LRow icon="moon" title={label('lbl.settingsDarkMode', 'Dark mode')} sub={label('lbl.accountDarkModeHint', 'Goodies only. Other Wantiss features keep their theme.')} onPress={() => setTheme(d ? 'light' : 'dark')} right={<Switch on={d} label={label('lbl.settingsDarkMode', 'Dark mode')} onPress={() => setTheme(d ? 'light' : 'dark')} />} />
      <LRow icon="help" title={label('lbl.settingsHelp', 'Help center')} sub={label('lbl.accountFaqSupportHint', 'FAQs and support')} onPress={() => go('help')} />

    </View>
  </View>);
}

function Profile() {
  const th = useTheme(), p = S.pf;
  return (<View>
    <Bar cmsKey={'lbl.profileTitle'} title={label('lbl.profileTitle', 'Profile')} onBack={back} />
    <View style={{paddingHorizontal: 16}}>
      <Card style={{alignItems: 'center'}}><Avatar z={76} /><T size={17} weight="600" style={{marginTop: 10}}>{p.n}</T><T size={13.5} color={th.mut} align="center" style={{lineHeight: 22}}>{p.e}{'\n'}{p.ph}</T><View style={{marginTop: 8}}><Badge cmsKey={'lbl.profileShared'} label={label('lbl.profileShared', 'Shared Wantiss account')} /></View></Card>
      <LRow icon="pin" title={label('lbl.settingsAddresses', 'Saved addresses')} onPress={() => go('addresses')} />
      <LRow icon="bag" title={label('lbl.profileOrderHistory', 'Order history')} sub={(S.orders.length === 1 ? label('lbl.accountOrderCountOne', '{count} order') : label('lbl.accountOrderCountMany', '{count} orders')).replace('{count}', String(S.orders.length))} onPress={() => tab('orders')} />
      <LRow icon="heart" title={label('lbl.settingsFavorites', 'Favorites')} onPress={() => go('favs')} />
      <LRow icon="bell" title={label('lbl.accountNotificationPreferences', 'Notification preferences')} onPress={() => go('settings')} />
      <LRow icon="help" title={label('lbl.accountHelpSupport', 'Help and support')} onPress={() => go('help')} />
      <LRow icon="tag" title={label('lbl.profilePolicies', 'Terms and policies')} onPress={() => go('policies')} />
    </View>
  </View>);
}

function Addresses() {
  const th = useTheme(), [edit, setEdit] = useState<any>(null), [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const fillFromCurrentLocation = async () => {
    if (locating || !edit) return;
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {toast(label("lbl.cms.7a946d1d12dc", "Allow location access to fill your address from where you are.")); return;}
      const position = await Location.getCurrentPositionAsync({accuracy: Location.Accuracy.High});
      const [place] = await Location.reverseGeocodeAsync({latitude: position.coords.latitude, longitude: position.coords.longitude});
      if (!place) {toast(label("lbl.cms.81a56ba9f91d", "We could not turn your location into an address. Please type it in.")); return;}
      const street = [place.streetNumber, place.street].filter(Boolean).join(' ').trim() || place.name || '';
      const city = place.city || place.subregion || place.district || '';
      S.currentLocation = {latitude: position.coords.latitude, longitude: position.coords.longitude, capturedAt: Date.now(), addressText: [street, city, place.region || '', place.country || ''].filter(Boolean).join(', ')};
      setEdit((prev: any) => prev ? {...prev, latitude: position.coords.latitude, longitude: position.coords.longitude, t: street || prev.t, city: city || prev.city, department: place.region || prev.department, country: place.country || prev.country} : prev);
      toast(label("lbl.cms.42ae2727e087", "Address filled from your current location. Check the details before saving."));
    } catch (e: any) {toast(friendlyError(e, label("lbl.cms.4497ac9d2bd1", "Could not get your current location.")));}
    finally {setLocating(false);}
  };
  useEffect(() => { void refreshUserAddresses().catch((e: any) => toast(friendlyError(e, label("lbl.cms.dfee89702c16", "Could not load saved addresses.")))); }, []);
  const rows = S.addr || [];
  const countryName = (cc: string, fallback?: string) => ({HT:'Haiti',DO:label("lbl.page.screens.Account.81e884cb2e", "Dominican Republic"),US:label("lbl.page.screens.Account.49dca65f36", "United States")} as any)[cc] || (fallback && fallback !== 'Other' ? fallback : label("lbl.page.screens.Account.f97e9da0e3", "Other"));
  const selectForGoodies = async (a: any) => {
    if (busy) return;
    setBusy(true);
    try {
      const {data: auth, error: authError} = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new Error(label("lbl.page.screens.Account.2e1d18330b", "Please sign in again."));
      const {error} = await supabase.auth.updateUser({data: {goodies_default_address_id: String(a.id)}});
      if (error) throw error;
      S.as = a.id;
      await refreshUserAddresses();
      save(); emit();
    } catch (e: any) {
      toast(friendlyError(e, label("lbl.cms.2bc4eea68a5e", "Could not update the Goodies delivery address.")));
    } finally { setBusy(false); }
  };
  const saveAddr = async () => {
    const street = String(edit.t || '').trim(), city = String(edit.city || '').trim();
    if (street.length < 4 || !city || !String(edit.country || '').trim()) { toast(label("lbl.cms.b8671dd2534d", "Enter the street address, city and country.")); return; }
    if (busy) return;
    setBusy(true);
    try {
      const {data: auth, error: authError} = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new Error(label("lbl.page.screens.Account.2e1d18330b", "Please sign in again."));
      const payload = {
        recipient_name: String(edit.l || 'Home').trim().slice(0, 80) || 'Home',
        phone_number: String(edit.phone || S.pf.ph || '').trim(),
        country: String(edit.country || '').trim(),
        department: String(edit.department || '').trim(),
        city,
        street_address: street,
        apartment: String(edit.apt || '').trim(),
        postal_code: String(edit.postal_code || '').trim(),
        ...(Number.isFinite(Number(edit.latitude)) && Number.isFinite(Number(edit.longitude)) && edit.latitude != null && edit.longitude != null ? {latitude: Number(edit.latitude), longitude: Number(edit.longitude)} : {}),
        delivery_notes: String(edit.inst || '').trim(),
        updated_at: new Date().toISOString(),
      };
      const isNew = !edit.id || typeof edit.id === 'number';
      const write = (body: any) => isNew
        ? supabase.from('user_addresses').insert({...body, user_id: auth.user.id, is_default: false}).select('id').single()
        : supabase.from('user_addresses').update(body).eq('id', String(edit.id)).eq('user_id', auth.user.id).select('id').single();
      let result = await write(payload);
      /* Until the coordinates migration is applied, save the address without them instead of failing. */
      if (result.error && /latitude|longitude/i.test(String(result.error.message))) {const {latitude, longitude, ...plain} = payload as any; result = await write(plain);}
      if (result.error) throw result.error;
      if (isNew) {
        const {error: preferenceError} = await supabase.auth.updateUser({data: {goodies_default_address_id: String(result.data.id)}});
        if (preferenceError) throw preferenceError;
        S.as = String(result.data.id);
      }
      setEdit(null);
      await refreshUserAddresses();
      toast(isNew ? label("lbl.cms.bf27147239d8", "Address saved to your Wantiss account.") : label("lbl.cms.ff44d9df12d3", "Address updated."));
      save(); emit();
    } catch (e: any) {
      toast(friendlyError(e, label("lbl.cms.50d4cef42e56", "Could not save this address.")));
    } finally { setBusy(false); }
  };
  const removeAddr = (a: any) => ui.sheet({kind: 'remove-address', addressLabel: a.l, onConfirm: () => {
    void (async () => {
      if (busy) return;
      setBusy(true);
      try {
        const {error} = await supabase.rpc('delete_user_address', {p_address_id: String(a.id)});
        if (error) throw error;
        await refreshUserAddresses(); save(); emit();
        ui.close();
        toast(label("lbl.cms.203961ea028d", "Address deleted."));
      } catch (e: any) { toast(friendlyError(e, label("lbl.cms.1c6579e6b5f5", "Could not delete this address."))); }
      finally { setBusy(false); }
    })();
  }});
  return (<View>
    <Bar cmsKey={'lbl.settingsAddresses'} title={label('lbl.settingsAddresses', 'Saved addresses')} onBack={back} />
    <View style={{paddingHorizontal: 16}}>
      {rows.map((a: any) => (
        <Card key={a.id}>
          <Row sp style={{flexWrap: 'wrap'}}><T weight="600">{a.l}</T><Row style={{gap: 6, flexWrap: 'wrap'}}>{a.def ? <Badge cmsKey={'lbl.accountWantissDefault'} green label={label('lbl.accountWantissDefault', 'Wantiss default')} /> : null}{a.goodiesDefault ? <View style={{backgroundColor: '#FD802E', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3}}><T cmsKey={"lbl.cms.445ce73a4a49"} size={10} weight="600" color="#fff">{label("lbl.cms.445ce73a4a49", "GOODIES")}</T></View> : null}</Row></Row>
          <T size={14} style={{marginTop: 6}}>{a.t}{a.apt ? ', ' + a.apt : ''}</T>{a.inst ? <T cmsKey={'lbl.accountAddressNote'} size={12.5} color={th.mut}>{label('lbl.accountAddressNote', 'Note:')} {a.inst}</T> : null}
          <Row style={{marginTop: 10, gap: 14, flexWrap: 'wrap'}}>
            <Pressable onPress={() => setEdit({...a})}><T cmsKey={'lbl.accountEdit'} size={13.5} weight="600" color={th.br}>{label('lbl.accountEdit', 'Edit')}</T></Pressable>
            {String(a.id) !== String(S.as) ? <Pressable disabled={busy} onPress={() => void selectForGoodies(a)}><T cmsKey={'lbl.accountUseForGoodies'} size={13.5} weight="600" color={th.br}>{label('lbl.accountUseForGoodies', 'Use for Goodies')}</T></Pressable> : null}
            {!a.def ? <Pressable onPress={() => Alert.alert(label("lbl.cms.2cdcc5b2c7ee", "Wantiss default"), label("lbl.cms.a2327e1b77d0", "Change your main Wantiss default address in Me → Settings → Saved addresses."))}><T cmsKey={"lbl.cms.af3e5b5bfea5"} size={13.5} weight="600" color={th.mut}>{label("lbl.cms.af3e5b5bfea5", "Main default")}</T></Pressable> : null}
            {rows.length > 1 ? <Pressable disabled={busy} onPress={() => removeAddr(a)}><T cmsKey={'lbl.accountDeleteAddress'} size={13.5} weight="600" color={th.red}>{label('lbl.accountDeleteAddress', 'Delete')}</T></Pressable> : null}
          </Row>
        </Card>
      ))}
      {edit ? (
        <Card>
          <T cmsKeys={['lbl.accountEditAddress','lbl.accountNewAddress']} size={17} weight="600">{edit.id && typeof edit.id === 'string' ? label('lbl.accountEditAddress', 'Edit address') : label('lbl.accountNewAddress', 'New address')}</T>
          <Row style={{marginTop: 10, gap: 8}}>{['Home', 'Work', 'Other'].map(x => <Chip cmsKey={'lbl.accountAddressType' + x} key={x} label={label('lbl.accountAddressType' + x, x)} on={edit.l === x} onPress={() => setEdit({...edit, l: x})} />)}</Row>
          <View style={{marginTop: 8, marginBottom: 12}}><Cta cmsKeys={["lbl.cms.984a06af7321","lbl.cms.18296053d4f7"]} ghost small label={locating ? label("lbl.cms.984a06af7321", "Locating…") : label("lbl.cms.18296053d4f7", "Use my current location")} disabled={locating} onPress={() => void fillFromCurrentLocation()} /></View>
          <Input cmsKey={'lbl.accountStreetArea'} label={label('lbl.accountStreetArea', 'Street and area')} value={edit.t || ''} onChange={v => setEdit({...edit, t: v, latitude: null, longitude: null})} />
          <Input cmsKey={"lbl.cms.fcae7abd6834"} label={label("lbl.cms.fcae7abd6834", "City")} value={edit.city || ''} onChange={v => setEdit({...edit, city: v})} />
          <Input cmsKey={"lbl.cms.736e82ce9843"} label={label("lbl.cms.736e82ce9843", "Department / State")} value={edit.department || ''} onChange={v => setEdit({...edit, department: v})} />
          <Input cmsKey={'lbl.accountApartment'} label={label('lbl.accountApartment', 'Apartment, building, floor or landmark')} value={edit.apt || ''} onChange={v => setEdit({...edit, apt: v})} />
          <Input cmsKey={'lbl.accountDeliveryInstructions'} label={label('lbl.accountDeliveryInstructions', 'Delivery instructions')} value={edit.inst || ''} onChange={v => setEdit({...edit, inst: v})} />
          <Input cmsKey={'lbl.accountCountry'} cmsPlaceholderKey={"lbl.cms.52ae5797df29"} label={label('lbl.accountCountry', 'Country')} value={edit.country ?? countryName(edit.cc || 'HT')} onChange={v => setEdit({...edit, country: v})} placeholder={label("lbl.cms.52ae5797df29", "Country name (e.g. Philippines)")} />
          <View style={{marginTop: 14}}><Cta cmsKeys={["lbl.cms.cf72ea618e90",'lbl.accountSaveAddress']} label={busy ? label("lbl.cms.cf72ea618e90", "Saving…") : label('lbl.accountSaveAddress', 'Save address')} disabled={busy} onPress={() => void saveAddr()} /></View>
        </Card>
      ) : <Cta cmsKey={'lbl.accountAddAddress'} label={label('lbl.accountAddAddress', '+ Add new address')} onPress={() => setEdit({id: 0, l: 'Home', t: '', city: '', department: '', apt: '', inst: '', def: 0, cc: '', country: '', phone: S.pf.ph || ''})} />}
    </View>
  </View>);
}

function StoreChat({id}: {id: string}) {
  const th = useTheme(), store = STB[id], listRef = useRef<React.ElementRef<typeof ScrollView>>(null), userIdRef = useRef('');
  const [userId, setUserId] = useState(''), [conversationId, setConversationId] = useState(''), [messages, setMessages] = useState<any[]>([]);
  const [draft, setDraft] = useState(''), [loading, setLoading] = useState(true), [sending, setSending] = useState(false), [problem, setProblem] = useState(''), [attempt, setAttempt] = useState(0);
  const loadMessages = async (cid: string) => {
    const {data, error} = await supabase.from('messages').select('id,sender_id,body,created_at').eq('conversation_id', cid).order('created_at', {ascending: true});
    if (error) throw error;
    setMessages(data || []);
    if ((data || []).some((m: any) => m.sender_id !== userIdRef.current)) void supabase.rpc('mark_conversation_read', {p_conv: cid});
  };
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const {data: auth, error: authError} = await supabase.auth.getUser();
        if (authError) throw authError;
        const user = auth.user;
        if (!user) throw new Error(label('lbl.chatErrSignIn', 'Sign in to message this store. Your conversation will appear here after you sign in.'));
        if (!active) return;
        setUserId(user.id); userIdRef.current = user.id;
        const {data: cid, error: conversationError} = await supabase.rpc('goodies_start_store_conversation', {
          p_store_id: id,
          p_customer_name: S.pf.n || label('lbl.accountCustomerFallback', 'Customer'),
        });
        if (conversationError) throw conversationError;
        if (!cid) throw new Error(label('lbl.chatErrOpen', 'Could not open this store conversation.'));
        if (!active) return;
        setConversationId(String(cid));
        await loadMessages(String(cid));
      } catch (e: any) { if (active) setProblem(friendlyError(e, label('lbl.chatErrOpen', 'Could not open this store conversation.'))); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [id, attempt]);
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase.channel('goodies-store-chat-' + conversationId).on('postgres_changes', {event: '*', schema: 'public', table: 'messages', filter: 'conversation_id=eq.' + conversationId}, () => { loadMessages(conversationId).catch(e => setProblem(friendlyError(e, label('lbl.chatErrRefresh', 'Could not refresh messages.')))); }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [conversationId]);
  const send = async () => {
    const body = draft.trim(); if (!body || !conversationId || !userId || sending) return;
    setSending(true);
    try {
      const {error} = await supabase.rpc('goodies_send_store_message', {p_conversation_id: conversationId, p_body: body});
      if (error) throw error;
      // The message is persisted now. Clear it before best-effort thread metadata so a
      // metadata failure cannot lead the customer to accidentally resend the same message.
      setDraft('');
      await loadMessages(conversationId);
    } catch (e: any) { setProblem(friendlyError(e, label('lbl.chatErrSend', 'Message could not be sent.'))); }
    finally { setSending(false); }
  };
  const chatActivated = messages.some(m => m.sender_id !== userId);
  const customerMessages = messages.filter(m => m.sender_id === userId);
  return (
    <View style={{flex: 1, minHeight: 430}}>
      <Bar cmsKey={'lbl.chatTitle'} title={store ? store.n : label('lbl.chatTitle', 'Message store')} onBack={back} />
      {store ? <View style={{paddingHorizontal: 16, paddingBottom: 10}}><Card style={{overflow: 'hidden', padding: 0}}><View style={{padding: 12}}><Row style={{gap: 10, alignItems: 'center'}}><Tile e={store.e} bg={store.bg} size={42} photo={store.thumbnail || store.logo || store.cover} /><View style={{flex: 1}}><T weight="600">{store.n}</T><T cmsKeys={['lbl.chatActive','lbl.chatTitle']} size={12} color={th.mut}>{chatActivated ? label('lbl.chatActive', 'Chat with the store') : label('lbl.chatTitle', 'Message store')}</T></View><Badge cmsKey={"lbl.accountAuto1AABD31"} label={label("lbl.accountAuto1AABD31", "Goodies")} /></Row></View></Card></View> : null}
      {problem ? <View style={{marginHorizontal: 16, marginBottom: 8}}><Card style={{borderColor: th.red}}><T size={13} color={th.red}>{problem}</T><Pressable onPress={() => {setProblem(''); setLoading(true); setConversationId(''); setAttempt(v => v + 1);}}><T cmsKey={'lbl.chatTryAgain'} size={13} weight="600" color={th.br} style={{marginTop: 8}}>{label('lbl.chatTryAgain', 'Try again')}</T></Pressable></Card></View> : null}
      {loading ? <View style={{padding: 24, alignItems: 'center'}}><T cmsKey={'lbl.chatOpening'} color={th.mut}>{label('lbl.chatOpening', 'Opening conversation…')}</T></View> : <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={listRef} style={{flex: 1}} contentContainerStyle={{paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexGrow: 1, justifyContent: chatActivated && messages.length ? 'flex-end' : 'flex-start'}} keyboardShouldPersistTaps="handled" onContentSizeChange={() => listRef.current?.scrollToEnd({animated: true})}>
          {chatActivated ? messages.map(m => {const mine = m.sender_id === userId; return <View key={m.id} style={{maxWidth: '82%', alignSelf: mine ? 'flex-end' : 'flex-start', backgroundColor: mine ? th.br : th.soft, borderRadius: 16, paddingHorizontal: 13, paddingVertical: 10}}><T size={14} color={mine ? '#FFFFFF' : th.ink}>{m.body}</T><T size={10} color={mine ? '#FFFFFF' : th.mut} style={{marginTop: 4}}>{new Date(m.created_at).toLocaleString()}</T></View>;}) : <View style={{paddingVertical: 16, gap: 10}}>
            <View style={{alignItems: 'center', padding: 18}}><Text style={{fontSize: 42}}>✉️</Text><T cmsKey={'lbl.chatContactStore'} weight="600" style={{marginTop: 6}}>{label('lbl.chatContactStore', 'Contact the store')}</T><T cmsKey={'lbl.chatFirstMessageHint'} size={13} color={th.mut} align="center" style={{marginTop: 5}}>{label('lbl.chatFirstMessageHint', 'Send your message below. Your messages are delivered to the store; the chat conversation will activate here when the store replies.')}</T></View>
            {customerMessages.length ? <Card><T cmsKey={'lbl.chatWaitingStore'} size={12.5} color={th.mut} style={{marginBottom:6}}>{label('lbl.chatWaitingStore', 'Waiting for the store to reply. The chat opens here as soon as they respond.')}</T><T cmsKey={'lbl.chatMessagesSent'} size={13} weight="600">{label('lbl.chatMessagesSent', 'Messages sent')}</T>{customerMessages.map(m => <View key={m.id} style={{paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: th.line}}><T size={13.5}>{m.body}</T><T size={10.5} color={th.mut} style={{marginTop: 3}}>{new Date(m.created_at).toLocaleString()}</T></View>)}</Card> : null}
          </View>}
        </ScrollView>
        <View style={{flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: th.line}}>
          <TextInput value={draft} onChangeText={setDraft} multiline placeholder={label('lbl.chatComposer', 'Write a message…')} placeholderTextColor={th.mut} style={{flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 10, color: th.ink, backgroundColor: th.soft, textAlignVertical: 'top'}} />
          <Pressable accessibilityRole="button" accessibilityLabel={label('lbl.chatSend', 'Send message')} disabled={!draft.trim() || !conversationId || sending} onPress={send} style={{height: 44, minWidth: 58, paddingHorizontal: 13, borderRadius: 14, backgroundColor: !draft.trim() || !conversationId || sending ? th.line : th.br, alignItems: 'center', justifyContent: 'center'}}><T cmsKey={'lbl.chatSend'} size={13} weight="600" color="#fff">{sending ? '…' : label('lbl.chatSend', 'Send')}</T></Pressable>
        </View>
      </KeyboardAvoidingView>}
    </View>
  );
}

function Contact({p}: {p: any}) {
  const th = useTheme(), storeId = p && p.storeContact ? String(p.storeId || '') : '', store = storeId ? STB[storeId] : null;
  const [topic, setTopic] = useState(p && p.o ? label("lbl.page.screens.Account.71a14bea90", "Order problem") : store ? label("lbl.page.screens.Account.f97e9da0e3", "Other") : label("lbl.page.screens.Account.f97e9da0e3", "Other"));
  const [oid, setOid] = useState(p && p.oid ? p.oid : '');
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const submit = async () => {
    const body = msg.trim();
    if (body.length < 10) {toast(label('lbl.accountMessageMinLength', 'Please write at least 10 characters')); return;}
    if (sending) return;
    setSending(true);
    try {
      let ticket = '';
      let conversationId = '';
      if (store) {
        const {data: auth, error: authError} = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!auth.user) throw new Error(label('lbl.contactErrSignInStore', 'Sign in to contact this store. Your message has not been sent.'));
        const {data: createdConversation, error: conversationError} = await supabase.rpc('goodies_start_store_conversation', {
          p_store_id: storeId,
          p_customer_name: S.pf.n || label('lbl.accountCustomerFallback', 'Customer'),
        });
        if (conversationError) throw conversationError;
        if (!createdConversation) throw new Error(label('lbl.contactErrNoVendor', 'We could not find the vendor account linked to this store. Your message has not been sent.'));
        conversationId = String(createdConversation);
        ticket = 'GS-' + conversationId.replace(/-/g, '').slice(0, 8).toUpperCase();
        const ticketBody = label("lbl.page.screens.Account.1a09f5e12f", "Support ticket ") + ticket + ' · ' + topic + (oid ? label("lbl.page.screens.Account.289cf25261", " · Order ") + oid : '') + '\n\n' + body;
        const {error: messageError} = await supabase.rpc('goodies_send_store_message', {p_conversation_id: conversationId, p_body: ticketBody});
        if (messageError) throw messageError;
      } else {
        const {data: auth, error: authError} = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!auth.user) throw new Error(label('lbl.contactErrSignInSupport', 'Sign in to contact support. Your ticket has not been created.'));
        const {data: created, error: ticketError} = await supabase.from('settings_support_requests').insert({
          user_id: auth.user.id,
          email: auth.user.email || '',
          subject: topic + (oid ? ' · Order ' + oid : ''),
          message: body,
        }).select('id,ticket_code').single();
        if (ticketError) throw ticketError;
        if (!created?.id || !created?.ticket_code) throw new Error(label('lbl.contactErrNotConfirmed', 'Support did not confirm the ticket. Please retry before leaving this screen.'));
        ticket = created.ticket_code;
      }
      if (!ticket) throw new Error(label('lbl.contactErrServerNotConfirmed', 'The server did not confirm your support ticket. Please retry.'));
      S.stack.pop();
      push('supdone', {ticket, storeId: store ? storeId : '', conversationId, topic, orderId: oid});
    } catch (e: any) {
      toast(friendlyError(e, label('lbl.accountSendMessageFailed', 'Could not send your message. Please try again.')));
    } finally {setSending(false);}
  };
  return (<View>
    <Bar title={store ? label('lbl.contactStoreTitle', 'Contact store') : label('lbl.contactSupportTitle', 'Contact support')} onBack={back} />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingHorizontal: 16, paddingBottom: 28}}>
      {store ? <Card style={{marginTop: 4, marginBottom: 8, overflow:'hidden', padding:0}}><View style={{padding:12}}><Row style={{gap:10,alignItems:'center'}}><Tile e={store.e} bg={store.bg} size={42} photo={store.thumbnail || store.logo || store.cover} /><View style={{flex:1}}><T weight="600">{store.n}</T><T cmsKey={"lbl.accountAuto11BPHFG"} size={12.5} color={th.mut}>{label("lbl.accountAuto11BPHFG", "Your message will be sent to this store.")}</T></View></Row></View></Card> : null}
      <T cmsKey={'lbl.accountSupportTopic'} size={13} weight="600" style={{marginTop: 6, marginBottom: 8}}>{label('lbl.accountSupportTopic', 'Topic')}</T>
      <Row style={{flexWrap: 'wrap', gap: 8}}>{supportTopics([]).map((x: string) => <Chip key={x} label={x} on={topic === x} onPress={() => setTopic(x)} />)}</Row>
      {!store ? <>
        <T cmsKey={'lbl.accountOptionalOrder'} size={13} weight="600" style={{marginTop: 14, marginBottom: 8}}>{label('lbl.accountOptionalOrder', 'Order (optional)')}</T>
        <Row style={{flexWrap: 'wrap', gap: 8}}><Chip cmsKey={'lbl.accountNone'} label={label('lbl.accountNone', 'None')} on={!oid} onPress={() => setOid('')} />{S.orders.map((o: any) => <Chip cmsKey={"lbl.cms.8d6fd57df49b"} key={o.id} label={o.id + ' · ' + (STB[o.sid]?.n || label("lbl.cms.8d6fd57df49b", "Store"))} on={oid === o.id} onPress={() => setOid(o.id)} />)}</Row>
      </> : null}
      <Input cmsKey={'lbl.accountMessage'} cmsPlaceholderKey={'lbl.accountSupportMessagePlaceholder'} label={label('lbl.accountMessage', 'Message')} value={msg} onChange={setMsg} placeholder={label('lbl.accountSupportMessagePlaceholder', 'Tell us what happened (at least 10 characters)')} multiline />
      <View style={{marginTop: 14}}><Cta cmsKeys={['lbl.contactSending','lbl.contactSend']} label={sending ? label('lbl.contactSending', 'Sending…') : label('lbl.contactSend', 'Send message')} disabled={sending} onPress={() => {void submit();}} /></View>
      <T cmsKeys={['lbl.contactStoreNote','lbl.contactSupportNote']} size={12} color={th.mut} style={{marginTop: 10}}>{store ? label('lbl.contactStoreNote', 'We’ll keep this ticket context with your store conversation. You can continue chatting when the store replies.') : label('lbl.contactSupportNote', 'Support messages are tracked with a ticket number.')}</T>
    </ScrollView>
  </View>);
}

export function Account({r, p,onOpenWallet}: {r: string; p: any;onOpenWallet?:()=>void}): any {
  const th = useTheme();
  switch (r) {
    case 'settings': return <Settings />;
    case 'profile': return <Profile />;
    case 'addresses': return <Addresses />;
    case 'payments': return <LivePayments onOpenWallet={onOpenWallet} />;
    case 'contact': return <Contact p={p} />;
    case 'storechat': return <StoreChat id={String(p || '')} />;
    case 'supdone': { const result = p && typeof p === 'object' ? p : {ticket: p}; const store = result.storeId ? STB[result.storeId] : null; return <View style={{padding: 16, paddingTop: 50, alignItems: 'center'}}><Text style={{fontSize: 64}}>💬</Text><T cmsKey={'lbl.accountSupportSentTitle'} size={22} weight="600" style={{marginTop: 10}}>{label('lbl.accountSupportSentTitle', 'Message sent')}</T><T cmsKeys={['lbl.accountStoreTicketSent','lbl.accountSupportTicketSent']} color={th.mut} align="center" style={{marginVertical: 8, marginBottom: 20}}>{store ? label('lbl.accountStoreTicketSent', 'Ticket {ticket} was sent to {store}. You can return to this conversation to see the store reply.').replace('{ticket}', String(result.ticket)).replace('{store}', store.n) : label('lbl.accountSupportTicketSent', 'Your support request {ticket} has been sent. Keep this reference if you contact us again.').replace('{ticket}', String(result.ticket))}</T><View style={{alignSelf: 'stretch'}}>{store ? <><Cta cmsKey={'lbl.accountOpenStoreConversation'} label={label('lbl.accountOpenStoreConversation', 'Open store conversation')} onPress={() => go('storechat', result.storeId)} /><View style={{height: 10}} /></> : null}<Cta cmsKey={'lbl.accountBackGoodies'} ghost label={label('lbl.accountBackGoodies', 'Back to Goodies')} onPress={() => tab('home')} /></View></View>; }
    case 'policies': return <View><Bar cmsKey={'lbl.profilePolicies'} title={label('lbl.profilePolicies', 'Terms and policies')} onBack={back} /><View style={{paddingHorizontal: 16}}>{Object.keys(POL).map(k => <LRow key={k} icon="help" title={label(POL_LABELS[k][0], POL[k][0])} onPress={() => go('policy', k)} />)}</View></View>;
    case 'policy': { const policy = POL[p]; const publishedText = policy ? legalDoc(policy[1]) : null; return policy ? <View><Bar cmsKey={POL_LABELS[p][0]} title={label(POL_LABELS[p][0], policy[0])} onBack={back} /><View style={{paddingHorizontal: 16}}>{publishedText ? <Card><T size={14.5} style={{lineHeight: 23}}>{publishedText}</T></Card> : <Card><T cmsKey={'lbl.legalUnavailableTitle'} weight="600">{label('lbl.legalUnavailableTitle', 'This policy is not available yet')}</T><T cmsKey={'lbl.legalUnavailableBody'} size={13} color={th.mut} style={{lineHeight: 21, marginTop: 6}}>{label('lbl.legalUnavailableBody', 'An approved, published version of this policy is not currently available. Please check back later or contact support if you need help.')}</T></Card>}</View></View> : <View><Bar cmsKey={'lbl.legalPolicyTitle'} title={label('lbl.legalPolicyTitle', 'Policy')} onBack={back} /><Empty emoji="📄" title={label('lbl.accountPageNotFound', 'Page not found')} button={label('lbl.accountBack', 'Back')} onPress={() => tab('home')} /></View>; }
    case 'ndetail': { const n = S.notifs.filter((x: any) => x.id == p)[0]; return n ? <View><Bar cmsKey={'lbl.accountNotificationTitle'} title={label('lbl.accountNotificationTitle', 'Notification')} onBack={back} /><View style={{paddingHorizontal: 16}}><Card><T size={17} weight="600">{n.t}</T><T color={th.mut} style={{marginTop: 8, lineHeight: 21}}>{n.d}</T></Card><Cta cmsKeys={['lbl.accountViewOrder','lbl.accountSeeDetails']} label={n.r === 'track' ? label('lbl.accountViewOrder', 'View order') : label('lbl.accountSeeDetails', 'See details')} onPress={() => (n.r === 'track' ? go('track', n.p) : n.r === 'promos' ? go('promos') : go('catlist', n.p || 'all'))} /></View></View> : <View><Bar cmsKey={'lbl.accountNotificationTitle'} title={label('lbl.accountNotificationTitle', 'Notification')} onBack={back} /><Empty emoji="🔔" title={label('lbl.accountNotificationNotFound', 'Notification not found')} button={label('lbl.accountBackGoodies', 'Back to Goodies')} onPress={() => tab('home')} /></View>; }
    default: return <Home />;
  }
}