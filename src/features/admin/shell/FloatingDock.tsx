import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNav } from './Nav';
import { can, secLv } from '../state/access';
import { REQ } from '../state/requirements';
import { useOverlay } from '../ui/Overlay';
import { Txt } from '../ui/Txt';
import { useExport, exportableScreen } from './useExport';
import { QuickCreateSheet } from './QuickCreateSheet';
import { SettingsSheet } from './SettingsSheet';
import { NotificationsSheet } from './NotificationsSheet';

export function FloatingDock({ expanded, onExpandedChange }: { expanded: boolean; onExpandedChange: (value: boolean) => void }) {
  const { screen, go } = useNav();
  const insets = useSafeAreaInsets();
  const { openDrawer } = useOverlay();
  const exportCsv = useExport();
  useEffect(() => {
    if (!expanded) return;
    const timer = setTimeout(() => onExpandedChange(false), 3500);
    return () => clearTimeout(timer);
  }, [expanded, onExpandedChange]);
  const actions = [
    { icon: expanded ? '‹' : '›', label: 'Show / hide menu', visible: true, run: () => onExpandedChange(!expanded) },
    { icon: '+', label: 'Quick create', visible: can(...REQ.content) || can(...REQ.permissions), run: () => openDrawer((close) => <QuickCreateSheet onClose={close} />) },
    { icon: '♢', label: 'Alerts', visible: true, run: () => openDrawer((close) => <NotificationsSheet onClose={close} />) },
    { icon: '▤', label: 'Operations', visible: secLv(1) > 0, run: () => go('operations') },
    { icon: '⇪', label: 'Export', visible: exportableScreen(screen), run: () => { void exportCsv(); } },
    { icon: '⚙', label: 'Settings', visible: secLv(7) > 0, run: () => openDrawer((close) => <SettingsSheet onClose={close} />) },
  ];
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', right: 10, bottom: 22 + insets.bottom, alignItems: 'flex-end', zIndex: 10, flexDirection: expanded ? 'column' : 'row', gap: expanded ? 0 : 8 }}>
      <View style={{ backgroundColor: '#16191a', width: expanded ? 168 : 46, paddingVertical: expanded ? 9 : 0, paddingHorizontal: expanded ? 7 : 0, borderRadius: 23, alignItems: 'stretch', gap: expanded ? 3 : 0, shadowColor: '#000', shadowOpacity: 0.24, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 9 }}>
        {actions.filter((action) => action.visible).map((action, index) => {
          if (!expanded && index !== 0) return null;
          return (
            <Pressable key={action.label} onPress={action.run} accessibilityRole="button" accessibilityLabel={action.label} hitSlop={6}
              style={{ minHeight: expanded ? 38 : 46, paddingHorizontal: expanded ? 9 : 0, flexDirection: 'row', alignItems: 'center', justifyContent: expanded ? 'flex-start' : 'center', gap: 10, borderRadius: 18 }}>
              <Txt size={expanded ? 14 : 17} color="#fff">{expanded ? action.icon : '☰'}</Txt>
              {expanded ? <Txt size={11.5} color="#fff" weight={500}>{action.label}</Txt> : null}
            </Pressable>
          );
        })}
      </View>
      {!expanded && (can(...REQ.content) || can(...REQ.permissions)) ? <View pointerEvents="box-none">
        <Pressable onPress={() => openDrawer((close) => <QuickCreateSheet onClose={close} />)} accessibilityRole="button" accessibilityLabel="Quick create" hitSlop={8}
          style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#16191a', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.24, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 9 }}>
          <Txt size={25} color="#fff">+</Txt>
        </Pressable>
      </View> : null}
    </View>
  );
}
