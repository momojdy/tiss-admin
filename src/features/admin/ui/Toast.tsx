import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Txt } from './Txt';
import { AppIcon } from './AppIcon';
import { useTheme } from '../theme/ThemeContext';

type ToastFn = (message: string, undo?: () => void) => void;
const Ctx = createContext<ToastFn>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<{ m: string; undo?: () => void } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const show = useCallback<ToastFn>((m, undo) => {
    if (timer.current) clearTimeout(timer.current);
    setT({ m, undo });
    timer.current = setTimeout(() => setT(null), 3600);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      {t ? (
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 14 + insets.bottom, alignItems: 'center', zIndex: 60 }}>
          <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.night, borderRadius: 99, paddingVertical: 8, paddingLeft: 14, paddingRight: t.undo ? 8 : 14, maxWidth: '92%' }}>
            <AppIcon name="check" size={14} color="#fff" />
            <Txt size={10.6} color="#fff" numberOfLines={2} style={{ flexShrink: 1 }}>{t.m}</Txt>
            {t.undo ? (
              <Pressable onPress={() => { t.undo?.(); setT(null); }} accessibilityRole="button">
                <View style={{ backgroundColor: c.ye, borderRadius: 99, paddingVertical: 5, paddingHorizontal: 10 }}><Txt size={10.6} weight={500} color="#161a17">Undo</Txt></View>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </Ctx.Provider>
  );
}
