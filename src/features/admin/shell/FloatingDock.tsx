import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { useNav } from './Nav';
import { can, secLv } from '../state/access';
import { REQ } from '../state/requirements';
import { useOverlay } from '../ui/Overlay';
import { Txt } from '../ui/Txt';
import { useExport } from './useExport';
import { SearchSheet } from './SearchSheet';
import { QuickCreateSheet } from './QuickCreateSheet';
import { SettingsSheet } from './SettingsSheet';
import { NotificationsSheet } from './NotificationsSheet';

export function FloatingDock({ expanded, onExpandedChange }: { expanded: boolean; onExpandedChange: (value: boolean) => void }) {
  const { go } = useNav();
  const { openDrawer } = useOverlay();
  const exportCsv = useExport();
  useEffect(() => {
    if (!expanded) return;
    const timer = setTimeout(() => onExpandedChange(false), 3500);
    return () => clearTimeout(timer);
  }, [expanded, onExpandedChange]);
  const actions = [
    { icon: expanded ? '‹' : '›', label: 'Show / hide menu', visible: true, run: () => onExpandedChange(!expanded) },
    { icon: '⌕', label: 'Search', visible: true, run: () => openDrawer((close) => <SearchSheet onClose={close} />) },
    { icon: '+', label: 'Quick create', visible: can(...REQ.content) || can(...REQ.permissions), run: () => openDrawer((close) => <QuickCreateSheet onClose={close} />) },
    { icon: '♢', label: 'Alerts', visible: true, run: () => openDrawer((close) => <NotificationsSheet onClose={close} />) },
    { icon: '▤', label: 'Operations', visible: secLv(1) > 0, run: () => go('operations') },
    { icon: '⇪', label: 'Export', visible: can(...REQ.export), run: () => { void exportCsv(); } },
    { icon: '⚙', label: 'Settings', visible: secLv(7) > 0, run: () => openDrawer((close) => <SettingsSheet onClose={close} />) },
  ];
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: expanded ? 9 : 0, top: 0, bottom: 0, justifyContent: 'center', zIndex: 10 }}>
      <View style={{ backgroundColor: '#16191a', width: expanded ? 37 : 16, height: expanded ? undefined : 72, paddingVertical: expanded ? 12 : 0, borderTopRightRadius: 24, borderBottomRightRadius: 24, alignItems: 'center', gap: expanded ? 15 : 0, shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 3, height: 4 }, elevation: 9 }}>
        {actions.filter((action) => action.visible).map((action, index) => {
          if (!expanded && index !== 0) return null;
          return (
            <Pressable key={action.label} onPress={action.run} accessibilityRole="button" accessibilityLabel={action.label} hitSlop={6} style={{ width: expanded ? 34 : 16, minHeight: 34, alignItems: 'center', justifyContent: 'center' }}>
              <Txt size={expanded ? 14 : 12} color="#fff">{action.icon}</Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
