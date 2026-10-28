import { ReactNode, useState } from 'react';
import { Pressable, StyleProp, TextInput, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { toneColor, STATUS_TONE, Tone } from '../theme/tokens';
import { Txt } from './Txt';

export const Dot = ({ color, size = 6, style }: { color?: Tone; size?: number; style?: StyleProp<ViewStyle> }) => {
  const { c } = useTheme();
  return <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: toneColor(c, color ?? 'or'), marginRight: 3 }, style]} />;
};

export function IconBtn({ label, onPress, size = 30, bg, borderless, fontSize = 12.3, color, a11y, children, style }: {
  label?: string; onPress?: () => void; size?: number; bg?: string; borderless?: boolean; fontSize?: number; color?: string; a11y?: string; children?: ReactNode; style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const body = (
    <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg ?? c.card, borderColor: c.bd, borderWidth: borderless ? 0 : 1, alignItems: 'center', justifyContent: 'center' }, style]}>
      {children ?? <Txt size={fontSize} color={color}>{label}</Txt>}
    </View>
  );
  return onPress ? <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y ?? label} hitSlop={6}>{body}</Pressable> : body;
}

export function Pill({ children, on, onPress, style, textStyle, size = 9.5 }: { children: ReactNode; on?: boolean; onPress?: () => void; style?: StyleProp<ViewStyle>; textStyle?: object; size?: number }) {
  const { c } = useTheme();
  const body = (
    <View style={[{ flexDirection: 'row', alignItems: 'center', backgroundColor: on ? c.ink : c.card, borderColor: c.bd, borderWidth: 1, borderRadius: 99, paddingVertical: 5, paddingHorizontal: 10 }, style]}>
      {typeof children === 'string' || typeof children === 'number' ? <Txt size={size} color={on ? c.on : c.ink} style={textStyle}>{children}</Txt> : children}
    </View>
  );
  return onPress ? <Pressable onPress={onPress} accessibilityRole="button">{body}</Pressable> : body;
}

export function StatusPill({ label, tone, small, onPress }: { label: string; tone?: Tone; small?: boolean; onPress?: () => void }) {
  return (
    <Pill onPress={onPress} style={small ? { paddingVertical: 3, paddingHorizontal: 7 } : undefined}>
      <Dot color={tone ?? STATUS_TONE[label] ?? 'ye'} />
      <Txt size={9.5}>{label}</Txt>
    </Pill>
  );
}

export function Btn({ children, onPress, style, disabled }: { children: string; onPress?: () => void; style?: StyleProp<ViewStyle>; disabled?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" style={[{ backgroundColor: c.ink, borderRadius: 99, paddingVertical: 8, paddingHorizontal: 13, opacity: disabled ? 0.5 : 1 }, style]}>
      <Txt size={10.6} color={c.on}>{children}</Txt>
    </Pressable>
  );
}

export function OutlineBtn({ children, onPress, primary, style, disabled }: { children: string; onPress?: () => void; primary?: boolean; style?: StyleProp<ViewStyle>; disabled?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" style={[{ paddingVertical: 8, paddingHorizontal: 13, borderRadius: 99, borderWidth: 1, borderColor: c.bd, backgroundColor: primary ? c.ink : c.card, marginRight: 6, marginBottom: 6, opacity: disabled ? 0.5 : 1 }, style]}>
      <Txt size={10.1} color={primary ? c.on : c.ink}>{children}</Txt>
    </Pressable>
  );
}

/** Wrap OutlineBtn rows (`<div>` of `.ob`). */
export const ButtonRow = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => (
  <View style={[{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }, style]}>{children}</View>
);

/** `.seg`: segmented control. Pass `value` and `onChange` for controlled use. */
export function Seg<T extends string | number>({ options, value, onChange, labels }: { options: readonly T[]; value: T; onChange?: (v: T) => void; labels?: (v: T) => string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.inset, borderRadius: 99, padding: 2, alignSelf: 'flex-start' }}>
      {options.map((o) => {
        const on = o === value;
        return (
          <Pressable key={String(o)} onPress={() => onChange?.(o)} accessibilityRole="button" accessibilityState={{ selected: on }}
            style={[{ paddingVertical: 4, paddingHorizontal: 9, borderRadius: 99 }, on ? { backgroundColor: c.card, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 1.5, shadowOffset: { width: 0, height: 1 }, elevation: 1 } : null]}>
            <Txt size={10.1} color={c.ink}>{labels ? labels(o) : String(o)}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chips<T extends string>({ options, value, onChange }: { options: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 9 }}>
      {options.map((o) => <Pill key={o} on={o === value} onPress={() => onChange(o)}>{o}</Pill>)}
    </View>
  );
}

export const Row = ({ children, style, wrap }: { children: ReactNode; style?: StyleProp<ViewStyle>; wrap?: boolean }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 9 }, wrap ? { flexWrap: 'wrap' } : null, style]}>{children}</View>
);

export function Tag({ children, tone }: { children: string; tone?: 'g' | 'r' | '' }) {
  const { c } = useTheme();
  const bg = tone === 'g' ? c.gr : tone === 'r' ? c.or : c.ye;
  const fg = tone ? '#fff' : '#161a17';
  return (
    <View style={{ backgroundColor: bg, borderRadius: 99, paddingVertical: 2, paddingHorizontal: 6, marginLeft: 3 }}>
      <Txt size={9.5} weight={500} color={fg}>{children}</Txt>
    </View>
  );
}

export function SearchInput({ value, onChangeText, placeholder }: { value: string; onChangeText: (v: string) => void; placeholder: string }) {
  const { c } = useTheme();
  return (
    <TextInput value={value} onChangeText={onChangeText} placeholder={'⌕  ' + placeholder} placeholderTextColor={c.mut} accessibilityLabel={placeholder}
      autoCapitalize="none" autoCorrect={false} clearButtonMode="while-editing"
      style={{ flex: 1, backgroundColor: c.card, borderColor: c.bd, borderWidth: 1, borderRadius: 99, paddingVertical: 9, paddingHorizontal: 12, color: c.ink, fontSize: 14 }} />
  );
}

export function SelectMenu<T extends string>({ label, options, value, onChange, placeholder }: { label?: string; options: readonly T[]; value: T; onChange: (value: T) => void; placeholder?: string }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginBottom: 9 }}>
      {label ? <Txt size={10} weight={500} style={{ marginBottom: 5 }}>{label}</Txt> : null}
      <Pressable accessibilityRole="button" accessibilityLabel={label || placeholder || 'Choose option'} accessibilityState={{ expanded: open }} onPress={() => setOpen((current) => !current)}
        style={{ minHeight: 40, borderWidth: 1, borderColor: c.bd, borderRadius: 10, backgroundColor: c.card, paddingHorizontal: 11, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Txt size={11.2} weight={500}>{value || placeholder || 'Select'}</Txt>
        <Txt size={11} mut>{open ? '⌃' : '⌄'}</Txt>
      </Pressable>
      {open ? <View style={{ marginTop: 4, borderWidth: 1, borderColor: c.bd, borderRadius: 10, backgroundColor: c.card, overflow: 'hidden' }}>
        {options.map((option) => <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: option === value }} onPress={() => { onChange(option); setOpen(false); }}
          style={{ paddingHorizontal: 11, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: c.bd, backgroundColor: option === value ? c.inset : c.card }}>
          <Txt size={10.8} weight={option === value ? 500 : 400}>{option}</Txt>
        </Pressable>)}
      </View> : null}
    </View>
  );
}

export function CountTag({ n }: { n: number }) {
  const { c } = useTheme();
  return <View style={{ backgroundColor: c.inset, borderRadius: 99, paddingVertical: 2, paddingHorizontal: 6, marginLeft: 3 }}><Txt size={9.5} weight={500}>{String(n)}</Txt></View>;
}
