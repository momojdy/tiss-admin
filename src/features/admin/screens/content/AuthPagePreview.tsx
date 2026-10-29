import { useState } from 'react';
import { Image, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

const PINK = '#BF008E';
const LINK = '#9D315B';
const TOGGLE_BG = '#E0E3E7';
const TOGGLE_OFF = '#949090';
const FIELD_BG = '#FBE8EF';
const FIELD_TEXT = '#9A4B68';
const DARK = '#14181B';
const PAGE_BG = '#F1F4F8';
const RED = '#FF0000';
const LOGO_URL = 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/WantisslogoOuterless.PNG';
const GOOGLE_PNG = 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.png';

// The customer app lays this page out on a 390 point wide screen; the preview renders that exact layout and scales it down.
const SCREEN_W = 390;
const SCREEN_H = 844;
const BEZEL = 7;
const MAX_SCALE = 0.82;

export type AuthPreviewCopy = Record<string, string | undefined>;

const safeColor = (value: unknown, fallback: string) =>
  typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.trim()) ? value.trim() : fallback;

const ICONS: Record<string, string> = {
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  eye: 'M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12zM12 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6z',
  user: 'M12 4.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM5 20c.7-3.8 3.2-5.5 7-5.5s6.3 1.7 7 5.5',
  building: 'M5 21V4h9v17M14 9h5v12M8 8h3M8 12h3M8 16h3M3 21h18',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
};
const APPLE = 'M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z';

function Icon({ name, color = FIELD_TEXT, size = 24 }: { name: keyof typeof ICONS; color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={ICONS[name]} stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

function Field({ top, placeholder, icon, suffix }: { top: number; placeholder: string; icon: keyof typeof ICONS; suffix?: boolean }) {
  return (
    <View style={{ paddingTop: top, paddingBottom: 8, paddingHorizontal: 8 }}>
      <View style={{ height: 60, backgroundColor: FIELD_BG, borderRadius: 15, flexDirection: 'row', alignItems: 'center', paddingLeft: 2 }}>
        <View style={{ width: 48, alignItems: 'center' }}><Icon name={icon} /></View>
        <Text style={{ flex: 1, fontSize: 18, color: FIELD_TEXT }} numberOfLines={1}>{placeholder}</Text>
        {suffix ? <View style={{ width: 48, alignItems: 'center' }}><Icon name="eye" /></View> : null}
      </View>
    </View>
  );
}

/** Phone preview of the customer sign-in / registration page, driven by the unsaved draft. */
export function AuthPagePreview({ copy, logoUrl, googleUrl, appleUrl }: { copy: AuthPreviewCopy; logoUrl?: string; googleUrl?: string; appleUrl?: string }) {
  const { width } = useWindowDimensions();
  const scale = Math.min(MAX_SCALE, Math.max(0.5, (width - 48) / (SCREEN_W + BEZEL * 2)));
  const [vendor, setVendor] = useState(false);
  const [register, setRegister] = useState(false);
  const [step, setStep] = useState(0);

  const accent = safeColor(copy.primary_color, PINK);
  const linkAccent = safeColor(copy.link_color, LINK);
  const headline = (copy.headline || '').trim();
  const subtitle = (copy.subtitle || '').trim();
  const t = (value: string | undefined, fallback: string) => (value && value.length ? value : fallback);

  const setRole = (next: boolean) => { setVendor(next); setStep(0); };
  const setMode = () => { setRegister((v) => !v); setStep(0); };

  const submit = (label: string) => (
    <View style={{ paddingHorizontal: 15, paddingTop: 20 }}>
      <View style={{ height: 60, borderRadius: 15, backgroundColor: accent, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#fff' }}>{label}</Text>
        {label === 'Next' ? <Icon name="arrow" color="#fff" size={22} /> : null}
      </View>
    </View>
  );

  const credentials = (submitLabel: string) => (
    <View>
      <Field top={15} placeholder={t(copy.email_placeholder, 'Email')} icon="mail" />
      <Field top={12} placeholder={t(copy.password_placeholder, 'Password')} icon="lock" suffix />
      <View style={{ paddingTop: 8, paddingHorizontal: 15, alignItems: 'flex-end' }}>
        <Text style={{ padding: 8, fontSize: 14, fontWeight: '600', color: linkAccent }}>{t(copy.forgot_password_label, 'Forgot password?')}</Text>
      </View>
      <View style={{ paddingTop: 15, flexDirection: 'row', justifyContent: 'center' }}>
        <View style={{ width: 100, height: 50, borderWidth: 0.5, borderColor: FIELD_TEXT, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
          <Image source={{ uri: googleUrl || GOOGLE_PNG }} style={{ width: 22, height: 22 }} resizeMode="contain" />
        </View>
        <View style={{ width: 90 }} />
        <View style={{ width: 100, height: 50, borderWidth: 0.5, borderColor: FIELD_TEXT, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
          {appleUrl
            ? <Image source={{ uri: appleUrl }} style={{ width: 25, height: 25 }} resizeMode="contain" />
            : <Svg width={25} height={25} viewBox="0 0 24 24"><Path d={APPLE} fill="#000" /></Svg>}
        </View>
      </View>
      {submit(submitLabel)}
    </View>
  );

  const body = register && vendor
    ? (step === 0
      ? <View><Field top={15} placeholder={t(copy.full_name_placeholder, 'Full Name')} icon="user" /><Field top={12} placeholder={t(copy.business_name_placeholder, 'Business Name (optional)')} icon="building" /><Pressable onPress={() => setStep(1)}>{submit('Next')}</Pressable></View>
      : credentials(t(copy.sign_up_button, 'Sign Up')))
    : credentials(register ? t(copy.sign_up_button, 'Sign Up') : t(copy.sign_in_button, 'Sign in'));

  const dot = (active: boolean) => <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: active ? accent : TOGGLE_BG }} />;

  return (
    <View style={{ alignItems: 'center', width: '100%' }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8, justifyContent: 'center' }}>
        {([['Sign in', false], ['Register', true]] as const).map(([label, value]) => (
          <Pressable key={label} onPress={() => { setRegister(value); setStep(0); }} accessibilityRole="button" style={{ borderRadius: 16, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: register === value ? '#FD802E' : '#F1F1F2' }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: register === value ? '#fff' : '#1B1B1F' }}>{label}</Text>
          </Pressable>
        ))}
        {([['Buyer', false], ['Business', true]] as const).map(([label, value]) => (
          <Pressable key={label} onPress={() => setRole(value)} accessibilityRole="button" style={{ borderRadius: 16, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: vendor === value ? '#FD802E' : '#F1F1F2' }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: vendor === value ? '#fff' : '#1B1B1F' }}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ width: SCREEN_W * scale + BEZEL * 2, height: SCREEN_H * scale + BEZEL * 2, borderRadius: 30, borderWidth: BEZEL, borderColor: '#252529', overflow: 'hidden', backgroundColor: PAGE_BG }}>
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, top: 0, width: SCREEN_W, height: SCREEN_H, transform: [{ translateX: -(SCREEN_W * (1 - scale)) / 2 }, { translateY: -(SCREEN_H * (1 - scale)) / 2 }, { scale }] }}>
          <View style={{ flex: 1, backgroundColor: PAGE_BG }}>
            <LinearGradient colors={['#F7DDEB', '#FBEAF3', '#FFF5E9']} locations={[0, 0.85, 0.925]} start={{ x: 1, y: 1 }} end={{ x: 0, y: 0 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 356 }} pointerEvents="none">
              <View style={{ flex: 1, paddingLeft: 10, paddingTop: 50, paddingRight: 30, paddingBottom: 25 }}>
                <Image source={{ uri: logoUrl || LOGO_URL }} style={{ width: '100%', height: headline || subtitle ? '72%' : '100%', borderRadius: 8 }} resizeMode="contain" />
                {headline ? <Text style={{ color: DARK, fontSize: 18, fontWeight: '700', textAlign: 'center', marginTop: 3 }}>{headline}</Text> : null}
                {subtitle ? <Text style={{ color: FIELD_TEXT, fontSize: 12, textAlign: 'center', marginTop: 2 }}>{subtitle}</Text> : null}
              </View>
            </LinearGradient>
            <View style={{ position: 'absolute', top: 300, left: 15, right: 15 }}>
              <View style={{ height: 470, backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 15, paddingTop: 24, overflow: 'hidden' }}>
                <View style={{ paddingHorizontal: 8 }}>
                  <View style={{ height: 50, flexDirection: 'row', backgroundColor: TOGGLE_BG, borderRadius: 12, padding: 2 }}>
                    <Pressable onPress={() => setRole(false)} style={{ flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: !vendor ? accent : 'transparent' }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: !vendor ? '#fff' : TOGGLE_OFF }}>{t(copy.buyer_label, 'Buyer')}</Text>
                    </Pressable>
                    <Pressable onPress={() => setRole(true)} style={{ flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: vendor ? accent : 'transparent' }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: vendor ? '#fff' : TOGGLE_OFF }}>{t(copy.business_label, 'B&P 2P')}</Text>
                    </Pressable>
                  </View>
                </View>
                {vendor ? <View style={{ height: 25, justifyContent: 'center', paddingLeft: '50%', alignItems: 'center' }}><Text style={{ fontSize: 13, color: RED }}>{t(copy.business_space_label, 'Business Space')}</Text></View> : null}
                {register && vendor ? <View style={{ paddingTop: 5, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7 }}><Pressable onPress={() => setStep(0)}>{dot(step === 0)}</Pressable><Pressable onPress={() => setStep(1)}>{dot(step === 1)}</Pressable></View> : null}
                {body}
              </View>
              <Pressable onPress={setMode} style={{ paddingTop: 5, paddingBottom: 10, alignItems: 'center' }}>
                <Text style={{ textAlign: 'center', fontSize: 15, color: DARK }}>
                  {register ? t(copy.login_prompt, 'Already have an account? ') : t(copy.register_prompt, "Don't have an account? ")}
                  <Text style={{ fontSize: 14.5, fontWeight: '600', color: linkAccent }}>{register ? t(copy.login_link, 'Sign in') : t(copy.register_link, 'Register')}</Text>
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
