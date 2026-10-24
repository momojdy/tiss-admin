import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Pill } from '../ui/Controls';
import { Txt } from '../ui/Txt';
import { AuthField, BigBadge, LinkText, NoticeBox, PasswordChecklist, PrimaryButton, SecondaryButton } from './AuthFields';
import { emailOk, passwordError } from './authLogic';
import { supabase } from '../lib/supabase';
import { session } from '../state/access';
import { bump } from '../state/db';

type View_ = 'in' | 'forgot' | 'sent' | 'reset' | 'blocked';
interface Props { notice?: string; noticeBad?: boolean; onDone: () => void }

export function AuthFlow({ notice, noticeBad, onDone }: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<View_>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [noticeText, setNoticeText] = useState(notice || '');
  const [bad, setBad] = useState(!!noticeBad);
  const [busy, setBusy] = useState(false);

  const message = (text: string, isBad = false) => { setNoticeText(text); setBad(isBad); };
  const signIn = async () => {
    const e = email.trim().toLowerCase();
    if (!emailOk(e) || !password) return message('Enter your work email and password.', true);
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: e, password });
      if (error || !data.user || !data.session) throw new Error('Email or password is incorrect.');
      if (!data.user.email_confirmed_at) {
        await supabase.auth.signOut();
        throw new Error('Verify your work email using the confirmation link before signing in.');
      }
      const { data: staff, error: staffError } = await supabase
        .from('wantiss_admin_staff')
        .select('user_id,display_name,status,role')
        .eq('user_id', data.user.id)
        .maybeSingle();
      if (staffError) throw new Error('Staff access could not be verified. Try again later.');
      if (!staff) {
        await supabase.auth.signOut();
        throw new Error('This account has no staff invitation. Ask a Super Admin to invite you.');
      }
      if (staff.status !== 'active') {
        await supabase.auth.signOut();
        setView('blocked');
        throw new Error(staff.status === 'suspended' ? 'Your staff access is suspended. Contact a Super Admin.' : 'Your staff access has been revoked.');
      }
      session.who = staff.display_name;
      session.view = staff.display_name;
      session.last = Date.now();
      session.userId = data.user.id;
      session.email = data.user.email || e;
      session.role = staff.role;
      session.status = staff.status;
      bump();
      onDone();
    } catch (err) {
      message(err instanceof Error ? err.message : 'Unable to sign in. Try again.', true);
    } finally { setBusy(false); }
  };
  const sendReset = async () => {
    const e = email.trim().toLowerCase();
    if (!emailOk(e)) return message('Enter a valid work email.', true);
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(e, { redirectTo: 'wantiss-admin://reset-password' });
      if (error) throw error;
      setView('sent');
      message('If this address belongs to a staff account, a password-reset email will arrive shortly.');
    } catch {
      message('We could not request a reset email. Please try again later.', true);
    } finally { setBusy(false); }
  };
  const savePassword = async () => {
    const problem = passwordError(password, email);
    if (problem) return message(problem, true);
    if (password !== confirm) return message('Passwords do not match.', true);
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword(''); setConfirm(''); setView('in');
      message('Password updated. Sign in with your new password.');
    } catch {
      message('The reset link is invalid or expired. Request a new password-reset email.', true);
    } finally { setBusy(false); }
  };

  return (
    <LinearGradient colors={[c.b1, c.b2, c.b3]} locations={[0, 0.45, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: 22 + insets.top, paddingBottom: 28 + insets.bottom, paddingHorizontal: 20 }}>
          <View style={{ width: '100%', maxWidth: 380, alignSelf: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <View style={{ width: 25, height: 25, borderRadius: 8, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' }}><Txt size={15.8} weight={500} color={c.on}>W</Txt></View>
              <Txt size={16.8} weight={500}>wantiss</Txt><Pill style={{ marginLeft: 6 }}>Staff</Pill>
            </View>
            {view === 'in' && <>
              <Txt size={22.1} lh={1.08} ls={-0.2}>{'Staff\nsign in'}</Txt>
              <Txt size={13} mut lh={1.45} style={{ marginTop: 6, marginBottom: 14 }}>Use your verified Wantiss work email. Access is checked by the server.</Txt>
              {(noticeText || notice) ? <NoticeBox bad={bad}>{noticeText || notice}</NoticeBox> : null}
              <AuthField label="Work email" value={email} onChangeText={setEmail} error={undefined} placeholder="name@wantiss.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="username" autoComplete="email" />
              <AuthField label="Password" value={password} onChangeText={setPassword} error={undefined} password textContentType="password" autoComplete="password" onSubmitEditing={signIn} />
              <View style={{ alignItems: 'flex-end', marginBottom: 6 }}><LinkText label="Forgot password?" onPress={() => { setView('forgot'); message(''); }} /></View>
              <PrimaryButton label="Sign in" onPress={signIn} busy={busy} busyLabel="Signing in…" />
              <View style={{ marginTop: 14 }}><NoticeBox>Staff accounts are created by a Super Admin invitation. Self-registration is disabled.</NoticeBox></View>
            </>}
            {view === 'forgot' && <>
              <Txt size={22.1} lh={1.08}>{'Reset your\npassword'}</Txt>
              <Txt size={13} mut style={{ marginTop: 6, marginBottom: 14 }}>We will send a secure reset link to your work email.</Txt>
              <AuthField label="Work email" value={email} onChangeText={setEmail} error={undefined} keyboardType="email-address" autoCapitalize="none" />
              {noticeText ? <NoticeBox bad={bad}>{noticeText}</NoticeBox> : null}
              <PrimaryButton label="Send reset email" onPress={sendReset} busy={busy} busyLabel="Sending…" />
              <SecondaryButton label="Back to sign in" onPress={() => { setView('in'); message(''); }} />
            </>}
            {view === 'sent' && <>
              <BigBadge glyph="✉" />
              <Txt size={22.1} lh={1.08}>{'Check your\nemail'}</Txt>
              <Txt size={13} mut style={{ marginTop: 6, marginBottom: 14 }}>Use the password-reset link sent to your work email. If the email does not arrive, check spam or ask an administrator to verify your account.</Txt>
              <SecondaryButton label="Back to sign in" onPress={() => { setView('in'); message(''); }} />
            </>}
            {view === 'reset' && <>
              <Txt size={22.1} lh={1.08}>{'Choose a new\npassword'}</Txt>
              <AuthField label="New password" value={password} onChangeText={setPassword} error={undefined} password textContentType="newPassword" />
              <PasswordChecklist value={password} />
              <AuthField label="Confirm password" value={confirm} onChangeText={setConfirm} error={undefined} password textContentType="newPassword" />
              <PrimaryButton label="Save password" onPress={savePassword} busy={busy} busyLabel="Saving…" />
            </>}
            {view === 'blocked' && <>
              <BigBadge glyph="!" tone="bad" />
              <Txt size={22.1} lh={1.08}>Staff access unavailable</Txt>
              <Txt size={13} mut style={{ marginTop: 6 }}>This account is suspended or revoked. Contact a Super Admin.</Txt>
              <SecondaryButton label="Back to sign in" onPress={() => setView('in')} />
            </>}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
