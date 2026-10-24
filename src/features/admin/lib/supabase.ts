import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Linking } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const expectedUrl = 'https://ycbirmgppwavorwudlrv.supabase.co';
const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || url !== expectedUrl) {
  throw new Error('Configure EXPO_PUBLIC_SUPABASE_URL with the verified Wantiss project URL.');
}
if (!key) {
  throw new Error('Configure EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY before running Wantiss Admin.');
}

export const supabase = createClient(url, key, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

AppState.addEventListener('change', state => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

const handleAuthUrl = async (incoming: string | null) => {
  if (!incoming) return;
  try {
    const parsed = new URL(incoming);
    const code = parsed.searchParams.get('code');
    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
      return;
    }
    const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''));
    const accessToken = hash.get('access_token');
    const refreshToken = hash.get('refresh_token');
    if (accessToken && refreshToken) {
      await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    }
  } catch {
    // Invalid or unrelated deep links must not establish a session.
  }
};

void Linking.getInitialURL().then(handleAuthUrl);
Linking.addEventListener('url', ({ url }) => { void handleAuthUrl(url); });
