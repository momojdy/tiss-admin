import { useCallback, useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { saveCmsVersion } from '../../lib/adminBackend';
import { can } from '../../state/access';
import { REQ } from '../../state/requirements';
import { useNav } from '../../shell/Nav';
import { useTheme } from '../../theme/ThemeContext';
import { useToast } from '../../ui/Toast';
import { Card, Section } from '../../ui/Card';
import { Heading } from '../../ui/Heading';
import { ListRows } from '../../ui/Lists';
import { OutlineBtn, Pill, StatusPill } from '../../ui/Controls';
import { Txt } from '../../ui/Txt';
import { CustomerPagePreview, type CustomerPreviewMode, type CustomerPreviewView } from './CustomerPagePreview';

type ContentRow = {
  id: string;
  content_key: string;
  locale: string;
  version: number;
  status: 'draft' | 'published' | 'archived';
  payload: Record<string, any>;
  updated_at: string;
};

const CONTENT_KEY = 'customer_page_builder';
const starterModel = () => ({
  v: 5,
  pages: {
    home: {
      title: 'Home page',
      order: ['home.logo', 'home.hero', 'home.section'],
      els: {
        'home.logo': { t: 'logo', label: 'wantiss', vis: 1 },
        'home.hero': { t: 'hero', title: 'Sell Joy, Buy Happiness', sub: 'Draft copy — replace before publishing', label: 'Explore services', dest: 'none', vis: 1, img: { k: 'Wantiss brand' } },
        'home.section': { t: 'section', title: 'New section', kids: [], layout: 'stack', vis: 1, bg: 'none' },
      },
    },
  },
  meta: { uploads: [] },
});

export function CustomerPageEditorScreen() {
  const { c } = useTheme();
  const { go } = useNav();
  const toast = useToast();
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [selected, setSelected] = useState<ContentRow | null>(null);
  const [json, setJson] = useState('');
  const [pageKey, setPageKey] = useState('home');
  const [featureMenuOpen, setFeatureMenuOpen] = useState(false);
  const [pageStack, setPageStack] = useState<string[]>([]);
  const [elementKey, setElementKey] = useState('');
  const [editorMode, setEditorMode] = useState<CustomerPreviewMode>('Edit');
  const [viewMode, setViewMode] = useState<CustomerPreviewView>('Draft');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async (): Promise<ContentRow[]> => {
    setLoading(true);
    setError('');
    try {
      const { data, error: queryError } = await supabase
        .from('wantiss_cms_content')
        .select('id,content_key,locale,version,status,payload,updated_at')
        .eq('content_key', CONTENT_KEY)
        .order('version', { ascending: false })
        .limit(100);
      if (queryError) throw new Error(queryError.code === '42501' ? 'You do not have permission to view customer page drafts.' : 'Customer page drafts are unavailable.');
      const next = (data || []) as ContentRow[];
      setRows(next);
      setSelected((current) => current && current.id !== 'local-new' ? next.find((row) => row.id === current.id) || current : current);
      return next;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Customer page drafts are unavailable.');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const openRow = (row: ContentRow) => {
    setSelected(row);
    setJson(JSON.stringify(row.payload, null, 2));
    setPageKey('home');
    setPageStack([]);
    setElementKey('');
    setViewMode('Draft');
    setEditorMode('Edit');
    setError('');
  };

  const startBlankDraft = () => {
    if (!can(...REQ.content)) {
      setError('Content edit access is required to create a page draft.');
      return;
    }
    const payload = starterModel();
    setSelected({
      id: 'local-new', content_key: CONTENT_KEY, locale: 'en', version: 0,
      status: 'draft', payload, updated_at: new Date().toISOString(),
    });
    setJson(JSON.stringify(payload, null, 2));
    setPageKey('home');
    setPageStack([]);
    setElementKey('');
    setViewMode('Draft');
    setEditorMode('Edit');
    setError('');
  };

  const mutatePayload = (change: (model: Record<string, any>) => void) => {
    if (viewMode !== 'Draft' || editorMode !== 'Edit' || !can(...REQ.content)) return;
    try {
      const model = JSON.parse(json);
      if (!model || Array.isArray(model) || typeof model !== 'object') throw new Error();
      change(model);
      setJson(JSON.stringify(model, null, 2));
      setError('');
    } catch {
      setError('Fix the JSON structure before using the visual editor.');
    }
  };

  const parsePayload = (): Record<string, any> | null => {
    try {
      const model = JSON.parse(json);
      return model && !Array.isArray(model) && typeof model === 'object' ? model : null;
    } catch { return null; }
  };

  const parsedDraft = parsePayload();
  const publishedRow = rows.find((row) => row.status === 'published' && row.content_key === (selected?.content_key || CONTENT_KEY) && row.locale === (selected?.locale || 'en'));
  const previewPayload = viewMode === 'Published' ? (publishedRow?.payload || (selected?.status === 'published' ? selected.payload : null) || { pages: {} }) : (parsedDraft || selected?.payload || starterModel());
  const pageKeys = previewPayload?.pages && typeof previewPayload.pages === 'object' ? Object.keys(previewPayload.pages) : [];
  const featureNameFor = (key: string) => {
    const normalized = key.toLowerCase();
    if (key === 'home') return 'Wantiss home';
    if (normalized.includes('goodies')) return 'Goodies';
    if (normalized.includes('stays') || normalized.includes('stayz')) return 'Stayz';
    if (normalized.includes('flyz') || normalized.includes('flight')) return 'Flyz';
    if (normalized.includes('konsoliss')) return 'Konsoliss';
    if (normalized.includes('wallet') || normalized === 'tab:wallet') return 'Wallet';
    if (normalized.includes('woulib')) return 'Woulib';
    if (normalized.includes('frenzies')) return 'Frenzies';
    if (normalized.includes('konsoliss')) return 'Konsoliss';
    if (normalized.startsWith('tab:')) return key.slice(4).replace(/^./, (v) => v.toUpperCase());
    if (normalized.startsWith('svc:')) return key.slice(4);
    return String(previewPayload?.pages?.[key]?.title || key);
  };
  const featureOptions = pageKeys.reduce((items: { label: string; key: string }[], key: string) => {
    const label = featureNameFor(key);
    if (!items.some((item) => item.label.toLowerCase() === label.toLowerCase())) items.push({ label, key });
    return items;
  }, []);
  const activePageKey = pageKeys.includes(pageKey) ? pageKey : pageKeys[0] || '';
  const activeFeature = featureOptions.find((item) => item.key === activePageKey) || featureOptions.find((item) => item.key === pageKey) || featureOptions[0];
  const page = activePageKey ? previewPayload?.pages?.[activePageKey] : null;
  const elements = page?.els && typeof page.els === 'object' ? page.els : {};
  const elementIds: string[] = (Array.isArray(page?.order) ? page.order : Object.keys(elements)).filter((id: string) => Boolean(elements[id]));
  const element = elementKey && elements[elementKey] ? elements[elementKey] : null;
  const editable = viewMode === 'Draft' && editorMode === 'Edit' && Boolean(selected) && can(...REQ.content);

  const updatePageTitle = (value: string) => mutatePayload((model) => { model.pages[activePageKey].title = value; });
  const updateElement = (field: string, value: string) => mutatePayload((model) => {
    model.pages[activePageKey].els[elementKey][field] = value;
  });
  const toggleElement = () => mutatePayload((model) => {
    const target = model.pages[activePageKey].els[elementKey];
    target.vis = target.vis ? 0 : 1;
  });
  const moveElement = (delta: number) => mutatePayload((model) => {
    const targetPage = model.pages[activePageKey];
    const parent = Object.values(targetPage.els || {}).find((item: any) => Array.isArray(item.kids) && item.kids.includes(elementKey)) as any;
    const order: string[] = parent ? parent.kids : (Array.isArray(targetPage.order) ? targetPage.order : Object.keys(targetPage.els));
    const index = order.indexOf(elementKey);
    const next = index + delta;
    if (index < 0 || next < 0 || next >= order.length) return;
    [order[index], order[next]] = [order[next], order[index]];
    if (!parent) targetPage.order = order;
  });
  const addElement = (type: 'text' | 'card') => mutatePayload((model) => {
    const targetPage = model.pages[activePageKey];
    targetPage.els = targetPage.els || {};
    const id = activePageKey + '.' + type + '.' + (Object.keys(targetPage.els).length + 1);
    targetPage.els[id] = type === 'card'
      ? { t: 'card', title: 'New card', sub: 'Draft copy', label: '', btn: 'Learn more', dest: 'none', vis: 1, img: { k: 'Wantiss brand' } }
      : { t: 'text', title: 'New text block', sub: 'Draft copy', vis: 1 };
    targetPage.order = Array.isArray(targetPage.order) ? [...targetPage.order, id] : [...Object.keys(targetPage.els).filter((key) => key !== id), id];
    setElementKey(id);
  });
  const addPage = () => mutatePayload((model) => {
    model.pages = model.pages || {};
    let n = Object.keys(model.pages).length + 1;
    let id = 'page-' + n;
    while (model.pages[id]) { n += 1; id = 'page-' + n; }
    model.pages[id] = { title: 'New page ' + n, order: [], els: {} };
    setPageKey(id);
    setPageStack([]);
    setElementKey('');
  });

  const navigatePhone = (nextPage: string) => {
    if (viewMode === 'Draft' && editorMode === 'Edit') return;
    if (!previewPayload?.pages?.[nextPage]) return;
    setPageStack((current) => [...current, activePageKey]);
    setPageKey(nextPage);
    setElementKey('');
  };
  const backPhone = () => {
    const previous = pageStack[pageStack.length - 1];
    if (!previous) return;
    setPageStack((current) => current.slice(0, -1));
    setPageKey(previous);
  };

  const createDraft = async () => {
    if (!selected) return;
    if (viewMode !== 'Draft' || !can(...REQ.content)) {
      setError('Content edit access is required to save a private page draft.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = parsePayload();
      if (!payload || !payload.pages || typeof payload.pages !== 'object' || Array.isArray(payload.pages)) {
        setError('The customer page model must contain a pages object.');
        return;
      }
      const savedId = await saveCmsVersion({ key: CONTENT_KEY, locale: selected.locale || 'en', payload, status: 'draft' });
      const next = await reload();
      const saved = next.find((row) => row.id === savedId);
      if (saved) openRow(saved);
      toast('Private customer page draft saved. Live customer pages are unchanged.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The page draft could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const fieldStyle = { borderWidth: 1, borderColor: c.bd, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 8, marginTop: 5, marginBottom: 8, color: c.ink, backgroundColor: c.card, fontSize: 11 } as const;

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
        <OutlineBtn onPress={() => go('content', { cs: 'Editor' })}>‹ Content Studio</OutlineBtn>
        <OutlineBtn onPress={() => { void reload(); }} disabled={loading}>Refresh</OutlineBtn>
        <OutlineBtn onPress={startBlankDraft} disabled={!can(...REQ.content)}>Start blank draft</OutlineBtn>
      </View>
      <Heading title="Customer page editor" sub="The phone stays visible while you edit. Draft changes are private until saved; previewing or navigating the phone never publishes content." />
      <Section title="Choose a customer feature" >
        <Txt size={10.5} mut style={{ marginBottom: 7 }}>Choose which feature's customer screen you want to inspect. The phone preview below follows the selected page model.</Txt>
        <Pressable accessibilityRole="button" onPress={() => setFeatureMenuOpen((open) => !open)} style={{ minHeight: 42, borderWidth: 1, borderColor: c.bd, borderRadius: 12, backgroundColor: c.card, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Txt size={12} weight={500}>{activeFeature?.label || 'Select a feature'}</Txt>
          <Txt size={12} mut>{featureMenuOpen ? '⌃' : '⌄'}</Txt>
        </Pressable>
        {featureMenuOpen ? <View style={{ marginTop: 5, borderWidth: 1, borderColor: c.bd, borderRadius: 12, backgroundColor: c.card, overflow: 'hidden' }}>
          {featureOptions.map((item) => <Pressable key={item.key} onPress={() => { setPageKey(item.key); setPageStack([]); setElementKey(''); setFeatureMenuOpen(false); }} style={{ paddingHorizontal: 12, paddingVertical: 10, backgroundColor: activePageKey === item.key ? c.inset : 'transparent', borderBottomWidth: 1, borderBottomColor: c.bd }}>
            <Txt size={11.5} weight={activePageKey === item.key ? 500 : 400}>{item.label}</Txt>
            <Txt size={9.5} mut>{String(previewPayload?.pages?.[item.key]?.title || item.key)}</Txt>
          </Pressable>)}
        </View> : null}
      </Section>
      {error ? <Card><Txt size={11.5} color={c.or}>{error}</Txt></Card> : null}

      <Section title="Live customer phone preview" right={<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
        <OutlineBtn primary={viewMode === 'Draft'} onPress={() => { setViewMode('Draft'); setPageStack([]); setPageKey(pageKeys.includes('home') ? 'home' : pageKeys[0] || 'home'); }}>Draft</OutlineBtn>
        <OutlineBtn primary={viewMode === 'Published'} onPress={() => { setViewMode('Published'); setEditorMode('Preview'); setPageStack([]); setPageKey(pageKeys.includes('home') ? 'home' : pageKeys[0] || 'home'); setElementKey(''); }}>Published</OutlineBtn>
        <OutlineBtn primary={editorMode === 'Edit'} disabled={viewMode === 'Published' || !can(...REQ.content)} onPress={() => { setEditorMode('Edit'); setPageStack([]); }}>Edit</OutlineBtn>
        <OutlineBtn primary={editorMode === 'Preview'} onPress={() => { setEditorMode('Preview'); setPageStack([]); }}>Preview</OutlineBtn>
      </View>}>
        <View style={{ alignItems: 'center', paddingVertical: 6 }}>
          {viewMode === 'Published' && !publishedRow && selected?.status !== 'published' ? <Txt size={10.5} color={c.or} style={{ marginBottom: 8 }}>No published version was found for this locale. This is an empty published view, not a draft preview.</Txt> : null}
          {!selected && viewMode === 'Draft' ? <Txt size={10.5} mut style={{ marginBottom: 8 }}>Starter preview · select a version or start a blank draft to edit it.</Txt> : null}
          {selected && viewMode === 'Draft' ? <Txt size={10.5} mut style={{ marginBottom: 8, textAlign: 'center' }}>{editorMode === 'Edit' ? 'Edit mode: tap an element to select it. Changes stay in the draft.' : 'Preview mode: tap linked elements or the bottom navigation to move through customer pages.'}</Txt> : null}
          <CustomerPagePreview
            payload={previewPayload}
            pageKey={activePageKey}
            mode={viewMode === 'Published' ? 'Preview' : editorMode}
            view={viewMode}
            selectedElementKey={elementKey}
            pageStack={pageStack}
            onSelectElement={(id) => { if (editable) setElementKey(id); }}
            onNavigate={navigatePhone}
            onBack={backPhone}
          />
        </View>
      </Section>

      {selected && viewMode === 'Draft' && editorMode === 'Edit' ? (
        <>
          <Section title="Page and element structure">
            {pageKeys.length ? (
              <>
                <Txt size={10.1} mut>Select a page, then an element. Changes update the phone above immediately and remain private until saved.</Txt>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {pageKeys.map((key) => <Pill key={key} on={activePageKey === key} onPress={() => { setPageKey(key); setPageStack([]); setElementKey(''); }}>{String(previewPayload?.pages?.[key]?.title || key)}</Pill>)}
                  <OutlineBtn onPress={addPage} disabled={!editable}>+ Add page</OutlineBtn>
                </View>
                {page ? (
                  <>
                    <Txt size={10.1} weight={500} style={{ marginTop: 10 }}>Page title</Txt>
                    <TextInput value={String(page.title || '')} onChangeText={updatePageTitle} editable={editable} style={fieldStyle} placeholder="Page title" />
                    <ListRows empty="This page has no elements yet." rows={elementIds.map((id) => ({
                      key: id,
                      main: String(elements[id]?.title || elements[id]?.label || id),
                      sub: id + ' · ' + String(elements[id]?.t || 'element'),
                      right: <StatusPill label={elements[id]?.vis ? 'Visible' : 'Hidden'} small />,
                      onPress: () => setElementKey(id),
                    }))} />
                    {element ? (
                      <View style={{ marginTop: 8, padding: 10, borderWidth: 1, borderColor: c.bd, borderRadius: 12 }}>
                        <Txt size={11} weight={500}>Selected element · {elementKey}</Txt>
                        <Txt size={9.5} mut style={{ marginTop: 2 }}>Type: {String(element.t || 'text')} · {element.vis ? 'Visible' : 'Hidden'}</Txt>
                        {(['title', 'sub', 'label', 'btn', 'dest'] as const).map((field) => (
                          <View key={field}>
                            <Txt size={9.5} mut>{field === 'dest' ? 'Destination' : field[0].toUpperCase() + field.slice(1)}</Txt>
                            <TextInput value={String(element[field] ?? '')} onChangeText={(value) => updateElement(field, value)} editable={editable} style={fieldStyle} placeholder={'Enter ' + field} />
                          </View>
                        ))}
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                          <OutlineBtn onPress={() => moveElement(-1)} disabled={!editable}>Move up</OutlineBtn>
                          <OutlineBtn onPress={() => moveElement(1)} disabled={!editable}>Move down</OutlineBtn>
                          <OutlineBtn onPress={toggleElement} disabled={!editable}>{element.vis ? 'Hide element' : 'Show element'}</OutlineBtn>
                        </View>
                      </View>
                    ) : null}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      <OutlineBtn onPress={() => addElement('text')} disabled={!editable}>+ Text block</OutlineBtn>
                      <OutlineBtn onPress={() => addElement('card')} disabled={!editable}>+ Card</OutlineBtn>
                    </View>
                  </>
                ) : null}
              </>
            ) : <Txt size={10.1} mut>This draft does not contain a pages object. Correct the JSON model below or start a blank page-builder draft.</Txt>}
          </Section>
          <Section title={'Advanced page model · v' + selected.version}>
            <Txt size={10.1} mut>JSON is the source payload. Visual controls and the phone preview use the same draft model; saving creates a new private version only.</Txt>
            <TextInput
              value={json}
              onChangeText={(value) => { setJson(value); setError(''); }}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              accessibilityLabel="Customer page JSON editor"
              style={{ minHeight: 220, maxHeight: 420, textAlignVertical: 'top', borderWidth: 1, borderColor: c.bd, borderRadius: 12, padding: 10, marginTop: 8, color: c.ink, backgroundColor: c.card, fontSize: 12, fontFamily: 'monospace' }}
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              <OutlineBtn onPress={() => { setJson(JSON.stringify(selected.payload, null, 2)); setError(''); }} disabled={!editable}>Reset edits</OutlineBtn>
              <OutlineBtn primary disabled={saving || !editable} onPress={() => { void createDraft(); }}>{saving ? 'Saving…' : 'Save private draft'}</OutlineBtn>
            </View>
            {!can(...REQ.content) ? <Txt size={9.5} color={c.or} style={{ marginTop: 6 }}>View access only: editing and draft saving are disabled.</Txt> : null}
          </Section>
        </>
      ) : null}

      <Section title={'Customer page versions · ' + rows.length}>
        <ListRows empty={loading ? 'Loading customer page versions…' : 'No customer page-builder versions are available. Start a blank draft to begin.'} rows={rows.map((row) => ({
          key: row.id,
          main: row.content_key + ' · v' + row.version,
          sub: row.locale + ' · updated ' + new Date(row.updated_at).toLocaleString(),
          right: <View style={{ alignItems: 'flex-end', gap: 4 }}><StatusPill label={row.status} small /><Txt size={9.5} mut>{selected?.id === row.id ? 'Selected' : 'Open ›'}</Txt></View>,
          onPress: () => openRow(row),
        }))} />
      </Section>
    </View>
  );
}
