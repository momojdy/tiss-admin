import { ReactNode } from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { IconBtn } from './Controls';
import { Txt } from './Txt';

export interface ListRowSpec {
  main: ReactNode; sub?: string; right?: ReactNode; onPress?: () => void; key?: string;
}

/** `AL([...])`: the divided list used inside cards and drawers (`.al`). */
export function ListRows({ rows, size = 10.1, empty }: { rows: ListRowSpec[]; size?: number; empty?: string }) {
  const { c } = useTheme();
  if (!rows.length && empty) return <Txt size={12} mut>{empty}</Txt>;
  return (
    <View>
      {rows.map((r, i) => {
        const body = (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, borderBottomWidth: i === rows.length - 1 ? 0 : 1, borderBottomColor: c.bd, gap: 8 }}>
            <View style={{ flex: 1 }}>
              {typeof r.main === 'string' ? <Txt size={size}>{r.main}</Txt> : r.main}
              {r.sub ? <Txt size={size} mut>{r.sub}</Txt> : null}
            </View>
            {r.right !== undefined ? (typeof r.right === 'string' ? <Txt size={size}>{r.right}</Txt> : r.right) : null}
          </View>
        );
        return r.onPress ? <Pressable key={r.key ?? i} onPress={r.onPress} accessibilityRole="button">{body}</Pressable> : <View key={r.key ?? i}>{body}</View>;
      })}
    </View>
  );
}

/** Bold-emphasised right side text: `129 <b>$12,480</b>`. */
export const Emph = ({ lead, bold, color }: { lead?: string; bold: string; color?: string }) => (
  <Txt size={10.1}>{lead ? lead + ' ' : ''}<Txt size={10.1} weight={600} color={color}>{bold}</Txt></Txt>
);

/** `KV([[label, value], ...])`: the receipt-style key/value card (`.pp`). */
export function KeyValue({ rows }: { rows: [string, ReactNode][] }) {
  const { c } = useTheme();
  return (
    <View style={{ backgroundColor: c.card, borderRadius: 18, padding: 14, marginVertical: 10, shadowColor: '#3c321e', shadowOpacity: 0.08, shadowRadius: 9, shadowOffset: { width: 0, height: 6 }, elevation: 2 }}>
      {rows.map(([k, v], i) => (
        <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, gap: 10 }}>
          <Txt size={10.1} mut>{k}</Txt>
          <View style={{ flexShrink: 1, alignItems: 'flex-end' }}>{typeof v === 'string' || typeof v === 'number' ? <Txt size={10.1} align="right">{v}</Txt> : v}</View>
        </View>
      ))}
    </View>
  );
}

/** `.fl`: icon, small caption, value, optional trailing icon. */
export function FieldRow({ icon, label, children, trailing, onTrailing }: { icon?: string; label: string; children: ReactNode; trailing?: string; onTrailing?: () => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: c.bd }}>
      {icon ? <Txt size={10.1} mut>{icon}</Txt> : null}
      <View style={{ flex: 1 }}>
        <Txt size={9.5} mut>{label}</Txt>
        {typeof children === 'string' ? <Txt size={10.1}>{children}</Txt> : children}
      </View>
      {trailing ? <IconBtn size={20} fontSize={10.1} label={trailing} onPress={onTrailing} /> : null}
    </View>
  );
}

export interface Column { title: string; flex?: number; align?: 'left' | 'right' | 'center' }

/** `.tbl`: simple flex-column table. Cells may be strings or nodes. */
export function Table({ columns, rows, onRow, style }: { columns: Column[]; rows: { key?: string; cells: ReactNode[]; onPress?: () => void }[]; onRow?: (i: number) => void; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View style={style}>
      <View style={{ flexDirection: 'row' }}>
        {columns.map((col, i) => (
          <View key={i} style={{ flex: col.flex ?? 1, paddingVertical: 5, paddingHorizontal: 3 }}>
            <Txt size={9.5} mut align={col.align}>{col.title}</Txt>
          </View>
        ))}
      </View>
      {rows.map((r, ri) => {
        const body = (
          <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: c.bd, alignItems: 'center' }}>
            {r.cells.map((cell, i) => (
              <View key={i} style={{ flex: columns[i]?.flex ?? 1, paddingVertical: 7, paddingHorizontal: 3, alignItems: columns[i]?.align === 'right' ? 'flex-end' : columns[i]?.align === 'center' ? 'center' : 'flex-start' }}>
                {typeof cell === 'string' || typeof cell === 'number' ? <Txt size={9.5} weight={i === 0 ? 600 : 400}>{cell}</Txt> : cell}
              </View>
            ))}
          </View>
        );
        const press = r.onPress ?? (onRow ? () => onRow(ri) : undefined);
        return press ? <Pressable key={r.key ?? ri} onPress={press}>{body}</Pressable> : <View key={r.key ?? ri}>{body}</View>;
      })}
    </View>
  );
}

/** A caption under a value inside a table cell (`<small>`). */
export const Small = ({ children }: { children: string }) => <Txt size={9.5} mut>{children}</Txt>;
