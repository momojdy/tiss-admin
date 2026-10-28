import { Pressable, View } from 'react-native';
import { useDb } from '../state/db';
import { unreadCount } from '../state/notices';
import { me } from '../state/access';
import { IconBtn } from '../ui/Controls';
import { Txt } from '../ui/Txt';
import { AppIcon } from '../ui/AppIcon';
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
        <IconBtn a11y="Search" onPress={onSearch} size={30}><AppIcon name="search" size={16} color={c.ink} /></IconBtn>
        <View>
          <IconBtn a11y="Notifications" onPress={onBell} size={30}><AppIcon name="bell" size={16} color={c.ink} /></IconBtn>
          {n ? <View style={{ position: 'absolute', right: -2, top: -2, minWidth: 14, height: 14, borderRadius: 7, backgroundColor: c.or, alignItems: 'center', justifyContent: 'center' }}><Txt size={8.5} color="#fff" weight={600}>{n}</Txt></View> : null}
        </View>
        <Pressable onPress={onAccount} accessibilityLabel={'Account menu for ' + me().n} hitSlop={6}>
          <View style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: c.bd, backgroundColor: c.card, alignItems: "center", justifyContent: "center" }}><AppIcon name="user-round" size={17} color={c.ink} /></View>
        </Pressable>
      </View>
    </View>
  );
}
