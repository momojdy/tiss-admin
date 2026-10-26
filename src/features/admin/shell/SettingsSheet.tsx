import { useState } from 'react';
import { View } from 'react-native';
import { useTheme, ThemeMode } from '../theme/ThemeContext';
import { useOverlay, DrawerBody } from '../ui/Overlay';
import { Card, CardTitle } from '../ui/Card';
import { ListRows } from '../ui/Lists';
import { Pill, Seg } from '../ui/Controls';
import { Txt } from '../ui/Txt';
import { can } from '../state/access';
import { REQ } from '../state/requirements';
import { useToast } from '../ui/Toast';
import { useNav } from './Nav';

const categories = [
  ['Platform', 'Default language, display currency and supported regions'],
  ['Ecosystem', 'Service availability and service-level configuration'],
  ['Notifications', 'Push, email and after-hours critical alerts'],
  ['Documents and requirements', 'Expiry warnings and second-review rules'],
  ['Workflows', 'Review targets and application assignment'],
  ['Finance', 'Refund confirmation and approval limits'],
  ['Team and access', 'MFA and staff session rules'],
  ['Help and information', 'Support contact and platform information'],
] as const;

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { mode, setMode } = useTheme();
  const { closeAll } = useOverlay();
  const { go } = useNav();
  const toast = useToast();
  const [selected, setSelected] = useState<string | null>(null);
  const destinations: Record<string, () => void> = {
    Platform: () => go('ecosystem'),
    Ecosystem: () => go('ecosystem'),
    Notifications: () => go('operations'),
    'Documents and requirements': () => go('operations'),
    Workflows: () => go('operations'),
    Finance: () => go('finance'),
    'Team and access': () => go('people'),
    'Help and information': () => go('people'),
  };
  return (
    <DrawerBody title="Settings" onClose={onClose}>
      <Card>
        <CardTitle title="Appearance" />
        <Txt size={10.1} mut style={{ marginBottom: 8 }}>Follows your selected appearance mode.</Txt>
        <Seg<ThemeMode> options={['light', 'dark', 'system']} value={mode} onChange={setMode} labels={(value) => value[0].toUpperCase() + value.slice(1)} />
      </Card>
      <ListRows rows={categories.map(([name, description]) => ({
        key: name, main: name, sub: description, right: selected === name ? '⌄' : '›',
        onPress: () => setSelected((current) => current === name ? null : name),
      }))} />
      {selected ? (
        <Card style={{ marginTop: 10 }}>
          <CardTitle title={selected} />
          <Txt size={11} lh={1.4}>This category is present in the HTML specification. The current React Native backend does not expose a verified, server-persisted settings API for it yet, so this panel will not pretend that changes have been saved.</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 6 }}>
            <Pill onPress={() => { const destination = destinations[selected]; closeAll(); destination?.(); }}>Open related workspace ›</Pill>
            {can(...REQ.settings) ? <Pill onPress={() => toast('Server settings endpoint is not implemented; no change was saved.')}>Check settings access</Pill> : null}
          </View>
        </Card>
      ) : null}
      <Txt size={9.5} mut style={{ marginTop: 10 }}>The HTML defines platform-wide settings. Only appearance is currently interactive here; the remaining categories require a server-backed settings contract and audit logging.</Txt>
    </DrawerBody>
  );
}
