import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';

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

export function HeaderAvatar({ size = 28 }: { size?: number }) {
  const { c } = useTheme();
  return (
    <LinearGradient colors={['#c79a7b', '#5a3a2a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: c.card }} />
  );
}
