import { useEffect, useState } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOverlay, DrawerBody } from '../ui/Overlay';
import { Card, CardTitle } from '../ui/Card';
import { ListRows } from '../ui/Lists';
import { Pill, OutlineBtn } from '../ui/Controls';
import { Txt } from '../ui/Txt';
import { can, session } from '../state/access';
import { REQ } from '../state/requirements';
import { useToast } from '../ui/Toast';
import { useNav } from './Nav';
import { useForm, FieldType } from '../ui/FormSheet';
import { aud, bump } from '../state/db';

const STORAGE_KEY = '@wantiss-admin-settings-v1';
type SettingValue = string | boolean;
type SettingField = { id: string; label: string; type: FieldType; options?: string[]; required?: boolean; value: SettingValue; placeholder?: string };
const defaults: Record<string, SettingField[]> = {
  Appearance: [
        { id: 'dens', label: 'Table density', type: 'select', options: ['Comfortable', 'Compact'], value: 'Comfortable' },
    { id: 'land', label: 'Landing page', type: 'select', options: ['Overview', 'Operations', 'Ecosystem', 'Content', 'Finance', 'Analytics', 'People'], value: 'Overview' },
  ],
  Platform: [
    { id: 'lang', label: 'Default language', type: 'select', options: ['English', 'Français', 'Kreyòl', 'Español', '简体中文'], value: 'English' },
    { id: 'cur', label: 'Display currency', type: 'select', options: ['USD', 'HTG'], value: 'USD' },
    { id: 'reg', label: 'Supported regions', type: 'text', value: 'Haiti, diaspora' },
  ],
  Notifications: [
    { id: 'push', label: 'Push notifications', type: 'check', value: true },
    { id: 'mail', label: 'Email notifications', type: 'check', value: true },
    { id: 'crit', label: 'Critical alerts only after hours', type: 'check', value: false },
  ],
  'Documents and requirements': [
    { id: 'exp', label: 'Warn before document expiry (days)', type: 'number', value: '30', required: true },
    { id: 'rev', label: 'Require a second reviewer for licences', type: 'check', value: false },
  ],
  Workflows: [
    { id: 'sla', label: 'Review target (hours)', type: 'number', value: '48', required: true },
    { id: 'asg', label: 'Auto-assign new applications', type: 'check', value: false },
  ],
  Finance: [
    { id: 'conf', label: 'Require confirmation for refunds', type: 'check', value: true },
    { id: 'lim', label: 'Refund approval limit (USD)', type: 'number', value: '200', required: true },
  ],
  'Team and access': [
    { id: 'mfa', label: 'Require MFA for staff', type: 'check', value: true },
    { id: 'sess', label: 'Session length (minutes)', type: 'number', value: '30', required: true },
  ],
  'Help and information': [
    { id: 'sup', label: 'Support contact', type: 'text', value: 'support@wantiss.example' },
  ],
};
const categories = [
  ['Appearance', 'Table density and landing page'],
  ['Platform', 'Default language, display currency and supported regions'],
  ['Ecosystem', 'Service availability and service-level configuration'],
  ['Notifications', 'Push, email and after-hours critical alerts'],
  ['Documents and requirements', 'Expiry warnings and second-review rules'],
  ['Workflows', 'Review targets and application assignment'],
  ['Finance', 'Refund confirmation and approval limits'],
  ['Team and access', 'MFA and staff session rules'],
  ['Help and information', 'Support contact and platform information'],
] as const;
const personal = new Set(['Appearance', 'Notifications']);
const initial = () => Object.fromEntries(Object.entries(defaults).map(([key, fields]) => [key, Object.fromEntries(fields.map((field) => [field.id, field.value]))])) as Record<string, Record<string, SettingValue>>;

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { closeAll } = useOverlay();
  const { go } = useNav();
  const toast = useToast();
  const form = useForm();
  const [selected, setSelected] = useState<string | null>(null);
  const [settings, setSettings] = useState<Record<string, Record<string, SettingValue>>>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!mounted) return;
      if (raw) {
        try {
          const saved = JSON.parse(raw) as Record<string, Record<string, SettingValue>>;
          setSettings({ ...initial(), ...saved });
        } catch { /* keep defaults if local data is malformed */ }
      }
      setLoaded(true);
    }).catch(() => { if (mounted) setLoaded(true); });
    return () => { mounted = false; };
  }, []);

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

  const editCategory = (name: string) => {
    if (!personal.has(name) && !can(...REQ.settings)) { toast('You need Manage settings access to edit ' + name + '.'); return; }
    const fields = (defaults[name] || [{ id: 'note', label: 'Configuration note', type: 'textarea' as const, value: '' }]).map((field) => ({
      ...field,
      value: settings[name]?.[field.id] ?? field.value,
    }));
    if (name === 'Ecosystem') {
      fields.push({ id: 'note', label: 'Service configuration note', type: 'textarea', value: String(settings[name]?.note || '') } as SettingField);
    }
    form({
      title: name + ' settings',
      sub: personal.has(name) ? 'These preferences apply to this admin on this device.' : 'Saved preferences are local to this device until a server-backed settings endpoint is implemented. They do not change production platform behavior.',
      fields,
      buttons: [{ label: 'Save settings', key: 'save', primary: true }],
      onSubmit: async (_key, values) => {
        const next = { ...settings, [name]: { ...(settings[name] || {}), ...values } as Record<string, SettingValue> };
        setSettings(next);
        try {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          return 'Settings could not be saved on this device.';
        }
        aud('Settings changed · ' + name, session.view);
        bump();
        toast(personal.has(name) ? name + ' preferences saved on this device.' : name + ' saved locally only; production behavior is unchanged.');
      },
    });
  };

  return (
    <DrawerBody title="Settings" onClose={onClose}>
      <ListRows rows={categories.map(([name, description]) => ({
        key: name, main: name, sub: description, right: selected === name ? '⌄' : '›',
        onPress: () => setSelected((current) => current === name ? null : name),
      }))} />
      {selected ? (
        <Card style={{ marginTop: 10 }}>
          <CardTitle title={selected} />
          <Txt size={10.1} mut lh={1.4}>{personal.has(selected) ? 'Personal preferences are stored on this device.' : 'Platform settings remain local until a server endpoint is connected.'}</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 6 }}>
            <OutlineBtn primary onPress={() => editCategory(selected)}>Edit settings</OutlineBtn>
            {destinations[selected] ? <OutlineBtn onPress={() => { const destination = destinations[selected]; closeAll(); destination?.(); }}>Open related workspace</OutlineBtn> : null}
          </View>
          {!personal.has(selected) ? <Txt size={9.5} mut style={{ marginTop: 8 }}>No production setting will be changed by saving this form.</Txt> : null}
        </Card>
      ) : null}
      {!loaded ? <Txt size={9.5} mut style={{ marginTop: 10 }}>Loading saved preferences…</Txt> : null}
    </DrawerBody>
  );
}
