import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useNav } from './Nav';
import { useOverlay } from '../ui/Overlay';
import { useTheme } from '../theme/ThemeContext';
import { Txt } from '../ui/Txt';
import { useExport } from './useExport';
import { SearchSheet } from './SearchSheet';
import { QuickCreateSheet } from './QuickCreateSheet';
import { SettingsSheet } from './SettingsSheet';
import { NotificationsSheet } from './NotificationsSheet';
import { AccountSheet } from './AccountSheet';

export function FloatingDock() {
  const [expanded, setExpanded] = useState(false);
  const { go } = useNav();
  const { openDrawer } = useOverlay();
  const { c } = useTheme();
  const exportCsv = useExport();
  useEffect(() => {
    if (!expanded) return;
    const timer = setTimeout(() => setExpanded(false), 3500);
    return () => clearTimeout(timer);
  }, [expanded]);
  const actions = [
    { icon: expanded ? '‹' : '›', label: 'Show / hide menu', run: () => setExpanded((value) => !value) },
    { icon: '⌕', label: 'Search', run: () => openDrawer((close) => <SearchSheet onClose={close} />) },
    { icon: '+', label: 'Quick create', run: () => openDrawer((close) => <QuickCreateSheet onClose={close} />) },
    { icon: '♢', label: 'Alerts', run: () => openDrawer((close) => <NotificationsSheet onClose={close} />) },
    { icon: '▤', label: 'Operations', run: () => go('operations') },
    { icon: '⇪', label: 'Export', run: () => { void exportCsv(); } },
    { icon: '⚙', label: 'Settings', run: () => openDrawer((close) => <SettingsSheet onClose={close} />) },
  ];
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, justifyContent: 'center', zIndex: 10 }}>
      <View style={{ backgroundColor: '#16191a', width: expanded ? 40 : 16, paddingVertical: expanded ? 12 : 0, borderTopRightRadius: 24, borderBottomRightRadius: 24, alignItems: 'center', gap: expanded ? 12 : 0, shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 3, height: 4 }, elevation: 9 }}>
        {actions.map((action, index) => {
          if (!expanded && index !== 0) return null;
          return (
            <Pressable key={action.label} onPress={action.run} accessibilityRole="button" accessibilityLabel={action.label} hitSlop={6} style={{ width: expanded ? 34 : 16, minHeight: expanded ? 28 : 72, alignItems: 'center', justifyContent: 'center' }}>
              <Txt size={expanded ? 14 : 12} color="#fff">{action.icon}</Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
