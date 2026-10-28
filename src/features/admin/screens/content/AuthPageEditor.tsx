import { useCallback, useEffect, useState } from 'react';
import { Image, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { listCmsAssets, publishCmsAsset, publishCmsVersion, saveCmsVersion, uploadCmsAsset } from '../../lib/adminBackend';
import { useTheme } from '../../theme/ThemeContext';
import { Card, Section } from '../../ui/Card';
import { OutlineBtn } from '../../ui/Controls';
import { Heading } from '../../ui/Heading';
import { Txt } from '../../ui/Txt';

type CmsRow = { id: string; version: number; status: 'draft' | 'published' | 'archived'; payload: Record<string, unknown> };
type AssetRow = { id: string; asset_key: string; status: 'draft' | 'published' | 'archived'; storage_path: string; content_type: string };

const CONTENT_KEY = 'wantiss.auth';
const LOGO_KEY = 'wantiss.auth.logo';
const DEFAULTS = {
  headline: '',
  subtitle: '',
  logo_asset_key: LOGO_KEY,
  primary_color: '#BF008E',
  link_color: '#9D315B',
  buyer_label: 'Buyer',
  business_label: 'B&P 2P',
  business_space_label: 'Business Space',
  email_placeholder: 'Email',
  password_placeholder: 'Password',
  full_name_placeholder: 'Full Name',
  business_name_placeholder: 'Business Name (optional)',
  forgot_password_label: 'Forgot password?',
  sign_in_button: 'Sign in',
  sign_up_button: 'Sign Up',
  register_prompt: "Don't have an account? ",
  register_link: 'Register',
  login_prompt: 'Already have an account? ',
  login_link: 'Sign in',
};

type AuthDraft = typeof DEFAULTS;
const COLUMNS = 'id,version,status,payload';

export function AuthPageEditor({ canEdit, canPublish }: { canEdit: boolean; canPublish: boolean }) {
  const { c } = useTheme();
  const [draft, setDraft] = useState<AuthDraft>(DEFAULTS);
  const [row, setRow] = useState<CmsRow | null>(null);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [logoAssetId, setLogoAssetId] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [baseline, setBaseline] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'save' | 'publish' | 'logo' | 'publish-logo' | ''>('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [{ data, error: queryError }, assetRows] = await Promise.all([
        supabase.from('wantiss_cms_content').select(COLUMNS).eq('content_key', CONTENT_KEY).eq('locale', 'en')
          .in('status', ['draft', 'published']).order('version', { ascending: false }).limit(20),
        listCmsAssets(),
      ]);
      if (queryError) throw new Error(queryError.code === '42501' ? 'You do not have permission to read authentication-page content.' : 'Authentication-page content could not be loaded.');
      const usableAssets = (Array.isArray(assetRows) ? assetRows : []) as AssetRow[];
      setAssets(usableAssets.filter((asset) => asset.status !== 'archived' && /^image\//.test(asset.content_type)));
      const rows = (data || []) as CmsRow[];
      const latest = rows[0] || null;
      const next = { ...DEFAULTS, ...(latest?.payload || {}) } as AuthDraft;
      setRow(latest);
      setDraft(next);
      setBaseline(JSON.stringify(next));
      const matching = usableAssets.filter((asset) => asset.asset_key === String(next.logo_asset_key || LOGO_KEY) && asset.status !== 'archived')
        .sort((a, b) => Number(b.status === 'published') - Number(a.status === 'published'))[0];
      setLogoAssetId(matching?.status === 'draft' ? matching.id : '');
      if (matching) {
        const { data: signed, error: signedError } = await supabase.storage.from('wantiss-cms-assets').createSignedUrl(matching.storage_path, 3600);
        setLogoPreview(!signedError && signed?.signedUrl ? signed.signedUrl : '');
      } else setLogoPreview('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Authentication-page content could not be loaded.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  const update = (key: keyof AuthDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setNotice('');
  };
  const dirty = JSON.stringify(draft) !== baseline;

  const uploadLogo = async () => {
    if (!canEdit || busy) return;
    setError(''); setNotice('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.9,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const file = result.assets[0];
      const contentType = file.mimeType || 'image/jpeg';
      const byteSize = file.fileSize || 0;
      if (!byteSize) throw new Error('The selected image size could not be read. Choose another image.');
      setBusy('logo');
      const id = await uploadCmsAsset({
        key: LOGO_KEY,
        uri: file.uri,
        fileName: file.fileName || 'auth-logo',
        contentType,
        byteSize,
        altText: { en: 'Wantiss authentication page logo' },
        status: 'draft',
      });
      setLogoAssetId(id);
      setLogoPreview(file.uri);
      update('logo_asset_key', LOGO_KEY);
      setNotice('Logo uploaded as a private draft. Publish the logo asset, then save and publish the page content.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The logo could not be uploaded.');
    } finally { setBusy(''); }
  };

  const publishLogo = async () => {
    if (!logoAssetId || !canPublish || busy) return;
    setBusy('publish-logo'); setError(''); setNotice('');
    try {
      await publishCmsAsset(logoAssetId);
      setNotice('Logo asset published. Save and publish the authentication page to use it.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'The logo asset could not be published.'); }
    finally { setBusy(''); }
  };

  const save = async () => {
    if (!canEdit || busy) return;
    setBusy('save'); setError(''); setNotice('');
    try {
      const id = await saveCmsVersion({ key: CONTENT_KEY, locale: 'en', payload: draft, status: 'draft' });
      const { data, error: queryError } = await supabase.from('wantiss_cms_content').select(COLUMNS).eq('id', id).maybeSingle();
      if (queryError || !data) throw new Error('The save request completed, but the new draft could not be confirmed. Reload before trying again.');
      const saved = data as CmsRow;
      setRow(saved); setDraft({ ...DEFAULTS, ...(saved.payload || {}) } as AuthDraft); setBaseline(JSON.stringify({ ...DEFAULTS, ...(saved.payload || {}) }));
      setNotice('Authentication page saved as draft version ' + saved.version + '. The live page is unchanged.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Authentication-page draft could not be saved.'); }
    finally { setBusy(''); }
  };

  const publish = async () => {
    if (!row || row.status !== 'draft' || !canPublish || busy || dirty) return;
    setBusy('publish'); setError(''); setNotice('');
    try {
      await publishCmsVersion(row.id);
      await load();
      setNotice('Authentication page published. The customer app will use the published content when it refreshes.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Authentication page could not be published.'); }
    finally { setBusy(''); }
  };

  const fieldStyle = { borderWidth: 1, borderColor: c.bd, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, marginTop: 5, marginBottom: 9, color: c.ink, backgroundColor: c.card, fontSize: 12 } as const;
  const input = (key: keyof AuthDraft, label: string, multiline = false) => (
    <View key={key} style={{ marginTop: 5 }}>
      <Txt size={10.5} mut>{label}</Txt>
      <TextInput value={String(draft[key] ?? '')} onChangeText={(value) => update(key, value)} editable={canEdit && !busy} multiline={multiline} style={[fieldStyle, multiline ? { minHeight: 64, textAlignVertical: 'top' } : null]} />
    </View>
  );

  return (
    <View>
      <Heading title="Authentication page editor" />
      <Txt size={11} mut style={{ marginBottom: 10 }}>Edit the existing sign-in and registration page. Authentication actions and validation remain in the customer app; this editor only changes published presentation content.</Txt>
      {error ? <Card><Txt size={11} color={c.or}>{error}</Txt></Card> : null}
      {notice ? <Card><Txt size={11} color={c.ink}>{notice}</Txt></Card> : null}
      <Section title="Logo and header">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {logoPreview ? <Image source={{ uri: logoPreview }} resizeMode="contain" style={{ width: 100, height: 70, borderRadius: 8 }} /> : <View style={{ width: 100, height: 70, borderRadius: 8, backgroundColor: c.inset, alignItems: 'center', justifyContent: 'center' }}><Txt size={10} mut>No custom logo</Txt></View>}
          <View style={{ flex: 1, minWidth: 160, gap: 6 }}>
            <Txt size={10.5} mut>Logo asset key: {String(draft.logo_asset_key || LOGO_KEY)}</Txt>
            <OutlineBtn onPress={() => { void uploadLogo(); }} disabled={!canEdit || !!busy}>{busy === 'logo' ? 'Uploading…' : 'Choose logo from photo library'}</OutlineBtn>
            {logoAssetId ? <OutlineBtn onPress={() => { void publishLogo(); }} disabled={!canPublish || !!busy}>{busy === 'publish-logo' ? 'Publishing logo…' : 'Publish logo asset'}</OutlineBtn> : null}
          </View>
        </View>
        {input('headline', 'Optional header title')}
        {input('subtitle', 'Optional header subtitle', true)}
      </Section>
      <Section title="Text and labels">
        {input('buyer_label', 'Buyer toggle label')}
        {input('business_label', 'Business toggle label')}
        {input('business_space_label', 'Business Space label')}
        {input('email_placeholder', 'Email field placeholder')}
        {input('password_placeholder', 'Password field placeholder')}
        {input('full_name_placeholder', 'Full name field placeholder')}
        {input('business_name_placeholder', 'Business name field placeholder')}
        {input('forgot_password_label', 'Forgot password link')}
        {input('sign_in_button', 'Sign-in button')}
        {input('sign_up_button', 'Sign-up button')}
        {input('register_prompt', 'Register prompt')}
        {input('register_link', 'Register link text')}
        {input('login_prompt', 'Existing-account prompt')}
        {input('login_link', 'Sign-in link text')}
        {input('primary_color', 'Primary accent color (hex, e.g. #BF008E)')}
        {input('link_color', 'Link color (hex, e.g. #9D315B)')}
      </Section>
      <Section title="Draft and publishing">
        <Txt size={10.5} mut>{loading ? 'Loading current CMS version…' : row ? 'Current version: ' + row.version + ' · ' + row.status : 'No CMS version exists yet. Saving creates the first draft.'}</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          <OutlineBtn onPress={() => { void load(); }} disabled={loading || !!busy}>Reload</OutlineBtn>
          <OutlineBtn primary onPress={() => { void save(); }} disabled={!canEdit || !!busy || loading}>{busy === 'save' ? 'Saving…' : 'Save private draft'}</OutlineBtn>
          <OutlineBtn onPress={() => { void publish(); }} disabled={!row || row.status !== 'draft' || !canPublish || !!busy || loading || dirty || !!logoAssetId}>{busy === 'publish' ? 'Publishing…' : 'Publish page'}</OutlineBtn>
        </View>
        {dirty ? <Txt size={10} color={c.or} style={{ marginTop: 7 }}>You have unsaved edits. Save a draft before publishing.</Txt> : null}
      </Section>
    </View>
  );
}
