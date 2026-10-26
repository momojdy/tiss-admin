import { useCallback, useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../../lib/supabase';
import { db, ui, bump, useDb } from '../../state/db';
import { can } from '../../state/access';
import { REQ } from '../../state/requirements';
import { useOverlay } from '../../ui/Overlay';
import { QuickCreateSheet } from '../../shell/QuickCreateSheet';
import { archiveCmsAsset, archiveCmsVersion, listCmsAssets, publishCmsAsset, publishCmsVersion, saveCmsVersion, uploadCmsAsset } from '../../lib/adminBackend';
import { Section, Card } from '../../ui/Card';
import { Heading } from '../../ui/Heading';
import { ListRows } from '../../ui/Lists';
import { Chips, OutlineBtn, Pill, StatusPill } from '../../ui/Controls';
import { Field, useForm } from '../../ui/FormSheet';
import { Txt } from '../../ui/Txt';
import { useTheme } from '../../theme/ThemeContext';
import { useToast } from '../../ui/Toast';
import { GoodiesPhonePreview } from './GoodiesPhonePreview';

type ContentRow = {
  id: string; content_key: string; locale: string; version: number; status: 'draft' | 'published' | 'archived';
  payload: Record<string, unknown>; updated_at: string;
};
type AssetRow = {
  id: string; asset_key: string; storage_path: string; content_type: string; byte_size: number;
  status: 'draft' | 'published' | 'archived'; alt_text: Record<string, string>; updated_at: string;
};

export function ContentScreen() {
  useDb();
  const { c } = useTheme();
  const form = useForm();
  const toast = useToast();
  const { openDrawer } = useOverlay();
  const [content, setContent] = useState<ContentRow[]>([]);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingDraft, setEditingDraft] = useState<ContentRow | null>(null);
  const [draftJson, setDraftJson] = useState('');
  const [draftJsonError, setDraftJsonError] = useState('');
  const [previewRow, setPreviewRow] = useState<ContentRow | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const previewPayload = (() => { try { return editingDraft ? JSON.parse(draftJson) : previewRow?.payload; } catch { return null; } })();

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


  const contentSections = ['Overview', 'Media', 'Banners', 'Promotions', 'Announcements', 'Calendar', 'Approvals', 'History', 'Editor', 'CMS versions'] as const;
  type ContentSection = typeof contentSections[number];
  const activeSection: ContentSection = contentSections.includes(ui.cs as ContentSection) ? ui.cs as ContentSection : 'Overview';
  const changeSection = (section: ContentSection) => { ui.cs = section; bump(); };
  const openQuickCreate = () => openDrawer((close) => <QuickCreateSheet onClose={close} />);

  const stageContentDraft = (kind: string, id: string, payload: Record<string, unknown>) => {
    if (!can(...REQ.content)) { toast('You need Content edit access to stage this draft.'); return; }
    form({
      title: 'Stage ' + kind + ' change',
      sub: 'The HTML workflow is represented here as a private CMS draft. This does not alter the seed record or publish anything.',
      fields: [{ id: 'reason', label: 'Reason for change', type: 'textarea', required: true }],
      buttons: [{ label: 'Save private draft', key: 'save', primary: true }],
      onSubmit: async (_key, values) => {
        const reason = String(values.reason || '').trim();
        if (!reason) return 'Enter a reason for the audit trail.';
        try {
          await saveCmsVersion({ key: 'admin.' + kind + '.' + id, locale: 'en', payload: { ...payload, proposed_only: true, change_reason: reason }, status: 'draft' });
          await reload();
          ui.cs = 'CMS versions'; bump();
          toast('Private draft saved. Live content has not changed.');
        } catch (error) {
          return error instanceof Error ? error.message : 'Draft could not be saved.';
        }
      },
    });
  };

  const editBannerDraft = (banner: typeof db.BN[number]) => {
    if (!can(...REQ.content)) { toast('You need Content edit access to edit banners.'); return; }
    form({
      title: 'Edit banner · ' + banner.t,
      sub: 'Save proposed changes as a private CMS draft; do not treat the demo banner as updated live content.',
      fields: [
        { id: 'title', label: 'Title', type: 'text', required: true, value: banner.t },
        { id: 'service', label: 'Service', type: 'select', options: db.SVC.map((service) => service[0]), required: true, value: banner.svc },
        { id: 'placement', label: 'Placement', type: 'select', options: ['Home hero', 'Home card', 'Category', 'Wallet card', 'Collection'], required: true, value: banner.pl },
        { id: 'from', label: 'Start date', type: 'date', value: banner.from },
        { id: 'to', label: 'End date', type: 'date', value: banner.to },
      ],
      buttons: [{ label: 'Save private draft', key: 'save', primary: true }],
      onSubmit: async (_key, values) => {
        const title = String(values.title || '').trim();
        if (!title) return 'Enter a title.';
        if (values.from && values.to && String(values.to) < String(values.from)) return 'End date cannot be before start date.';
        try {
          await saveCmsVersion({ key: 'admin.banner.' + banner.id, locale: 'en', payload: { id: banner.id, type: 'banner', title, service: values.service, placement: values.placement, start_date: values.from, end_date: values.to, proposed_only: true }, status: 'draft' });
          await reload(); ui.cs = 'CMS versions'; bump(); toast('Banner change saved as a private draft.');
        } catch (error) { return error instanceof Error ? error.message : 'Banner draft could not be saved.'; }
      },
    });
  };

  const editPromotionDraft = (promotion: typeof db.PRM[number]) => {
    if (!can(...REQ.content)) { toast('You need Content edit access to edit promotions.'); return; }
    form({
      title: 'Edit promotion · ' + promotion.n,
      sub: 'Save proposed campaign details as a private CMS draft.',
      fields: [
        { id: 'title', label: 'Campaign name', type: 'text', required: true, value: promotion.n },
        { id: 'service', label: 'Service', type: 'select', options: db.SVC.map((service) => service[0]), required: true, value: promotion.svc },
        { id: 'funding', label: 'Funding', type: 'select', options: ['Platform', 'Vendor', 'Mixed'], required: true, value: promotion.fund },
        { id: 'incentive', label: 'Incentive', type: 'text', required: true, value: promotion.inc },
        { id: 'from', label: 'Start date', type: 'date', required: true, value: promotion.from },
        { id: 'to', label: 'End date', type: 'date', required: true, value: promotion.to },
        { id: 'terms', label: 'Terms', type: 'textarea', value: promotion.terms || '' },
      ],
      buttons: [{ label: 'Save private draft', key: 'save', primary: true }],
      onSubmit: async (_key, values) => {
        if (String(values.to || '') < String(values.from || '')) return 'End date cannot be before start date.';
        try {
          await saveCmsVersion({ key: 'admin.promotion.' + promotion.id, locale: 'en', payload: { id: promotion.id, type: 'promotion', ...values, proposed_only: true }, status: 'draft' });
          await reload(); ui.cs = 'CMS versions'; bump(); toast('Promotion change saved as a private draft.');
        } catch (error) { return error instanceof Error ? error.message : 'Promotion draft could not be saved.'; }
      },
    });
  };

  const editAnnouncementDraft = (announcement: typeof db.ANN[number]) => {
    if (!can(...REQ.content)) { toast('You need Content edit access to edit announcements.'); return; }
    form({
      title: 'Edit announcement · ' + announcement.t,
      sub: 'Save proposed announcement content as a private CMS draft.',
      fields: [
        { id: 'title', label: 'Title', type: 'text', required: true, value: announcement.t },
        { id: 'audience', label: 'Audience', type: 'select', options: ['All customers', 'Businesses and providers', 'One service'], required: true, value: announcement.aud },
        { id: 'date', label: 'Schedule date', type: 'date', value: announcement.when },
      ],
      buttons: [{ label: 'Save private draft', key: 'save', primary: true }],
      onSubmit: async (_key, values) => {
        try {
          await saveCmsVersion({ key: 'admin.announcement.' + announcement.id, locale: 'en', payload: { id: announcement.id, type: 'announcement', title: values.title, audience: values.audience, schedule_date: values.date, proposed_only: true }, status: 'draft' });
          await reload(); ui.cs = 'CMS versions'; bump(); toast('Announcement change saved as a private draft.');
        } catch (error) { return error instanceof Error ? error.message : 'Announcement draft could not be saved.'; }
      },
    });
  };

  return (
    <View>
      <Heading title="Content Studio" sub="Banners, campaigns, announcements, media and customer-facing CMS content." />
      {error ? <Card><Txt size={12} color={c.or}>{error}</Txt></Card> : null}
      <Chips options={contentSections} value={activeSection} onChange={changeSection} />

      {activeSection === 'Overview' ? (
        <>
          <Section title="Placements" right={<OutlineBtn primary onPress={openQuickCreate}>+ New banner</OutlineBtn>}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              <Pill>{db.BN.filter((banner) => banner.st === 'Live').length} live</Pill>
              <Pill>{db.BN.filter((banner) => banner.st === 'Scheduled').length} scheduled</Pill>
              <Pill>{db.BN.filter((banner) => banner.st === 'Draft' || banner.st === 'In review').length} drafts/reviews</Pill>
            </View>
            <ListRows empty="No seeded placements." rows={db.BN.filter((banner) => banner.st !== 'Archived').slice(0, 6).map((banner) => ({
              key: banner.id, main: banner.pl, sub: banner.t + ' · ' + banner.svc,
              right: <StatusPill label={banner.st} small />,
              onPress: () => editBannerDraft(banner),
            }))} />
          </Section>
          <Section title="Promotions" right={<OutlineBtn onPress={openQuickCreate}>+ New promotion</OutlineBtn>}>
            <ListRows empty="No seeded promotions." rows={db.PRM.slice(0, 5).map((promotion) => ({
              key: promotion.id, main: promotion.n, sub: promotion.svc + ' · ' + promotion.fund,
              right: <StatusPill label={promotion.st} small />,
              onPress: () => editPromotionDraft(promotion),
            }))} />
          </Section>
          <Section title="Announcements" right={<OutlineBtn onPress={openQuickCreate}>+ New announcement</OutlineBtn>}>
            <ListRows empty="No seeded announcements." rows={db.ANN.slice(0, 4).map((announcement) => ({
              key: announcement.id, main: announcement.t, sub: announcement.aud + (announcement.when ? ' · ' + announcement.when : ''),
              right: <StatusPill label={announcement.st} small />,
              onPress: () => editAnnouncementDraft(announcement),
            }))} />
          </Section>
        </>
      ) : null}

      {activeSection === 'Banners' ? <Section title={'Banners and placements · ' + db.BN.length} right={<OutlineBtn primary onPress={openQuickCreate}>+ New banner</OutlineBtn>}>
        <ListRows rows={db.BN.map((banner) => ({ key: banner.id, main: banner.t, sub: banner.svc + ' · ' + banner.pl + (banner.to ? ' · ends ' + banner.to : ''), right: <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><StatusPill label={banner.st} small /><OutlineBtn onPress={() => editBannerDraft(banner)}>Edit draft</OutlineBtn></View>, onPress: () => editBannerDraft(banner) }))} />
      </Section> : null}

      {activeSection === 'Promotions' ? <Section title={'Promotions and campaigns · ' + db.PRM.length} right={<OutlineBtn primary onPress={openQuickCreate}>+ New promotion</OutlineBtn>}>
        <ListRows rows={db.PRM.map((promotion) => ({ key: promotion.id, main: promotion.n, sub: promotion.svc + ' · ' + promotion.fund + ' · ' + promotion.inc, right: <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><StatusPill label={promotion.st} small /><OutlineBtn onPress={() => editPromotionDraft(promotion)}>Edit draft</OutlineBtn></View>, onPress: () => editPromotionDraft(promotion) }))} />
      </Section> : null}

      {activeSection === 'Announcements' ? <Section title={'Announcements · ' + db.ANN.length} right={<OutlineBtn primary onPress={openQuickCreate}>+ New announcement</OutlineBtn>}>
        <ListRows rows={db.ANN.map((announcement) => ({ key: announcement.id, main: announcement.t, sub: announcement.aud + (announcement.when ? ' · ' + announcement.when : ''), right: <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><StatusPill label={announcement.st} small /><OutlineBtn onPress={() => editAnnouncementDraft(announcement)}>Edit draft</OutlineBtn></View>, onPress: () => editAnnouncementDraft(announcement) }))} />
      </Section> : null}

      {activeSection === 'Calendar' ? <Section title="Publishing calendar">
        <ListRows empty="No scheduled content dates." rows={[
          ...db.BN.filter((banner) => banner.from || banner.to).flatMap((banner) => [
            ...(banner.from ? [{ key: banner.id + '-start', main: 'Starts · ' + banner.t, sub: banner.svc, right: banner.from, onPress: () => editBannerDraft(banner) }] : []),
            ...(banner.to ? [{ key: banner.id + '-end', main: 'Ends · ' + banner.t, sub: banner.svc, right: banner.to, onPress: () => editBannerDraft(banner) }] : []),
          ]),
          ...db.PRM.filter((promotion) => promotion.from || promotion.to).map((promotion) => ({ key: promotion.id, main: 'Campaign · ' + promotion.n, sub: promotion.svc, right: promotion.from + ' → ' + promotion.to, onPress: () => editPromotionDraft(promotion) })),
          ...db.ANN.filter((announcement) => announcement.when).map((announcement) => ({ key: announcement.id, main: 'Announcement · ' + announcement.t, sub: announcement.aud, right: announcement.when, onPress: () => editAnnouncementDraft(announcement) })),
        ].sort((a, b) => String(a.right).localeCompare(String(b.right)))} />
      </Section> : null}

      {activeSection === 'Approvals' ? <Section title="Approval queue">
        <ListRows empty="Nothing is marked as in review in the current snapshot." rows={[
          ...db.BN.filter((banner) => banner.st === 'In review' || banner.st === 'Draft').map((banner) => ({ key: 'banner-' + banner.id, main: banner.t, sub: 'Banner · ' + banner.svc, right: <OutlineBtn onPress={() => stageContentDraft('approval.' + banner.id, banner.id, { item_type: 'banner', proposed_action: 'review', item_id: banner.id })}>Stage review</OutlineBtn> })),
          ...db.PRM.filter((promotion) => promotion.st === 'In review' || promotion.st === 'Draft').map((promotion) => ({ key: 'promotion-' + promotion.id, main: promotion.n, sub: 'Promotion · ' + promotion.svc, right: <OutlineBtn onPress={() => stageContentDraft('approval.' + promotion.id, promotion.id, { item_type: 'promotion', proposed_action: 'review', item_id: promotion.id })}>Stage review</OutlineBtn> })),
        ]} />
        <Txt size={9.5} mut style={{ marginTop: 8 }}>These are draft proposals only. A real approval queue needs a dedicated server-side review endpoint.</Txt>
      </Section> : null}

      {activeSection === 'History' ? <Section title="Publishing history (read-only)">
        <ListRows empty="No history entries." rows={[
          ...db.CH.slice(0, 30).map((entry, i) => ({ key: 'change-' + i, main: entry[1], sub: entry[0], right: 'Activity' })),
          ...db.AUD.slice(0, 20).map((entry, i) => ({ key: 'audit-' + i, main: entry[0], sub: entry[1], right: entry[2] })),
        ]} />
      </Section> : null}

      {activeSection === 'Media' ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <OutlineBtn primary onPress={() => { void pickAsset(); }} disabled={busy}>Upload asset</OutlineBtn>
            <OutlineBtn onPress={() => { void reload(); }} disabled={busy}>Refresh</OutlineBtn>
          </View>
          <Section title={'Media library · ' + assets.length}>
            <ListRows empty="No assets are available for your permissions." rows={assets.map((asset) => ({
              key: asset.id, main: asset.asset_key, sub: asset.content_type + ' · ' + Math.ceil(asset.byte_size / 1024) + ' KB · ' + asset.status,
              right: <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                {asset.status === 'draft' ? <OutlineBtn onPress={() => { void setAssetStatus(asset, 'published'); }}>Publish</OutlineBtn> : null}
                {asset.status !== 'archived' ? <OutlineBtn onPress={() => { void setAssetStatus(asset, 'archived'); }}>Archive</OutlineBtn> : null}
                {asset.status !== 'draft' ? <Pill>{asset.status}</Pill> : null}
              </View>,
            }))} />
          </Section>
        </>
      ) : null}

      {activeSection === 'Editor' ? <Section title="Customer page editor">
        <Txt size={11} mut lh={1.4}>The HTML defines a full customer-page builder. The React Native version can preview and edit Goodies CMS JSON drafts below, but does not yet reproduce the HTML's visual drag-and-drop page builder.</Txt>
        <ListRows empty="Create or load a Goodies CMS draft to begin." rows={content.filter((row) => row.content_key.toLowerCase().includes('goodies')).map((row) => ({
          key: row.id, main: row.content_key + ' · v' + row.version, sub: row.status + ' · ' + row.locale,
          right: <OutlineBtn onPress={() => { setPreviewRow(row); setEditingDraft(row.status === 'draft' ? row : null); if (row.status === 'draft') setDraftJson(JSON.stringify(row.payload, null, 2)); }}>Open editor</OutlineBtn>,
        }))} />
      </Section> : null}

      {activeSection === 'Editor' || activeSection === 'CMS versions' ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {activeSection === 'CMS versions' ? <OutlineBtn primary onPress={() => { newContent(); }}>New content version</OutlineBtn> : null}
            {activeSection === 'CMS versions' ? <OutlineBtn onPress={() => { void pickAsset(); }} disabled={busy}>Upload asset</OutlineBtn> : null}
            <OutlineBtn onPress={() => { void reload(); }} disabled={busy}>Refresh</OutlineBtn>
          </View>
          {(editingDraft || previewRow) ? <Section title={editingDraft ? 'Goodies draft editor · unsaved changes preview live' : 'Goodies customer phone preview'}>
            {editingDraft ? <>
              <Txt size={12} color={c.mut}>Editing {editingDraft.content_key} · v{editingDraft.version}. Changes stay in this editor until you save a new draft. Nothing is published automatically.</Txt>
              <TextInput value={draftJson} onChangeText={(value) => { setDraftJson(value); setDraftJsonError(''); }} multiline autoCapitalize="none" autoCorrect={false} spellCheck={false} style={{ minHeight: 170, maxHeight: 300, textAlignVertical: 'top', borderWidth: 1, borderColor: c.bd, borderRadius: 12, padding: 10, color: c.ink, backgroundColor: c.card, fontSize: 12, fontFamily: 'monospace' }} />
              {draftJsonError ? <Txt size={12} color={c.or}>{draftJsonError}</Txt> : null}
              <View style={{ flexDirection: 'row', gap: 8, marginVertical: 8 }}>
                <OutlineBtn onPress={() => { setEditingDraft(null); setPreviewRow(null); }}>Close preview</OutlineBtn>
                <OutlineBtn primary disabled={savingDraft || busy} onPress={() => {
                  let parsed: Record<string, unknown>;
                  try { parsed = JSON.parse(draftJson); } catch { setDraftJsonError('Draft must be valid JSON before it can be saved.'); return; }
                  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') { setDraftJsonError('Draft must be a JSON object.'); return; }
                  setSavingDraft(true);
                  void saveCmsVersion({ key: editingDraft.content_key, locale: editingDraft.locale, payload: parsed, status: 'draft' })
                    .then(async () => { await reload(); toast('A new draft version was saved. It is not published.'); setEditingDraft(null); setPreviewRow(null); })
                    .catch((e) => setDraftJsonError(e instanceof Error ? e.message : 'Draft could not be saved.'))
                    .finally(() => setSavingDraft(false));
                }}>Save draft only</OutlineBtn>
              </View>
            </> : <View style={{ marginBottom: 8 }}><OutlineBtn onPress={() => setPreviewRow(null)}>Close preview</OutlineBtn></View>}
            {previewPayload && previewRow?.content_key.toLowerCase().includes('goodies') ? <GoodiesPhonePreview payload={previewPayload} /> :
              <Card><Txt size={12} color={c.or}>{previewPayload ? 'This record is not a Goodies v5 customer-content payload, so the Goodies phone renderer cannot display it.' : 'The JSON is invalid. Fix it to refresh the preview.'}</Txt></Card>}
          </Section> : null}
        </>
      ) : null}

      {activeSection === 'CMS versions' ? <Section title={'Content versions · ' + content.length}>
        <ListRows empty="No content versions are available for your permissions." rows={content.map((row) => ({
          key: row.id, main: row.content_key + ' · ' + row.locale + ' · v' + row.version,
          sub: row.status + ' · updated ' + new Date(row.updated_at).toLocaleString(),
          right: <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
            <OutlineBtn onPress={() => { setPreviewRow(row); setEditingDraft(null); }}>Phone preview</OutlineBtn>
            {row.status === 'draft' ? <OutlineBtn onPress={() => { setEditingDraft(row); setDraftJson(JSON.stringify(row.payload, null, 2)); setDraftJsonError(''); setPreviewRow(row); }}>Edit draft</OutlineBtn> : null}
            {row.status === 'draft' ? <OutlineBtn onPress={() => cloneStatus(row, 'published')}>Publish</OutlineBtn> : null}
            {row.status !== 'archived' ? <OutlineBtn onPress={() => cloneStatus(row, 'archived')}>Archive</OutlineBtn> : null}
            {row.status !== 'draft' ? <Pill>{row.status}</Pill> : null}
          </View>,
        }))} />
      </Section> : null}
    </View>
  );
}
