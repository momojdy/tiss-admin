import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
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
