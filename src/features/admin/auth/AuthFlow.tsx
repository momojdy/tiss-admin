import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Linking } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Pill } from '../ui/Controls';
import { Txt } from '../ui/Txt';
import { AuthField, BigBadge, LinkText, NoticeBox, PasswordChecklist, PrimaryButton, SecondaryButton } from './AuthFields';
import { emailOk, passwordError } from './authLogic';
import { supabase } from '../lib/supabase';
import { session, setServerGrants } from '../state/access';
import { bump } from '../state/db';
import { hydrateAdminState } from '../lib/hydrateAdminState';

type View_ = 'in' | 'code-sent' | 'forgot' | 'sent' | 'reset' | 'invite' | 'blocked';
interface Props { notice?: string; noticeBad?: boolean; onDone: () => void }

export function AuthFlow({ notice, noticeBad, onDone }: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<View_>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [confirm, setConfirm] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [noticeText, setNoticeText] = useState(notice || '');
  const [bad, setBad] = useState(!!noticeBad);
  const [busy, setBusy] = useState(false);

  const message = (text: string, isBad = false) => { setNoticeText(text); setBad(isBad); };

  useEffect(() => {
    let active = true;
    const consumeAuthLink = async (rawUrl: string | null | undefined) => {
      if (!rawUrl || !active) return;
      try {
        const parsed = new URL(rawUrl);
        const query = parsed.searchParams;
        const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''));
        const type = query.get('type') || hash.get('type') || '';
        const tokenHash = query.get('token_hash');
        if (tokenHash && (type === 'invite' || type === 'recovery' || type === 'signup' || type === 'email')) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as 'invite' | 'recovery' | 'signup' | 'email' });
          if (error) throw error;
        }
        if (!active) return;
        if (type === 'invite' || parsed.pathname.includes('accept-invite')) {
          setView('invite');
          message('Invitation verified. Set a password to activate your staff access.');
        } else if (type === 'recovery' || parsed.pathname.includes('reset-password')) {
          setView('reset');
          message('Choose a new password from your verified reset link.');
        }
      } catch {
        if (active) message('This verification link is invalid or expired. Request a new email.', true);
      }
    };
    void Linking.getInitialURL().then(consumeAuthLink);
    void supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user;
      if (!active || !user?.email_confirmed_at || user.user_metadata?.wantiss_invite_accepted === true) return;
      const { data: pendingInvite } = await supabase.from('wantiss_admin_staff')
        .select('invited_at,invitation_expires_at').eq('user_id', user.id).maybeSingle();
      if (active && pendingInvite?.invited_at && (!pendingInvite.invitation_expires_at || Date.parse(pendingInvite.invitation_expires_at) > Date.now())) {
        setView('invite');
        message('Invitation verified. Set a password to activate your staff access.');
      }
    });
    const linkSubscription = Linking.addEventListener('url', ({ url }) => { void consumeAuthLink(url); });
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') { setView('reset'); message('Choose a new password from your verified reset link.'); }
    });
    return () => { active = false; linkSubscription.remove(); listener.subscription.unsubscribe(); };
  }, []);
  const completeSignIn = async (user: any, fallbackEmail: string) => {
    if (!user?.email_confirmed_at) {
      await supabase.auth.signOut();
      throw new Error('Verify your work email using the confirmation link before signing in.');
    }
    const { data: staff, error: staffError } = await supabase
      .from('wantiss_admin_staff')
      .select('user_id,display_name,status,role,invitation_expires_at,invited_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (staffError) {
      await supabase.auth.signOut();
      throw new Error('Staff access could not be verified. Try again later.');
    }
    if (!staff) {
      await supabase.auth.signOut();
      setView('blocked');
      throw new Error('This account does not have staff access. Contact Wantiss administration.');
    }
    if (staff.status !== 'active' || (staff.invitation_expires_at && Date.parse(staff.invitation_expires_at) <= Date.now())) {
      await supabase.auth.signOut();
      setView('blocked');
      throw new Error(staff.status === 'suspended' ? 'Your staff access is suspended. Contact a Super Admin.' : staff.status === 'revoked' ? 'Your staff access has been revoked.' : 'This invitation expired. Ask a Super Admin to send a new invitation.');
    }
    if (staff.invited_at && user.user_metadata?.wantiss_invite_accepted !== true) {
      setView('invite');
      message('Invitation verified. Set a password to activate your staff access.');
      return;
    }
    session.who = staff.display_name;
    session.view = staff.display_name;
    session.last = Date.now();
    session.userId = user.id;
    session.email = user.email || fallbackEmail;
    session.role = staff.role;
    session.status = staff.status;
    const { data: grants } = await supabase.from('wantiss_admin_permission_grants').select('permission_key,access_level,expires_at,revoked_at').eq('staff_user_id', user.id);
    setServerGrants(grants || []);
    await hydrateAdminState();
    bump();
    onDone();
  };

  // Temporary passwordless staff login: email OTP only; never creates a new account.
  const signIn = async () => {
    const e = email.trim().toLowerCase();
    if (!emailOk(e)) return message('Enter your verified work email.', true);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: e,
        options: { shouldCreateUser: false }
      });
      if (error) throw error;
      setView('code-sent');
      message('If this email belongs to an existing account, a sign-in code will arrive shortly.');
    } catch {
      message('Could not request a sign-in code. Check the email and try again.', true);
    } finally { setBusy(false); }
  };

  const verifyLoginCode = async () => {
    const e = email.trim().toLowerCase();
    const token = loginCode.trim();
    if (!emailOk(e)) return message('Enter your work email.', true);
    if (!/^\\d{6}$/.test(token)) return message('Enter the 6-digit sign-in code from your email.', true);
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email: e, token, type: 'email' });
      if (error || !data.user || !data.session) throw new Error('That code is invalid or expired. Request a new one.');
      await completeSignIn(data.user, e);
    } catch (err) {
      message(err instanceof Error ? err.message : 'Unable to verify the code. Try again.', true);
    } finally { setBusy(false); }
  };

  const sendReset = async () => {
    const e = email.trim().toLowerCase();
    if (!emailOk(e)) return message('Enter a valid work email.', true);
    setBusy(true);
    try {
      // Recovery uses the email OTP code so it works in Expo Go without app deep-link handling.
      const { error } = await supabase.auth.resetPasswordForEmail(e);
      if (error) throw error;
      setView('sent');
      message('If this address belongs to a staff account, a password-reset email will arrive shortly.');
    } catch {
      message('We could not request a reset email. Please try again later.', true);
    } finally { setBusy(false); }
  };
  const verifyResetCode = async () => {
    const e = email.trim().toLowerCase();
    const token = resetCode.trim();
    if (!emailOk(e)) return message('Enter the email address that received the code.', true);
    if (!/^\\d{6}$/.test(token)) return message('Enter the 6-digit code from your reset email.', true);
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email: e, token, type: 'recovery' });
      if (error) throw error;
      setView('reset');
      setPassword('');
      setConfirm('');
      message('Code verified. Choose a new password.');
    } catch {
      message('That code is invalid or expired. Request a new reset email and try again.', true);
    } finally { setBusy(false); }
  };

  const savePassword = async () => {
    const problem = passwordError(password, email);
    if (problem) return message(problem, true);
    if (password !== confirm) return message('Passwords do not match.', true);
    setBusy(true);
    try {
      const acceptingInvite = view === 'invite';
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      if (acceptingInvite) {
        const { error: acceptError } = await supabase.rpc('wantiss_admin_accept_invitation');
        if (acceptError) throw acceptError;
        const { error: metadataError } = await supabase.auth.updateUser({ data: { wantiss_invite_accepted: true } });
        if (metadataError) throw metadataError;
      }
      setPassword(''); setConfirm(''); setView('in');
      await supabase.auth.signOut();
      message(acceptingInvite ? 'Invitation accepted. Sign in with your new password.' : 'Password updated. Sign in with your new password.');
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
              <AuthField label="Work email" value={email} onChangeText={setEmail} error={undefined} placeholder="Wantiss.app@gmail.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" autoComplete="email" onSubmitEditing={signIn} />
              <PrimaryButton label="Email me a sign-in code" onPress={signIn} busy={busy} busyLabel="Sending code…" />
              <View style={{ marginTop: 14 }}><NoticeBox>Temporary passwordless login. Only existing accounts with active Wantiss staff access can enter; ordinary Wantiss accounts are denied.</NoticeBox></View>
            </>}
            {view === 'code-sent' && <>
              <BigBadge glyph="✉" />
              <Txt size={22.1} lh={1.08}>{'Check your\\nemail'}</Txt>
              <Txt size={13} mut style={{ marginTop: 6, marginBottom: 14 }}>Enter the 6-digit sign-in code sent to your work email.</Txt>
              <AuthField label="Work email" value={email} onChangeText={setEmail} error={undefined} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
              <AuthField label="6-digit sign-in code" value={loginCode} onChangeText={setLoginCode} error={undefined} keyboardType="number-pad" />
              {noticeText ? <NoticeBox bad={bad}>{noticeText}</NoticeBox> : null}
              <PrimaryButton label="Verify and sign in" onPress={verifyLoginCode} busy={busy} busyLabel="Verifying…" />
              <SecondaryButton label="Send a new code" onPress={signIn} />
              <SecondaryButton label="Back" onPress={() => { setView('in'); setLoginCode(''); message(''); }} />
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
              <Txt size={13} mut style={{ marginTop: 6, marginBottom: 14 }}>Enter the 6-digit verification code in the reset email. Keep this screen open while you check your email.</Txt>
              <AuthField label="Work email" value={email} onChangeText={setEmail} error={undefined} keyboardType="email-address" autoCapitalize="none" />
              <AuthField label="6-digit email code" value={resetCode} onChangeText={setResetCode} error={undefined} keyboardType="number-pad" />
              {noticeText ? <NoticeBox bad={bad}>{noticeText}</NoticeBox> : null}
              <PrimaryButton label="Verify code" onPress={verifyResetCode} busy={busy} busyLabel="Verifying…" />
              <SecondaryButton label="Send a new code" onPress={sendReset} />
              <SecondaryButton label="Back to sign in" onPress={() => { setView('in'); message(''); }} />
            </>}
            {view === 'invite' && <>
              <Txt size={22.1} lh={1.08}>{'Accept your\ninvitation'}</Txt>
              <Txt size={13} mut style={{ marginTop: 6, marginBottom: 14 }}>Create a secure password for your Wantiss staff account.</Txt>
              {noticeText ? <NoticeBox bad={bad}>{noticeText}</NoticeBox> : null}
              <AuthField label="New password" value={password} onChangeText={setPassword} error={undefined} password textContentType="newPassword" />
              <PasswordChecklist value={password} />
              <AuthField label="Confirm password" value={confirm} onChangeText={setConfirm} error={undefined} password textContentType="newPassword" />
              <PrimaryButton label="Accept invitation" onPress={savePassword} busy={busy} busyLabel="Activating…" />
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
              <Txt size={13} mut style={{ marginTop: 6 }}>This account does not have active staff access. Contact Wantiss administration.</Txt>
              <SecondaryButton label="Back to sign in" onPress={() => setView('in')} />
            </>}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
