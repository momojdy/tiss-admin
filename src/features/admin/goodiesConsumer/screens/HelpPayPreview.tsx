import {label} from '../content';
import React, {useEffect, useState} from 'react';
import {View, Pressable, ScrollView} from 'react-native';
import {Bar, Card, Cta, Row, T, Ttl, useTheme} from '../components/ui';
import {S, totals, money, navBack, emit} from '../store';

/** Isolated, interactive walkthrough. No messages, wallet writes or orders are created. */
type Mode = 'share' | 'full';
type Step = 'setup' | 'invite' | 'pay' | 'progress' | 'complete';
const STEPS: Step[] = ['setup', 'invite', 'pay', 'progress', 'complete'];
const stepNames = (): Record<Step, string> => ({
  setup: label('lbl.helpPay.step.setup','Choose how to split'), invite: label('lbl.helpPay.step.invite','Send to friends'),
  pay: label('lbl.helpPay.step.pay','Friend chooses an amount'), progress: label('lbl.helpPay.step.progress','Track contributions'), complete: label('lbl.helpPay.step.complete','Order is fully funded'),
});
export function HelpPayPreview() {
  const th = useTheme();
  const friends=[label('lbl.helpPay.friendA','Friend A'),label('lbl.helpPay.friendB','Friend B'),label('lbl.helpPay.friendC','Friend C')];
  const [mode, setMode] = useState<Mode>('share');
  const [step, setStep] = useState<Step>('setup');
  const [percent, setPercent] = useState(25);
  const [paid, setPaid] = useState(0);
  const [contributions, setContributions] = useState<{name:string; cents:number}[]>([]);
  const [recipient, setRecipient] = useState(0);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  useEffect(() => {const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer);}, []);
  const total = Math.max(0, Math.round(Number(totals().total || 0) * 100));
  const initial = mode === 'share' ? Math.ceil(total * 0.6) : 0;
  const pool = total - initial;
  const remaining = Math.max(0, pool - paid);
  const funded = initial + paid;
  const expires = Math.max(0, Math.ceil((startedAt + 30 * 60_000 - now) / 1000));
  const timerLabel = `${Math.floor(expires / 60)}:${String(expires % 60).padStart(2, '0')}`;
  // Contributor's chosen percentage is of the currently unfunded Help Pay portion.
  // One person may cover the entire remaining 40% of the original bill.
  const chosen = mode === 'full' ? remaining : Math.min(remaining, Math.max(1, Math.round(remaining * percent / 100)));
  const amount = (cents: number) => money(cents / 100);
  const reset = (next: Mode) => {setMode(next); setStep('setup'); setPaid(0); setContributions([]); setPercent(25); setRecipient(0); setStartedAt(Date.now());};
  const next = () => setStep(s => STEPS[Math.min(STEPS.length - 1, STEPS.indexOf(s) + 1)]);
  const previous = () => setStep(s => STEPS[Math.max(0, STEPS.indexOf(s) - 1)]);
  const addContribution = () => {
    if (!remaining || !expires) return;
    const cents = Math.min(chosen, remaining);
    setPaid(v => Math.min(pool, v + cents));
    setContributions(v => [...v, {name: recipient === 0 ? label('lbl.helpPay.friendA','Friend A') : recipient === 1 ? label('lbl.helpPay.friendB','Friend B') : label('lbl.helpPay.friendC','Friend C'), cents}]);
    setStep(cents >= remaining ? 'complete' : 'progress');
  };
  const option = (label: string, active: boolean, onPress: () => void) =>
    <Pressable accessibilityRole="button" onPress={onPress} style={{paddingVertical:11,paddingHorizontal:12,borderRadius:13,borderWidth:1,borderColor:active?th.br:th.line,backgroundColor:active?th.brt:th.soft}}>
      <T size={13} weight="600" color={active?th.br:th.ink} align="center">{label}</T>
    </Pressable>;
  return <View style={{flex:1,backgroundColor:th.bg}}>
    <Bar cmsKey={"lbl.cms.24f236576f00"} title={label("lbl.cms.24f236576f00", "Help Pay · Walkthrough")} onBack={() => {navBack();emit();}} />
    <ScrollView contentContainerStyle={{padding:16,paddingBottom:55,gap:13}}>
      <T cmsKey={"lbl.cms.78242f2aebe6"} size={12} color={th.mut}>{label("lbl.cms.78242f2aebe6", "Interactive preview · Nothing is charged, shared or ordered.")}</T>
      <Row style={{gap:8}}>
        <View style={{flex:1}}>{option(label('lbl.helpPay.shareBill','Share bill · 60/40'),mode==='share',()=>reset('share'))}</View>
        <View style={{flex:1}}>{option(label('lbl.helpPay.fullPay','Help me fully pay'),mode==='full',()=>reset('full'))}</View>
      </Row>
      <Row sp>
        <T cmsKeys={["lbl.cms.2aeeb41bb682","lbl.cms.41f4298910ce"]} size={12} color={th.mut}>{label("lbl.cms.2aeeb41bb682", "Step ")}{STEPS.indexOf(step)+1} {label("lbl.cms.41f4298910ce", "of ")}{STEPS.length}</T>
        <T cmsKeys={["lbl.cms.6e746ee8b4fe","lbl.cms.046f168e2991"]} size={12} weight="600" color={th.br}>{label("lbl.cms.6e746ee8b4fe", "Goodies · ")}{timerLabel} {label("lbl.cms.046f168e2991", "left")}</T>
      </Row>
      <View style={{height:5,borderRadius:5,backgroundColor:th.soft,overflow:'hidden'}}>
        <View style={{height:5,width:`${(STEPS.indexOf(step)+1)*20}%`,backgroundColor:th.br}} />
      </View>
      <Ttl>{stepNames()[step]}</Ttl>
      <Card>
        <Row sp><T cmsKey={"lbl.cms.ec1cc0c94ace"} weight="600">{label("lbl.cms.ec1cc0c94ace", "Goodies bill")}</T><T weight="600">{amount(total)}</T></Row>
        {S.cart.lines.map((line:any,i:number)=><Row key={String(line.k||i)} sp style={{marginTop:8}}><T size={12} color={th.mut}>{line.q}× {line.n}</T><T size={12}>{money(line.p*line.q)}</T></Row>)}
        <Row sp style={{marginTop:12}}><T cmsKey={"lbl.cms.af5b6180fcea"} size={13}>{label("lbl.cms.af5b6180fcea", "Customer's upfront share")}</T><T size={13} weight="600">{amount(initial)}</T></Row>
        <Row sp style={{marginTop:7}}><T cmsKey={"lbl.cms.77261425ec6c"} size={13}>{label("lbl.cms.77261425ec6c", "Friends can cover")}</T><T size={13} weight="600">{amount(pool)}</T></Row>
        <Row sp style={{marginTop:7}}><T cmsKey={"lbl.cms.5f964c1d13e4"} size={13}>{label("lbl.cms.5f964c1d13e4", "Still needed")}</T><T size={13} weight="600" color={th.br}>{amount(remaining)}</T></Row>
      </Card>
      {step==='setup' ? <>
        <Card>
          <T cmsKeys={["lbl.cms.51f5915af4ef","lbl.cms.c460d20229b9"]} weight="600">{mode==='share'?label("lbl.cms.51f5915af4ef", "How the 60/40 split works"):label("lbl.cms.c460d20229b9", "How full payment works")}</T>
          <T cmsKeys={["lbl.cms.24a1b0418c6e","lbl.cms.248fefd7effd"]} size={13} color={th.mut} style={{marginTop:9}}>{mode==='share'?label("lbl.cms.24a1b0418c6e", "You pay 60% first. Friends can contribute any percentage of the remaining 40%, until it is fully covered. One friend can pay the whole 40%."):label("lbl.cms.248fefd7effd", "You request 100% of the bill from someone else. One person pays the full amount using an eligible payment method.")}</T>
          <T cmsKey={"lbl.cms.3037855e4da5"} size={12} color={th.mut} style={{marginTop:9}}>{label("lbl.cms.3037855e4da5", "In the real checkout, the request is only shared after the required upfront payment is verified.")}</T>
        </Card>
        <Cta cmsKey={"lbl.cms.4d841f662ff0"} label={label("lbl.cms.4d841f662ff0", "Continue to friend selection")} onPress={next} />
      </> : null}
      {step==='invite' ? <>
        <Card>
          <T cmsKey={"lbl.cms.51fd3576107d"} weight="600">{label("lbl.cms.51fd3576107d", "Choose friends · preview contacts")}</T>
          <T cmsKey={"lbl.cms.0c815902b6b8"} size={12} color={th.mut} style={{marginTop:7}}>{label("lbl.cms.0c815902b6b8", "The real version uses your Wantiss friend list. These are placeholders.")}</T>
          {friends.map((name,i)=><Pressable key={name} onPress={()=>setRecipient(i)} style={{paddingVertical:13,borderBottomWidth:i<2?1:0,borderColor:th.line}}>
            <Row sp><T weight={recipient===i?'600':undefined}>{name}</T><T cmsKeys={["lbl.cms.439ba7bca2f9","lbl.cms.66d0ec6d4d70"]} color={recipient===i?th.br:th.mut}>{recipient===i?label("lbl.cms.439ba7bca2f9", "Selected"):label("lbl.cms.66d0ec6d4d70", "Select")}</T></Row>
          </Pressable>)}
        </Card>
        <T cmsKey={"lbl.cms.7b6022533f4d"} size={12} color={th.mut}>{label("lbl.cms.7b6022533f4d", "Forwarding shares the same request and remaining balance. It never resets the 30-minute timer.")}</T>
        <Cta cmsKey={"lbl.cms.be8b08bcf8db"} label={label("lbl.cms.be8b08bcf8db", "Preview friend's message")} onPress={next} />
      </> : null}
      {step==='pay' ? <>
        <Card>
          <T cmsKey={"lbl.cms.421be83107c0"} size={12} color={th.mut}>{label("lbl.cms.421be83107c0", "Message preview · ")}{friends[recipient]}</T>
          <T cmsKey={"lbl.cms.cb52931e4fa7"} weight="600" style={{marginTop:7}}>{label("lbl.cms.cb52931e4fa7", "Help pay a Goodies order")}</T>
          <T cmsKey={"lbl.cms.1ffcbca434d7"} size={13} style={{marginTop:6}}>{amount(remaining)} {label("lbl.cms.1ffcbca434d7", "remaining · expires in ")}{timerLabel}</T>
          <T cmsKey={"lbl.cms.1b446a360546"} size={12} color={th.mut} style={{marginTop:8}}>{label("lbl.cms.1b446a360546", "Friends see the aggregate progress and their own payments, never the other contributors' identities or amounts.")}</T>
        </Card>
        {mode==='share' ? <Card>
          <T cmsKey={"lbl.cms.c36ec498735d"} weight="600">{label("lbl.cms.c36ec498735d", "How much would you like to pay?")}</T>
          <T cmsKey={"lbl.cms.38a73aeee517"} size={12} color={th.mut} style={{marginTop:7}}>{label("lbl.cms.38a73aeee517", "Choose a percentage of the remaining Help Pay amount.")}</T>
          <Row style={{gap:7,marginTop:12,flexWrap:'wrap'}}>
            {[10,25,50,75,100].map(v=><View key={v}>{option(v+'%',percent===v,()=>setPercent(v))}</View>)}
          </Row>
          <Row sp style={{marginTop:16}}><T cmsKey={"lbl.cms.5742239db66e"}>{label("lbl.cms.5742239db66e", "Selected ")}{percent}%</T><T weight="600" color={th.br}>{amount(chosen)}</T></Row>
          <T cmsKeys={["lbl.cms.ca05018be110","lbl.cms.19192368f257"]} size={12} color={th.mut} style={{marginTop:7}}>{label("lbl.cms.ca05018be110", "Equivalent to ")}{total?((chosen/total)*100).toFixed(1):'0'}{label("lbl.cms.19192368f257", "% of the original bill. Wallet only.")}</T>
        </Card> : <Card><T cmsKey={"lbl.cms.f4a87149377d"} weight="600">{label("lbl.cms.f4a87149377d", "Full bill payment")}</T><T cmsKeys={["lbl.cms.666ec91f4a22","lbl.cms.6472bf2c1c5e"]} size={13} color={th.mut} style={{marginTop:7}}>{label("lbl.cms.666ec91f4a22", "This request requires one person to pay the entire ")}{amount(remaining)}{label("lbl.cms.6472bf2c1c5e", ". In the live flow, eligible Wallet and card payment options are offered.")}</T></Card>}
        <Cta cmsKey={"lbl.cms.da77f6ee2ece"} label={label("lbl.cms.da77f6ee2ece", "Simulate paying {value0}").replace(/\{value0\}/g, String(amount(chosen)))} onPress={addContribution} />
      </> : null}
      {step==='progress'||step==='complete' ? <>
        <Card>
          <T cmsKeys={["lbl.cms.8ff661770946","lbl.cms.099a7872e3cb"]} weight="600">{step==='complete'?label("lbl.cms.8ff661770946", "Fully funded · preview"):label("lbl.cms.099a7872e3cb", "Customer funding overview")}</T>
          <View style={{height:9,borderRadius:9,backgroundColor:th.soft,overflow:'hidden',marginTop:15}}>
            <View style={{height:9,width:`${total?Math.min(100,Math.round(funded/total*100)):0}%`,backgroundColor:th.br}} />
          </View>
          <Row sp style={{marginTop:9}}><T cmsKey={"lbl.cms.05521fd984d2"} size={13}>{total?Math.round(funded/total*100):0}{label("lbl.cms.05521fd984d2", "% funded")}</T><T cmsKey={"lbl.cms.046f168e2991"} size={13} weight="600">{amount(remaining)} {label("lbl.cms.046f168e2991", "left")}</T></Row>
          <T cmsKey={"lbl.cms.e0f192b8b2cb"} weight="600" style={{marginTop:17}}>{label("lbl.cms.e0f192b8b2cb", "Contributions · customer view only")}</T>
          {contributions.map((c,i)=><Row key={i} sp style={{marginTop:9}}><T size={13}>{c.name}</T><T size={13}>{amount(c.cents)}</T></Row>)}
          <T cmsKey={"lbl.cms.84439715c11a"} size={12} color={th.mut} style={{marginTop:12}}>{label("lbl.cms.84439715c11a", "Contributors cannot see this list or the number of people who paid.")}</T>
        </Card>
        {step==='progress'? <Cta cmsKey={"lbl.cms.091a111ce415"} label={label("lbl.cms.091a111ce415", "Preview another friend's contribution")} onPress={()=>{setRecipient(v=>(v+1)%3);setPercent(25);setStep('pay');}} />:
          <Card><T cmsKey={"lbl.cms.54627b4c469e"} weight="600">{label("lbl.cms.54627b4c469e", "What happens next?")}</T><T cmsKey={"lbl.cms.70ab53df00d6"} size={13} color={th.mut} style={{marginTop:8}}>{label("lbl.cms.70ab53df00d6", "Once the server confirms all funds, checkout details and store availability must be revalidated. Only then can the real Goodies order be placed. If the request expires or fails, payments must be reversed.")}</T></Card>}
      </> : null}
      {step!=='setup' ? <Pressable onPress={previous} style={{paddingVertical:10,alignSelf:'flex-start'}}><T cmsKey={"lbl.cms.5736a9bb3c88"} color={th.br} weight="600">{label("lbl.cms.5736a9bb3c88", "Previous step")}</T></Pressable> : null}
      <Pressable onPress={()=>reset(mode)} style={{paddingVertical:10,alignSelf:'flex-start'}}><T cmsKey={"lbl.cms.e5d115728d05"} color={th.mut} size={13}>{label("lbl.cms.e5d115728d05", "Restart walkthrough")}</T></Pressable>
    </ScrollView>
  </View>;
}
