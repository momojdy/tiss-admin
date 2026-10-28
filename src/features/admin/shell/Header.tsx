import { Pressable, View } from 'react-native';
import { useDb } from '../state/db';
import { unreadCount } from '../state/notices';
import { me } from '../state/access';
import { IconBtn } from '../ui/Controls';
import { HeaderAvatar } from '../ui/Bits';
import { Txt } from '../ui/Txt';
import { useTheme } from '../theme/ThemeContext';

export function Header({ onBell, onAccount, onSearch }: { onBell: () => void; onAccount: () => void; onSearch: () => void }) {
  useDb();
  const { c } = useTheme();
  const n = unreadCount();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 25, height: 25, borderRadius: 8, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' }}>
          <Txt size={15.8} weight={500} color={c.on}>W</Txt>
        </View>
        <Txt size={16.8} weight={500}>wantiss</Txt>
      </View>
      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
        <IconBtn label="⌕" a11y="Search" onPress={onSearch} size={30} />
        <View>
          <IconBtn label="♢" a11y="Notifications" onPress={onBell} size={30} />
          {n ? <View style={{ position: 'absolute', right: -2, top: -2, minWidth: 14, height: 14, borderRadius: 7, backgroundColor: c.or, alignItems: 'center', justifyContent: 'center' }}><Txt size={8.5} color="#fff" weight={600}>{n}</Txt></View> : null}
        </View>
        <Pressable onPress={onAccount} accessibilityLabel={'Account menu for ' + me().n} hitSlop={6}>
          <HeaderAvatar />
        </Pressable>
      </View>
    </View>
  );
}
