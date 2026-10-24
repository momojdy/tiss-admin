import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Switch, View, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Pill } from '../ui/Controls';
import { Txt } from '../ui/Txt';
import { authDb } from '../state/db';
import { StaffMember } from '../data/types';
import { AuthField, BigBadge, LinkText, NoticeBox, PasswordChecklist, PrimaryButton, SecondaryButton } from './AuthFields';
import {
  activateInvitation, applyReset, AUTH_CONFIG, checkCredentials, codeOk, demoAccounts, emailOk, enterApp, maskEmail, registerFromInvite,
  passwordError, requestReset, ResetToken, staffByCode, staffByEmail, tokenValid,
} from './authLogic';

type View_ = 'in' | 'mfa' | 'reg' | 'mfas' | 'forgot' | 'sent' | 'reset' | 'resetok' | 'expired' | 'blocked';
interface Props { notice?: string; noticeBad?: boolean; onDone: () => void }

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Staff authentication: sign in, two-step code, accept invitation, forgot and reset password. */
export function AuthFlow({ notice, noticeBad, onDone }: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<View_>('in');
  const [note, setNote] = useState<{ text: string; bad?: boolean } | undefined>(notice ? { text: notice, bad: noticeBad } : undefined);
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState<StaffMember | null>(null);
  const [token, setToken] = useState<ResetToken | null>(null);
  const [blocked, setBlocked] = useState({ title: '', message: '' });
  const [regCode, setRegCode] = useState('');

  const go = (v: View_, n?: { text: string; bad?: boolean }) => { setNote(n); setView(v); };

  return (
    <LinearGradient colors={[c.b1, c.b2, c.b3]} locations={[0, 0.45, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: 22 + insets.top, paddingBottom: 28 + insets.bottom, paddingHorizontal: 20 }}>
          <View style={{ width: '100%', maxWidth: 380, alignSelf: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <View style={{ width: 25, height: 25, borderRadius: 8, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' }}><Txt size={15.8} weight={500} color={c.on}>W</Txt></View>
              <Txt size={16.8} weight={500}>wantiss</Txt>
              <Pill style={{ marginLeft: 6 }}>Staff</Pill>
            </View>
            {view !== 'in' && view !== 'mfa' && view !== 'resetok' && view !== 'blocked' && view !== 'mfas' && view !== 'reset' ? (
              <Pressable onPress={() => go('in')} accessibilityRole="button" style={{ paddingVertical: 6, marginBottom: 6 }}><Txt size={13} mut>‹ Back to sign in</Txt></Pressable>
            ) : null}
            {view === 'in' && <SignIn email={email} setEmail={setEmail} note={note} onForgot={() => go('forgot')} onRegister={() => { setRegCode(''); go('reg'); }}
              onMfa={(s) => { setPending(s); go('mfa'); }} onBlocked={(t, m) => { setBlocked({ title: t, message: m }); go('blocked'); }} />}
            {view === 'mfa' && pending && <CodeStep title={'Two-step\nverification'} intro={`Enter the 6-digit code from your authenticator app for ${maskEmail(authDb[pending.n].email!)}.`} cta="Verify and continue" resend note={note}
              onBack={() => go('in')} onOk={() => { enterApp(pending); onDone(); }} onTooMany={() => { setEmail(authDb[pending.n].email!); go('in', { text: 'Too many wrong codes. Sign in again.', bad: true }); }} />}
            {view === 'reg' && <Register initialCode={regCode} onDone={(s) => { setPending(s); go('mfas'); }} />}
            {view === 'mfas' && pending && <CodeStep title={'Set up two-step\nverification'} intro="Your account is created. Add this key to an authenticator app, then enter the code it shows." cta="Finish and sign in" setupKey
              onOk={() => { enterApp(pending); onDone(); }} />}
            {view === 'forgot' && <Forgot email={email} setEmail={setEmail} onSent={(t) => { setToken(t); go('sent'); }} />}
            {view === 'sent' && <Sent email={email} token={token} onResend={() => setToken(requestReset(email))} onOther={() => go('forgot')} onOpen={() => (tokenValid(token) ? go('reset') : go('expired'))} onOpenOld={() => go('expired')} />}
            {view === 'reset' && token && <Reset token={token} onExpired={() => go('expired')} onOk={() => { setEmail(token.email); setToken(null); go('resetok'); }} />}
            {view === 'resetok' && (
              <View>
                <BigBadge glyph="✓" tone="ok" />
                <Txt size={22.1} lh={1.08} ls={-0.2}>{'Password\nupdated'}</Txt>
                <Txt size={13} mut lh={1.45} style={{ marginTop: 6, marginBottom: 14 }}>Other devices were signed out. Sign in with your new password.</Txt>
                <PrimaryButton label="Go to sign in" onPress={() => go('in')} />
              </View>
            )}
            {view === 'expired' && (
              <View>
                <BigBadge glyph="!" tone="bad" />
                <Txt size={22.1} lh={1.08} ls={-0.2}>{'This link\nhas expired'}</Txt>
                <Txt size={13} mut lh={1.45} style={{ marginTop: 6, marginBottom: 14 }}>Reset links work for 30 minutes and only once. Request a new one.</Txt>
                <PrimaryButton label="Request a new link" onPress={() => go('forgot')} />
              </View>
            )}
            {view === 'blocked' && (
              <View>
                <BigBadge glyph="⚑" tone="bad" />
                <Txt size={22.1} lh={1.08} ls={-0.2}>{blocked.title}</Txt>
                <Txt size={13} mut lh={1.45} style={{ marginTop: 6, marginBottom: 14 }}>{blocked.message}</Txt>
                <PrimaryButton label="Back to sign in" onPress={() => go('in')} />
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const Title = ({ children, sub }: { children: string; sub?: string }) => (
  <View style={{ marginBottom: 14 }}>
    <Txt size={22.1} lh={1.08} ls={-0.2}>{children}</Txt>
    {sub ? <Txt size={13} mut lh={1.45} style={{ marginTop: 6 }}>{sub}</Txt> : null}
  </View>
);

function SignIn({ email, setEmail, note, onForgot, onRegister, onMfa, onBlocked }: {
  email: string; setEmail: (v: string) => void; note?: { text: string; bad?: boolean }; onForgot: () => void; onRegister: () => void;
  onMfa: (s: StaffMember) => void; onBlocked: (t: string, m: string) => void;
}) {
  const { c } = useTheme();
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<{ em?: string; pw?: string; f?: string }>({});
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const e: typeof err = {}, em = email.trim().toLowerCase();
    if (!em) e.em = 'Enter your work email.'; else if (!emailOk(em)) e.em = 'Enter a valid email, like name@wantiss.com.';
    if (!pw) e.pw = 'Enter your password.';
    setErr(e);
    if (e.em || e.pw) return;
    setBusy(true); await wait(700);
    const r = checkCredentials(em, pw);
    setBusy(false);
    if (r.kind === 'error') setErr({ f: r.message });
    else if (r.kind === 'blocked') onBlocked(r.title, r.message);
    else onMfa(r.staff);
  };
  return (
    <View>
      <Title sub="Use your Wantiss work email. What you see after signing in depends on your role.">{'Staff\nsign in'}</Title>
      {note ? <NoticeBox bad={note.bad}>{note.text}</NoticeBox> : null}
      <AuthField label="Work email" value={email} onChangeText={(v) => { setEmail(v); setErr({}); }} error={err.em} placeholder="name@wantiss.com" keyboardType="email-address" textContentType="username" autoComplete="email" returnKeyType="next" />
      <AuthField label="Password" value={pw} onChangeText={(v) => { setPw(v); setErr({}); }} error={err.pw} password textContentType="password" autoComplete="password" returnKeyType="go" onSubmitEditing={submit} />
      <View style={{ alignItems: 'flex-end', marginBottom: 6 }}><LinkText label="Forgot password?" onPress={onForgot} /></View>
      {err.f ? <Txt size={12} color={c.or} lh={1.35} style={{ marginBottom: 4 }} accessibilityLiveRegion="polite">{err.f}</Txt> : null}
      <PrimaryButton label="Sign in" onPress={submit} busy={busy} busyLabel="Signing in…" />
      <View style={{ backgroundColor: c.card, borderColor: c.bd, borderWidth: 1, borderRadius: 22, padding: 12, marginTop: 14, alignItems: 'center', gap: 8 }}>
        <Txt size={13}>Have an invitation from a Super Admin?</Txt>
        <View style={{ alignSelf: 'stretch' }}><SecondaryButton label="Create your account" onPress={onRegister} /></View>
      </View>
      <DemoHelper onPick={(a) => { setEmail(a.email); setPw(a.pw); setErr({}); }} />
    </View>
  );
}

function DemoHelper({ onPick }: { onPick: (a: ReturnType<typeof demoAccounts>[number]) => void }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ backgroundColor: c.card, borderColor: c.bd, borderWidth: 1, borderRadius: 22, padding: 12, marginTop: 14 }}>
      <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button"><Txt size={12} mut>{(open ? '▾ ' : '▸ ') + 'Prototype helper'}</Txt></Pressable>
      {open ? (
        <View>
          <Txt size={12} mut lh={1.4} style={{ marginVertical: 8 }}>No real email or SMS is sent. Demo password {AUTH_CONFIG.demoPassword}, two-step code {AUTH_CONFIG.demoCode}. Remove before launch.</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
            {demoAccounts().map((a) => <Pill key={a.name} onPress={() => onPick(a)}>{`${a.name} · ${a.role}${a.status !== 'Active' ? ' · ' + a.status : ''}`}</Pill>)}
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** Six-digit code entry, used for sign in and for first-time setup. */
function CodeStep({ title, intro, cta, resend, setupKey, note, onBack, onOk, onTooMany }: {
  title: string; intro: string; cta: string; resend?: boolean; setupKey?: boolean; note?: { text: string; bad?: boolean };
  onBack?: () => void; onOk: () => void; onTooMany?: () => void;
}) {
  const { c } = useTheme();
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const tries = useRef(0);
  const [cd, setCd] = useState(30);
  useEffect(() => { if (!resend) return; const t = setInterval(() => setCd((n) => (n > 0 ? n - 1 : 0)), 1000); return () => clearInterval(t); }, [resend]);
  const submit = async () => {
    const v = code.replace(/\s/g, '');
    if (!/^\d{6}$/.test(v)) { setErr('Enter the 6-digit code.'); return; }
    setBusy(true); await wait(600); setBusy(false);
    if (!codeOk(v)) {
      tries.current++;
      if (onTooMany && tries.current >= AUTH_CONFIG.maxAttempts) { onTooMany(); return; }
      setErr(onTooMany ? `That code is not right. ${AUTH_CONFIG.maxAttempts - tries.current} tries left.` : 'That code is not right. Try again.');
      return;
    }
    onOk();
  };
  return (
    <View>
      <Title sub={intro}>{title}</Title>
      {note ? <NoticeBox bad={note.bad}>{note.text}</NoticeBox> : null}
      {setupKey ? (
        <View style={{ backgroundColor: c.card, borderColor: c.bd, borderWidth: 1, borderRadius: 22, padding: 12, alignItems: 'center', marginBottom: 6 }}>
          <Txt size={12} mut>Setup key (prototype)</Txt>
          <Txt size={18} weight={500} ls={2} style={{ marginTop: 4 }} selectable>WNTS 4K9P 2XQ7 MD5R</Txt>
        </View>
      ) : null}
      <AuthField label="6-digit code" value={code} onChangeText={(v) => { setCode(v.replace(/\D/g, '').slice(0, 6)); setErr(''); }} error={err} placeholder="123456" keyboardType="number-pad" maxLength={6} textContentType="oneTimeCode" autoComplete="sms-otp" />
      {info ? <Txt size={12} color={c.gr} style={{ marginTop: 4 }}>{info}</Txt> : null}
      <PrimaryButton label={cta} onPress={submit} busy={busy} busyLabel="Verifying…" />
      {onBack || resend ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
          {onBack ? <LinkText label="Use a different account" onPress={onBack} /> : <View />}
          {resend ? <LinkText label={cd > 0 ? `Resend in ${cd}s` : 'Resend code'} disabled={cd > 0} onPress={() => { setCd(30); setInfo('A new code was sent.'); }} /> : null}
        </View>
      ) : null}
    </View>
  );
}

function Register({ initialCode, onDone }: { initialCode: string; onDone: (s: StaffMember) => void }) {
  const [code, setCode] = useState(initialCode);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const { c } = useTheme();
  const inv = staffByCode(code.trim().toUpperCase());
  const submit = async () => {
    const r = registerFromInvite(code, email, pw, pw2, ok);
    if (!r.ok) { setErr({ [r.field ?? 'f']: r.message }); return; }
    setErr({}); setBusy(true); await wait(800); setBusy(false);
    activateInvitation(r.staff, pw);
    onDone(r.staff);
  };
  const clear = () => setErr({});
  return (
    <View>
      <Title sub="Enter the invitation code from your email. Your role is set by the person who invited you.">{'Create your\nstaff account'}</Title>
      <AuthField label="Invitation code" value={code} onChangeText={(v) => { setCode(v); clear(); }} error={err.ic} placeholder="WNT-XXXX-XXXX" autoCapitalize="characters" />
      {inv && inv.st === 'Invited' ? <Txt size={12} color={c.gr} style={{ marginTop: 4, marginLeft: 2 }}>{`Invitation for ${inv.n} · ${inv.role}`}</Txt> : null}
      <AuthField label="Work email" value={email} onChangeText={(v) => { setEmail(v); clear(); }} error={err.em} keyboardType="email-address" textContentType="username" />
      <AuthField label="Create password" value={pw} onChangeText={(v) => { setPw(v); clear(); }} error={err.pw} password textContentType="newPassword" />
      <PasswordChecklist value={pw} />
      <AuthField label="Confirm password" value={pw2} onChangeText={(v) => { setPw2(v); clear(); }} error={err.pw2} password textContentType="newPassword" />
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 12 }}>
        <Switch value={ok} onValueChange={(v) => { setOk(v); clear(); }} trackColor={{ true: c.gr, false: c.inset }} accessibilityLabel="Accept the staff access policy" />
        <Txt size={13} style={{ flex: 1, marginTop: 2 }}>I agree to the staff access policy and understand my actions are logged.</Txt>
      </View>
      {err.tm ? <Txt size={12} color={c.or} style={{ marginTop: 4 }}>{err.tm}</Txt> : null}
      {err.f ? <Txt size={12} color={c.or} style={{ marginTop: 6 }}>{err.f}</Txt> : null}
      <PrimaryButton label="Create account" onPress={submit} busy={busy} busyLabel="Creating account…" />
    </View>
  );
}

function Forgot({ email, setEmail, onSent }: { email: string; setEmail: (v: string) => void; onSent: (t: ResetToken | null) => void }) {
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const em = email.trim().toLowerCase();
    if (!em) return setErr('Enter your work email.');
    if (!emailOk(em)) return setErr('Enter a valid email address.');
    setBusy(true); await wait(700); setBusy(false);
    setEmail(em);
    onSent(requestReset(em));
  };
  return (
    <View>
      <Title sub="Enter your work email. If it belongs to a staff account, we send a link that works for 30 minutes.">{'Forgot\npassword'}</Title>
      <AuthField label="Work email" value={email} onChangeText={(v) => { setEmail(v); setErr(''); }} error={err} placeholder="name@wantiss.com" keyboardType="email-address" textContentType="username" returnKeyType="send" onSubmitEditing={submit} />
      <PrimaryButton label="Send reset link" onPress={submit} busy={busy} busyLabel="Sending…" />
    </View>
  );
}

function Sent({ email, token, onResend, onOther, onOpen, onOpenOld }: { email: string; token: ResetToken | null; onResend: () => void; onOther: () => void; onOpen: () => void; onOpenOld: () => void }) {
  const { c } = useTheme();
  const [cd, setCd] = useState(30);
  useEffect(() => { const t = setInterval(() => setCd((n) => (n > 0 ? n - 1 : 0)), 1000); return () => clearInterval(t); }, []);
  return (
    <View>
      <BigBadge glyph="✉" />
      <Title sub={`If ${email} belongs to a staff account, a reset link is on its way. It expires in 30 minutes and works once.`}>{'Check your\nemail'}</Title>
      <View style={{ backgroundColor: c.card, borderColor: c.bd, borderWidth: 1, borderRadius: 22, padding: 12 }}>
        <Txt size={13} lh={1.4} style={{ marginBottom: 8 }}><Txt size={13} weight={600}>Prototype only. </Txt>No email is sent, so open the link here.</Txt>
        <PrimaryButton label="Open reset link" onPress={token ? onOpen : onOpenOld} />
        <View style={{ height: 8 }} />
        <SecondaryButton label="Open an expired link" onPress={onOpenOld} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <LinkText label="Use another email" onPress={onOther} />
        <LinkText label={cd > 0 ? `Resend in ${cd}s` : 'Resend link'} disabled={cd > 0} onPress={() => { setCd(30); onResend(); }} />
      </View>
    </View>
  );
}

function Reset({ token, onOk, onExpired }: { token: ResetToken; onOk: () => void; onExpired: () => void }) {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const pre = applyResetPreview(token, pw, pw2);
    if (pre) { setErr({ [pre.field]: pre.message }); return; }
    setBusy(true); await wait(700); setBusy(false);
    const r = applyReset(token, pw, pw2);
    if (r.expired) return onExpired();
    if (!r.ok) { setErr({ [r.field ?? 'pw']: r.message ?? '' }); return; }
    onOk();
  };
  return (
    <View>
      <Title sub={`For ${maskEmail(token.email)}. Signing in elsewhere will end after you save.`}>{'Choose a new\npassword'}</Title>
      <AuthField label="New password" value={pw} onChangeText={(v) => { setPw(v); setErr({}); }} error={err.pw} password textContentType="newPassword" />
      <PasswordChecklist value={pw} />
      <AuthField label="Confirm new password" value={pw2} onChangeText={(v) => { setPw2(v); setErr({}); }} error={err.pw2} password textContentType="newPassword" />
      <PrimaryButton label="Save password" onPress={submit} busy={busy} busyLabel="Saving…" />
    </View>
  );
}

/** Field checks that need no waiting; the same rules applyReset enforces. */
function applyResetPreview(t: ResetToken, pw: string, pw2: string): { field: string; message: string } | null {
  if (!tokenValid(t)) return null;
  const r = applyResetCheck(t, pw, pw2);
  return r;
}
function applyResetCheck(t: ResetToken, pw: string, pw2: string) {
  if (!pw) return { field: 'pw', message: 'Enter a new password.' };
  const pe = passwordError(pw, t.email);
  if (pe) return { field: 'pw', message: pe };
  if (pw !== pw2) return { field: 'pw2', message: 'Passwords do not match.' };
  const s = staffByEmail(t.email);
  if (s && authDb[s.n].pw === pw) return { field: 'pw', message: 'Choose a password you have not used before.' };
  return null;
}
