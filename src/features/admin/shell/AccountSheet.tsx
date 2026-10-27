import { useState } from 'react';
import { View } from 'react-native';
import { db, bump, useDb } from '../state/db';
import { can, me, realMe, session, setView } from '../state/access';
import { REQ } from '../state/requirements';
import { leaveApp } from '../auth/authLogic';
import { passwordError } from '../auth/authLogic';
import { AuthField, PasswordChecklist, PrimaryButton, NoticeBox } from '../auth/AuthFields';
import { supabase } from '../lib/supabase';
import { useOverlay } from '../ui/Overlay';
import { DrawerBody } from '../ui/Overlay';
import { Card, CardTitle } from '../ui/Card';
import { Chips, OutlineBtn, Seg } from '../ui/Controls';
import { ListRows } from '../ui/Lists';
import { Txt } from '../ui/Txt';
import { useTheme, ThemeMode } from '../theme/ThemeContext';
import { MyAccessCard } from '../overlays/GrantDrawers';

export function AccountSheet({ onClose }: { onClose: () => void }) {
  useDb();
  const { mode, setMode } = useTheme();
  const { closeAll } = useOverlay();
  const mine = realMe() ?? me();
  const mineLog = db.AUD.filter((a) => a[1] === mine.n).slice(0, 5);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordBad, setPasswordBad] = useState(false);

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
        <Txt size={13} weight={500}>{mine.n}</Txt>
        <Txt size={10.1} mut>{mine.role} · {mine.st}</Txt>
        {session.email ? <Txt size={10.1} mut>{session.email}</Txt> : null}
      </Card>
      <Card>
        <CardTitle title="Change password" />
        <Txt size={10.5} mut style={{ marginBottom: 10 }}>Update your password while signed in. Your current password is required to confirm it is you.</Txt>
        {passwordMessage ? <NoticeBox bad={passwordBad}>{passwordMessage}</NoticeBox> : null}
        <AuthField label="Current password" value={currentPassword} onChangeText={setCurrentPassword} error={undefined} password textContentType="password" autoComplete="current-password" />
        <AuthField label="New password" value={newPassword} onChangeText={setNewPassword} error={undefined} password textContentType="newPassword" autoComplete="new-password" />
        <PasswordChecklist value={newPassword} />
        <AuthField label="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} error={undefined} password textContentType="newPassword" autoComplete="new-password" onSubmitEditing={changePassword} />
        <PrimaryButton label="Save new password" onPress={changePassword} busy={passwordBusy} busyLabel="Saving password…" />
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
      <OutlineBtn onPress={() => { closeAll(); leaveApp(); bump(); }}>Sign out</OutlineBtn>
    </DrawerBody>
  );
}
