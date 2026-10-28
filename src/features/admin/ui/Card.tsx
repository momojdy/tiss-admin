import { ReactNode } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Txt } from './Txt';

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: c.card, borderColor: c.bd, borderWidth: 1, borderRadius: 22, padding: 12, marginBottom: 10,
          shadowColor: '#3c321e', shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** `.ct`: card title on the left, optional actions on the right. */
export function CardTitle({ title, right, size = 11.8 }: { title: ReactNode; right?: ReactNode; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      {typeof title === 'string' ? <Txt size={size}>{title}</Txt> : title}
      {right ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>{right}</View> : null}
    </View>
  );
}

/** `CD(title, body, right)` helper: a Card with a title row and a body. */
export function Section({ title, right, children, style }: { title: ReactNode; right?: ReactNode; children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Card style={style}>
      <CardTitle title={title} right={right} />
      {children}
    </Card>
  );
}
