/* Wantiss Wallet and saved cards for Goodies (live data).
   The shell (GoodiesApp) already scrolls every route except byo and storechat, so this screen must not add its own ScrollView. */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {View, Pressable, Text} from 'react-native';
import {Icon} from '../components/Icon';
import {T, Bar, Cta, Card, Row, Badge, Ttl, useTheme} from '../components/ui';
import {S, money, emit, save, toast, previewOnly} from '../store';
import {back, createWallet} from '../actions';
import {supabase} from '../../lib/supabase';

type LoadState = 'loading' | 'ready' | 'error' | 'signedout';

/* Same shape as refreshPaymentOptions() in actions.ts, which checkout reads (id, b, l4, expiryMonth, expiryYear, isDefault). */
const normalizeCard = (c: any) => ({
  id: String(c.id),
  b: String(c.brand || 'Card'),
  l4: String(c.last4 || ''),
  expiryMonth: c.expiry_month,
  expiryYear: c.expiry_year,
  isDefault: !!c.is_default,
});
const expLabel = (c: any) => (c.expiryMonth && c.expiryYear ? String(c.expiryMonth).padStart(2, '0') + '/' + String(c.expiryYear).slice(-2) : '');

function Skeleton({h, w}: {h: number; w?: number | string}) {
  const th = useTheme();
  return <View style={{height: h, width: (w ?? '100%') as any, borderRadius: 14, backgroundColor: th.soft, marginBottom: 12}} />;
}

export function LivePayments() {
  const th = useTheme();
  const [state, setState] = useState<LoadState>('loading');
  const [problem, setProblem] = useState('');
  const [busyId, setBusyId] = useState('');
  const [creating, setCreating] = useState(false);
  const [confirmId, setConfirmId] = useState('');
  const mounted = useRef(true);
  const loaded = useRef(false); /* true once data has been shown, so later refreshes stay silent */
  const busyRef = useRef(false); /* blocks a second tap before React re-renders */

  useEffect(() => {
    mounted.current = true;
    return () => {mounted.current = false;};
  }, []);

  const load = useCallback(async () => {
    if (previewOnly) { setState('signedout'); return; }
    if (!loaded.current) setState('loading');
    try {
      const {data: auth, error: authError} = await supabase.auth.getUser();
      /* With no session, supabase-js v2 returns AuthSessionMissingError instead of user: null. That means signed out, not a failure. */
      if (authError && authError.name !== 'AuthSessionMissingError') throw authError;
      if (!mounted.current) return;
      if (!auth?.user) {loaded.current = false; setState('signedout'); return;}
      const [wallet, methods] = await Promise.all([
        supabase.from('wallets').select('id,balance').eq('user_id', auth.user.id).maybeSingle(),
        supabase.rpc('get_my_payment_methods'),
      ]);
      if (wallet.error) throw wallet.error;
      if (methods.error) throw methods.error;
      if (!mounted.current) return;
      S.hasWallet = !!wallet.data?.id;
      S.wallet = Number(wallet.data?.balance || 0);
      S.cards = (methods.data || []).map(normalizeCard);
      if (!S.cards.some((c: any) => c.id === S.selectedCardId)) S.selectedCardId = (S.cards.find((c: any) => c.isDefault) || S.cards[0])?.id || '';
      save(); emit();
      loaded.current = true; setProblem(''); setState('ready');
    } catch (e: any) {
      if (!mounted.current) return;
      const msg = e?.message || 'Could not load your wallet and cards.';
      if (loaded.current) {toast(msg); return;} /* keep showing the last good data */
      setProblem(msg); setState('error');
    }
  }, []);

  useEffect(() => {void load();}, [load]);

  /* Both card RPCs return a boolean. false means nothing changed, with no error. */
  const act = async (id: string, call: () => PromiseLike<{data: any; error: any}>, okMsg: string, failMsg: string) => {
    if (previewOnly) { toast('Payment-method changes are disabled in the admin preview.'); return; }
    if (busyRef.current) return;
    busyRef.current = true; setBusyId(id); setConfirmId('');
    let ok = false;
    try {
      const {data, error} = await call();
      if (error || data === false) toast(error?.message || failMsg);
      else {toast(okMsg); ok = true;}
    } catch (e: any) {
      toast(e?.message || failMsg);
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusyId('');
    }
    if (ok && mounted.current) await load();
  };
  const makeDefault = (id: string) => {
    void act(id, () => supabase.rpc('set_default_payment_method', {p_payment_method_id: id}), 'Default card updated', 'Could not change your default card.');
  };
  const removeCard = (id: string) => {
    if (busyRef.current) return;
    if (confirmId !== id) {setConfirmId(id); return;}
    void act(id, () => supabase.rpc('delete_payment_method', {p_payment_method_id: id}), 'Card removed', 'Could not remove this card.');
  };
  const makeWallet = async () => {
    if (previewOnly) { toast('Wallet changes are disabled in the admin preview.'); return; }
    if (creating) return;
    setCreating(true);
    try {await createWallet();} finally {if (mounted.current) setCreating(false);}
    if (mounted.current) await load();
  };

  if (state === 'loading') {
    return (<View>
      <Bar title="Wallet and payments" onBack={back} />
      <View style={{paddingHorizontal: 16}}>
        <Skeleton h={120} /><Skeleton h={20} w={110} /><Skeleton h={64} /><Skeleton h={64} />
      </View>
    </View>);
  }
  if (state === 'signedout') {
    return (<View>
      <Bar title="Wallet and payments" onBack={back} />
      <View style={{padding: 16, paddingTop: 40, alignItems: 'center'}}>
        <Icon name="lock" size={46} color={th.ink} />
        <T size={18} weight="800" style={{marginTop: 8}}>Sign in to see your wallet</T>
        <T size={13.5} color={th.mut} align="center" style={{marginVertical: 8, marginBottom: 18}}>Your Wantiss wallet and saved cards are tied to your account.</T>
        <View style={{alignSelf: 'stretch'}}><Cta ghost label="Back" onPress={back} /></View>
      </View>
    </View>);
  }
  if (state === 'error') {
    return (<View>
      <Bar title="Wallet and payments" onBack={back} />
      <View style={{paddingHorizontal: 16}}>
        <Card style={{borderColor: th.red}}>
          <T weight="800">We couldn’t load your payment details</T>
          <T size={13} color={th.red} style={{marginTop: 4}}>{problem}</T>
          <View style={{marginTop: 12}}><Cta small label="Try again" onPress={() => {void load();}} /></View>
        </Card>
      </View>
    </View>);
  }

  return (<View>
    <Bar title="Wallet and payments" onBack={back} />
    <View style={{paddingHorizontal: 16}}>
      {S.hasWallet ? (
        <View style={{borderRadius: 18, padding: 14, backgroundColor: th.br, marginBottom: 12}}>
          <T size={13} color="#fff" style={{opacity: 0.9}}>Wantiss Wallet</T>
          <T size={34} weight="800" color="#fff" style={{marginTop: 4, marginBottom: 14}}>{money(S.wallet)}</T>
          <Pressable accessibilityRole="button" onPress={() => toast('Wallet top-up is not available yet.')} style={{height: 44, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center'}}><T size={15} weight="800" color={th.brd}>Top up (coming soon)</T></Pressable>
        </View>
      ) : (
        <Card>
          <Row style={{gap: 10}}><Icon name="walletEmpty" size={28} color={th.ink} /><View style={{flex: 1}}><T weight="800">No Wantiss wallet found</T></View></Row>
          <T size={13} color={th.mut} style={{marginVertical: 6, lineHeight: 19}}>You haven’t created a wallet, or it was deleted. Create one to pay with it and to receive refunds. Your balance starts at {money(0)}.</T>
          <Cta small label={creating ? 'Creating…' : 'Create wallet'} disabled={creating} onPress={() => {void makeWallet();}} />
        </Card>
      )}

      <Ttl>Saved cards</Ttl>
      {S.cards.length ? S.cards.map((c: any) => (
        <Card key={c.id}>
          <Row style={{gap: 10}}>
            <Icon name="card" size={22} color={th.ink} />
            <View style={{flex: 1}}>
              <T weight="700">{c.b} •••• {c.l4}</T>
              <T size={12.5} color={th.mut}>{expLabel(c) ? 'Expires ' + expLabel(c) : 'Saved card'}</T>
            </View>
            {c.isDefault ? <Badge green label="Default" /> : null}
            <Pressable accessibilityRole="button" accessibilityLabel="Remove card" hitSlop={12} disabled={!!busyId} onPress={() => removeCard(c.id)}><Icon name="trash" size={18} color={th.red} /></Pressable>
          </Row>
          {(!c.isDefault || confirmId === c.id) ? (
            <Row style={{marginTop: 10, gap: 16}}>
              {!c.isDefault ? <Pressable accessibilityRole="button" disabled={!!busyId} onPress={() => makeDefault(c.id)}><T size={13.5} weight="700" color={th.br}>{busyId === c.id ? 'Updating…' : 'Set as default'}</T></Pressable> : null}
              {confirmId === c.id ? <Pressable accessibilityRole="button" disabled={!!busyId} onPress={() => removeCard(c.id)}><T size={13.5} weight="700" color={th.red}>Tap again to remove</T></Pressable> : null}
              {confirmId === c.id ? <Pressable accessibilityRole="button" onPress={() => setConfirmId('')}><T size={13.5} weight="700" color={th.mut}>Cancel</T></Pressable> : null}
            </Row>
          ) : null}
        </Card>
      )) : (
        <Card style={{alignItems: 'center', paddingVertical: 22}}>
          <Icon name="card" size={36} color={th.ink} />
          <T weight="800" style={{marginTop: 6}}>No saved cards yet</T>
          <T size={13} color={th.mut} align="center" style={{marginTop: 4, lineHeight: 19}}>Saved cards will appear here and can be used at checkout.</T>
        </Card>
      )}
      <Cta ghost label="+ Add a card" onPress={() => toast('Adding cards is not available yet.')} />
      <T size={12} color={th.mut} style={{marginTop: 10}}>Only the brand, last 4 digits and expiry are shown.</T>
    </View>
  </View>);
}
