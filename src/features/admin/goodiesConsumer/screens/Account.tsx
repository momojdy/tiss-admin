/* Account screens: settings, profile, addresses, payments, policies, support. Ported from v24. */
import React, {useState, useEffect, useRef} from 'react';
import {View, Text, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform} from 'react-native';
import {Icon} from '../components/Icon';
import {T, Bar, Cta, Card, Row, Badge, Ttl, Empty, Switch, Input, Chip, useTheme, Tile} from '../components/ui';
import {S, defAddr, money, emit, save, toast, ui, push, reset, resetDemo, STB, previewOnly, zoneOf} from '../store';
import {back, go, tab, togglePref} from '../actions';
import {setTheme} from '../store';
import {t as tr} from '../i18n';
import {providerInfo} from '../providers';
import {Home} from './Browse';
import {LivePayments} from './Payments';
import {supabase} from '../../lib/supabase';
import {legalDoc, supportTopics} from '../content';

const POL: Record<string, [string, string]> = {
  terms: ['Terms of use', 'These are placeholder terms for the Goodies prototype. By using Goodies you agree to order responsibly and provide accurate delivery details. Final legal text will replace this page.'],
  privacy: ['Privacy policy', 'Placeholder policy. In this prototype your data is stored only on this device. In the real app, your Wantiss account data and Goodies orders will be handled under the final privacy policy.'],
  refund: ['Refund and cancellation policy', 'Placeholder policy. Orders can be cancelled until the store finishes preparing them. Wallet payments are refunded to your wallet. Final rules will be published before launch.'],
};

const LRow = ({icon, title, sub, onPress, right}: {icon: string; title: string; sub?: string; onPress: () => void; right?: any}) => {
  const th = useTheme();
  return (
    <Pressable onPress={onPress} style={{flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: th.line}}>
      <View style={{width: 38, height: 38, borderRadius: 12, backgroundColor: th.soft, alignItems: 'center', justifyContent: 'center'}}><Icon name={icon} size={19} color={th.ink} /></View>
      <View style={{flex: 1}}><T size={14.5} weight="700">{title}</T>{sub ? <T size={12.5} color={th.mut}>{sub}</T> : null}</View>
      {right || <Icon name="chevR" size={16} color={th.ink} />}
    </Pressable>
  );
};
const Avatar = ({z}: {z: number}) => {const th = useTheme(); return <View style={{width: z, height: z, borderRadius: z / 2, backgroundColor: th.br, alignItems: 'center', justifyContent: 'center'}}><T size={Math.round(z * 0.45)} weight="800" color="#fff">{S.pf.av || String(S.pf.n).charAt(0).toUpperCase()}</T></View>;};

function Settings() {
  const th = useTheme(), d = S.theme === 'dark', defaultAddress = defAddr();
  return (<View>
    <Bar title={tr('settings')} onBack={back} />
    <View style={{paddingHorizontal: 16}}>
      <Pressable onPress={() => go('profile')}><Card><Row><Avatar z={48} /><View style={{flex: 1}}><T weight="700">{S.pf.n}</T><T size={13} color={th.mut}>Wantiss account · view profile</T></View><Icon name="chevR" size={16} color={th.ink} /></Row></Card></Pressable>
      <Ttl>Notifications</Ttl>
      <Row sp style={{paddingVertical: 8, paddingHorizontal: 4}}><T>Order updates</T><Switch on={!!S.np.orders} label="Order updates" onPress={() => togglePref('orders')} /></Row>
      <Row sp style={{paddingVertical: 8, paddingHorizontal: 4}}><T>Offers and deals</T><Switch on={!!S.np.promos} label="Offers and deals" onPress={() => togglePref('promos')} /></Row>
      <Ttl>Account</Ttl>
      <LRow icon="pin" title="Saved addresses" sub={(defaultAddress?.t || 'No saved address') + (defaultAddress?.t ? ' · Wantiss default' : '')} onPress={() => go('addresses')} />
      <LRow icon="wallet" title="Wallet and payment methods" sub={'Balance ' + money(S.wallet)} onPress={() => go('payments')} />
      <LRow icon="heart" title="Favorites" sub={S.fav.length + S.favp.length + ' saved'} onPress={() => go('favs')} />
      <LRow icon="tag" title="Coupons and offers" onPress={() => go('promos')} />

      <LRow icon="moon" title="Dark mode" sub="Goodies only. Other Wantiss features keep their theme." onPress={() => setTheme(d ? 'light' : 'dark')} right={<Switch on={d} label="Dark mode" onPress={() => setTheme(d ? 'light' : 'dark')} />} />
      <LRow icon="help" title="Help center" sub="FAQs and support" onPress={() => go('help')} />
      {providerInfo.demo ? (<><Ttl>Demo</Ttl><LRow icon="tag" title="Import Admin content" sub="Paste the export from Wantiss Admin" onPress={() => ui.sheet({kind: 'import'})} /><LRow icon="user" title="Reset Goodies demo data" sub="Clears orders, cart and checkout numbers" onPress={() => {resetDemo(); toast('Demo data reset');}} /></>) : null}
      <T size={12} color={th.mut} align="center" style={{marginTop: 18}}>Goodies {providerInfo.demo ? '(demo)' : ''}</T>
    </View>
  </View>);
}

function Profile() {
  const th = useTheme(), p = S.pf;
  return (<View>
    <Bar title="Profile" onBack={back} />
    <View style={{paddingHorizontal: 16}}>
      <Card style={{alignItems: 'center'}}><Avatar z={76} /><T size={17} weight="800" style={{marginTop: 10}}>{p.n}</T><T size={13.5} color={th.mut} align="center" style={{lineHeight: 22}}>{p.e}{'\n'}{p.ph}</T><View style={{marginTop: 8}}><Badge label="Shared Wantiss account" /></View></Card>
      <LRow icon="bag" title="Order history" sub={S.orders.length + ' orders'} onPress={() => tab('orders')} />
      <LRow icon="heart" title="Favorites" onPress={() => go('favs')} />
      <LRow icon="wallet" title="Wallet and payments" onPress={() => go('payments')} />
      <LRow icon="bell" title="Notification preferences" onPress={() => go('settings')} />
      <LRow icon="help" title="Help and support" onPress={() => go('help')} />
      <LRow icon="tag" title="Terms and policies" onPress={() => go('policies')} />
    </View>
  </View>);
}

function Addresses() {
  const th = useTheme(), [edit, setEdit] = useState<any>(null);
  const saveAddr = () => {
    if (previewOnly) { toast('Address changes are disabled in the admin preview.'); return; }
    const t = (edit.t || '').trim(); if (t.length < 4) {toast('Enter the street and area'); return;}
    let a = S.addr.filter((x: any) => x.id === edit.id)[0]; const isNew = !a;
    if (isNew) {a = {id: Date.now(), def: 0}; S.addr.push(a);}
    if (isNew || a.t !== t) a.z = zoneOf(t);
    a.l = edit.l; a.cc = edit.cc || 'HT'; a.t = t; a.apt = (edit.apt || '').trim(); a.inst = (edit.inst || '').trim();
    if (edit.def && !a.def) {S.addr.forEach((x: any) => (x.def = 0)); a.def = 1;}
    if (isNew) S.as = a.id; setEdit(null); toast(isNew ? 'Address saved to your Wantiss account' : 'Address updated'); save(); emit();
  };
  return (<View>
    <Bar title="Saved addresses" onBack={back} />
    <View style={{paddingHorizontal: 16}}>
      <T size={13} color={th.mut} style={{marginBottom: 12, lineHeight: 19}}>These belong to your Wantiss account. Picking one for Goodies does not change your Wantiss default.</T>
      {S.addr.map((a: any) => (
        <Card key={a.id}>
          <Row sp style={{flexWrap: 'wrap'}}><T weight="700">{a.l}</T><Row style={{gap: 6}}>{a.def ? <Badge green label="Wantiss default" /> : null}{a.id === S.as ? <Badge label="Delivering here" /> : null}</Row></Row>
          <T size={14} style={{marginTop: 6}}>{a.t}{a.apt ? ', ' + a.apt : ''}</T>{a.inst ? <T size={12.5} color={th.mut}>Note: {a.inst}</T> : null}
          <Row style={{marginTop: 10, gap: 14, flexWrap: 'wrap'}}>
            <Pressable onPress={() => setEdit({...a})}><T size={13.5} weight="700" color={th.br}>Edit</T></Pressable>
            {a.id !== S.as ? <Pressable onPress={() => {S.as = a.id; toast('Goodies will deliver to ' + a.l); save(); emit();}}><T size={13.5} weight="700" color={th.br}>Use for Goodies</T></Pressable> : null}
            {!a.def ? <Pressable onPress={() => {S.addr.forEach((x: any) => (x.def = x.id === a.id ? 1 : 0)); toast('Wantiss default address updated'); save(); emit();}}><T size={13.5} weight="700" color={th.br}>Set as Wantiss default</T></Pressable> : null}
            {S.addr.length > 1 ? <Pressable onPress={() => {S.addr = S.addr.filter((x: any) => x.id !== a.id); if (a.def) S.addr[0].def = 1; if (S.as === a.id) S.as = defAddr().id; toast('Address deleted'); save(); emit();}}><T size={13.5} weight="700" color={th.red}>Delete</T></Pressable> : <></>}
          </Row>
        </Card>
      ))}
      {edit ? (
        <Card>
          <T size={17} weight="800">{edit.id ? 'Edit' : 'New'} address</T>
          <Row style={{marginTop: 10, gap: 8}}>{['Home', 'Work', 'Other'].map(x => <Chip key={x} label={x} on={edit.l === x} onPress={() => setEdit({...edit, l: x})} />)}</Row>
          <Input label="Street and area" value={edit.t || ''} onChange={v => setEdit({...edit, t: v})} />
          <Input label="Apartment, building, floor or landmark" value={edit.apt || ''} onChange={v => setEdit({...edit, apt: v})} />
          <Input label="Delivery instructions" value={edit.inst || ''} onChange={v => setEdit({...edit, inst: v})} />
          <T size={13} weight="700" style={{marginTop: 10, marginBottom: 6}}>Country</T>
          <Row style={{gap: 8}}>{[['HT', 'Haiti'], ['DO', 'Dominican Republic'], ['US', 'United States'], ['XX', 'Other']].map(x => <Chip key={x[0]} label={x[1]} on={(edit.cc || 'HT') === x[0]} onPress={() => setEdit({...edit, cc: x[0]})} />)}</Row>
          <Pressable disabled={!!edit.def && !!edit.id} onPress={() => setEdit({...edit, def: edit.def ? 0 : 1})} style={{flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14}}><View style={{width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: th.br, backgroundColor: edit.def ? th.br : 'transparent'}} /><T>{edit.def && edit.id ? 'This is your Wantiss default address' : 'Make this my default Wantiss address'}</T></Pressable>
          <View style={{marginTop: 14}}><Cta label="Save address" onPress={saveAddr} /></View>
        </Card>
      ) : <Cta label="+ Add new address" onPress={() => setEdit({id: 0, l: 'Home', t: '', apt: '', inst: '', def: 0, cc: 'HT'})} />}
    </View>
  </View>);
}

function StoreChat({id}: {id: string}) {
  const th = useTheme(), store = STB[id], listRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const [userId, setUserId] = useState(''), [conversationId, setConversationId] = useState(''), [messages, setMessages] = useState<any[]>([]);
  const [draft, setDraft] = useState(''), [loading, setLoading] = useState(true), [sending, setSending] = useState(false), [problem, setProblem] = useState(''), [attempt, setAttempt] = useState(0);
  const loadMessages = async (cid: string) => {
    const {data, error} = await supabase.from('messages').select('id,sender_id,body,created_at').eq('conversation_id', cid).order('created_at', {ascending: true});
    if (error) throw error;
    setMessages(data || []);
  };
  useEffect(() => {
    let active = true;
    if (previewOnly) { setProblem('Messaging is disabled in the admin preview.'); setLoading(false); return () => { active = false; }; }
    (async () => {
      try {
        const {data: auth, error: authError} = await supabase.auth.getUser();
        if (authError) throw authError;
        const user = auth.user;
        if (!user) throw new Error('Sign in to message this store. Your conversation will appear here after you sign in.');
        if (!active) return;
        setUserId(user.id);
        const {data: mapping, error: mappingError} = await supabase.from('goodies_store_schedules').select('business_id').eq('store_id', id).maybeSingle();
        if (mappingError) throw mappingError;
        if (!mapping?.business_id) throw new Error('We could not find the vendor account linked to this store. Please try again later.');
        const {data: found, error: findError} = await supabase.from('conversations').select('id').eq('business_id', mapping.business_id).eq('feature', 'goodies').eq('ref_id', id).eq('customer_id', user.id).limit(1).maybeSingle();
        if (findError) throw findError;
        let cid = found?.id;
        if (!cid) {
          const {data: created, error: createError} = await supabase.from('conversations').insert({business_id: mapping.business_id, participant_ids: [user.id], customer_id: user.id, customer_name: S.pf.n || 'Customer', feature: 'goodies', ref_id: id, ref_label: store?.n || 'Goodies store', title: store?.n || 'Goodies store', last_body: '', unread_business: 0, unread_customer: 0}).select('id').single();
          if (createError) throw createError;
          cid = created.id;
        }
        if (!active) return;
        setConversationId(cid);
        await loadMessages(cid);
      } catch (e: any) { if (active) setProblem(e?.message || 'Could not open this store conversation.'); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [id, attempt]);
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase.channel('goodies-store-chat-' + conversationId).on('postgres_changes', {event: '*', schema: 'public', table: 'messages', filter: 'conversation_id=eq.' + conversationId}, () => { loadMessages(conversationId).catch(e => setProblem(e?.message || 'Could not refresh messages.')); }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [conversationId]);
  const send = async () => {
    if (previewOnly) { toast('Messaging is disabled in the admin preview.'); return; }
    const body = draft.trim(); if (!body || !conversationId || !userId || sending) return;
    setSending(true);
    try {
      const {error} = await supabase.from('messages').insert({conversation_id: conversationId, sender_id: userId, body});
      if (error) throw error;
      const {error: threadError} = await supabase.from('conversations').update({last_body: body, updated_at: new Date().toISOString(), unread_business: 1}).eq('id', conversationId);
      if (threadError) throw threadError;
      setDraft('');
      await loadMessages(conversationId);
    } catch (e: any) { setProblem(e?.message || 'Message could not be sent.'); }
    finally { setSending(false); }
  };
  const chatActivated = messages.some(m => m.sender_id !== userId);
  const customerMessages = messages.filter(m => m.sender_id === userId);
  return (
    <View style={{flex: 1, minHeight: 430}}>
      <Bar title={store ? store.n : 'Contact store'} onBack={back} />
      {store ? <View style={{paddingHorizontal: 16, paddingBottom: 10}}><Card><Row style={{gap: 10, alignItems: 'center'}}><Tile e={store.e} bg={store.bg} size={42} /><View style={{flex: 1}}><T weight="800">{store.n}</T><T size={12} color={th.mut}>{chatActivated ? 'Chat with the store' : 'Message the store'}</T></View><Badge label="Goodies" /></Row></Card></View> : null}
      {problem ? <View style={{marginHorizontal: 16, marginBottom: 8}}><Card style={{borderColor: th.red}}><T size={13} color={th.red}>{problem}</T><Pressable onPress={() => {setProblem(''); setLoading(true); setConversationId(''); setAttempt(v => v + 1);}}><T size={13} weight="800" color={th.br} style={{marginTop: 8}}>Try again</T></Pressable></Card></View> : null}
      {loading ? <View style={{padding: 24, alignItems: 'center'}}><T color={th.mut}>Opening conversation…</T></View> : <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={listRef} style={{flex: 1}} contentContainerStyle={{paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexGrow: 1, justifyContent: chatActivated && messages.length ? 'flex-end' : 'flex-start'}} keyboardShouldPersistTaps="handled" onContentSizeChange={() => listRef.current?.scrollToEnd({animated: true})}>
          {chatActivated ? messages.map(m => {const mine = m.sender_id === userId; return <View key={m.id} style={{maxWidth: '82%', alignSelf: mine ? 'flex-end' : 'flex-start', backgroundColor: mine ? th.br : th.soft, borderRadius: 16, paddingHorizontal: 13, paddingVertical: 10}}><T size={14} color={mine ? '#FFFFFF' : th.ink}>{m.body}</T><T size={10} color={mine ? '#FFFFFF' : th.mut} style={{marginTop: 4}}>{new Date(m.created_at).toLocaleString()}</T></View>;}) : <View style={{paddingVertical: 16, gap: 10}}>
            <View style={{alignItems: 'center', padding: 18}}><Icon name="mail" size={38} color={th.ink} /><T weight="800" style={{marginTop: 6}}>Contact the store</T><T size={13} color={th.mut} align="center" style={{marginTop: 5}}>Send your message below. Your messages are delivered to the store; the chat conversation will activate here when the store replies.</T></View>
            {customerMessages.length ? <Card><T size={13} weight="800">Messages sent</T>{customerMessages.map(m => <View key={m.id} style={{paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: th.line}}><T size={13.5}>{m.body}</T><T size={10.5} color={th.mut} style={{marginTop: 3}}>{new Date(m.created_at).toLocaleString()}</T></View>)}</Card> : null}
          </View>}
        </ScrollView>
        <View style={{flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: th.line}}>
          <TextInput value={draft} onChangeText={setDraft} multiline placeholder="Write a message…" placeholderTextColor={th.mut} style={{flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 10, color: th.ink, backgroundColor: th.soft, textAlignVertical: 'top'}} />
          <Pressable accessibilityRole="button" accessibilityLabel="Send message" disabled={!draft.trim() || !conversationId || sending} onPress={send} style={{height: 44, minWidth: 58, paddingHorizontal: 13, borderRadius: 14, backgroundColor: !draft.trim() || !conversationId || sending ? th.line : th.br, alignItems: 'center', justifyContent: 'center'}}><T size={13} weight="800" color="#fff">{sending ? '…' : 'Send'}</T></Pressable>
        </View>
      </KeyboardAvoidingView>}
    </View>
  );
}

function Contact({p}: {p: any}) {
  const th = useTheme(), storeId = p && p.storeContact ? String(p.storeId || '') : '', store = storeId ? STB[storeId] : null;
  const [topic, setTopic] = useState(p && p.o ? 'Order problem' : store ? 'Other' : 'Other');
  const [oid, setOid] = useState(p && p.oid ? p.oid : '');
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const submit = async () => {
    if (previewOnly) { toast('Support messages are disabled in the admin preview.'); return; }
    const body = msg.trim();
    if (body.length < 10) {toast('Please write at least 10 characters'); return;}
    if (sending) return;
    setSending(true);
    try {
      let ticket = 'GS-' + Math.floor(1000 + Math.random() * 9000);
      let conversationId = '';
      if (store) {
        const {data: auth, error: authError} = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!auth.user) throw new Error('Sign in to contact this store. Your message has not been sent.');
        const {data: mapping, error: mappingError} = await supabase.from('goodies_store_schedules').select('business_id').eq('store_id', storeId).maybeSingle();
        if (mappingError) throw mappingError;
        if (!mapping?.business_id) throw new Error('We could not find the vendor account linked to this store. Your message has not been sent.');
        const {data: found, error: findError} = await supabase.from('conversations').select('id').eq('business_id', mapping.business_id).eq('feature', 'goodies').eq('ref_id', storeId).eq('customer_id', auth.user.id).limit(1).maybeSingle();
        if (findError) throw findError;
        conversationId = found?.id || '';
        if (!conversationId) {
          const {data: created, error: createError} = await supabase.from('conversations').insert({
            business_id: mapping.business_id, participant_ids: [auth.user.id], customer_id: auth.user.id,
            customer_name: S.pf.n || 'Customer', feature: 'goodies', ref_id: storeId,
            ref_label: store.n, title: store.n, last_body: '', unread_business: 0, unread_customer: 0
          }).select('id').single();
          if (createError) throw createError;
          conversationId = created.id;
        }
        const ticketBody = 'Support ticket ' + ticket + ' · ' + topic + (oid ? ' · Order ' + oid : '') + '\n\n' + body;
        const {error: messageError} = await supabase.from('messages').insert({conversation_id: conversationId, sender_id: auth.user.id, body: ticketBody});
        if (messageError) throw messageError;
        const {error: threadError} = await supabase.from('conversations').update({last_body: ticketBody, updated_at: new Date().toISOString(), unread_business: 1}).eq('id', conversationId);
        if (threadError) throw threadError;
      }
      S.stack.pop();
      push('supdone', {ticket, storeId: store ? storeId : '', conversationId, topic, orderId: oid});
    } catch (e: any) {
      toast(e?.message || 'Could not send your message. Please try again.');
    } finally {setSending(false);}
  };
  return (<View>
    <Bar title={store ? 'Contact store' : 'Contact support'} onBack={back} />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingHorizontal: 16, paddingBottom: 28}}>
      {store ? <Card style={{marginTop: 4, marginBottom: 8}}><Row style={{gap: 10, alignItems: 'center'}}><Tile e={store.e} bg={store.bg} size={42} /><View style={{flex: 1}}><T weight="800">{store.n}</T><T size={12.5} color={th.mut}>Your message will be sent to this store.</T></View></Row></Card> : null}
      <T size={13} weight="700" style={{marginTop: 6, marginBottom: 8}}>Topic</T>
      <Row style={{flexWrap: 'wrap', gap: 8}}>{supportTopics(['Order problem', 'Payment', 'Account', 'Other']).map((x: string) => <Chip key={x} label={x} on={topic === x} onPress={() => setTopic(x)} />)}</Row>
      {!store ? <>
        <T size={13} weight="700" style={{marginTop: 14, marginBottom: 8}}>Order (optional)</T>
        <Row style={{flexWrap: 'wrap', gap: 8}}><Chip label="None" on={!oid} onPress={() => setOid('')} />{S.orders.map((o: any) => <Chip key={o.id} label={o.id + ' · ' + (STB[o.sid]?.n || 'Store')} on={oid === o.id} onPress={() => setOid(o.id)} />)}</Row>
      </> : null}
      <Input label="Message" value={msg} onChange={setMsg} placeholder="Tell us what happened (at least 10 characters)" multiline />
      <View style={{marginTop: 14}}><Cta label={sending ? 'Sending…' : 'Send message'} disabled={sending} onPress={() => {void submit();}} /></View>
      <T size={12} color={th.mut} style={{marginTop: 10}}>{store ? 'We’ll keep this ticket context with your store conversation. You can continue chatting when the store replies.' : 'Support messages are tracked with a ticket number.'}</T>
    </ScrollView>
  </View>);
}

export function Account({r, p}: {r: string; p: any}): any {
  const th = useTheme();
  switch (r) {
    case 'settings': return <Settings />;
    case 'profile': return <Profile />;
    case 'addresses': return <Addresses />;
    case 'payments': return <LivePayments />;
    case 'contact': return <Contact p={p} />;
    case 'storechat': return <StoreChat id={String(p || '')} />;
    case 'supdone': { const result = p && typeof p === 'object' ? p : {ticket: p}; const store = result.storeId ? STB[result.storeId] : null; return <View style={{padding: 16, paddingTop: 50, alignItems: 'center'}}><Icon name="message" size={54} color={th.br} /><T size={22} weight="800" style={{marginTop: 10}}>Message sent</T><T color={th.mut} align="center" style={{marginVertical: 8, marginBottom: 20}}>{store ? 'Ticket ' + result.ticket + ' was sent to ' + store.n + '. You can return to this conversation to see the store reply.' : 'Ticket ' + result.ticket + ' (demo). Your support request is not connected to a live support inbox yet.'}</T><View style={{alignSelf: 'stretch'}}>{store ? <><Cta label="Open store conversation" onPress={() => go('storechat', result.storeId)} /><View style={{height: 10}} /></> : null}<Cta ghost label="Back to Goodies" onPress={() => tab('home')} /></View></View>; }
    case 'policies': return <View><Bar title="Terms and policies" onBack={back} /><View style={{paddingHorizontal: 16}}>{Object.keys(POL).map(k => <LRow key={k} icon="help" title={POL[k][0]} onPress={() => go('policy', k)} />)}</View></View>;
    case 'policy': return POL[p] ? <View><Bar title={POL[p][0]} onBack={back} /><View style={{paddingHorizontal: 16}}><Card><T size={14.5} style={{lineHeight: 23}}>{legalDoc(({terms: 'legal.terms', privacy: 'legal.privacy', refund: 'legal.refund'} as any)[p]) || POL[p][1]}</T></Card></View></View> : <View><Bar title="Policy" onBack={back} /><Empty emoji="document" title="Page not found" button="Back" onPress={() => tab('home')} /></View>;
    case 'ndetail': { const n = S.notifs.filter((x: any) => x.id == p)[0]; return n ? <View><Bar title="Notification" onBack={back} /><View style={{paddingHorizontal: 16}}><Card><T size={17} weight="800">{n.t}</T><T color={th.mut} style={{marginTop: 8, lineHeight: 21}}>{n.d}</T></Card><Cta label={n.r === 'track' ? 'View order' : 'See details'} onPress={() => (n.r === 'track' ? go('track', n.p) : n.r === 'promos' ? go('promos') : go('catlist', n.p || 'all'))} /></View></View> : <View><Bar title="Notification" onBack={back} /><Empty emoji="notification" title="Notification not found" button="Back to Goodies" onPress={() => tab('home')} /></View>; }
    default: return <Home />;
  }
}