import {EditableNativeText as Text} from '../EditableNativeText';
/* Wantiss Wallet and saved cards for Goodies (live data).
   The shell (GoodiesApp) already scrolls every route except byo and storechat, so this screen must not add its own ScrollView. */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {View, Pressable, Text as UnusedNativeText} from 'react-native';
import {Icon} from '../components/Icon';
import WalletBalance from './WalletBalance';
import {T, Bar, Cta, Card, Row, Badge, Ttl, useTheme} from '../components/ui';
import {S, money, emit, save, toast} from '../store';
import {back, createWallet} from '../actions';
import {push} from '../store';
import {label} from '../content';
import {previewBackend as supabase} from '../previewRuntime';
import {friendlyError} from '../friendlyError';

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
      const msg = friendlyError(e, label("lbl.cms.cd891775350a", "Could not load your wallet and cards."));
      if (loaded.current) {toast(msg); return;} /* keep showing the last good data */
      setProblem(msg); setState('error');
    }
  }, []);

  useEffect(() => {void load();}, [load]);

  /* Both card RPCs return a boolean. false means nothing changed, with no error. */
  const act = async (id: string, call: () => PromiseLike<{data: any; error: any}>, okMsg: string, failMsg: string) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusyId(id); setConfirmId('');
    let ok = false;
    try {
      const {data, error} = await call();
      if (error || data === false) toast(friendlyError(error, failMsg));
      else {toast(okMsg); ok = true;}
    } catch (e: any) {
      toast(friendlyError(e, failMsg));
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
    if (creating) return;
    setCreating(true);
    try {await createWallet();} finally {if (mounted.current) setCreating(false);}
    if (mounted.current) await load();
  };

  if (state === 'loading') {
    return (<View>
      <Bar cmsKey={'lbl.paymentsTitle'} title={label('lbl.paymentsTitle', 'Wallet and payments')} onBack={back} />
      <View style={{paddingHorizontal: 16}}>
        <Skeleton h={120} /><Skeleton h={20} w={110} /><Skeleton h={64} /><Skeleton h={64} />
      </View>
    </View>);
  }
  if (state === 'signedout') {
    return (<View>
      <Bar cmsKey={'lbl.paymentsTitle'} title={label('lbl.paymentsTitle', 'Wallet and payments')} onBack={back} />
      <View style={{padding: 16, paddingTop: 40, alignItems: 'center'}}>
        <Text style={{fontSize: 52}}>🔒</Text>
        <T cmsKey={'lbl.paymentsSignIn'} size={18} weight="600" style={{marginTop: 8}}>{label('lbl.paymentsSignIn', 'Sign in to see your wallet')}</T>
        <T cmsKey={'lbl.paymentsSignedOut'} size={13.5} color={th.mut} align="center" style={{marginVertical: 8, marginBottom: 18}}>{label('lbl.paymentsSignedOut', 'Your Wantiss wallet and saved cards are tied to your account.')}</T>
        <View style={{alignSelf: 'stretch'}}><Cta cmsKey={'lbl.paymentBack'} ghost label={label('lbl.paymentBack', 'Back')} onPress={back} /></View>
      </View>
    </View>);
  }
  if (state === 'error') {
    return (<View>
      <Bar cmsKey={'lbl.paymentsTitle'} title={label('lbl.paymentsTitle', 'Wallet and payments')} onBack={back} />
      <View style={{paddingHorizontal: 16}}>
        <Card style={{borderColor: th.red}}>
          <T cmsKey={'lbl.paymentLoadError'} weight="600">{label('lbl.paymentLoadError', 'We couldn’t load your payment details')}</T>
          <T size={13} color={th.red} style={{marginTop: 4}}>{problem}</T>
          <View style={{marginTop: 12}}><Cta cmsKey={'lbl.paymentRetry'} small label={label('lbl.paymentRetry', 'Try again')} onPress={() => {void load();}} /></View>
        </Card>
      </View>
    </View>);
  }

  return (<View>
    <Bar cmsKey={'lbl.paymentsTitle'} title={label('lbl.paymentsTitle', 'Wallet and payments')} onBack={back} />
    <View style={{paddingHorizontal: 16}}>
      {S.hasWallet ? (
        <View style={{marginBottom: 12}}>
          {/* Same green wallet card as the Wallet feature home; it loads its own balance and stays live. */}
          <View style={{marginHorizontal: -16, marginTop: -13}}><WalletBalance contentLabel={label} /></View>
          <Pressable accessibilityRole="button" accessibilityLabel={label('lbl.paymentTopup', 'Top up')} hitSlop={10} onPress={() => toast(label('lbl.paymentTopupUnavailable', 'Wallet top-up is not available yet.'))} style={{alignSelf: 'flex-start', marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6}}>
            <Icon name="plus" size={16} color={th.br} /><T cmsKey={'lbl.paymentTopup'} size={13.5} weight="600" color={th.br}>{label('lbl.paymentTopup', 'Top up')}</T>
          </Pressable>
        </View>
      ) : (
        <Card>
          <Row style={{gap: 10}}><Text style={{fontSize: 30}}>👛</Text><View style={{flex: 1}}><T cmsKey={'lbl.paymentNoWallet'} weight="600">{label('lbl.paymentNoWallet', 'No Wantiss wallet found')}</T></View></Row>
          <T cmsKey={"lbl.cms.f8cd04d16d2c"} size={13} color={th.mut} style={{marginVertical: 6, lineHeight: 19}}>{label("lbl.cms.f8cd04d16d2c", "You haven’t created a wallet, or it was deleted. Create one to pay with it and to receive refunds. Your balance starts at ")}{money(0)}.</T>
          <Cta cmsKeys={["lbl.cms.7ac9ab914a13","lbl.cms.f94093c65ad4"]} small label={creating ? label("lbl.cms.7ac9ab914a13", "Creating…") : label("lbl.cms.f94093c65ad4", "Create wallet")} disabled={creating} onPress={() => {void makeWallet();}} />
        </Card>
      )}

      <Ttl>{label('lbl.paymentsCards', 'Saved cards')}</Ttl>
      {S.cards.length ? S.cards.map((c: any) => (
        <Card key={c.id}>
          <Row style={{gap: 10}}>
            <Icon name="card" size={22} color={th.ink} />
            <View style={{flex: 1}}>
              <T weight="600">{c.b} •••• {c.l4}</T>
              <T cmsKeys={["lbl.cms.832feb1f5f0c","lbl.cms.b4fe1f1f9202"]} size={12.5} color={th.mut}>{expLabel(c) ? label("lbl.cms.832feb1f5f0c", "Expires ") + expLabel(c) : label("lbl.cms.b4fe1f1f9202", "Saved card")}</T>
            </View>
            {c.isDefault ? <Badge cmsKey={'lbl.paymentDefaultCard'} green label={label('lbl.paymentDefaultCard', 'Default')} /> : null}
            <Pressable accessibilityRole="button" accessibilityLabel={label('lbl.paymentRemoveCard', 'Remove card')} hitSlop={12} disabled={!!busyId} onPress={() => removeCard(c.id)}><Icon name="trash" size={18} color={th.red} /></Pressable>
          </Row>
          {(!c.isDefault || confirmId === c.id) ? (
            <Row style={{marginTop: 10, gap: 16}}>
              {!c.isDefault ? <Pressable accessibilityRole="button" disabled={!!busyId} onPress={() => makeDefault(c.id)}><T cmsKeys={["lbl.cms.ce5c2af83377","lbl.cms.eeb9fe67ea00"]} size={13.5} weight="600" color={th.br}>{busyId === c.id ? label("lbl.cms.ce5c2af83377", "Updating…") : label("lbl.cms.eeb9fe67ea00", "Set as default")}</T></Pressable> : null}
              {confirmId === c.id ? <Pressable accessibilityRole="button" disabled={!!busyId} onPress={() => removeCard(c.id)}><T cmsKey={'lbl.paymentTapAgainRemove'} size={13.5} weight="600" color={th.red}>{label('lbl.paymentTapAgainRemove', 'Tap again to remove')}</T></Pressable> : null}
              {confirmId === c.id ? <Pressable accessibilityRole="button" onPress={() => setConfirmId('')}><T cmsKey={'lbl.paymentCancel'} size={13.5} weight="600" color={th.mut}>{label('lbl.paymentCancel', 'Cancel')}</T></Pressable> : null}
            </Row>
          ) : null}
        </Card>
      )) : (
        <Card style={{alignItems: 'center', paddingVertical: 22}}>
          <Text style={{fontSize: 40}}>💳</Text>
          <T cmsKey={'lbl.paymentNoCards'} weight="600" style={{marginTop: 6}}>{label('lbl.paymentNoCards', 'No saved cards yet')}</T>
          <T cmsKey={'lbl.paymentSavedCardsHint'} size={13} color={th.mut} align="center" style={{marginTop: 4, lineHeight: 19}}>{label('lbl.paymentSavedCardsHint', 'Saved cards will appear here and can be used at checkout.')}</T>
        </Card>
      )}
      <Cta cmsKey={'lbl.paymentAddCard'} ghost label={label('lbl.paymentAddCard', '+ Add a card')} onPress={() => push('addcard')} />
    </View>
  </View>);
}
