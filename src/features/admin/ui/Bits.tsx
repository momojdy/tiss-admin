import { View, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';

/** `.fa`: overlapping avatar dots on dark tiles. */
export function AvatarStack({ n = 3 }: { n?: number }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {Array.from({ length: n }).map((_, i) => (
        <LinearGradient key={i} colors={['#d8b497', '#6a4636']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.8)', marginLeft: i ? -4 : 0 }} />
      ))}
    </View>
  );
}

/** `.av`: the header avatar. */
export function HeaderAvatar({ size = 28 }: { size?: number }) {
  const { c } = useTheme();
  return (
    <LinearGradient colors={['#c79a7b', '#5a3a2a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: c.card }} />
  );
}

/** `.bar`: thin progress bar. */
export function ProgressBar({ pct, color, style }: { pct: number; color: string; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View style={[{ height: 3, borderRadius: 3, backgroundColor: c.inset, marginTop: 9, marginBottom: 7 }, style]}>
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.max(0, Math.min(100, pct))}%`, borderRadius: 3, backgroundColor: color }} />
    </View>
  );
}

export const Divider = ({ style }: { style?: StyleProp<ViewStyle> }) => {
  const { c } = useTheme();
  return <View style={[{ height: 1, backgroundColor: c.bd }, style]} />;
};
