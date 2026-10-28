import { ReactNode, useState } from 'react';
import { Pressable, TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Txt } from '../ui/Txt';
import { PASSWORD_RULES, passwordScore } from './authLogic';

export interface AuthFieldProps extends Omit<TextInputProps, 'onChange'> {
  label: string; error?: string; value: string; onChangeText: (v: string) => void; password?: boolean; readOnly?: boolean;
}

export function AuthField({ label, error, value, onChangeText, password, readOnly, onFocus: onFieldFocus, onBlur: onFieldBlur, ...rest }: AuthFieldProps) {
  const { c } = useTheme();
  const [show, setShow] = useState(false);
  const [focus, setFocus] = useState(false);
  return (
    <View>
      <Txt size={12} mut style={{ marginTop: 10, marginBottom: 4 }}>{label}</Txt>
      <View>
        <TextInput
          {...rest} value={value} onChangeText={onChangeText} editable={!readOnly} secureTextEntry={password && !show}
          accessibilityLabel={label} placeholderTextColor={c.mut} autoCapitalize="none" autoCorrect={false} spellCheck={false}
          onFocus={(event) => { setFocus(true); onFieldFocus?.(event); }} onBlur={(event) => { setFocus(false); onFieldBlur?.(event); }}
          style={{ height: 48, borderRadius: 14, paddingHorizontal: 14, paddingRight: password ? 72 : 14, fontSize: 16, color: c.ink, backgroundColor: c.card,
            borderWidth: 1, borderColor: error ? c.or : focus ? c.gr : c.bd }}
        />
        {password ? (
          <Pressable onPress={() => setShow((s) => !s)} accessibilityRole="button" accessibilityLabel={show ? 'Hide password' : 'Show password'}
            style={{ position: 'absolute', right: 6, top: 6, height: 36, minWidth: 52, borderRadius: 99, backgroundColor: c.inset, alignItems: 'center', justifyContent: 'center' }}>
            <Txt size={12}>{show ? 'Hide' : 'Show'}</Txt>
          </Pressable>
        ) : null}
      </View>
      <View accessibilityLiveRegion="polite">{error ? <Txt size={12} color={c.or} lh={1.35} style={{ marginTop: 4, marginHorizontal: 2 }}>{error}</Txt> : null}</View>
    </View>
  );
}

export function PasswordChecklist({ value }: { value: string }) {
  const { c } = useTheme();
  const sc = passwordScore(value);
  return (
    <View>
      <View style={{ height: 4, borderRadius: 4, backgroundColor: c.inset, marginTop: 8, marginBottom: 6, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${sc * 25}%`, backgroundColor: sc < 3 ? c.or : sc === 3 ? c.ye : c.gr }} />
      </View>
      {PASSWORD_RULES.map((r, i) => {
        const ok = r[1](value);
        return <Txt key={i} size={12} color={ok ? c.gr : c.mut} style={{ paddingVertical: 2, paddingLeft: 2 }}>{(ok ? '●  ' : '○  ') + r[0]}</Txt>;
      })}
    </View>
  );
}

export function PrimaryButton({ label, onPress, busy, busyLabel }: { label: string; onPress: () => void; busy?: boolean; busyLabel?: string }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={busy} accessibilityRole="button" style={{ height: 48, borderRadius: 99, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center', marginTop: 12, opacity: busy ? 0.6 : 1 }}>
      <Txt size={15} color={c.on}>{busy ? busyLabel ?? 'Please wait…' : label}</Txt>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ height: 44, borderRadius: 99, borderWidth: 1, borderColor: c.bd, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
      <Txt size={14}>{label}</Txt>
    </Pressable>
  );
}

export function LinkText({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="link" style={{ paddingVertical: 10 }}>
      <Txt size={13} color={disabled ? c.mut : c.gr} style={{ textDecorationLine: disabled ? 'none' : 'underline' }}>{label}</Txt>
    </Pressable>
  );
}

export function NoticeBox({ children, bad }: { children: ReactNode; bad?: boolean }) {
  const { c } = useTheme();
  return (
    <View accessibilityRole="alert" style={{ backgroundColor: c.card, borderColor: bad ? c.or : c.bd, borderWidth: 1, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 10 }}>
      <Txt size={13} color={bad ? c.or : c.ink}>{children}</Txt>
    </View>
  );
}

export function BigBadge({ glyph, tone }: { glyph: ReactNode; tone?: 'ok' | 'bad' }) {
  const { c } = useTheme();
  return (
    <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: tone === 'ok' ? c.gr : tone === 'bad' ? c.or : c.card, borderWidth: 1, borderColor: c.bd, alignItems: 'center', justifyContent: 'center', marginTop: 4, marginBottom: 14 }}>
      <Txt size={22} color={tone ? '#fff' : c.ink}>{glyph}</Txt>
    </View>
  );
}
