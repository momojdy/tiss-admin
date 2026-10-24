import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../../lib/supabase';
import { archiveCmsAsset, archiveCmsVersion, listCmsAssets, publishCmsAsset, publishCmsVersion, saveCmsVersion, uploadCmsAsset } from '../../lib/adminBackend';
import { Section, Card } from '../../ui/Card';
import { Heading } from '../../ui/Heading';
import { ListRows } from '../../ui/Lists';
import { OutlineBtn, Pill } from '../../ui/Controls';
import { Field, useForm } from '../../ui/FormSheet';
import { Txt } from '../../ui/Txt';
import { useTheme } from '../../theme/ThemeContext';
import { useToast } from '../../ui/Toast';

type ContentRow = {
  id: string; content_key: string; locale: string; version: number; status: 'draft' | 'published' | 'archived';
  payload: Record<string, unknown>; updated_at: string;
};
type AssetRow = {
  id: string; asset_key: string; storage_path: string; content_type: string; byte_size: number;
  status: 'draft' | 'published' | 'archived'; alt_text: Record<string, string>; updated_at: string;
};

export function ContentScreen() {
  const { c } = useTheme();
  const form = useForm();
  const toast = useToast();
  const [content, setContent] = useState<ContentRow[]>([]);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setError('');
    const [contentResult, assetResult] = await Promise.all([
      supabase.from('wantiss_cms_content').select('id,content_key,locale,version,status,payload,updated_at').order('updated_at', { ascending: false }).limit(300),
      listCmsAssets().catch((error) => error instanceof Error ? error : new Error('Assets are unavailable.')),
    ]);
    if (contentResult.error) setError(contentResult.error.code === '42501' ? 'You do not have permission to view content.' : 'Content records are unavailable. Check the CMS migration and permission grants.');
    if (assetResult instanceof Error) setError(assetResult.message);
    setContent(contentResult.data || []);
    setAssets(Array.isArray(assetResult) ? assetResult as AssetRow[] : []);
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const newContent = () => form({
    title: 'Create content version',
    sub: 'Drafts are private. Publishing and archiving require separate server-side permissions.',
    fields: [
      { id: 'key', label: 'Content key', type: 'text', required: true, placeholder: 'goodies.home.hero' },
      { id: 'locale', label: 'Locale', type: 'select', options: ['en', 'fr', 'ht', 'es', 'zh'], value: 'en', required: true },
      { id: 'payload', label: 'Content payload (JSON)', type: 'textarea', required: true, value: '{}' },
      { id: 'status', label: 'Initial status', type: 'select', options: ['draft', 'published', 'archived'], value: 'draft', required: true },
    ],
    buttons: [{ label: 'Save version', key: 'save', primary: true }],
    onSubmit: async (_key, values) => {
      let payload: Record<string, unknown>;
      try { payload = JSON.parse(String(values.payload || '{}')); }
      catch { return 'Content payload must be valid JSON.'; }
      if (!payload || Array.isArray(payload) || typeof payload !== 'object') return 'Content payload must be a JSON object.';
      setBusy(true);
      try {
        await saveCmsVersion({ key: String(values.key), locale: String(values.locale), payload, status: 'draft' });
        await reload(); toast('Content version saved.');
      } catch (e) { return e instanceof Error ? e.message : 'Content could not be saved.'; }
      finally { setBusy(false); }
    },
  });

  const pickAsset = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const file = result.assets[0];
      if (!file.size || !file.mimeType) { setError('The selected file has no readable size or MIME type.'); return; }
      form({
        title: 'Upload private asset',
        sub: 'The asset is private by default. Publishing creates short-lived signed URLs for published customer/vendor content.',
        fields: [
          { id: 'key', label: 'Asset key', type: 'text', required: true, value: file.name.replace(/\\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '.') },
          { id: 'alt', label: 'Alt text (English)', type: 'text' },
          { id: 'status', label: 'Initial status', type: 'select', options: ['draft', 'published'], value: 'draft', required: true },
          { id: 'reason', label: 'Reason', type: 'textarea', required: true },
        ],
        buttons: [{ label: 'Upload asset', key: 'upload', primary: true }],
        onSubmit: async (_key, values) => {
          setBusy(true);
          try {
            const id = await uploadCmsAsset({
              key: String(values.key), uri: file.uri, fileName: file.name, contentType: file.mimeType!,
              byteSize: file.size!, altText: { en: String(values.alt || '') },
              status: 'draft',
            });
            await reload(); toast('Asset uploaded with ID ' + id + '.');
          } catch (e) { return e instanceof Error ? e.message : 'Asset upload failed.'; }
          finally { setBusy(false); }
        },
      });
    } catch {
      setError('Could not open the asset picker.');
    }
  };

  const setAssetStatus = async (asset: AssetRow, status: 'published' | 'archived') => {
    setBusy(true);
    try {
      if (status === 'published') await publishCmsAsset(asset.id);
      else await archiveCmsAsset(asset.id);
      await reload(); toast('Asset status changed to ' + status + '.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Asset status could not be changed.'); }
    finally { setBusy(false); }
  };

  const cloneStatus = (row: ContentRow, status: 'draft' | 'published' | 'archived') => form({
    title: status[0].toUpperCase() + status.slice(1) + ' content',
    sub: status === 'published' ? 'Only a draft can be published. The currently published version will be archived.' : status === 'archived' ? 'This version will no longer be delivered to customers or vendors.' : 'Save a new private draft version.',
    fields: [{ id: 'reason', label: 'Reason', type: 'textarea', required: true }],
    buttons: [{ label: status === 'published' ? 'Publish version' : status === 'archived' ? 'Archive version' : 'Create draft', key: 'save', primary: true }],
    onSubmit: async (_key, values) => {
      try {
        if (status === 'published') await publishCmsVersion(row.id);
        else if (status === 'archived') await archiveCmsVersion(row.id);
        else await saveCmsVersion({ key: row.content_key, locale: row.locale, payload: row.payload, status: 'draft' });
        await reload(); toast('Content status changed to ' + status + '.');
      } catch (e) { return e instanceof Error ? e.message : 'Content status could not be changed.'; }
    },
  });

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 36, gap: 14 }}>
      <Heading title="Content & assets" sub="Manage shared published content and private media." />
      {error ? <Card><Txt size={12} color={c.or}>{error}</Txt></Card> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <OutlineBtn primary onPress={() => { newContent(); }}>New content version</OutlineBtn>
        <OutlineBtn onPress={() => { void pickAsset(); }} disabled={busy}>Upload asset</OutlineBtn>
        <OutlineBtn onPress={() => { void reload(); }} disabled={busy}>Refresh</OutlineBtn>
      </View>
      <Section title={'Content versions · ' + content.length}>
        <ListRows empty="No content versions are available for your permissions." rows={content.map(row => ({
          key: row.id, main: row.content_key + ' · ' + row.locale + ' · v' + row.version,
          sub: row.status + ' · updated ' + new Date(row.updated_at).toLocaleString(),
          right: <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
            <OutlineBtn onPress={() => Alert.alert('Preview · ' + row.content_key, JSON.stringify(row.payload, null, 2))}>Preview</OutlineBtn>
            {row.status === 'draft' ? <OutlineBtn onPress={() => cloneStatus(row, 'published')}>Publish</OutlineBtn> : null}
            {row.status !== 'archived' ? <OutlineBtn onPress={() => cloneStatus(row, 'archived')}>Archive</OutlineBtn> : null}
            {row.status !== 'draft' ? <Pill>{row.status}</Pill> : null}
          </View>,
        }))} />
      </Section>
      <Section title={'Private assets · ' + assets.length}>
        <ListRows empty="No assets are available for your permissions." rows={assets.map(asset => ({
          key: asset.id, main: asset.asset_key, sub: asset.content_type + ' · ' + Math.ceil(asset.byte_size / 1024) + ' KB · ' + asset.status,
          right: <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
            {asset.status === 'draft' ? <OutlineBtn onPress={() => { void setAssetStatus(asset, 'published'); }}>Publish</OutlineBtn> : null}
            {asset.status !== 'archived' ? <OutlineBtn onPress={() => { void setAssetStatus(asset, 'archived'); }}>Archive</OutlineBtn> : null}
            {asset.status !== 'draft' ? <Pill>{asset.status}</Pill> : null}
          </View>,
        }))} />
      </Section>
    </ScrollView>
  );
}
