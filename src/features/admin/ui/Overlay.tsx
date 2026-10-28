import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View, useWindowDimensions, BackHandler } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { useTheme } from '../theme/ThemeContext';
import { IconBtn } from './Controls';
import { Txt } from './Txt';

type Kind = 'dialog' | 'drawer';
type Render = ReactNode | ((close: () => void) => ReactNode);
interface Item { id: number; kind: Kind; render: Render }

interface OverlayApi {
  openDialog: (r: Render) => number;
  openDrawer: (r: Render) => number;
  close: (id?: number) => void;
  closeAll: () => void;
}
const Ctx = createContext<OverlayApi>({ openDialog: () => 0, openDrawer: () => 0, close: () => {}, closeAll: () => {} });
export const useOverlay = () => useContext(Ctx);

let seq = 1;

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const { c, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const frameWidth = Math.min(512, width);
  const frameHeight = Math.min(910, height);
  const frameLeft = (width - frameWidth) / 2;
  const frameTop = (height - frameHeight) / 2;

  const api = useMemo<OverlayApi>(() => ({
    openDialog: (render) => { const id = seq++; setItems((l) => [...l, { id, kind: 'dialog', render }]); return id; },
    openDrawer: (render) => { const id = seq++; setItems((l) => [...l, { id, kind: 'drawer', render }]); return id; },
    close: (id) => setItems((l) => (id == null ? l.slice(0, -1) : l.filter((x) => x.id !== id))),
    closeAll: () => setItems([]),
  }), []);

  useEffect(() => {
    if (!items.length) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { api.close(); return true; });
    return () => sub.remove();
  }, [items.length, api]);

  const drawerW = Math.min(318, frameWidth);
  const renderBody = useCallback((it: Item) => (typeof it.render === 'function' ? it.render(() => api.close(it.id)) : it.render), [api]);

  return (
    <Ctx.Provider value={api}>
      {children}
      {items.map((it) => (
        <View key={it.id} style={{ position: 'absolute', top: frameTop, left: frameLeft, width: frameWidth, height: frameHeight, zIndex: 20 + it.id }}>
          <BlurView intensity={25} tint={dark ? 'dark' : 'light'} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
          <Pressable accessibilityLabel="Close" onPress={() => api.close(it.id)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.overlay }} />
          {it.kind === 'dialog' ? (
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center', padding: 14, paddingTop: 14 + insets.top, paddingBottom: 14 + insets.bottom }} pointerEvents="box-none">
              {renderBody(it)}
            </KeyboardAvoidingView>
          ) : (
            <View pointerEvents="box-none" style={{ flex: 1, alignItems: 'flex-end' }}>
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: drawerW, flex: 1 }}>
                <View style={{ flex: 1, backgroundColor: c.b2, borderLeftWidth: 1, borderLeftColor: c.bd, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: -10, height: 0 }, elevation: 12 }}>
                  <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 14, paddingTop: 14 + insets.top, paddingBottom: 24 + insets.bottom }}>
                    {renderBody(it)}
                  </ScrollView>
                </View>
              </KeyboardAvoidingView>
            </View>
          )}
        </View>
      ))}
    </Ctx.Provider>
  );
}

export function DialogCard({ children, title, onClose, bg, maxHeight = '92%', titleSize = 14 }: { children: ReactNode; title?: ReactNode; onClose?: () => void; bg?: string; maxHeight?: number | `${number}%`; titleSize?: number }) {
  const { c } = useTheme();
  return (
    <View style={{ backgroundColor: bg ?? c.card, borderRadius: 26, padding: 16, maxHeight, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 25, shadowOffset: { width: 0, height: 20 }, elevation: 14, overflow: 'hidden', borderWidth: bg ? 0 : 1, borderColor: c.bd }}>
      {title !== undefined ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          {typeof title === 'string' ? <Txt size={titleSize}>{title}</Txt> : title}
          {onClose ? <IconBtn label="✕" onPress={onClose} a11y="Close" /> : null}
        </View>
      ) : null}
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{children}</ScrollView>
    </View>
  );
}

export function DrawerBody({ title, onClose, children, actions }: { title: ReactNode; onClose: () => void; children?: ReactNode; actions?: ReactNode }) {
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        {typeof title === 'string' ? <Txt size={14}>{title}</Txt> : title}
        <IconBtn label="✕" onPress={onClose} a11y="Close" />
      </View>
      {children}
      {actions ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>{actions}</View> : null}
    </View>
  );
}
