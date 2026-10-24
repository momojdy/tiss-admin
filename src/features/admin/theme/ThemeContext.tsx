import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
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

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('light');
  const dark = mode === 'system' ? system === 'dark' : mode === 'dark';
  const value = useMemo(() => ({ c: dark ? darkPalette : lightPalette, dark, mode, setMode }), [dark, mode]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
