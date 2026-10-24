import { Pressable, ScrollView } from 'react-native';
import { TABS } from '../state/db';
import { secLv } from '../state/access';
import { Txt } from '../ui/Txt';
import { useTheme } from '../theme/ThemeContext';
import { TAB_OF, TAB_SCREENS, useNav } from './Nav';

/** Top tabs. A tab the signed-in person has no access to is not shown. */
export function Tabs() {
  const { screen, go } = useNav();
  const { c } = useTheme();
  const active = TAB_OF[screen];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 6, paddingBottom: 8 }}>
      {TABS.map((t, i) => (secLv(i) > 0 || i === 0 ? (
        <Pressable key={t} onPress={() => go(TAB_SCREENS[i])} accessibilityRole="tab" accessibilityState={{ selected: i === active }}
          style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: i === active ? c.ink : 'transparent', borderWidth: 1, borderColor: i === active ? c.ink : c.bd }}>
          <Txt size={10.6} weight={500} color={i === active ? c.on : c.ink}>{t}</Txt>
        </Pressable>
      ) : null))}
    </ScrollView>
  );
}
