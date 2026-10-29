import { useCallback, useEffect, useState } from 'react';
import { Image, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
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
  google_asset_key: 'wantiss.auth.google',
  apple_asset_key: 'wantiss.auth.apple',
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
  const [googleAssetId, setGoogleAssetId] = useState('');
  const [appleAssetId, setAppleAssetId] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [googlePreview, setGooglePreview] = useState('');
  const [applePreview, setApplePreview] = useState('');
  const [baseline, setBaseline] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string>('');
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
      const resolveAsset = (key: string) => usableAssets.filter((asset) => asset.asset_key === key && asset.status !== 'archived')
        .sort((a, b) => Number(b.status === 'published') - Number(a.status === 'published'))[0];
      const logo = resolveAsset(String(next.logo_asset_key || LOGO_KEY));
      const google = resolveAsset(String(next.google_asset_key || 'wantiss.auth.google'));
      const apple = resolveAsset(String(next.apple_asset_key || 'wantiss.auth.apple'));
      setLogoAssetId(logo?.status === 'draft' ? logo.id : '');
      setGoogleAssetId(google?.status === 'draft' ? google.id : '');
      setAppleAssetId(apple?.status === 'draft' ? apple.id : '');
      const previewAsset = async (asset: AssetRow | undefined) => {
        if (!asset) return '';
        const { data: signed, error: signedError } = await supabase.storage.from('wantiss-cms-assets').createSignedUrl(asset.storage_path, 3600);
        return !signedError && signed?.signedUrl ? signed.signedUrl : '';
      };
      const [logoUrl, googleUrl, appleUrl] = await Promise.all([previewAsset(logo), previewAsset(google), previewAsset(apple)]);
      setLogoPreview(logoUrl); setGooglePreview(googleUrl); setApplePreview(appleUrl);
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

  type AuthAssetSlot = 'logo' | 'google' | 'apple';
  const assetConfig = {
    logo: { key: LOGO_KEY, payloadKey: 'logo_asset_key' as const, label: 'Wantiss authentication page logo' },
    google: { key: 'wantiss.auth.google', payloadKey: 'google_asset_key' as const, label: 'Google sign-in button image' },
    apple: { key: 'wantiss.auth.apple', payloadKey: 'apple_asset_key' as const, label: 'Apple sign-in button image' },
  };
  const uploadAuthAsset = async (slot: AuthAssetSlot, source: 'photos' | 'files') => {
    if (!canEdit || busy) return;
    setError(''); setNotice('');
    try {
      let uri = '';
      let fileName = slot + '-auth-asset';
      let contentType = 'image/jpeg';
      let byteSize = 0;

      if (source === 'photos') {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.9,
        });
        if (result.canceled || !result.assets?.[0]) return;
        const file = result.assets[0];
        uri = file.uri;
        fileName = file.fileName || fileName;
        contentType = file.mimeType || contentType;
        byteSize = file.fileSize || 0;
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: 'image/*',
          multiple: false,
          copyToCacheDirectory: true,
        });
        if (result.canceled || !result.assets?.[0]) return;
        const file = result.assets[0];
        uri = file.uri;
        fileName = file.name || fileName;
        contentType = file.mimeType || contentType;
        byteSize = file.size || 0;
      }

      if (!byteSize) {
        const response = await fetch(uri);
        if (!response.ok) throw new Error('The selected image could not be read. Choose another image.');
        byteSize = (await response.blob()).size;
      }
      if (!byteSize) throw new Error('The selected image size could not be read. Choose another image.');
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(contentType)) {
        throw new Error('Choose a JPEG, PNG, WebP, or GIF image. If your photo is HEIC/HEIF, export it as JPEG first.');
      }

      setBusy(slot);
      const config = assetConfig[slot];
      const assetKey = config.key + '.' + crypto.randomUUID();
      const id = await uploadCmsAsset({
        key: assetKey, uri, fileName, contentType, byteSize,
        altText: { en: config.label }, status: 'draft',
      });
      if (slot === 'logo') { setLogoAssetId(id); setLogoPreview(file.uri); }
      if (slot === 'google') { setGoogleAssetId(id); setGooglePreview(file.uri); }
      if (slot === 'apple') { setAppleAssetId(id); setApplePreview(file.uri); }
      update(config.payloadKey, assetKey);
      setNotice(config.label + ' uploaded as a private draft. Publish this asset, then save and publish the page content.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The selected image could not be uploaded.');
    } finally { setBusy(''); }
  };

  const publishAuthAsset = async (slot: AuthAssetSlot) => {
    const id = slot === 'logo' ? logoAssetId : slot === 'google' ? googleAssetId : appleAssetId;
    if (!id || !canPublish || busy) return;
    setBusy('publish-' + slot); setError(''); setNotice('');
    try {
      await publishCmsAsset(id);
      if (slot === 'logo') setLogoAssetId('');
      if (slot === 'google') setGoogleAssetId('');
      if (slot === 'apple') setAppleAssetId('');
      setNotice(assetConfig[slot].label + ' published. Save and publish the page draft to make it live.');
    } catch (e) { setError(e instanceof Error ? e.message : 'The image asset could not be published.'); }
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

  const renderAssetControl = (slot: AuthAssetSlot, title: string, preview: string, assetId: string) => (
    <View key={slot} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
      {preview ? <Image source={{ uri: preview }} resizeMode="contain" style={{ width: 100, height: 64, borderRadius: 8, backgroundColor: '#FFFFFF' }} /> : <View style={{ width: 100, height: 64, borderRadius: 8, backgroundColor: c.inset, alignItems: 'center', justifyContent: 'center' }}><Txt size={10} mut>No custom image</Txt></View>}
      <View style={{ flex: 1, minWidth: 160, gap: 6 }}>
        <Txt size={11}>{title}</Txt>
        <OutlineBtn onPress={() => { void uploadAuthAsset(slot, 'photos'); }} disabled={!canEdit || !!busy}>
          {busy === slot ? 'Uploading…' : 'Choose from Photos / Live Photos'}
        </OutlineBtn>
        <OutlineBtn onPress={() => { void uploadAuthAsset(slot, 'files'); }} disabled={!canEdit || !!busy}>
          Choose from Files
        </OutlineBtn>
        {assetId ? <OutlineBtn onPress={() => { void publishAuthAsset(slot); }} disabled={!canPublish || !!busy}>{busy === 'publish-' + slot ? 'Publishing…' : 'Publish image asset'}</OutlineBtn> : null}
      </View>
    </View>
  );

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
        {renderAssetControl('logo', 'Wantiss logo', logoPreview, logoAssetId)}
        {input('headline', 'Optional header title')}
        {input('subtitle', 'Optional header subtitle', true)}
      </Section>
      <Section title="Google and Apple sign-in images">
        <Txt size={10.5} mut>Choose each button image from your photo library (including the image version of a Live Photo) or from Files. Upload the image, publish that image asset, then save and publish the page draft. The existing Google and Apple sign-in actions stay unchanged. Supported formats: JPEG, PNG, WebP, and GIF.</Txt>
        {renderAssetControl('google', 'Google sign-in image', googlePreview, googleAssetId)}
        {renderAssetControl('apple', 'Apple sign-in image', applePreview, appleAssetId)}
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
          <OutlineBtn onPress={() => { void publish(); }} disabled={!row || row.status !== 'draft' || !canPublish || !!busy || loading || dirty || !!logoAssetId || !!googleAssetId || !!appleAssetId}>{busy === 'publish' ? 'Publishing…' : 'Publish page'}</OutlineBtn>
        </View>
        {dirty ? <Txt size={10} color={c.or} style={{ marginTop: 7 }}>You have unsaved edits. Save a draft before publishing.</Txt> : null}
      </Section>
    </View>
  );
}
