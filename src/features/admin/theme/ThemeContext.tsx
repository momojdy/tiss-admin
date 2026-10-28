import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { darkPalette, lightPalette, Palette } from './tokens';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeValue {
  c: Palette;
  dark: boolean;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
}

const Ctx = createContext<ThemeValue>({ c: lightPalette, dark: false, mode: 'light', setMode: () => {} });
const STORAGE_KEY = '@wantiss-admin-settings-v1';

function validMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('light');
  const modeChanged = useRef(false);

  useEffect(() => {
    let mounted = true;
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!mounted || !raw) return;
      try {
        const saved = JSON.parse(raw) as Record<string, Record<string, unknown>>;
        const storedMode = String(saved.Appearance?.mode || 'light').toLowerCase();
        if (!modeChanged.current && validMode(storedMode)) setModeState(storedMode);
      } catch { /* keep the default theme if saved settings are malformed */ }
    }).catch(() => { /* keep the default theme if storage is unavailable */ });
    return () => { mounted = false; };
  }, []);

  const setMode = useCallback((nextMode: ThemeMode) => {
    modeChanged.current = true;
    setModeState(nextMode);
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      let saved: Record<string, Record<string, unknown>> = {};
      if (raw) {
        try { saved = JSON.parse(raw) as Record<string, Record<string, unknown>>; } catch { /* replace malformed local settings */ }
      }
      const nextSettings = {
        ...saved,
        Appearance: { ...(saved.Appearance || {}), mode: nextMode[0].toUpperCase() + nextMode.slice(1) },
      };
      return AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings));
    }).catch(() => { /* theme still applies for this session if persistence fails */ });
  }, []);

  const dark = mode === 'system' ? system === 'dark' : mode === 'dark';
  const value = useMemo(() => ({ c: dark ? darkPalette : lightPalette, dark, mode, setMode }), [dark, mode, setMode]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
