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
import { session, expireStaff, setServerGrants } from './state/access';
import { bump, useDb } from './state/db';
import { supabase } from './lib/supabase';
import { hydrateAdminState } from './lib/hydrateAdminState';
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
      if (session.who) return;
      const { data } = await supabase.auth.getSession();
      if (!mounted || !data.session) return;
      const { data: staff, error } = await supabase.from('wantiss_admin_staff').select('user_id,display_name,status,role,invitation_expires_at,invited_at').eq('user_id', data.session.user.id).maybeSingle();
      if (!mounted) return;
      if (error || !staff || staff.status !== 'active' || (staff.invitation_expires_at && Date.parse(staff.invitation_expires_at) <= Date.now()) || !data.session.user.email_confirmed_at) { await supabase.auth.signOut(); return; }
      if (staff.invited_at && data.session.user.user_metadata?.wantiss_invite_accepted !== true) return;
      session.who = staff.display_name; session.view = staff.display_name; session.last = Date.now(); session.userId = staff.user_id; session.email = data.session.user.email || null; session.role = staff.role; session.status = staff.status; const { data: grants } = await supabase.from('wantiss_admin_permission_grants').select('permission_key,access_level,expires_at,revoked_at').eq('staff_user_id', data.session.user.id); setServerGrants(grants || []); await hydrateAdminState(); bump();
    };
    void restore();
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') void Promise.resolve().then(restore);
    });
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
    return () => { mounted = false; clearInterval(t); authListener.subscription.unsubscribe(); };
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
