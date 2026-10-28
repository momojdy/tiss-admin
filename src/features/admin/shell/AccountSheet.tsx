import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { db, bump, useDb } from '../state/db';
import { can, me, realMe, secLv, session, setView } from '../state/access';
import { REQ } from '../state/requirements';
import { leaveApp, passwordError } from '../auth/authLogic';
import { AuthField, PasswordChecklist, PrimaryButton, NoticeBox } from '../auth/AuthFields';
import { supabase } from '../lib/supabase';
import { useOverlay } from '../ui/Overlay';
import { DrawerBody } from '../ui/Overlay';
import { Card, CardTitle } from '../ui/Card';
import { Chips, OutlineBtn, Seg } from '../ui/Controls';
import { ListRows } from '../ui/Lists';
import { Txt } from '../ui/Txt';
import { AppIcon } from '../ui/AppIcon';
import { useTheme, ThemeMode } from '../theme/ThemeContext';
import { MyAccessCard } from '../overlays/GrantDrawers';
import { SettingsSheet } from './SettingsSheet';

export function AccountSheet({ onClose }: { onClose: () => void }) {
  useDb();
  const { mode, setMode } = useTheme();
  const { closeAll, openDrawer } = useOverlay();
  const mine = realMe() ?? me();
  const mineLog = db.AUD.filter((a) => a[1] === mine.n).slice(0, 5);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordHintsVisible, setPasswordHintsVisible] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordBad, setPasswordBad] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoverySent, setRecoverySent] = useState(false);

  const uploadAvatar = async () => {
    if (!session.userId) { setAvatarMessage('Please sign in again before uploading a profile photo.'); return; }
    setAvatarBusy(true);
    setAvatarMessage('');
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'image/webp'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (picked.canceled || !picked.assets?.[0]) return;
      const asset = picked.assets[0];
      const mime = asset.mimeType || (/\.png$/i.test(asset.name) ? 'image/png' : /\.webp$/i.test(asset.name) ? 'image/webp' : /\.jpe?g$/i.test(asset.name) ? 'image/jpeg' : '');
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) {
        setAvatarMessage('Choose a JPG, PNG or WebP image.');
        return;
      }
      if (asset.size && asset.size > 5 * 1024 * 1024) {
        setAvatarMessage('Choose an image smaller than 5 MB.');
        return;
      }
      const response = await fetch(asset.uri);
      if (!response.ok) throw new Error('The selected image could not be read.');
      const blob = await response.blob();
      const extension = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
      const path = session.userId + '/admin-avatar.' + extension;
      const { error: uploadError } = await supabase.storage.from('wallet-avatars').upload(path, blob, {
        contentType: mime,
        upsert: true,
        cacheControl: '3600',
      });
      if (uploadError) throw uploadError;
      const publicUrl = supabase.storage.from('wallet-avatars').getPublicUrl(path).data.publicUrl + '?v=' + Date.now();
      const { error: profileError } = await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      if (profileError) throw profileError;
      session.avatarUrl = publicUrl;
      bump();
      setAvatarMessage('Profile photo updated.');
    } catch (error) {
      setAvatarMessage(error instanceof Error ? error.message : 'Could not upload your profile photo. Please try again.');
    } finally {
      setAvatarBusy(false);
    }
  };

  const sendRecoveryCode = async () => {
    const email = session.email?.trim().toLowerCase() || '';
    if (!email) { setPasswordMessage('Your account email is unavailable. Please sign in again.'); setPasswordBad(true); return; }
    setPasswordBusy(true); setPasswordMessage(''); setPasswordBad(false);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      setRecoverySent(true);
      setPasswordMessage('Recovery code sent. Check your email, including spam.');
      setPasswordBad(false);
    } catch (err) {
      setPasswordMessage(err instanceof Error ? err.message : 'Could not send a recovery code. Please try again.');
      setPasswordBad(true);
    } finally { setPasswordBusy(false); }
  };

  const saveRecoveredPassword = async () => {
    const email = session.email?.trim().toLowerCase() || '';
    const token = recoveryCode.trim();
    const problem = passwordError(newPassword, email);
    if (!/^\d{6}$/.test(token)) { setPasswordMessage('Enter the six-digit recovery code from your email.'); setPasswordBad(true); return; }
    if (problem) { setPasswordMessage(problem); setPasswordBad(true); return; }
    if (newPassword !== confirmPassword) { setPasswordMessage('The new passwords do not match.'); setPasswordBad(true); return; }
    setPasswordBusy(true); setPasswordMessage(''); setPasswordBad(false);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({ email, token, type: 'recovery' });
      if (verifyError) throw verifyError;
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setRecoveryMode(false); setRecoverySent(false); setRecoveryCode('');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setPasswordMessage('Password reset successfully.');
      setPasswordBad(false);
    } catch (err) {
      setPasswordMessage(err instanceof Error ? err.message : 'Could not reset your password. Check the code and try again.');
      setPasswordBad(true);
    } finally { setPasswordBusy(false); }
  };

  const changePassword = async () => {
    const email = session.email?.trim().toLowerCase() || '';
    if (!currentPassword) { setPasswordMessage('Enter your current password.'); setPasswordBad(true); return; }
    const problem = passwordError(newPassword, email);
    if (problem) { setPasswordMessage(problem); setPasswordBad(true); return; }
    if (newPassword !== confirmPassword) { setPasswordMessage('The new passwords do not match.'); setPasswordBad(true); return; }
    if (currentPassword === newPassword) { setPasswordMessage('Choose a password different from your current password.'); setPasswordBad(true); return; }
    if (!email || !session.userId) { setPasswordMessage('Your signed-in account could not be verified. Please sign in again.'); setPasswordBad(true); return; }
    setPasswordBusy(true); setPasswordMessage(''); setPasswordBad(false);
    try {
      // Verify the current password before allowing the password update.
      const { data, error: verifyError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
      if (verifyError || data.user?.id !== session.userId || !data.session) {
        throw new Error('Your current password is incorrect.');
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setPasswordMessage('Password changed successfully.');
      setPasswordBad(false);
    } catch (err) {
      setPasswordMessage(err instanceof Error ? err.message : 'Could not change your password. Please try again.');
      setPasswordBad(true);
    } finally { setPasswordBusy(false); }
  };

  return (
    <DrawerBody title="Account" onClose={onClose}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {session.avatarUrl ? <Image source={{ uri: session.avatarUrl }} style={{ width: 54, height: 54, borderRadius: 27 }} /> : <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: '#0000000A', alignItems: 'center', justifyContent: 'center' }}><AppIcon name="user-round" size={25} /></View>}
          <View style={{ flex: 1 }}>
            <Txt size={13} weight={500}>{mine.n}</Txt>
            <Txt size={10.1} mut>{mine.role} · {mine.st}</Txt>
            {session.email ? <Txt size={10.1} mut>{session.email}</Txt> : null}
          </View>
        </View>
        <Pressable onPress={() => { void uploadAvatar(); }} disabled={avatarBusy} accessibilityRole="button" style={{ marginTop: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#00000008', alignItems: 'center', opacity: avatarBusy ? 0.6 : 1 }}>
          <Txt size={11.5} weight={500}>{avatarBusy ? 'Uploading photo…' : session.avatarUrl ? 'Change profile photo' : 'Upload profile photo'}</Txt>
        </Pressable>
        {avatarMessage ? <Txt size={10.1} mut style={{ marginTop: 6 }}>{avatarMessage}</Txt> : null}
      </Card>
      <Card>
        <CardTitle title="Change password" />
        {passwordMessage ? <NoticeBox bad={passwordBad}>{passwordMessage}</NoticeBox> : null}
        {recoveryMode ? (
          <>
            <Txt size={10.5} mut style={{ marginBottom: 10 }}>We'll email a 6-digit code to {session.email || 'your account email'}.</Txt>
            {recoverySent ? (
              <>
                <AuthField label="Six-digit recovery code" value={recoveryCode} onChangeText={setRecoveryCode} error={undefined} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" />
                <AuthField label="New password" value={newPassword} onChangeText={setNewPassword} error={undefined} password textContentType="newPassword" autoComplete="new-password" />
                <PasswordChecklist value={newPassword} />
                <AuthField label="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} error={undefined} password textContentType="newPassword" autoComplete="new-password" onSubmitEditing={saveRecoveredPassword} />
                <PrimaryButton label="Reset password" onPress={saveRecoveredPassword} busy={passwordBusy} busyLabel="Resetting password…" />
                <OutlineBtn onPress={sendRecoveryCode}>Resend recovery code</OutlineBtn>
              </>
            ) : (
              <PrimaryButton label="Send recovery code" onPress={sendRecoveryCode} busy={passwordBusy} busyLabel="Sending code…" />
            )}
            <OutlineBtn onPress={() => { setRecoveryMode(false); setRecoverySent(false); setRecoveryCode(''); setNewPassword(''); setConfirmPassword(''); setPasswordMessage(''); setPasswordBad(false); }}>Cancel password recovery</OutlineBtn>
          </>
        ) : (
          <>
            <AuthField label="Current password" value={currentPassword} onChangeText={setCurrentPassword} error={undefined} password textContentType="password" autoComplete="current-password" />
            <AuthField label="New password" value={newPassword} onChangeText={(value) => { setNewPassword(value); setPasswordHintsVisible(true); }} error={undefined} password textContentType="newPassword" autoComplete="new-password" onFocus={() => setPasswordHintsVisible(true)} />
            {passwordHintsVisible ? <PasswordChecklist value={newPassword} /> : null}
            <AuthField label="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} error={undefined} password textContentType="newPassword" autoComplete="new-password" onSubmitEditing={changePassword} />
            <PrimaryButton label="Save new password" onPress={changePassword} busy={passwordBusy} busyLabel="Saving password…" />
            <View style={{ height: 6 }} />
            <OutlineBtn onPress={() => { setRecoveryMode(true); setPasswordMessage(''); setPasswordBad(false); }}>Forgot your current password?</OutlineBtn>
          </>
        )}
      </Card>
      <Card>
        <CardTitle title="Appearance" />
        <Seg<ThemeMode> options={['light', 'dark', 'system']} value={mode} onChange={setMode} labels={(v) => v[0].toUpperCase() + v.slice(1)} />
      </Card>
      <MyAccessCard />
      {can(...REQ.permissions) ? (
        <Card>
          <CardTitle title="Preview as" />
          <Txt size={10.1} mut style={{ marginBottom: 6 }}>See the admin the way another person sees it. Nothing is changed.</Txt>
          <Chips options={db.STAFF.filter((s) => s.st === 'Active').map((s) => s.n)} value={session.view} onChange={(n) => { setView(n); closeAll(); }} />
        </Card>
      ) : null}
      <Card>
        <CardTitle title="My activity" />
        <ListRows empty="No activity yet." rows={mineLog.map((a, i) => ({ key: String(i), main: a[0], sub: a[2] }))} />
      </Card>
      {secLv(7) > 0 ? <OutlineBtn onPress={() => { closeAll(); openDrawer((close) => <SettingsSheet onClose={close} />); }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>Open settings<AppIcon name="chevron-right" size={12} /></View></OutlineBtn> : null}
      <OutlineBtn onPress={() => { closeAll(); leaveApp(); bump(); }}>Sign out</OutlineBtn>
    </DrawerBody>
  );
}
