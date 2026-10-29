import { useCallback, useEffect, useState } from 'react';
import { Image, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../../lib/supabase';
import { listCmsAssets, publishCmsAsset, publishCmsVersion, saveCmsVersion, uploadCmsAsset } from '../../lib/adminBackend';
import { fetchPublishedWantissContent } from '../../lib/wantissCms';
import { DEFAULT_HOME_COPY, HOME_CATEGORIES, HOME_CONTENT_KEY, buildHomeContent, homeCategorySlug, mergeHomeCopy, type HomeCopy } from '../../lib/wantissHomeContent';
import { useTheme } from '../../theme/ThemeContext';
import { Card, Section } from '../../ui/Card';
import { OutlineBtn } from '../../ui/Controls';
import { Txt } from '../../ui/Txt';
import { HomePagePreview } from './HomePagePreview';
import { PhoneFrame } from './PhoneFrame';

type CmsRow = { id: string; version: number; status: 'draft' | 'published' | 'archived'; payload: Record<string, unknown> };
type AssetRow = { id: string; asset_key: string; status: 'draft' | 'published' | 'archived'; storage_path: string; content_type: string };
type Field = { key: string; label: string; multiline?: boolean };
type TargetConfig = { title: string; fields: Field[]; images: { key: string; label: string }[]; toggle?: string };

const COLUMNS = 'id,version,status,payload';
const ASSET_BUCKET = 'wantiss-cms-assets';
const f = (key: string, label: string, multiline = false): Field => ({ key, label, multiline });

const SINGLE: Record<string, TargetConfig> = {
  tab_favs: { title: 'Tab · Favs', fields: [f('tab_favs', 'Tab label')], images: [] },
  tab_for_you: { title: 'Tab · For you', fields: [f('tab_for_you', 'Tab label')], images: [] },
  tab_flash: { title: 'Tab · Flash', fields: [f('tab_flash', 'Tab label')], images: [] },
  tab_locals: { title: 'Tab · Locals', fields: [f('tab_locals', 'Tab label')], images: [] },
  tab_new_arrivals: { title: 'Tab · New Arrivals', fields: [f('tab_new_arrivals', 'Tab label (first word goes on the top line)')], images: [] },
  tab_live: { title: 'Tab · Live', fields: [f('tab_live', 'Tab label')], images: [] },
  categories_label: { title: 'Categories link', fields: [f('categories_label', 'Link text')], images: [] },
  slogans: { title: 'Search bar slogans', fields: [f('slogan_1', 'Slogan 1'), f('slogan_2', 'Slogan 2'), f('slogan_3', 'Slogan 3')], images: [] },
  search_button: { title: 'Search button', fields: [f('search_button', 'Button text')], images: [] },
  featured: { title: 'Featured picks card', fields: [f('featured_label', 'Card title'), f('featured_caption_1', 'Caption 1'), f('featured_caption_2', 'Caption 2'), f('featured_caption_3', 'Caption 3')], images: [] },
  flash: { title: 'Flash deals card', fields: [f('flash_label', 'Card title'), f('flash_caption_1', 'Caption 1'), f('flash_caption_2', 'Caption 2'), f('flash_caption_3', 'Caption 3')], images: [] },
  voucher: { title: 'Voucher card', fields: [f('voucher_amount', 'Amount'), f('voucher_text', 'Text')], images: [] },
  banner1: { title: 'Promo card 1', fields: [f('banner_caption_1', 'Caption')], images: [{ key: 'banner_image_1_asset_key', label: 'Image' }] },
  banner2: { title: 'Promo card 2', fields: [f('banner_caption_2', 'Caption')], images: [{ key: 'banner_image_2_asset_key', label: 'Image' }] },
  banner3: { title: 'Promo card 3', fields: [f('banner_caption_3', 'Caption')], images: [{ key: 'banner_image_3_asset_key', label: 'Image' }] },
  notice: { title: 'Promo notice bar', fields: [f('notice_1', 'Notice 1'), f('notice_2', 'Notice 2'), f('notice_3', 'Notice 3')], images: [] },
  popup: { title: 'Promo popup', fields: [f('popup_badge', 'Badge text'), f('popup_message_1', 'Message 1'), f('popup_message_2', 'Message 2'), f('popup_message_3', 'Message 3')], images: [], toggle: 'popup_enabled' },
  nav_logo: { title: 'Bottom bar logo', fields: [], images: [{ key: 'logo_asset_key', label: 'Logo' }] },
  nav_showcase: { title: 'Bottom bar · Showcase', fields: [f('nav_showcase', 'Label')], images: [] },
  nav_messages: { title: 'Bottom bar · Messages', fields: [f('nav_messages', 'Label')], images: [] },
  nav_cart: { title: 'Bottom bar · Cart', fields: [f('nav_cart', 'Label')], images: [] },
  nav_me: { title: 'Bottom bar · Me', fields: [f('nav_me', 'Label')], images: [] },
};

function targetConfig(id: string): TargetConfig | null {
  if (id.startsWith('cat:')) {
    const slug = id.slice(4);
    const label = HOME_CATEGORIES.find((item) => homeCategorySlug(item) === slug);
    if (!label) return null;
    return { title: 'Category · ' + label, fields: [f('cat_' + slug, 'Label')], images: [{ key: 'cat_' + slug + '_asset_key', label: 'Icon' }] };
  }
  return SINGLE[id] || null;
}

const SECTIONS: { title: string; ids: string[] }[] = [
  { title: 'Tabs and search', ids: ['tab_favs', 'tab_for_you', 'tab_flash', 'tab_locals', 'tab_new_arrivals', 'tab_live', 'categories_label', 'slogans', 'search_button'] },
  { title: 'Categories', ids: HOME_CATEGORIES.map((label) => 'cat:' + homeCategorySlug(label)) },
  { title: 'Featured and flash cards', ids: ['featured', 'flash'] },
  { title: 'Promo banner', ids: ['voucher', 'banner1', 'banner2', 'banner3', 'notice'] },
  { title: 'Promo popup', ids: ['popup'] },
  { title: 'Bottom bar', ids: ['nav_logo', 'nav_showcase', 'nav_messages', 'nav_cart', 'nav_me'] },
];

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function HomePageEditor({ canEdit, canPublish }: { canEdit: boolean; canPublish: boolean }) {
  const { c } = useTheme();
  const [draft, setDraft] = useState<HomeCopy>(DEFAULT_HOME_COPY);
  const [row, setRow] = useState<CmsRow | null>(null);
  const [pending, setPending] = useState<Record<string, string>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [baseline, setBaseline] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [mode, setMode] = useState<'Manual editor' | 'Phone preview'>('Manual editor');
  const [selected, setSelected] = useState<string | null>(null);

  const manual = mode === 'Manual editor';
  const editOnPhone = manual && canEdit;
  const dirty = JSON.stringify(draft) !== baseline;
  const pendingFields = Object.keys(pending).filter((field) => pending[field]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [{ data, error: queryError }, assetRows] = await Promise.all([
        supabase.from('wantiss_cms_content').select(COLUMNS).eq('content_key', HOME_CONTENT_KEY).eq('locale', 'en')
          .in('status', ['draft', 'published']).order('version', { ascending: false }).limit(20),
        listCmsAssets(),
      ]);
      if (queryError) throw new Error(queryError.code === '42501' ? 'You do not have permission to read Home page content.' : 'Home page content could not be loaded.');
      const usable = ((Array.isArray(assetRows) ? assetRows : []) as AssetRow[]).filter((asset) => asset.status !== 'archived' && /^image\//.test(asset.content_type));
      const latest = ((data || []) as CmsRow[])[0] || null;
      const next = mergeHomeCopy(latest?.payload);
      setRow(latest); setDraft(next); setBaseline(JSON.stringify(next)); setSelected(null);

      const found = new Map<string, AssetRow>();
      Object.keys(next).filter((field) => field.endsWith('_asset_key') && next[field]).forEach((field) => {
        const match = usable.filter((asset) => asset.asset_key === next[field]).sort((a, b) => Number(b.status === 'published') - Number(a.status === 'published'))[0];
        if (match) found.set(field, match);
      });
      const nextPending: Record<string, string> = {};
      found.forEach((asset, field) => { if (asset.status === 'draft') nextPending[field] = asset.id; });
      setPending(nextPending);
      const paths = Array.from(found.values()).map((asset) => asset.storage_path);
      const nextPreviews: Record<string, string> = {};
      if (paths.length) {
        const { data: signed } = await supabase.storage.from(ASSET_BUCKET).createSignedUrls(paths, 3600);
        const byPath = new Map<string, string>();
        (signed || []).forEach((item: any) => { if (item?.path && item?.signedUrl) byPath.set(item.path, item.signedUrl); });
        found.forEach((asset, field) => { const url = byPath.get(asset.storage_path); if (url) nextPreviews[field] = url; });
      }
      setPreviews(nextPreviews);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Home page content could not be loaded.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const update = (key: string, value: string) => { setDraft((current) => ({ ...current, [key]: value })); setNotice(''); };
  const switchMode = (next: 'Manual editor' | 'Phone preview') => { setMode(next); setSelected(null); };

  const uploadImage = async (field: string, source: 'photos' | 'files') => {
    if (!canEdit || busy) return;
    setError(''); setNotice('');
    try {
      let uri = '';
      let fileName = field + '-home-asset';
      let contentType = 'image/jpeg';
      let byteSize = 0;
      if (source === 'photos') {
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.9 });
        if (result.canceled || !result.assets?.[0]) return;
        const file = result.assets[0];
        uri = file.uri; fileName = file.fileName || fileName; contentType = file.mimeType || contentType; byteSize = file.fileSize || 0;
      } else {
        const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', multiple: false, copyToCacheDirectory: true });
        if (result.canceled || !result.assets?.[0]) return;
        const file = result.assets[0];
        uri = file.uri; fileName = file.name || fileName; contentType = file.mimeType || contentType; byteSize = file.size || 0;
      }
      if (!byteSize) {
        const response = await fetch(uri);
        if (!response.ok) throw new Error('The selected image could not be read. Choose another image.');
        byteSize = (await response.blob()).size;
      }
      if (!byteSize) throw new Error('The selected image size could not be read. Choose another image.');
      if (!IMAGE_TYPES.includes(contentType)) throw new Error('Choose a JPEG, PNG, WebP, or GIF image. If your photo is HEIC/HEIF, export it as JPEG first.');
      setBusy(field);
      const assetKey = 'wantiss.home.' + field + '.' + crypto.randomUUID();
      const id = await uploadCmsAsset({ key: assetKey, uri, fileName, contentType, byteSize, altText: { en: 'Home page image' }, status: 'draft' });
      setPending((current) => ({ ...current, [field]: id }));
      setPreviews((current) => ({ ...current, [field]: uri }));
      update(field, assetKey);
      setNotice('Image uploaded as a private draft. Publish the image, then save and publish the page.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The selected image could not be uploaded.');
    } finally { setBusy(''); }
  };

  const publishImage = async (field: string) => {
    const id = pending[field];
    if (!id || !canPublish || busy) return;
    setBusy('publish-' + field); setError(''); setNotice('');
    try {
      await publishCmsAsset(id);
      setPending((current) => { const next = { ...current }; delete next[field]; return next; });
      setNotice('Image published. Save and publish the page to make it live.');
    } catch (e) { setError(e instanceof Error ? e.message : 'The image could not be published.'); }
    finally { setBusy(''); }
  };

  const useDefaultImage = (field: string) => {
    update(field, '');
    setPending((current) => { const next = { ...current }; delete next[field]; return next; });
    setPreviews((current) => { const next = { ...current }; delete next[field]; return next; });
  };

  const save = async () => {
    if (!canEdit || busy) return;
    setBusy('save'); setError(''); setNotice('');
    try {
      const id = await saveCmsVersion({ key: HOME_CONTENT_KEY, locale: 'en', payload: draft, status: 'draft' });
      const { data, error: queryError } = await supabase.from('wantiss_cms_content').select(COLUMNS).eq('id', id).maybeSingle();
      if (queryError || !data) throw new Error('The save request completed, but the new draft could not be confirmed. Reload before trying again.');
      const saved = data as CmsRow;
      const merged = mergeHomeCopy(saved.payload);
      setRow(saved); setDraft(merged); setBaseline(JSON.stringify(merged));
      setNotice('Home page saved as draft version ' + saved.version + '. The live app is unchanged.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Home page draft could not be saved.'); }
    finally { setBusy(''); }
  };

  const publish = async () => {
    if (!row || row.status !== 'draft' || !canPublish || busy || dirty || pendingFields.length) return;
    setBusy('publish'); setError(''); setNotice('');
    try {
      await publishCmsVersion(row.id);
      // Read back what the customer app will receive and compare it with this draft.
      let message = 'Home page published as version ' + row.version + '.';
      try {
        const remote = await fetchPublishedWantissContent('en');
        const { content, found } = buildHomeContent(remote.content as any, remote.assets);
        const expected = mergeHomeCopy(row.payload);
        const same = found && Object.keys(expected).every((key) => content.copy[key] === expected[key]);
        const missingImages = Object.keys(expected).filter((key) => key.endsWith('_asset_key') && expected[key] && !content.images[key]);
        if (same && !missingImages.length) message += ' Confirmed: the public endpoint serves this exact content. The app picks it up the next time Home opens (the endpoint caches for up to a minute).';
        else if (!found) message += ' The public endpoint has not returned it yet. Press Reload in a minute to check.';
        else message += ' Warning: the public endpoint does not match this draft' + (missingImages.length ? ' (images not served: ' + missingImages.join(', ') + ')' : '') + '. Press Reload in a minute and check again.';
      } catch { message += ' Could not read it back from the public endpoint; press Reload to check.'; }
      await load();
      setNotice(message);
    } catch (e) { setError(e instanceof Error ? e.message : 'Home page could not be published.'); }
    finally { setBusy(''); }
  };

  const fieldStyle = { borderWidth: 1, borderColor: c.bd, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, marginTop: 5, marginBottom: 9, color: c.ink, backgroundColor: c.card, fontSize: 12 } as const;
  const input = (field: Field) => (
    <View key={field.key} style={{ marginTop: 5 }}>
      <Txt size={10.5} mut>{field.label}</Txt>
      <TextInput value={String(draft[field.key] ?? '')} onChangeText={(value) => update(field.key, value)} editable={canEdit && !busy} multiline={field.multiline} style={[fieldStyle, field.multiline ? { minHeight: 64, textAlignVertical: 'top' } : null]} />
    </View>
  );

  const imageControl = (key: string, title: string) => {
    const preview = previews[key];
    return (
      <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
        {preview ? <Image source={{ uri: preview }} resizeMode="contain" style={{ width: 100, height: 64, borderRadius: 8, backgroundColor: '#FFFFFF' }} /> : <View style={{ width: 100, height: 64, borderRadius: 8, backgroundColor: c.inset, alignItems: 'center', justifyContent: 'center' }}><Txt size={10} mut>Built-in image</Txt></View>}
        <View style={{ flex: 1, minWidth: 160, gap: 6 }}>
          <Txt size={11}>{title}</Txt>
          <OutlineBtn onPress={() => { void uploadImage(key, 'photos'); }} disabled={!canEdit || !!busy}>{busy === key ? 'Uploading…' : 'Choose from Photos / Live Photos'}</OutlineBtn>
          <OutlineBtn onPress={() => { void uploadImage(key, 'files'); }} disabled={!canEdit || !!busy}>Choose from Files</OutlineBtn>
          {pending[key] ? <OutlineBtn onPress={() => { void publishImage(key); }} disabled={!canPublish || !!busy}>{busy === 'publish-' + key ? 'Publishing…' : 'Publish image'}</OutlineBtn> : null}
          {draft[key] ? <OutlineBtn onPress={() => useDefaultImage(key)} disabled={!canEdit || !!busy}>Use built-in image</OutlineBtn> : null}
        </View>
      </View>
    );
  };

  const targetBody = (config: TargetConfig) => (
    <View>
      {config.toggle ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 4 }}>
        <Txt size={10.5} mut>{draft[config.toggle] === 'false' ? 'Hidden from customers' : 'Shown to customers'}</Txt>
        <OutlineBtn onPress={() => update(config.toggle!, draft[config.toggle!] === 'false' ? 'true' : 'false')} disabled={!canEdit || !!busy}>{draft[config.toggle] === 'false' ? 'Show popup' : 'Hide popup'}</OutlineBtn>
      </View> : null}
      {config.fields.map(input)}
      {config.images.map((image) => imageControl(image.key, image.label))}
    </View>
  );

  const selectedConfig = selected ? targetConfig(selected) : null;
  // The phone only needs the images that exist; undefined means "use the built-in one".
  const phoneImages: Record<string, string> = {};
  Object.keys(previews).forEach((key) => { if (draft[key]) phoneImages[key] = previews[key]; });

  return (
    <View>
      <Txt size={11} mut style={{ marginBottom: 10 }}>Edit the Home screen text and images customers see after signing in.</Txt>
      {error ? <Card><Txt size={11} color={c.or}>{error}</Txt></Card> : null}
      {notice ? <Card><Txt size={11} color={c.ink}>{notice}</Txt></Card> : null}
      <Section title="Home page" right={<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
        <OutlineBtn primary={manual} onPress={() => switchMode('Manual editor')}>Manual editor</OutlineBtn>
        <OutlineBtn primary={!manual} onPress={() => switchMode('Phone preview')}>Phone preview</OutlineBtn>
      </View>}>
        <Txt size={10} mut>{manual ? (canEdit ? 'Select an item on the phone or edit it below.' : 'View access only: editing is disabled.') : 'Preview of the Home screen with your draft.'}</Txt>
        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
          <PhoneFrame>
            <HomePagePreview copy={draft} images={phoneImages} editMode={editOnPhone} selected={selected} onSelect={setSelected} />
          </PhoneFrame>
        </View>
      </Section>
      {editOnPhone && selectedConfig ? (
        <Section title={selectedConfig.title}>
          {targetBody(selectedConfig)}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            <OutlineBtn onPress={() => setSelected(null)}>Done</OutlineBtn>
          </View>
        </Section>
      ) : null}
      {manual ? SECTIONS.map((section) => (
        <Section key={section.title} title={section.title}>
          {section.ids.map((id) => {
            const config = targetConfig(id);
            if (!config) return null;
            return (
              <View key={id} style={{ marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: c.bd }}>
                <Txt size={11} weight={500}>{config.title}</Txt>
                {targetBody(config)}
              </View>
            );
          })}
        </Section>
      )) : null}
      <Section title="Draft and publishing">
        <Txt size={10.5} mut>{loading ? 'Loading current CMS version…' : row ? 'Current version: ' + row.version + ' · ' + row.status : 'Nothing published yet: the app uses its built-in Home. Saving creates the first draft.'}</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          <OutlineBtn onPress={() => { void load(); }} disabled={loading || !!busy}>Reload</OutlineBtn>
          <OutlineBtn primary onPress={() => { void save(); }} disabled={!canEdit || !!busy || loading || (!dirty && !!row)}>{busy === 'save' ? 'Saving…' : 'Save private draft'}</OutlineBtn>
          <OutlineBtn onPress={() => { void publish(); }} disabled={!row || row.status !== 'draft' || !canPublish || !!busy || loading || dirty || pendingFields.length > 0}>{busy === 'publish' ? 'Publishing…' : 'Publish page'}</OutlineBtn>
        </View>
        {dirty ? <Txt size={10} color={c.or} style={{ marginTop: 7 }}>You have unsaved edits. Save a draft before publishing.</Txt> : null}
        {pendingFields.length ? <Txt size={10} color={c.or} style={{ marginTop: 7 }}>Publish the uploaded image{pendingFields.length > 1 ? 's' : ''} before publishing the page.</Txt> : null}
      </Section>
    </View>
  );
}
