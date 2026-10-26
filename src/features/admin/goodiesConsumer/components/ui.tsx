/* UI primitives. Every dimension below is copied from the Goodies v24 stylesheet. */
import React, {useMemo, useRef} from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {View, Text, Pressable, ScrollView, TextInput, StyleSheet, ViewStyle, TextStyle, Image, PanResponder} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {light, dark, Theme, BG} from '../theme';
import {S, useGoodies, money, STB, PV, toast, ui} from '../store';
import {Icon} from './Icon';
import {t as tr, ts} from '../i18n';

export const useTheme = (): Theme => {useGoodies(); return S.theme === 'dark' ? dark : light;};

export function T({children, style, size = 14, weight, color, lines, align}: {children?: any; style?: TextStyle; size?: number; weight?: any; color?: string; lines?: number; align?: any}) {
  const th = useTheme();
  return <Text numberOfLines={lines} style={[{fontSize: size, color: color || th.ink, fontWeight: weight}, align ? {textAlign: align} : null, style]}>{typeof children === 'string' ? ts(children) : children}</Text>;
}
export const Mut = (p: any) => {const th = useTheme(); return <T {...p} color={th.mut} />;};

export function Grad({idx = 0, colors, style, children, angle = 135}: {idx?: number; colors?: readonly [string, string]; style?: ViewStyle; children?: any; angle?: number}) {
  const th = useTheme();
  const c = (colors || BG[idx % 5]) as readonly [string, string];
  const start = angle === 110 ? {x: 0, y: 0.3} : {x: 0, y: 0}, end = angle === 110 ? {x: 1, y: 0.7} : {x: 1, y: 1};
  return <LinearGradient colors={c as any} start={start} end={end} style={[style, th.dark && colors == null ? {opacity: 0.85} : null]}>{children}</LinearGradient>;
}

export const bgIdx = (bg: string) => +String(bg).replace('bg', '') || 0;

/* header: circular icon button */
export function Circ({icon, onPress, dot, count, label, color, fill = false}: {icon: string; onPress: () => void; dot?: boolean; count?: number; label: string; color?: string; fill?: boolean}) {
  const th = useTheme();
  return (
    <Pressable accessibilityLabel={label} onPress={onPress} style={{width: 40, height: 40, borderRadius: 20, backgroundColor: th.soft, alignItems: 'center', justifyContent: 'center'}}>
      <Icon name={icon} color={color || th.ink} fill={fill} />
      {dot ? <View style={{position: 'absolute', top: 8, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: th.br, borderWidth: 2, borderColor: th.soft}} /> : null}
      {count ? <View style={{position: 'absolute', top: 2, right: 0, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: th.br, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4}}><Text style={{fontSize: 10.5, fontWeight: '700', color: th.navink}}>{count}</Text></View> : null}
    </Pressable>
  );
}

export function Bar({title, right, onBack, stripe = true}: {title: string; right?: any; onBack: () => void; stripe?: boolean}) {
  const th = useTheme(), ins = useSafeAreaInsets();
  return (
    <>
      <View style={{height: 100, justifyContent: 'flex-end', paddingTop: ins.top, paddingHorizontal: 16, paddingBottom: 10, backgroundColor: th.bg}}>
        <View style={{height: 40, flexDirection: 'row', alignItems: 'center', gap: 10}}>
          <Pressable accessibilityLabel={tr('back')} onPress={onBack} style={{width: 40, height: 40, borderRadius: 20, backgroundColor: th.soft, alignItems: 'center', justifyContent: 'center'}}><Icon name="chevL" color={th.ink} /></Pressable>
          <T size={20} weight="800" style={{flex: 1}}>{title}</T>
          {right}
        </View>
      </View>
      {stripe ? <><View style={{height: 20, backgroundColor: '#FD802E'}} /><View style={{height: 15}} /></> : null}
    </>
  );
}

export function Sh({title, link, onLink, right}: {title: string; link?: string; onLink?: () => void; right?: any}) {
  const th = useTheme();
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 24, paddingBottom: 10, gap: 8}}>
      <T size={19} weight="800" style={{flexShrink: 1}}>{title}</T>
      {link ? <Pressable onPress={onLink}><T size={13} weight="700" color={th.br}>{link}</T></Pressable> : right || null}
    </View>
  );
}

export const Rail = ({children, gap = 10, style}: any) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[{paddingHorizontal: 16, gap}, style]}>{children}</ScrollView>
);

export function Chip({label, on, onPress, color}: {label: string; on?: boolean; onPress: () => void; color?: string}) {
  const th = useTheme();
  return (
    <Pressable onPress={onPress} style={{height: 34, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1, borderColor: on ? th.br : th.line, backgroundColor: on ? th.brt : th.card, alignItems: 'center', justifyContent: 'center'}}>
      <T size={13} weight="600" color={color || (on ? th.chipOnText : th.ink)}>{label}</T>
    </Pressable>
  );
}
export const Chips = ({list, on, onPick}: {list: [string, string][]; on: string; onPick: (k: string) => void}) => (
  <Rail gap={8} style={{paddingBottom: 4}}>{list.map(x => <Chip key={x[0]} label={x[1]} on={on === x[0]} onPress={() => onPick(x[0])} />)}</Rail>
);

export function Cta({label, onPress, ghost, disabled, small}: {label: string; onPress: () => void; ghost?: boolean; disabled?: boolean; small?: boolean}) {
  const th = useTheme();
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({pressed}) => ({height: small ? 42 : 52, borderRadius: 16, backgroundColor: ghost ? th.soft : th.br, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.45 : 1, transform: [{scale: pressed ? 0.94 : 1}], flex: small ? 1 : undefined})}>
      <T size={small ? 14 : 15.5} weight="800" color={ghost ? th.ink : '#fff'}>{label}</T>
    </Pressable>
  );
}

export const Card = ({children, style}: any) => {const th = useTheme(); return <View style={[{backgroundColor: th.card, borderWidth: 1, borderColor: th.line, borderRadius: 18, padding: 14, marginBottom: 12}, style]}>{children}</View>;};
export const Row = ({children, style, sp}: any) => <View style={[{flexDirection: 'row', alignItems: 'center', gap: 12}, sp ? {justifyContent: 'space-between'} : null, style]}>{children}</View>;
export const Badge = ({label, green, red}: {label: string; green?: boolean; red?: boolean}) => {
  const th = useTheme();
  return <View style={{alignSelf: 'flex-start', borderRadius: 9, paddingHorizontal: 9, paddingVertical: 3, backgroundColor: red ? th.red : green ? 'rgba(14,159,110,.14)' : th.brt}}><T size={11.5} weight="800" color={red ? '#fff' : green ? th.grn : th.brd}>{label}</T></View>;
};
export const Ttl = ({children}: any) => <T size={15} weight="800" style={{marginTop: 18, marginBottom: 8}}>{children}</T>;

export function Empty({emoji, icon, title, text, button, onPress}: {emoji?: string; icon?: string; title: string; text?: string; button?: string; onPress?: () => void}) {
  const th = useTheme();
  return (
    <View style={{alignItems: 'center', paddingVertical: 70, paddingHorizontal: 30}}>
      {icon ? <View style={{width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(253,128,46,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 4}}><Icon name={icon} size={30} color="#FD802E" /></View> : emoji ? <Text style={{fontSize: 64}}>{emoji}</Text> : null}
      <T size={19} weight="800" style={{marginTop: 12, marginBottom: 6}}>{title}</T>
      {text ? <T size={14} color={th.mut} align="center" style={{marginBottom: 20}}>{text}</T> : null}
      {button ? <View style={{alignSelf: 'stretch'}}><Cta label={button} onPress={onPress as any} /></View> : null}
    </View>
  );
}

export function Switch({on, onPress, label}: {on: boolean; onPress: () => void; label: string}) {
  const th = useTheme();
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{checked: on}} accessibilityLabel={label} onPress={onPress} style={{width: 46, height: 28, borderRadius: 14, backgroundColor: on ? th.br : th.line}}>
      <View style={{position: 'absolute', top: 3, left: on ? 21 : 3, width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff'}} />
    </Pressable>
  );
}

export function Radio({on, onPress, children}: {on: boolean; onPress: () => void; children: any}) {
  const th = useTheme();
  return (
    <Pressable onPress={onPress} style={{flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14, borderWidth: 1.5, borderColor: on ? th.br : th.line, backgroundColor: on ? th.brt : 'transparent', borderRadius: 16, marginBottom: 10}}>
      <View style={{width: 20, height: 20, borderRadius: 10, borderWidth: on ? 6 : 2, borderColor: on ? th.br : th.line}} />
      <View style={{flex: 1}}>{children}</View>
    </Pressable>
  );
}

export function Seg({list, on, onPick}: {list: [string, string][]; on: string; onPick: (k: string) => void}) {
  const th = useTheme();
  return (
    <View style={{flexDirection: 'row', backgroundColor: th.soft, borderRadius: 14, padding: 4, gap: 4}}>
      {list.map(x => (
        <Pressable key={x[0]} onPress={() => onPick(x[0])} style={{flex: 1, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: on === x[0] ? th.card : 'transparent', shadowColor: '#000', shadowOpacity: on === x[0] ? 0.12 : 0, shadowRadius: 2, shadowOffset: {width: 0, height: 1}}}>
          <T size={13.5} weight="700" color={on === x[0] ? th.ink : th.mut}>{x[1]}</T>
        </Pressable>
      ))}
    </View>
  );
}

export function Stepper({q, onMinus, onPlus}: {q: number; onMinus: () => void; onPlus: () => void}) {
  const th = useTheme();
  const b = (icon: string, f: () => void, lb: string) => <Pressable accessibilityLabel={lb} onPress={f} style={{width: 30, height: 30, borderRadius: 15, backgroundColor: th.card, alignItems: 'center', justifyContent: 'center'}}><Icon name={icon} size={16} color={th.ink} /></Pressable>;
  return <View style={{flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: th.soft, borderRadius: 20, padding: 4}}>{b('minus', onMinus, 'Less')}<T size={14} weight="800" style={{minWidth: 16, textAlign: 'center'}}>{q}</T>{b('plus', onPlus, 'More')}</View>;
}

export function Input({label, value, onChange, placeholder, multiline, keyboard}: {label?: string; value: string; onChange: (s: string) => void; placeholder?: string; multiline?: boolean; keyboard?: any}) {
  const th = useTheme();
  const [f, setF] = React.useState(false);
  return (
    <View>
      {label ? <T size={13} weight="700" style={{marginTop: 10, marginBottom: 5}}>{label}</T> : null}
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={th.mut} multiline={multiline} keyboardType={keyboard} onFocus={() => setF(true)} onBlur={() => setF(false)}
        style={{fontSize: 15, color: th.ink, backgroundColor: th.soft, borderWidth: 1, borderColor: f ? th.br : th.line, borderRadius: 12, padding: 12, minHeight: multiline ? 84 : undefined, textAlignVertical: multiline ? 'top' : 'center'}} />
    </View>
  );
}

export const Tile = ({e, bg, size = 56, photo}: {e: string; bg: string; size?: number; photo?: string | null}) => (
  <Grad idx={bgIdx(bg)} style={{width: size, height: size, borderRadius: 16, alignItems: 'center', justifyContent: 'center'}}>
    {photo ? <Image source={{uri: photo}} style={{width: size, height: size, borderRadius: 16}} /> : <Text style={{fontSize: size * 0.54}}>{e}</Text>}
  </Grad>
);

/* sheet rendered by the shell */
export function SheetBox({children, large = false, compact = false, onClose}: any) {
  const th = useTheme();
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponderCapture: (_e, g) => g.dy > 14 && Math.abs(g.dy) > Math.abs(g.dx) * 1.2,
    onPanResponderRelease: (_e, g) => { if (g.dy > 65 && onClose) onClose(); },
  }), [onClose]);
  return (
    <View {...pan.panHandlers} style={{backgroundColor: th.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20, height: compact || large ? '100%' : undefined, maxHeight: '100%', flexShrink: 1, minHeight: 0, overflow: 'hidden'}}>
      <View style={{height: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8}}>
        <View style={{width: 40, height: 4, borderRadius: 2, backgroundColor: th.line}} />
        {onClose ? <Pressable accessibilityRole="button" accessibilityLabel="Close popup" onPress={onClose} hitSlop={12} style={{position: 'absolute', right: 0, top: 2, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: th.soft}}><Text style={{fontSize: 20, lineHeight: 22, color: th.ink}}>×</Text></Pressable> : null}
      </View>
      {children}
    </View>
  );
}

export const heartBtn = (id: string, on: boolean, onPress: () => void, label?: string) => {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label || (on ? "Remove from favorites" : "Save to favorites")} onPress={onPress} style={{position: 'absolute', top: 10, right: 10, width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center'}}>
      <Icon name="heart" size={17} color={on ? '#FD802E' : '#1B1B1F'} fill={on} />
    </Pressable>
  );
};
export {money, STB, PV, toast, ui, S};
