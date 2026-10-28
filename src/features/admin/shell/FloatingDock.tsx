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
import { SearchSheet } from './SearchSheet';
import { AppIcon, AppIconName } from '../ui/AppIcon';

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
    { icon: 'menu', label: 'Show / hide menu', visible: true, run: () => onExpandedChange(!expanded) },
    { icon: 'check-circle', label: 'Quick Start', visible: secLv(0) > 0, run: () => go('overview') },
    { icon: 'search', label: 'Search', visible: true, run: () => openDrawer((close) => <SearchSheet onClose={close} />) },
    { icon: 'clipboard-list', label: 'Review queue', visible: secLv(1) > 0, run: () => go('operations', { ov: 'List' }) },
    { icon: 'history', label: 'Audit log', visible: secLv(6) > 0, run: () => go('people', { ps: 'Audit log' }) },
    { icon: 'download', label: 'Export', visible: exportableScreen(screen), run: () => { void exportCsv(); } },
    { icon: 'settings', label: 'Settings', visible: secLv(7) > 0, run: () => openDrawer((close) => <SettingsSheet onClose={close} />) },
  ];
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', right: 10, bottom: 22 + insets.bottom, alignItems: 'flex-end', zIndex: 10, flexDirection: expanded ? 'column' : 'row', gap: expanded ? 0 : 8 }}>
      <View style={{ backgroundColor: '#16191a', width: expanded ? 168 : 46, paddingVertical: expanded ? 9 : 0, paddingHorizontal: expanded ? 7 : 0, borderRadius: 23, alignItems: 'stretch', gap: expanded ? 3 : 0, shadowColor: '#000', shadowOpacity: 0.24, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 9 }}>
        {actions.filter((action) => action.visible).map((action, index) => {
          if (!expanded && index !== 0) return null;
          return (
            <Pressable key={action.label} onPress={action.run} accessibilityRole="button" accessibilityLabel={action.label} hitSlop={6}
              style={{ minHeight: expanded ? 38 : 46, paddingHorizontal: expanded ? 9 : 0, flexDirection: 'row', alignItems: 'center', justifyContent: expanded ? 'flex-start' : 'center', gap: 10, borderRadius: 18 }}>
              {expanded ? <AppIcon name={action.icon as AppIconName} size={16} color="#fff" /> : <AppIcon name="menu" size={18} color="#fff" />}
              {expanded ? <Txt size={11.5} color="#fff" weight={500}>{action.label}</Txt> : null}
            </Pressable>
          );
        })}
      </View>
      {!expanded && (can(...REQ.content) || can(...REQ.permissions)) ? <View pointerEvents="box-none">
        <Pressable onPress={() => openDrawer((close) => <QuickCreateSheet onClose={close} />)} accessibilityRole="button" accessibilityLabel="Quick create" hitSlop={8}
          style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#16191a', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.24, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 9 }}>
          <AppIcon name="plus" size={21} color="#fff" />
        </Pressable>
      </View> : null}
    </View>
  );
}
