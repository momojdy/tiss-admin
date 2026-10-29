import { Image, Text, View } from 'react-native';

type AuthPreviewDraft = {
  headline: string;
  subtitle: string;
  primary_color: string;
  link_color: string;
  buyer_label: string;
  business_label: string;
  email_placeholder: string;
  password_placeholder: string;
  forgot_password_label: string;
  sign_in_button: string;
  register_prompt: string;
  register_link: string;
};

type Props = {
  draft: AuthPreviewDraft;
  logoPreview: string;
  googlePreview: string;
  applePreview: string;
};

export function AuthPhonePreview({ draft, logoPreview, googlePreview, applePreview }: Props) {
  const primary = /^#[0-9a-fA-F]{6}$/.test(draft.primary_color) ? draft.primary_color : '#BF008E';
  const link = /^#[0-9a-fA-F]{6}$/.test(draft.link_color) ? draft.link_color : '#9D315B';
  const textOr = (value: string | undefined, fallback: string) => value?.trim() || fallback;

  const field = (placeholder: string) => (
    <View style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 9, paddingHorizontal: 10, height: 35, justifyContent: 'center', marginTop: 7 }}>
      <Text style={{ color: '#8A8A8A', fontSize: 10 }}>{placeholder}</Text>
    </View>
  );

  const socialButton = (label: string, imageUrl: string) => (
    <View style={{ height: 36, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 9, marginTop: 7, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
      {imageUrl ? <Image source={{ uri: imageUrl }} resizeMode="contain" style={{ width: '92%', height: 29 }} /> : <Text style={{ color: '#252525', fontSize: 10, fontWeight: '600' }}>Continue with {label}</Text>}
    </View>
  );

  return (
    <View style={{ alignItems: 'center', paddingVertical: 10 }}>
      <View style={{ width: 276, maxWidth: '100%', borderWidth: 5, borderColor: '#202124', borderRadius: 32, padding: 8, backgroundColor: '#202124' }}>
        <View style={{ height: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderTopLeftRadius: 21, borderTopRightRadius: 21 }}>
          <View style={{ width: 64, height: 5, borderRadius: 4, backgroundColor: '#202124' }} />
        </View>
        <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 17, paddingBottom: 22, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 }}>
          <View style={{ alignItems: 'center', minHeight: 48, justifyContent: 'center' }}>
            {logoPreview ? <Image source={{ uri: logoPreview }} resizeMode="contain" style={{ width: 94, height: 45 }} /> : <Text style={{ fontSize: 19, fontWeight: '800', color: primary }}>Wantiss</Text>}
          </View>
          {draft.headline.trim() ? <Text style={{ textAlign: 'center', color: '#222222', fontSize: 15, fontWeight: '700', marginTop: 10 }}>{draft.headline}</Text> : null}
          {draft.subtitle.trim() ? <Text style={{ textAlign: 'center', color: '#777777', fontSize: 10, marginTop: 5 }}>{draft.subtitle}</Text> : null}
          <View style={{ flexDirection: 'row', marginTop: 16, backgroundColor: '#F5F5F5', padding: 3, borderRadius: 9 }}>
            <View style={{ flex: 1, backgroundColor: primary, borderRadius: 7, paddingVertical: 8, alignItems: 'center' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '600' }}>{textOr(draft.buyer_label, 'Buyer')}</Text>
            </View>
            <View style={{ flex: 1, borderRadius: 7, paddingVertical: 8, alignItems: 'center' }}>
              <Text style={{ color: '#555555', fontSize: 10 }}>{textOr(draft.business_label, 'Business')}</Text>
            </View>
          </View>
          {field(textOr(draft.email_placeholder, 'Email'))}
          {field(textOr(draft.password_placeholder, 'Password'))}
          <Text style={{ color: link, fontSize: 9, textAlign: 'right', marginTop: 7 }}>{textOr(draft.forgot_password_label, 'Forgot password?')}</Text>
          <View style={{ height: 36, borderRadius: 9, backgroundColor: primary, alignItems: 'center', justifyContent: 'center', marginTop: 11 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>{textOr(draft.sign_in_button, 'Sign in')}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 2 }}>
            <View style={{ height: 1, flex: 1, backgroundColor: '#E8E8E8' }} />
            <Text style={{ color: '#888888', fontSize: 8, marginHorizontal: 8 }}>OR CONTINUE WITH</Text>
            <View style={{ height: 1, flex: 1, backgroundColor: '#E8E8E8' }} />
          </View>
          {socialButton('Google', googlePreview)}
          {socialButton('Apple', applePreview)}
          <Text style={{ color: '#777777', fontSize: 9, textAlign: 'center', marginTop: 14 }}>
            {textOr(draft.register_prompt, "Don't have an account? ")}<Text style={{ color: link, fontWeight: '700' }}>{textOr(draft.register_link, 'Register')}</Text>
          </Text>
          <Text style={{ color: '#B2B2B2', fontSize: 8, textAlign: 'center', marginTop: 14 }}>Phone preview · sample screen</Text>
        </View>
      </View>
    </View>
  );
}
