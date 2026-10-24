import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, Outfit_300Light, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold } from '@expo-google-fonts/outfit';
import { ThemeProvider, useTheme } from './theme/ThemeContext';
import { ToastProvider } from './ui/Toast';
import { OverlayProvider, useOverlay } from './ui/Overlay';
import { NavProvider } from './shell/Nav';
import { Header } from './shell/Header';
import { Tabs } from './shell/Tabs';
import { ScreenHost } from './shell/ScreenHost';
import { AccountSheet } from './shell/AccountSheet';
import { NotificationsSheet } from './shell/NotificationsSheet';
import { AuthFlow } from './auth/AuthFlow';
import { idleExpired, leaveApp, sessionStillValid, touch } from './auth/authLogic';
import { session, expireStaff } from './state/access';
import { bump, useDb } from './state/db';
import { supabase } from './lib/supabase';
import './overlays/ApplicationDrawers';
import './overlays/TransactionDrawers';
import './overlays/PeopleDrawers';
import './overlays/GrantDrawers';

function Frame() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { openDrawer } = useOverlay();
  return (
    <LinearGradient colors={[c.b1, c.b2, c.b3]} style={{ flex: 1, paddingTop: insets.top }} onTouchStart={touch}>
      <Header onBell={() => openDrawer((close) => <NotificationsSheet onClose={close} />)} onSearch={() => {}} onAccount={() => openDrawer((close) => <AccountSheet onClose={close} />)} />
      <Tabs />
      <ScreenHost />
    </LinearGradient>
  );
}

function AuthGate() {
  useDb();
  const [notice, setNotice] = useState<string | undefined>();
  useEffect(() => {
    let mounted = true;
    const restore = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted || !data.session) return;
      const { data: staff, error } = await supabase.from('wantiss_admin_staff').select('user_id,display_name,status,role').eq('user_id', data.session.user.id).maybeSingle();
      if (!mounted) return;
      if (error || !staff || staff.status !== 'active' || !data.session.user.email_confirmed_at) { await supabase.auth.signOut(); return; }
      session.who = staff.display_name; session.view = staff.display_name; session.last = Date.now(); session.userId = staff.user_id; session.email = data.session.user.email || null; session.role = staff.role; session.status = staff.status; bump();
    };
    void restore();
    const t = setInterval(() => {
      if (!session.who) return;
      expireStaff();
      if (idleExpired()) { leaveApp(); setNotice('You were signed out after 30 minutes of inactivity.'); }
      else if (!sessionStillValid()) { leaveApp(); setNotice('Your access changed. Please sign in again.'); }
      else {
        void supabase.from('wantiss_admin_staff').select('status').eq('user_id', session.userId || '').maybeSingle().then(({ data }) => {
          if (!data || data.status !== 'active') { leaveApp(); setNotice('Your access changed. Please sign in again.'); }
        });
        bump();
      }
    }, 30000);
    return () => { mounted = false; clearInterval(t); };
  }, []);
  if (!session.who) return <AuthFlow notice={notice} noticeBad onDone={() => setNotice(undefined)} />;
  return <Frame />;
}

export function AdminApp() {
  const [loaded] = useFonts({ Outfit_300Light, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold });
  if (!loaded) return <View style={{ flex: 1 }} />;
  return (
    <ThemeProvider><ToastProvider><OverlayProvider><NavProvider><AuthGate /></NavProvider></OverlayProvider></ToastProvider></ThemeProvider>
  );
}
