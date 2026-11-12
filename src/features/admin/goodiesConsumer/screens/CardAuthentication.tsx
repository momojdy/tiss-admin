import {EditableNativeText as Text} from '../EditableNativeText';
import {label} from '../content';
import React, {useMemo, useState} from 'react';
import {View, Text as UnusedNativeText, ActivityIndicator} from 'react-native';
import {WebView} from '../previewNative';
import {Bar, Cta, Card, useTheme} from '../components/ui';

type Props = {
  clientSecret: string;
  publishableKey: string;
  onComplete: () => void;
  onCancel: () => void;
};

export function CardAuthentication({clientSecret, publishableKey, onComplete, onCancel}: Props) {
  const th = useTheme();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const verifying=label('lbl.cardVerifying','Securely verifying your card…');
  const html = useMemo(() => {
    const safeVerifying=verifying.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
    const secret = JSON.stringify(clientSecret);
    const key = JSON.stringify(publishableKey);
      return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:Arial,sans-serif;color:#1A2517;padding:18px;text-align:center"><p>${safeVerifying}</p><script src="https://js.stripe.com/v3/"></script><script>
      const send=x=>window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(x));
      const stripe=Stripe(${key});
      stripe.handleCardAction(${secret}).then(({paymentIntent,error})=>{
        if(error){send({error:error.message||'Card verification failed'});return;}
        send({status:paymentIntent&&paymentIntent.status||'unknown'});
      }).catch(e=>send({error:String(e&&e.message||e)}));
    </script></body></html>`;
  }, [clientSecret, publishableKey,verifying]);
  const onMessage = (event: any) => {
    let value: any;
    try {value = JSON.parse(event.nativeEvent.data);} catch {setProblem(label("lbl.cms.df27a086d299","Could not read the card verification result."));setBusy(false);return;}
    if (value.error) {setProblem(label('lbl.cardVerificationFailed','Your card could not be verified. Please try again or use another card.')); setBusy(false);return;}
    if (value.status === 'requires_capture' || value.status === 'succeeded') {setBusy(true);onComplete();return;}
    setProblem(label("lbl.cms.4d1f059d62c2","Your card verification did not complete. Please try again or use another card."));
    setBusy(false);
  };
  return <View style={{flex: 1, backgroundColor: th.bg}}>
    <Bar cmsKey={"lbl.cms.11195aeabc09"} title={label("lbl.cms.11195aeabc09", "Verify card")} onBack={onCancel} />
    <View style={{padding: 16, gap: 12}}>
      <Card>
        <Text cmsKey={"lbl.cms.bd7ffa079895"} style={{color: th.ink, fontWeight: '600', fontSize: 15}}>{label("lbl.cms.bd7ffa079895", "Your bank may ask you to approve this payment")}</Text>
        <Text cmsKey={"lbl.cms.d8fc219cd4f7"} style={{color: th.mut, fontSize: 13, lineHeight: 19, marginTop: 6}}>{label("lbl.cms.d8fc219cd4f7", "Complete the secure verification from your bank. Your card is only captured after verification succeeds.")}</Text>
      </Card>
      <View style={{height: 330, overflow: 'hidden', borderRadius: 14, backgroundColor: '#fff'}}>
        <WebView source={{html, baseUrl: 'https://wantiss.app'}} originWhitelist={['*']} javaScriptEnabled domStorageEnabled onMessage={onMessage} onLoadStart={() => setBusy(true)} onLoadEnd={() => setBusy(false)} />
      </View>
      {busy ? <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}><ActivityIndicator color={th.br} /><Text cmsKey={"lbl.cms.6db1d18c8e5d"} style={{color: th.mut, fontSize: 12}}>{label("lbl.cms.6db1d18c8e5d", "Waiting for secure card verification…")}</Text></View> : null}
      {problem ? <Text style={{color: th.red, fontSize: 13}}>{problem}</Text> : null}
      <Cta cmsKey={"lbl.cms.e9f88c775f6c"} ghost label={label("lbl.cms.e9f88c775f6c", "Cancel verification")} onPress={onCancel} disabled={busy} />
    </View>
  </View>;
}
