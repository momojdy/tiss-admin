import { Pressable, View } from 'react-native';
import { AvatarStack } from './Bits';
import { Txt } from './Txt';
import { useTheme } from '../theme/ThemeContext';

export type DealTone = '' | 'o' | 'g' | 'y' | 'w';

export function Deal({ tone = '', top, title, sub, value, meta, onPress, minWidth }: {
  tone?: DealTone; top: string; title: string; sub?: string; value?: string; meta?: string; onPress?: () => void; minWidth?: number;
}) {
  const { c } = useTheme();
  const bg = tone === 'o' ? c.or : tone === 'g' ? c.forest : tone === 'y' ? '#f1c94a' : tone === 'w' ? c.card : c.night;
  const fg = tone === 'y' ? '#161a17' : tone === 'w' ? c.ink : '#fff';
  const body = (
    <View style={{ minHeight: 112, minWidth, borderRadius: 16, padding: 9, justifyContent: 'space-between', backgroundColor: bg, flex: minWidth ? undefined : 1,
      shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 7, shadowOffset: { width: 0, height: 6 }, elevation: 3, ...(tone === 'w' ? { borderWidth: 1, borderColor: c.bd } : null) }}>
      <Txt size={9.5} color={fg} style={{ opacity: 0.7 }}>{top}</Txt>
      <View style={{ position: 'absolute', right: 7, top: 7, width: 17, height: 17, borderRadius: 9, borderWidth: 1, borderColor: tone === 'y' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' }}>
        <Txt size={9} color={fg}>···</Txt>
      </View>
      <View style={{ marginTop: 11 }}>
        <Txt size={14} lh={1.1} ls={-0.1} color={fg} style={{ marginBottom: 3 }}>{title}</Txt>
        {sub ? <Txt size={9.5} color={fg} style={{ opacity: 0.65 }}>{sub}</Txt> : null}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View>
          {value ? <Txt size={14.7} weight={500} color={fg}>{value}</Txt> : null}
          {meta ? <Txt size={9.5} color={fg} style={{ opacity: 0.7 }}>{meta}</Txt> : null}
        </View>
        <AvatarStack />
      </View>
    </View>
  );
  return onPress ? <Pressable onPress={onPress} style={{ flex: minWidth ? undefined : 1 }} accessibilityRole="button">{body}</Pressable> : body;
}

export function TileGrid({ cols = 3, gap = 7, children }: { cols?: number; gap?: number; children: React.ReactNode[] }) {
  const items = (Array.isArray(children) ? children : [children]).flat().filter(Boolean) as React.ReactNode[];
  const rows: React.ReactNode[][] = [];
  for (let i = 0; i < items.length; i += cols) rows.push(items.slice(i, i + cols));
  return (
    <View style={{ gap }}>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', gap }}>
          {r.map((x, j) => <View key={j} style={{ flex: 1 }}>{x}</View>)}
          {r.length < cols ? Array.from({ length: cols - r.length }).map((_, k) => <View key={'e' + k} style={{ flex: 1 }} />) : null}
        </View>
      ))}
    </View>
  );
}
