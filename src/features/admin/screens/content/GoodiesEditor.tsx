import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, TextInput, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { listCmsAssets, publishCmsVersion, saveCmsVersion } from '../../lib/adminBackend';
import { fetchPublishedWantissContent } from '../../lib/wantissCms';
import { useTheme } from '../../theme/ThemeContext';
import { clone } from '../../lib/clone';
import { Card, Section } from '../../ui/Card';
import { OutlineBtn } from '../../ui/Controls';
import { Txt } from '../../ui/Txt';
import { GoodiesConsumerPreview } from './GoodiesConsumerPreview';
import type { GoodiesSelection } from '../../goodiesConsumer/editContext';
import {
  GOODIES_CONTENT_KEY, buildStarterDraft, imageKeyFor, isSignedUrl, referencedAssetKeys, sanitizeForSave, stable, validateGoodiesDraft,
} from '../../goodiesConsumer/draft';

type Row = { id: string; content_key: string; version: number; status: 'draft' | 'published' | 'archived'; payload: any };
type Notice = { tone: 'ok' | 'warn' | 'error'; text: string };
const COLUMNS = 'id,content_key,version,status,payload';
const ASSET_BUCKET = 'wantiss-cms-assets';

const listKeyFor = (kind: GoodiesSelection['kind']) => (kind === 'mode' ? 'modes' : kind === 'promo' ? 'promos' : kind === 'category' ? 'cats' : 'labels');
const textKeyFor = (sel: GoodiesSelection) => (sel.kind === 'label' ? 't' : sel.kind === 'category' ? 'name' : sel.field);
const readText = (value: any): string => (typeof value === 'string' ? value : String(value?.en?.v ?? ''));
const fieldName: Record<string, string> = { title: 'Title', sub: 'Subtitle', btn: 'Button text', text: 'Text', art: 'Emoji and image' };
const kindName: Record<string, string> = { mode: 'Service tile', promo: 'Promotion', category: 'Category', label: 'Text' };

/** Owns the Goodies draft lifecycle; stores asset keys and keeps signed URLs in memory only. */
export function GoodiesEditor({ canEdit, canPublish }: { canEdit: boolean; canPublish: boolean }) {
  const { c } = useTheme();
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState('');
  const [draft, setDraft] = useState<any | null>(null);
  const [baseline, setBaseline] = useState('');
  const [source, setSource] = useState<'none' | 'draft' | 'published' | 'starter'>('none');
  const [row, setRow] = useState<Row | null>(null);
  const [selection, setSelection] = useState<GoodiesSelection | null>(null);
  const [mode, setMode] = useState<'Edit' | 'Preview'>('Edit');
  const [busy, setBusy] = useState<'' | 'save' | 'publish'>('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [assets, setAssets] = useState<any[]>([]);
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});
  const [assetNote, setAssetNote] = useState('');
  const [linkText, setLinkText] = useState('');

  const clean = useMemo(() => (draft ? sanitizeForSave(draft) : null), [draft]);
  const dirty = !!clean && stable(clean) !== baseline;
  const ready = loadState === 'ready' && !!draft;
  const editMode = ready && canEdit && mode === 'Edit';

  const load = useCallback(async () => {
    setLoadState('loading'); setLoadError(''); setNotice(null); setConfirmPublish(false);
    try {
      const { data, error } = await supabase.from('wantiss_cms_content').select(COLUMNS)
        .in('content_key', [GOODIES_CONTENT_KEY, 'goodies']).eq('locale', 'en').in('status', ['draft', 'published'])
        .order('version', { ascending: false }).limit(40);
      if (error) throw new Error(error.code === '42501' ? 'You do not have permission to read Goodies content.' : 'Goodies content could not be loaded.');
      const rows = (data || []) as Row[];
      const preferred = rows.filter((r) => r.content_key === GOODIES_CONTENT_KEY);
      const latest = (preferred.length ? preferred : rows)[0];
      if (!latest) {
        setDraft(null); setRow(null); setBaseline(''); setSource('none'); setSelection(null);
      } else {
        const errors = validateGoodiesDraft(latest.payload);
        if (errors.length) throw new Error('Version ' + latest.version + ' (' + latest.status + ') is not valid Goodies content. ' + errors[0]);
        const opened = clone(latest.payload);
        setDraft(opened); setRow(latest); setBaseline(stable(sanitizeForSave(opened))); setSource(latest.status === 'published' ? 'published' : 'draft'); setSelection(null);
      }
      setLoadState('ready');
    } catch (e) {
      // Never replace existing content on a failure: the previous draft stays as it was.
      setLoadError(e instanceof Error ? e.message : 'Goodies content could not be loaded.');
      setLoadState('error');
    }
  }, []);

  const loadAssets = useCallback(async () => {
    try {
      const list: any[] = await listCmsAssets();
      const usable = list.filter((a) => a.status !== 'archived' && /^image\//.test(String(a.content_type)));
      const byKey = new Map<string, any>();
      usable.forEach((a) => {
        const current = byKey.get(a.asset_key);
        if (!current || (current.status !== 'published' && a.status === 'published')) byKey.set(a.asset_key, a);
      });
      setAssets(Array.from(byKey.values()));
      const paths = Array.from(byKey.values()).map((a) => a.storage_path);
      if (!paths.length) { setAssetUrls({}); setAssetNote(''); return; }
      const { data, error } = await supabase.storage.from(ASSET_BUCKET).createSignedUrls(paths, 3600);
      if (error) throw new Error('Draft images cannot be previewed: ' + error.message);
      const urlByPath = new Map<string, string>();
      (data || []).forEach((d: any) => { if (d?.path && d?.signedUrl) urlByPath.set(d.path, d.signedUrl); });
      const next: Record<string, string> = {};
      byKey.forEach((a, key) => { const url = urlByPath.get(a.storage_path); if (url) next[key] = url; });
      setAssetUrls(next); setAssetNote('');
    } catch (e) {
      setAssetNote(e instanceof Error ? e.message : 'Assets are unavailable.');
    }
  }, []);

  useEffect(() => { void load(); void loadAssets(); }, [load, loadAssets]);

  const select = useCallback((target: GoodiesSelection) => { setSelection(target); setLinkText(''); }, []);

  const edit = (change: (next: any) => void) => {
    if (!draft || !editMode) return;
    const next = clone(draft);
    change(next);
    setDraft(next); setNotice(null); setConfirmPublish(false);
  };
  const findItem = (d: any, sel: GoodiesSelection) => (d?.[listKeyFor(sel.kind)] || []).find((entry: any) => entry.id === sel.id);
  const item = selection && draft ? findItem(draft, selection) : null;
  const imageKey = selection ? imageKeyFor(listKeyFor(selection.kind)) : 'img';

  const setText = (value: string) => edit((next) => {
    if (!selection) return;
    const target = findItem(next, selection);
    if (!target) return;
    const key = textKeyFor(selection);
    const current = target[key];
    const holder = current && typeof current === 'object' ? current : {};
    holder.en = { v: value, s: 'draft' };
    target[key] = holder;
  });
  const setEmoji = (value: string) => edit((next) => { const target = selection && findItem(next, selection); if (target) target.emoji = value; });
  const setImage = (image: any) => edit((next) => { const target = selection && findItem(next, selection); if (target) target[imageKey] = image; });
  const createLabel = () => edit((next) => {
    if (!selection || selection.kind !== 'label' || findItem(next, selection)) return;
    next.labels.push({ id: selection.id, label: selection.id, t: { en: { v: '', s: 'draft' } } });
  });
  const pickAsset = (asset: any) => setImage({ assetKey: asset.asset_key, w: asset.width || undefined, h: asset.height || undefined });
  const applyLink = () => {
    const url = linkText.trim();
    if (!url) return;
    if (isSignedUrl(url)) { setNotice({ tone: 'error', text: 'Temporary signed links cannot be saved. Upload the image in Content Studio and pick it from the asset list.' }); return; }
    if (!/^https:\/\//i.test(url)) { setNotice({ tone: 'error', text: 'Image links must start with https://' }); return; }
    setImage({ url });
    setLinkText('');
  };

  const startStarter = () => {
    if (!canEdit) return;
    setDraft(buildStarterDraft()); setBaseline(''); setSource('starter'); setRow(null); setSelection(null); setMode('Edit');
    setNotice({ tone: 'warn', text: 'Starter draft not saved yet.' });
  };
  const discardStarter = () => { setDraft(null); setSource('none'); setBaseline(''); setSelection(null); setNotice(null); };

  const save = async () => {
    if (!draft || !clean || !canEdit || busy) return;
    const errors = validateGoodiesDraft(clean);
    if (errors.length) { setNotice({ tone: 'error', text: 'Not saved. ' + errors[0] }); return; }
    setBusy('save'); setNotice(null); setConfirmPublish(false);
    try {
      const id = await saveCmsVersion({ key: GOODIES_CONTENT_KEY, locale: 'en', payload: clean, status: 'draft' });
      const { data, error } = await supabase.from('wantiss_cms_content').select(COLUMNS).eq('id', id).maybeSingle();
      if (error || !data) {
        setNotice({ tone: 'warn', text: 'The save call succeeded but the new version could not be read back to confirm it. Press Reload to check before saving again.' });
        return;
      }
      const saved = data as Row;
      setRow(saved); setSource('draft'); setBaseline(stable(saved.payload));
      if (stable(saved.payload) === stable(clean)) {
        setNotice({ tone: 'ok', text: 'Saved as draft version ' + saved.version + ' and confirmed.' });
      } else {
        setNotice({ tone: 'warn', text: 'Saved as version ' + saved.version + ' but the stored content differs from what was sent. Press Reload and review.' });
      }
    } catch (e) {
      setNotice({ tone: 'error', text: 'Not saved. ' + (e instanceof Error ? e.message : 'The draft could not be saved.') });
    } finally { setBusy(''); }
  };

  const publish = async () => {
    if (!canPublish || !row || row.status !== 'draft' || dirty || busy || !draft) return;
    setBusy('publish'); setNotice(null);
    try {
      const keys = referencedAssetKeys(draft);
      if (keys.length) {
        const list: any[] = await listCmsAssets();
        const unpublished = keys.filter((key) => !list.some((a) => a.asset_key === key && a.status === 'published'));
        if (unpublished.length) {
          setNotice({ tone: 'error', text: 'Not published. Publish these assets first (Content Studio, Assets): ' + unpublished.join(', ') });
          return;
        }
      }
      await publishCmsVersion(row.id);
      setRow({ ...row, status: 'published' }); setSource('published');
      const remote = await fetchPublishedWantissContent('en');
      const live = remote.content.find((entry) => entry.content_key === GOODIES_CONTENT_KEY);
      setNotice(live && live.version === row.version
        ? { tone: 'ok', text: 'Published version ' + row.version + ' and confirmed on the public endpoint.' }
        : { tone: 'warn', text: 'Version ' + row.version + ' was published. The public endpoint caches for up to a minute, so press Reload shortly to confirm.' });
    } catch (e) {
      setNotice({ tone: 'error', text: 'Not published. ' + (e instanceof Error ? e.message : 'Publishing failed.') });
    } finally { setBusy(''); setConfirmPublish(false); }
  };

  const toggleMode = (next: 'Edit' | 'Preview') => { setMode(next); setSelection(null); };

  const fieldStyle = { borderWidth: 1, borderColor: c.bd, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 8, marginTop: 5, marginBottom: 8, color: c.ink, backgroundColor: c.card, fontSize: 11 } as const;
  const toneColor = (tone: Notice['tone']) => (tone === 'ok' ? c.ink : c.or);
  const statusLine = source === 'starter' ? 'Starter draft (not saved)' : row ? 'Version ' + row.version + ' · ' + row.status : 'No Goodies content yet';
  const currentImage = item ? item[imageKey] : null;
  const currentImageText = !currentImage ? 'No image (the emoji is shown).' : currentImage.assetKey ? 'Managed asset: ' + (currentImage.assetKey || currentImage.asset_key) + (assetUrls[currentImage.assetKey] ? '' : ' (preview not available)') : currentImage.url ? 'External link: ' + currentImage.url : 'Embedded image data.';

  return (
    <View>
      <Section title="Goodies content" right={<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
        <OutlineBtn primary={mode === 'Edit'} disabled={!canEdit} onPress={() => toggleMode('Edit')}>Manual editor</OutlineBtn>
        <OutlineBtn primary={mode === 'Preview'} onPress={() => toggleMode('Preview')}>Phone preview</OutlineBtn>
      </View>}>
        {source !== 'none' || row ? <Txt size={10.5} mut>{statusLine}{dirty ? ' · unsaved changes' : ''}</Txt> : null}
        
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          <OutlineBtn primary onPress={() => { void save(); }} disabled={!ready || !canEdit || !dirty || !!busy}>{busy === 'save' ? 'Saving…' : 'Save draft'}</OutlineBtn>
          <OutlineBtn onPress={() => { void load(); void loadAssets(); }} disabled={!!busy}>{dirty ? 'Discard changes & reload' : 'Reload'}</OutlineBtn>
          {source === 'starter' ? <OutlineBtn onPress={discardStarter}>Discard starter</OutlineBtn> : null}
          {!confirmPublish ? <OutlineBtn onPress={() => setConfirmPublish(true)} disabled={!canPublish || !row || row.status !== 'draft' || dirty || !!busy}>Publish…</OutlineBtn> : null}
        </View>
        {confirmPublish ? (
          <View style={{ marginTop: 6, padding: 10, borderWidth: 1, borderColor: c.or, borderRadius: 12 }}>
            <Txt size={11} weight={500}>Publish version {row?.version} to all customers?</Txt>
            <Txt size={10} mut style={{ marginTop: 2 }}>Publishing replaces the built-in defaults. The current version is archived.</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              <OutlineBtn primary onPress={() => { void publish(); }} disabled={!!busy}>{busy === 'publish' ? 'Publishing…' : 'Yes, publish'}</OutlineBtn>
              <OutlineBtn onPress={() => setConfirmPublish(false)} disabled={!!busy}>Cancel</OutlineBtn>
            </View>
          </View>
        ) : null}
        {!canEdit ? <Txt size={9.5} color={c.or} style={{ marginTop: 6 }}>View access only: editing and saving are disabled.</Txt> : null}
      </Section>

      {notice ? <Card><Txt size={11} color={toneColor(notice.tone)}>{notice.text}</Txt></Card> : null}
      {loadState === 'error' ? (
        <Card>
          <Txt size={11} color={c.or}>{loadError}</Txt>
          <Txt size={10} mut style={{ marginTop: 3 }}>{draft ? 'Showing the content already loaded. Editing is paused until it loads again.' : 'Nothing was replaced or defaulted.'}</Txt>
          <View style={{ marginTop: 8 }}><OutlineBtn onPress={() => { void load(); }}>Retry</OutlineBtn></View>
        </Card>
      ) : null}
      {loadState === 'ready' && !draft ? (
        <Card>
          <Txt size={11} weight={500}>No Goodies content yet</Txt>
          <View style={{ marginTop: 8 }}><OutlineBtn primary disabled={!canEdit} onPress={startStarter}>Create starter draft (unsaved)</OutlineBtn></View>
        </Card>
      ) : null}
      <Section title="Goodies phone preview">
        <View style={{ alignItems: 'center', paddingVertical: 6 }}>
          {loadState === 'loading' && !draft ? <Txt size={10.5} mut>Loading Goodies content…</Txt> : (
            <GoodiesConsumerPreview editMode={editMode} contentDraft={draft} assetUrls={assetUrls} selectedTarget={selection} onSelectTarget={select} />
          )}
        </View>
      </Section>

      {editMode && draft ? (
        <>
          <Section title="Home · Service tiles">
            <Txt size={10} mut>Manage the three main service cards shown near the top of Home. Select a field to edit it below.</Txt>
            {(draft.modes || []).map((entry: any, index: number) => (
              <View key={entry.id} style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.bd }}>
                <Txt size={11} weight={500}>{'Service tile ' + (index + 1) + ' · ' + readText(entry.title)}</Txt>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
                  <OutlineBtn onPress={() => select({ kind: 'mode', id: entry.id, field: 'title' })}>Title</OutlineBtn>
                  <OutlineBtn onPress={() => select({ kind: 'mode', id: entry.id, field: 'sub' })}>Subtitle</OutlineBtn>
                  <OutlineBtn onPress={() => select({ kind: 'mode', id: entry.id, field: 'art' })}>Image / icon</OutlineBtn>
                </View>
              </View>
            ))}
            {!draft.modes?.length ? <Txt size={10} mut style={{ marginTop: 6 }}>No service tiles are configured.</Txt> : null}
          </Section>
          <Section title="Home · Categories">
            <Txt size={10} mut>Manage category names and artwork displayed in the Home category row.</Txt>
            {(draft.cats || []).slice().sort((a: any, b: any) => Number(a.ord || 0) - Number(b.ord || 0)).map((entry: any) => (
              <View key={entry.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: c.bd }}>
                <View style={{ flex: 1 }}>
                  <Txt size={10.5} weight={500}>{readText(entry.name) || entry.id}</Txt>
                  <Txt size={9.5} mut>{entry.st === 'on' ? 'Visible' : 'Hidden'} · {entry.id}</Txt>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                  <OutlineBtn onPress={() => select({ kind: 'category', id: entry.id, field: 'title' })}>Name</OutlineBtn>
                  <OutlineBtn onPress={() => select({ kind: 'category', id: entry.id, field: 'art' })}>Artwork</OutlineBtn>
                </View>
              </View>
            ))}
            {!draft.cats?.length ? <Txt size={10} mut style={{ marginTop: 6 }}>No categories are configured.</Txt> : null}
          </Section>
          <Section title="Home · Promotion cards">
            <Txt size={10} mut>Manage each promotional card's title, subtitle, button text and artwork.</Txt>
            {(draft.promos || []).slice().sort((a: any, b: any) => Number(a.ord || 0) - Number(b.ord || 0)).map((entry: any, index: number) => (
              <View key={entry.id} style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.bd }}>
                <Txt size={11} weight={500}>{'Promotion ' + (index + 1) + ' · ' + readText(entry.title)}</Txt>
                <Txt size={9.5} mut>{entry.st || 'Unspecified status'} · {entry.id}</Txt>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
                  <OutlineBtn onPress={() => select({ kind: 'promo', id: entry.id, field: 'title' })}>Title</OutlineBtn>
                  <OutlineBtn onPress={() => select({ kind: 'promo', id: entry.id, field: 'sub' })}>Subtitle</OutlineBtn>
                  <OutlineBtn onPress={() => select({ kind: 'promo', id: entry.id, field: 'btn' })}>Button</OutlineBtn>
                  <OutlineBtn onPress={() => select({ kind: 'promo', id: entry.id, field: 'art' })}>Image / icon</OutlineBtn>
                </View>
              </View>
            ))}
            {!draft.promos?.length ? <Txt size={10} mut style={{ marginTop: 6 }}>No promotion cards are configured.</Txt> : null}
          </Section>
          <Section title="Home · Text and section headings">
            <Txt size={10} mut>Manage the search placeholder, offer-card text and Home section headings.</Txt>
            {(draft.labels || []).map((entry: any) => (
              <View key={entry.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: c.bd }}>
                <View style={{ flex: 1 }}>
                  <Txt size={10.5} weight={500}>{entry.label || entry.id}</Txt>
                  <Txt size={9.5} mut>{readText(entry.t) || 'No English text yet'}</Txt>
                </View>
                <OutlineBtn onPress={() => select({ kind: 'label', id: entry.id, field: 'text' })}>Edit text</OutlineBtn>
              </View>
            ))}
            {!draft.labels?.length ? <Txt size={10} mut style={{ marginTop: 6 }}>No Home text fields are configured.</Txt> : null}
          </Section>
        </>
      ) : null}
      {editMode && selection ? (
        <Section title={kindName[selection.kind] + ' · ' + fieldName[selection.field]}>
          {!item ? (
            <View>
              {selection.kind === 'label' ? <View style={{ marginTop: 8 }}><OutlineBtn primary onPress={createLabel}>Create editable text</OutlineBtn></View> : null}
            </View>
          ) : selection.field !== 'art' ? (
            <View>
              <Txt size={9.5} mut>{fieldName[selection.field]}</Txt>
              <TextInput value={readText(item[textKeyFor(selection)])} onChangeText={setText} style={fieldStyle} placeholder={fieldName[selection.field]} />
            </View>
          ) : (
            <View>
              <Txt size={9.5} mut>Emoji</Txt>
              <TextInput value={String(item.emoji || '')} onChangeText={setEmoji} style={fieldStyle} placeholder="Emoji" />
              <Txt size={9.5} mut>Image</Txt>
              <Txt size={10} style={{ marginTop: 3 }}>{currentImageText}</Txt>
              {assetNote ? <Txt size={9.5} color={c.or} style={{ marginTop: 3 }}>{assetNote}</Txt> : null}
              <View style={{ marginTop: 6 }}>
                {assets.slice(0, 20).map((asset) => (
                  <Pressable key={asset.id} onPress={() => pickAsset(asset)} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: c.bd }}>
                    {assetUrls[asset.asset_key] ? <Image source={{ uri: assetUrls[asset.asset_key] }} style={{ width: 34, height: 34, borderRadius: 8 }} resizeMode="cover" /> : <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: c.inset }} />}
                    <View style={{ flex: 1 }}>
                      <Txt size={10.5}>{asset.asset_key}</Txt>
                      <Txt size={9.5} mut>{asset.status === 'published' ? 'Published' : 'Draft (publish it before publishing this content)'}</Txt>
                    </View>
                  </Pressable>
                ))}
                {!assets.length ? <Txt size={10} mut>No image assets found. Upload images in Content Studio, then press Reload.</Txt> : null}
              </View>
              <Txt size={9.5} mut style={{ marginTop: 8 }}>Or use an external https link (not managed by the CMS)</Txt>
              <TextInput value={linkText} onChangeText={setLinkText} style={fieldStyle} placeholder="https://…" autoCapitalize="none" autoCorrect={false} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                <OutlineBtn onPress={applyLink} disabled={!linkText.trim()}>Use link</OutlineBtn>
                <OutlineBtn onPress={() => setImage(null)} disabled={!currentImage}>Remove image</OutlineBtn>
              </View>
            </View>
          )}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            <OutlineBtn onPress={() => setSelection(null)}>Done</OutlineBtn>
          </View>
        </Section>
      ) : null}
    </View>
  );
}
