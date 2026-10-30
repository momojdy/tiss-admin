import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../../lib/supabase';
import { listCmsAssets, publishCmsAsset, publishCmsVersion, saveCmsVersion, uploadCmsAsset } from '../../lib/adminBackend';
import { fetchPublishedWantissContent } from '../../lib/wantissCms';
import { useTheme } from '../../theme/ThemeContext';
import { clone } from '../../lib/clone';
import { Card, Section } from '../../ui/Card';
import { OutlineBtn } from '../../ui/Controls';
import { Txt } from '../../ui/Txt';
import { GoodiesConsumerPreview } from './GoodiesConsumerPreview';
import { GoodiesBuilderConfigEditor } from './GoodiesBuilderConfigEditor';
import { PromoColorPicker } from './PromoColorPicker';
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
const PAGE_ORDER = ['Home, browse & discovery', 'Store, products & reviews', 'Cart, deals & coupons', 'Checkout, delivery & payment', 'Orders, actions & validation', 'Build Your Own & ingredients', 'Account, notifications & help', 'Store chat & messages', 'Scheduling & delivery', 'Reviews & ratings', 'Addresses', 'Contact numbers', 'Group orders', 'Courier, cart & wallet sheets', 'Shared sheets & modal actions', 'Order tracking steps', 'Screen reader labels', 'Other Goodies pages & shared messages'];

const labelPage = (id: string) => {
  const key = id.replace(/^lbl\./, '').toLowerCase();
  const groups: Array<[RegExp, string]> = [
    [/^a11y/, 'Screen reader labels'],
    [/^stage/, 'Order tracking steps'],
    [/^(chat|message|conversation|storechat|storemessage|contact)/, 'Store chat & messages'],
    [/^sheet(group|invite|sharedcart|member|subtotal|host|waiting|noMembers|endGroup|viewCart)/, 'Group orders'],
    [/^sheet(schedule|chooseDay|scheduledMinimum|availableTimes|exactTime|hour|minute|apply|chooseStore|noScheduleClosed|chooseWithinHours|chooseFutureTime|scheduledFor)/, 'Scheduling & delivery'],
    [/^sheet(contactNumber|phone|editNumber|removeNumber|sameWantissPhone)/, 'Contact numbers'],
    [/^sheet(review|orderNotFound|pickRating|submitReview|reviewComment)/, 'Reviews & ratings'],
    [/^sheet(address|deliverTo)/, 'Addresses'],
    [/^sheet(courier|wallet|topup|demoMoney|clearCart|cancelOrder)/, 'Courier, cart & wallet sheets'],
    [/^sheetAuto/, 'Shared sheets & modal actions'],
    [/^sheet/, 'Shared sheets & modal actions'],
    [/^(byo|builder|ingredient|custom|size)/, 'Build Your Own & ingredients'],
    [/^(cart|basket|coupon|promo|deal)/, 'Cart, deals & coupons'],
    [/^(checkout|payment|wallet|tip|fee|delivery|pickup|schedule|address)/, 'Checkout, delivery & payment'],
    [/^(order|track|tracking|history|cancel|reorder|confirm|action)/, 'Orders, actions & validation'],
    [/^(product|item|detail|review|rating|store|shop|card)/, 'Store, products & reviews'],
    [/^(account|profile|notif|help|support|privacy|legal|faq|settings)/, 'Account, notifications & help'],
    [/^(search|browse|home|cat|filter|sort|mode|tile|promo|popular)/, 'Home, browse & discovery'],
  ];
  return groups.find(([pattern]) => pattern.test(key))?.[1] || 'Other Goodies pages & shared messages';
};

const HOME_LABEL_IDS = ['lbl.search', 'lbl.coupons', 'lbl.coupons2', 'lbl.flash', 'lbl.again', 'lbl.recent', 'lbl.popular', 'lbl.produce', 'lbl.haitian', 'lbl.trending'];

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
  const [pendingAssets, setPendingAssets] = useState<Record<string, string>>({});
  const [assetBusy, setAssetBusy] = useState('');
  const [linkText, setLinkText] = useState('');
  const [pageChoice, setPageChoice] = useState('');

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
        /* Newly added text fields appear in the editor with their default wording; saving keeps them. */
        const known = new Set((opened.labels || []).map((entry: any) => entry.id));
        opened.labels = [...(opened.labels || []), ...buildStarterDraft().labels.filter((entry: any) => !known.has(entry.id))];
        setDraft(opened); setRow(latest); setBaseline(stable(sanitizeForSave(latest.payload))); setSource(latest.status === 'published' ? 'published' : 'draft'); setSelection(null);
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

  const select = useCallback((target: GoodiesSelection) => {
    setSelection(target);
    setLinkText('');
    // Opening the matching page group keeps the manual editor aligned with
    // the element selected in the phone, including Build Your Own labels.
    if (target.kind === 'label') setPageChoice(labelPage(target.id));
  }, []);

  const edit = (change: (next: any) => void) => {
    if (!draft || !editMode) return;
    const next = clone(draft);
    change(next);
    setDraft(next); setNotice(null); setConfirmPublish(false);
  };
  const setLabelText = (id: string, value: string) => edit((next) => {
    const target = (next.labels || []).find((entry: any) => entry.id === id);
    if (!target) return;
    const holder = target.t && typeof target.t === 'object' ? target.t : {};
    holder.en = { v: value, s: 'draft' };
    target.t = holder;
  });
  const pageGroups = useMemo(() => {
    const grouped = new Map<string, any[]>();
    (draft?.labels || []).filter((entry: any) => !HOME_LABEL_IDS.includes(String(entry.id))).forEach((entry: any) => {
      const page = labelPage(String(entry.id || ''));
      if (!grouped.has(page)) grouped.set(page, []);
      grouped.get(page)!.push(entry);
    });
    const rank = (name: string) => { const i = PAGE_ORDER.indexOf(name); return i < 0 ? 99 : i; };
    return Array.from(grouped.entries()).sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b));
  }, [draft?.labels]);
  const activePage = pageGroups.some(([page]) => page === pageChoice) ? pageChoice : '';
  const activeEntries = pageGroups.find(([page]) => page === activePage)?.[1] || [];
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
  const setMeta = (kind: GoodiesSelection['kind'], id: string, key: string, value: string) => edit((next) => {
    const target = findItem(next, { kind, id, field: 'title' });
    if (target) target[key] = key === 'ord' ? (Number(value) || 0) : value;
  });
  const metaInput = (kind: GoodiesSelection['kind'], entry: any, key: string, label: string) => (
    <View style={{ flex: 1, minWidth: 120, marginTop: 6 }}>
      <Txt size={9.5} mut>{label}</Txt>
      <TextInput value={String(entry[key] ?? '')} onChangeText={(value) => setMeta(kind, entry.id, key, value)} editable={canEdit && !busy && !assetBusy} style={fieldStyle} />
    </View>
  );
  const toggleLive = (kind: GoodiesSelection['kind'], entry: any, key: string, active: string, inactive: string) => (
    <OutlineBtn onPress={() => setMeta(kind, entry.id, key, entry[key] === active ? inactive : active)} disabled={!canEdit || !!busy || !!assetBusy}>
      {entry[key] === active ? 'Hide' : 'Show'}
    </OutlineBtn>
  );
  const createLabel = () => edit((next) => {
    if (!selection || selection.kind !== 'label' || findItem(next, selection)) return;
    next.labels.push({ id: selection.id, label: selection.id, t: { en: { v: '', s: 'draft' } } });
  });
  const pickAsset = (asset: any) => setImage({ assetKey: asset.asset_key, w: asset.width || undefined, h: asset.height || undefined });

  const uploadHomeImage = async (source: 'photos' | 'files') => {
    if (!selection || !canEdit || assetBusy) return;
    setAssetNote('');
    try {
      let uri = '', fileName = selection.id + '-goodies-home-image', contentType = 'image/jpeg', byteSize = 0;
      if (source === 'photos') {
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.9 });
        if (result.canceled || !result.assets?.[0]) return;
        const file = result.assets[0]; uri = file.uri; fileName = file.fileName || fileName; contentType = file.mimeType || contentType; byteSize = file.fileSize || 0;
      } else {
        const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', multiple: false, copyToCacheDirectory: true });
        if (result.canceled || !result.assets?.[0]) return;
        const file = result.assets[0]; uri = file.uri; fileName = file.name || fileName; contentType = file.mimeType || contentType; byteSize = file.size || 0;
      }
      if (!byteSize) {
        const response = await fetch(uri);
        if (!response.ok) throw new Error('The selected image could not be read. Choose another image.');
        byteSize = (await response.blob()).size;
      }
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(contentType)) throw new Error('Choose a JPEG, PNG, WebP, or GIF image. Export HEIC/HEIF photos as JPEG first.');
      if (!byteSize) throw new Error('The selected image size could not be read.');
      setAssetBusy(source);
      const key = 'wantiss.goodies.home.' + selection.kind + '.' + selection.id + '.' + crypto.randomUUID();
      const id = await uploadCmsAsset({ key, uri, fileName, contentType, byteSize, altText: { en: 'Goodies Home ' + selection.kind + ' image' }, status: 'draft' });
      setPendingAssets((current) => ({ ...current, [key]: id }));
      setImage({ assetKey: key });
      await loadAssets();
      setAssetNote('Image uploaded as a private draft. Publish the image before publishing the Home content.');
    } catch (e) {
      setAssetNote(e instanceof Error ? e.message : 'The image could not be uploaded.');
    } finally { setAssetBusy(''); }
  };

  const publishHomeImage = async (key: string) => {
    const id = pendingAssets[key];
    if (!id || !canPublish || assetBusy) return;
    setAssetBusy('publish'); setAssetNote('');
    try {
      await publishCmsAsset(id);
      setPendingAssets((current) => { const next = { ...current }; delete next[key]; return next; });
      await loadAssets();
      setAssetNote('Image published. Save the Home draft, then publish the Home content.');
    } catch (e) { setAssetNote(e instanceof Error ? e.message : 'The image could not be published.'); }
    finally { setAssetBusy(''); }
  };

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
  const thumbnailFor = (entry: any, kind: GoodiesSelection['kind']) => {
    const image = entry?.[imageKeyFor(listKeyFor(kind))];
    const key = image?.assetKey || image?.asset_key;
    return (key && assetUrls[key]) || image?.url || image?.data || '';
  };
  const thumbnail = (entry: any, kind: GoodiesSelection['kind']) => {
    const uri = thumbnailFor(entry, kind);
    return uri ? <Image source={{ uri }} resizeMode="cover" style={{ width: 54, height: 46, borderRadius: 8, backgroundColor: c.inset }} /> : <View style={{ width: 54, height: 46, borderRadius: 8, backgroundColor: c.inset, alignItems: 'center', justifyContent: 'center' }}><Txt size={8.5} mut>{entry?.emoji || 'No image'}</Txt></View>;
  };
  const promoColors = [{ id: 'plum', label: 'Plum', colors: ['#7B3FE4', '#A56BFF'] }, { id: 'orange', label: 'Orange', colors: ['#FD802E', '#FFA35C'] }, { id: 'green', label: 'Green', colors: ['#1F7A5A', '#2FB584'] }] as const;
  const setPromoColor = (entry: any, color: string) => setMeta('promo', entry.id, 'color', color);
  const promoColorPicker = (entry: any) => (
    <View style={{ marginTop: 8 }}>
      <Txt size={9.5} mut>Promotion card color</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 6 }}>
        {promoColors.map((option) => <Pressable key={option.id} accessibilityRole="button" accessibilityLabel={'Set ' + option.label + ' promotion color'} onPress={() => setPromoColor(entry, option.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 9, borderRadius: 18, borderWidth: entry.color === option.id ? 2 : 1, borderColor: entry.color === option.id ? c.ink : c.bd, backgroundColor: c.card }}><View style={{ width: 28, height: 18, borderRadius: 6, backgroundColor: option.colors[0], borderWidth: 1, borderColor: option.colors[1] }} /><Txt size={10} weight={entry.color === option.id ? 700 : 400}>{option.label}</Txt>{entry.color === option.id ? <Txt size={10}>✓</Txt> : null}</Pressable>)}
      </View>
      <PromoColorPicker value={String(entry.color || 'plum')} onChange={(color) => setPromoColor(entry, color)} disabled={!canEdit || !!busy || !!assetBusy} />
    </View>
  );
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

      {editMode && selection ? (
        <Section title={kindName[selection.kind] + ' · ' + fieldName[selection.field]}>
          <View style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: '#FD802E', borderRadius: 12, padding: 10 }}>
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                {thumbnailFor(item, selection.kind) ? <Image source={{ uri: thumbnailFor(item, selection.kind) }} resizeMode="contain" style={{ width: 100, height: 64, borderRadius: 8, backgroundColor: '#FFFFFF' }} /> : <View style={{ width: 100, height: 64, borderRadius: 8, backgroundColor: c.inset, alignItems: 'center', justifyContent: 'center' }}><Txt size={10} mut>{item.emoji || 'No image'}</Txt></View>}
                <View style={{ flex: 1, minWidth: 160 }}>
                  <Txt size={11} weight={500}>Current image</Txt>
                  <Txt size={9.5} mut>{currentImageText}</Txt>
                </View>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                <OutlineBtn onPress={() => { void uploadHomeImage('photos'); }} disabled={!canEdit || !!assetBusy}>{assetBusy === 'photos' ? 'Uploading…' : 'Choose from Photos / Live Photos'}</OutlineBtn>
                <OutlineBtn onPress={() => { void uploadHomeImage('files'); }} disabled={!canEdit || !!assetBusy}>Choose from Files</OutlineBtn>
              </View>
              {currentImage?.assetKey && pendingAssets[currentImage.assetKey] ? <View style={{ marginTop: 5 }}><OutlineBtn onPress={() => { void publishHomeImage(currentImage.assetKey); }} disabled={!canPublish || !!assetBusy}>{assetBusy === 'publish' ? 'Publishing image…' : 'Publish image'}</OutlineBtn></View> : null}
              {assetNote ? <Txt size={9.5} color={c.or} style={{ marginTop: 3 }}>{assetNote}</Txt> : null}
              <View style={{ marginTop: 10 }}>
                <Txt size={10.5} weight={500}>Choose an existing CMS image</Txt>
                <Txt size={9.5} mut style={{ marginTop: 2, marginBottom: 5 }}>Select an image to use it for this item. The preview updates immediately.</Txt>
                {assets.slice(0, 20).map((asset) => {
                  const active = currentImage?.assetKey === asset.asset_key || currentImage?.asset_key === asset.asset_key;
                  return (
                    <Pressable key={asset.id} onPress={() => pickAsset(asset)} accessibilityRole="button" accessibilityLabel={'Select image ' + asset.asset_key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', paddingVertical: 8, paddingHorizontal: 7, marginBottom: 5, borderWidth: active ? 2 : 1, borderColor: active ? c.ink : c.bd, borderRadius: 10, backgroundColor: active ? c.inset : c.card }}>
                      {assetUrls[asset.asset_key] ? <Image source={{ uri: assetUrls[asset.asset_key] }} resizeMode="contain" style={{ width: 100, height: 64, borderRadius: 8, backgroundColor: '#FFFFFF' }} /> : <View style={{ width: 100, height: 64, borderRadius: 8, backgroundColor: c.inset, alignItems: 'center', justifyContent: 'center' }}><Txt size={10} mut>No preview</Txt></View>}
                      <View style={{ flex: 1, minWidth: 150 }}>
                        <Txt size={10.5} weight={500}>{asset.asset_key}</Txt>
                        <Txt size={9.5} mut>{asset.status === 'published' ? 'Published image' : 'Draft image · publish before publishing Home content'}</Txt>
                        {active ? <Txt size={9.5} weight={500}>Currently selected ✓</Txt> : <Txt size={9.5} mut>Tap to select</Txt>}
                      </View>
                    </Pressable>
                  );
                })}
                {!assets.length ? <Txt size={10} mut>No image assets found yet. Choose an image above or upload it in Content Studio.</Txt> : null}
              </View>
              <Txt size={9.5} mut style={{ marginTop: 8 }}>Or use an external https link (not managed by the CMS)</Txt>
              <TextInput value={linkText} onChangeText={setLinkText} style={fieldStyle} placeholder="https://…" autoCapitalize="none" autoCorrect={false} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                <OutlineBtn onPress={applyLink} disabled={!linkText.trim()}>Use link</OutlineBtn>
                <OutlineBtn onPress={() => setImage(null)} disabled={!currentImage}>Remove image</OutlineBtn>
              </View>
            </View>
          )}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            <OutlineBtn primary onPress={() => setSelection(null)}>Done editing this item</OutlineBtn>
          </View>
          </View>
        </Section>
      ) : null}

      {editMode && draft ? (
        <>
          <Section title="Home · Service tiles">
            <Txt size={10} mut>Manage the three main service cards shown near the top of Home. Select a field to edit it below.</Txt>
            {(draft.modes || []).map((entry: any, index: number) => (
              <View key={entry.id} style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.bd }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {thumbnail(entry, 'mode')}
                  <View style={{ flex: 1 }}><Txt size={11} weight={500}>{'Service tile ' + (index + 1) + ' · ' + readText(entry.title)}</Txt><Txt size={9.5} mut>{entry.cat || 'No destination set'} · {entry.st || 'Unspecified status'}</Txt></View>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 5, alignItems: 'center' }}>
                  <OutlineBtn onPress={() => select({ kind: 'mode', id: entry.id, field: 'title' })}>Title</OutlineBtn>
                  <OutlineBtn onPress={() => select({ kind: 'mode', id: entry.id, field: 'sub' })}>Subtitle</OutlineBtn>
                  <OutlineBtn onPress={() => select({ kind: 'mode', id: entry.id, field: 'art' })}>Image / icon</OutlineBtn>
                  {toggleLive('mode', entry, 'st', 'Live', 'Hidden')}
                </View>
                {metaInput('mode', entry, 'cat', 'Tap destination category')}
              </View>
            ))}
            {!draft.modes?.length ? <Txt size={10} mut style={{ marginTop: 6 }}>No service tiles are configured.</Txt> : null}
          </Section>
          <Section title="Home · Categories">
            <Txt size={10} mut>Manage category names and artwork displayed in the Home category row.</Txt>
            {(draft.cats || []).slice().sort((a: any, b: any) => Number(a.ord || 0) - Number(b.ord || 0)).map((entry: any) => (
              <View key={entry.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: c.bd }}>
                {thumbnail(entry, 'category')}
                <View style={{ flex: 1 }}>
                  <Txt size={10.5} weight={500}>{readText(entry.name) || entry.id}</Txt>
                  <Txt size={9.5} mut>{entry.st === 'on' ? 'Visible' : 'Hidden'} · {entry.id}</Txt>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                  <OutlineBtn onPress={() => select({ kind: 'category', id: entry.id, field: 'title' })}>Name</OutlineBtn>
                  <OutlineBtn onPress={() => select({ kind: 'category', id: entry.id, field: 'art' })}>Artwork</OutlineBtn>
                  {toggleLive('category', entry, 'st', 'on', 'off')}
                </View>
                {metaInput('category', entry, 'ord', 'Display order')}
              </View>
            ))}
            {!draft.cats?.length ? <Txt size={10} mut style={{ marginTop: 6 }}>No categories are configured.</Txt> : null}
          </Section>
          <Section title="Home · Promotion cards">
            <Txt size={10} mut>Manage each promotional card's title, subtitle, button text and artwork.</Txt>
            {(draft.promos || []).slice().sort((a: any, b: any) => Number(a.ord || 0) - Number(b.ord || 0)).map((entry: any, index: number) => (
              <View key={entry.id} style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.bd }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {thumbnail(entry, 'promo')}
                  <View style={{ flex: 1 }}><Txt size={11} weight={500}>{'Promotion ' + (index + 1) + ' · ' + readText(entry.title)}</Txt><Txt size={9.5} mut>{entry.st || 'Unspecified status'} · {entry.id}</Txt></View>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 5, alignItems: 'center' }}>
                  <OutlineBtn onPress={() => select({ kind: 'promo', id: entry.id, field: 'title' })}>Title</OutlineBtn>
                  <OutlineBtn onPress={() => select({ kind: 'promo', id: entry.id, field: 'sub' })}>Subtitle</OutlineBtn>
                  <OutlineBtn onPress={() => select({ kind: 'promo', id: entry.id, field: 'btn' })}>Button</OutlineBtn>
                  <OutlineBtn onPress={() => select({ kind: 'promo', id: entry.id, field: 'art' })}>Image / icon</OutlineBtn>
                  {toggleLive('promo', entry, 'st', 'Live', 'Hidden')}
                </View>
                {promoColorPicker(entry)}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {metaInput('promo', entry, 'target', 'Tap destination')}

                  {metaInput('promo', entry, 'aud', 'Audience')}
                  {metaInput('promo', entry, 'ord', 'Display order')}
                  {metaInput('promo', entry, 'from', 'Start date (YYYY-MM-DD)')}
                  {metaInput('promo', entry, 'to', 'End date (YYYY-MM-DD)')}
                </View>
              </View>
            ))}
            {!draft.promos?.length ? <Txt size={10} mut style={{ marginTop: 6 }}>No promotion cards are configured.</Txt> : null}
          </Section>
          <Section title="Home · Text and section headings">
            <Txt size={10} mut>Manage the search placeholder, offer-card text and Home section headings.</Txt>
            {(draft.labels || []).filter((entry: any) => HOME_LABEL_IDS.includes(String(entry.id))).map((entry: any) => (
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
          <Section title="Other pages · Text">
            <Txt size={10} mut style={{ marginBottom: 8 }}>Choose a page, then edit its text below. Changes stay in this draft until you save and publish.</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {pageGroups.map(([page, entries]) => (
                <OutlineBtn key={page} primary={activePage === page} onPress={() => setPageChoice(activePage === page ? '' : page)}>{page + ' (' + entries.length + ')'}</OutlineBtn>
              ))}
            </View>
            {activeEntries.map((entry: any) => (
              <View key={entry.id} style={{ marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: c.bd }}>
                <Txt size={10.5} mut>{entry.label || entry.id}</Txt>
                <TextInput value={readText(entry.t)} onChangeText={(value) => setLabelText(entry.id, value)} editable={canEdit && !busy} multiline={readText(entry.t).length > 60} style={[fieldStyle, readText(entry.t).length > 60 ? { minHeight: 64, textAlignVertical: 'top' } : null]} placeholder="Text customers see" />
              </View>
            ))}
          </Section>
          <GoodiesBuilderConfigEditor canEdit={canEdit} />
        </>
      ) : null}
    </View>
  );
}
