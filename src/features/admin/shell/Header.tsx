import { Pressable, View } from 'react-native';
import { useDb } from '../state/db';
import { unreadCount } from '../state/notices';
import { me } from '../state/access';
import { IconBtn } from '../ui/Controls';
import { HeaderAvatar } from '../ui/Bits';
import { Txt } from '../ui/Txt';
import { useTheme } from '../theme/ThemeContext';

export function Header({ onBell, onSearch, onAccount }: { onBell: () => void; onSearch: () => void; onAccount: () => void }) {
  useDb();
  const { c } = useTheme();
  const n = unreadCount();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 }}>
      <Pressable onPress={onAccount} accessibilityLabel="Account" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <HeaderAvatar />
        <View><Txt size={12} weight={500}>{me().n}</Txt><Txt size={9.5} mut>{me().role}</Txt></View>
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <IconBtn label="⌕" a11y="Search" onPress={onSearch} />
        <View>
          <IconBtn label="◔" a11y="Notifications" onPress={onBell} />
          {n ? <View style={{ position: 'absolute', right: -2, top: -2, minWidth: 14, height: 14, borderRadius: 7, backgroundColor: c.or, alignItems: 'center', justifyContent: 'center' }}><Txt size={8.5} color="#fff" weight={600}>{n}</Txt></View> : null}
        </View>
      </View>
    </View>
  );
}
