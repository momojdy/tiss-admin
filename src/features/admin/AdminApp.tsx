import { useEffect, useRef, useState } from 'react';
import { ScrollView, type ScrollViewInstance, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, Outfit_300Light, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold } from '@expo-google-fonts/outfit';
import { ThemeProvider, useTheme } from './theme/ThemeContext';
import { ToastProvider } from './ui/Toast';
import { OverlayProvider, useOverlay } from './ui/Overlay';
import { NavProvider, useNav, TAB_OF, TAB_SCREENS } from './shell/Nav';
import { Header } from './shell/Header';
import { Tabs } from './shell/Tabs';
import { ScreenHost } from './shell/ScreenHost';
import { AccountSheet } from './shell/AccountSheet';
import { NotificationsSheet } from './shell/NotificationsSheet';
import { FloatingDock } from './shell/FloatingDock';
import { SearchSheet } from './shell/SearchSheet';
import { AuthFlow } from './auth/AuthFlow';
import { idleExpired, leaveApp, sessionStillValid, touch } from './auth/authLogic';
import { session, expireStaff, setServerGrants, secLv } from './state/access';
import { bump, useDb } from './state/db';
import { supabase } from './lib/supabase';
import { hydrateAdminState } from './lib/hydrateAdminState';
import './overlays/ApplicationDrawers';
import './overlays/TransactionDrawers';
import './overlays/PeopleDrawers';
import './overlays/GrantDrawers';


function Frame() {
  const [dockExpanded, setDockExpanded] = useState(false);
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const frameWidth = Math.min(512, windowWidth);
  const frameHeight = Math.min(910, windowHeight);
  const frameRadius = windowWidth <= 520 ? 0 : 26;
  const { navKey, keepScroll, screen, go } = useNav();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const resolvedAccessFor = useRef<string | null>(null);
  useEffect(() => { if (!keepScroll) scrollRef.current?.scrollTo({ y: 0, animated: false }); }, [navKey, keepScroll]);
  // Resolve the initial screen once per authenticated identity; preserve later navigation.
  useEffect(() => {
    if (!session.who) return;
    const identity = session.userId || session.who;
    if (resolvedAccessFor.current === identity) return;
    resolvedAccessFor.current = identity;
    const firstAllowed = TAB_SCREENS.find((id) => secLv(TAB_OF[id]) > 0);
    if (firstAllowed && secLv(TAB_OF[screen]) === 0) go(firstAllowed);
  }, [session.who, session.userId, session.role, session.status, screen, go]);
  const { openDrawer } = useOverlay();
  return (
    <View style={{ flex: 1, backgroundColor: c.out, alignItems: 'center', justifyContent: 'center' }}>
      <LinearGradient
        colors={[c.b1, c.b2, c.b3]}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={{ width: frameWidth, height: frameHeight, borderRadius: frameRadius, overflow: 'hidden' }}
        onTouchStart={touch}
      >
        <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 14 + insets.top, paddingBottom: (dockExpanded ? 360 : 90) + insets.bottom, paddingLeft: 18, paddingRight: 18 }}>
          <Header onBell={() => openDrawer((close) => <NotificationsSheet onClose={close} />)} onAccount={() => openDrawer((close) => <AccountSheet onClose={close} />)} onSearch={() => openDrawer((close) => <SearchSheet onClose={close} />)} />
          <Tabs />
          <ScreenHost />
        </ScrollView>
        <FloatingDock expanded={dockExpanded} onExpandedChange={setDockExpanded} />
      </LinearGradient>
    </View>
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
      if (error || !staff || staff.status !== 'active' || (staff.invitation_expires_at && Date.parse(staff.invitation_expires_at) <= Date.now()) || !data.session.user.email_confirmed_at ) { await supabase.auth.signOut(); return; }
      if (staff.invited_at && data.session.user.user_metadata?.wantiss_invite_accepted !== true) return;
      session.who = staff.display_name; session.view = staff.display_name; session.last = Date.now(); session.userId = staff.user_id; session.email = data.session.user.email || null; session.role = staff.role; session.status = staff.status; const { data: grants } = await supabase.from('wantiss_admin_permission_grants').select('permission_key,access_level,expires_at,revoked_at').eq('staff_user_id', data.session.user.id); setServerGrants(grants || []); await hydrateAdminState(); bump();
    };
    void restore();
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') void Promise.resolve().then(restore);
      if (event === 'SIGNED_OUT' && session.who) { leaveApp(); setNotice('Your Supabase session ended. Please sign in again.'); }
    });
    const t = setInterval(() => {
      if (!session.who) return;
      expireStaff();
      if (idleExpired()) { leaveApp(); setNotice('You were signed out after 30 minutes of inactivity.'); }
      else if (!sessionStillValid()) { leaveApp(); setNotice('Your access changed. Please sign in again.'); }
      else {
        void (async () => {
          const { data: auth, error: authError } = await supabase.auth.getUser();
          if (authError) {
            const reason = authError.message || '';
            if (/refresh token|invalid jwt|jwt expired|session not found|not authenticated/i.test(reason)) {
              leaveApp();
              setNotice('Your sign-in expired. Please sign in again.');
            }
            return;
          }
          if (!auth.user || !auth.user.email_confirmed_at) {
            leaveApp();
            setNotice('Your sign-in expired. Please sign in again.');
            return;
          }
          const { data: staff, error } = await supabase.from('wantiss_admin_staff')
            .select('status,role,invitation_expires_at,invited_at')
            .eq('user_id', session.userId || '').maybeSingle();
          if (error) return;
          if (!staff || staff.status !== 'active' ||
              (staff.invitation_expires_at && Date.parse(staff.invitation_expires_at) <= Date.now()) ||
              (staff.invited_at && auth.user.user_metadata?.wantiss_invite_accepted !== true)) {
            leaveApp(); setNotice('Your access changed. Please sign in again.'); return;
          }
          session.role = staff.role;
          session.status = staff.status;
          const { data: grants, error: grantError } = await supabase.from('wantiss_admin_permission_grants')
            .select('permission_key,access_level,expires_at,revoked_at').eq('staff_user_id', session.userId || '');
          if (!grantError) setServerGrants(grants || []);
          bump();
        })();
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
