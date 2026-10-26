import { useCallback, useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
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
import { OutlineBtn, StatusPill } from '../../ui/Controls';
import { Txt } from '../../ui/Txt';
import { GoodiesPhonePreview } from './GoodiesPhonePreview';

type ContentRow = {
  id: string;
  content_key: string;
  locale: string;
  version: number;
  status: 'draft' | 'published' | 'archived';
  payload: Record<string, unknown>;
  updated_at: string;
};

/**
 * Standalone customer page editor. All edits are private CMS versions;
 * the existing server RPC remains responsible for authorization and persistence.
 */
export function CustomerPageEditorScreen() {
  const { c } = useTheme();
  const { go } = useNav();
  const toast = useToast();
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [selected, setSelected] = useState<ContentRow | null>(null);
  const [json, setJson] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: queryError } = await supabase
        .from('wantiss_cms_content')
        .select('id,content_key,locale,version,status,payload,updated_at')
        .ilike('content_key', '%goodies%')
        .order('updated_at', { ascending: false })
        .limit(200);
      if (queryError) throw new Error(queryError.code === '42501' ? 'You do not have permission to view customer content.' : 'Customer content is unavailable.');
      const next = (data || []) as ContentRow[];
      setRows(next);
      setSelected((current) => current ? next.find((row) => row.id === current.id) || current : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Customer content is unavailable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const openRow = (row: ContentRow) => {
    setSelected(row);
    setJson(JSON.stringify(row.payload, null, 2));
    setError('');
  };

  const createDraft = async () => {
    if (!selected) return;
    if (!can(...REQ.content)) {
      setError('Content edit access is required to create a draft.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      let payload: Record<string, unknown>;
      try { payload = JSON.parse(json); }
      catch { setError('Enter valid JSON before saving.'); return; }
      if (!payload || Array.isArray(payload) || typeof payload !== 'object') {
        setError('The page payload must be a JSON object.');
        return;
      }
      await saveCmsVersion({ key: selected.content_key, locale: selected.locale, payload, status: 'draft' });
      await reload();
      toast('Private page draft saved. Live customer content is unchanged.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The draft could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  let preview: Record<string, unknown> | null = null;
  try {
    const parsed = JSON.parse(json);
    if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') preview = parsed;
  } catch { /* validation is shown inline while editing */ }

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <OutlineBtn onPress={() => go('content', { cs: 'Editor' })}>‹ Content Studio</OutlineBtn>
        <OutlineBtn onPress={() => { void reload(); }} disabled={loading}>Refresh</OutlineBtn>
      </View>
      <Heading title="Customer page editor" sub="Select a Goodies CMS version, edit its page payload and preview the customer-facing layout. Saving creates a private draft; it never publishes directly." />
      {error ? <Card><Txt size={11.5} color={c.or}>{error}</Txt></Card> : null}
      <Section title={'Goodies page versions · ' + rows.length}>
        <ListRows empty={loading ? 'Loading CMS versions…' : 'No Goodies CMS versions are available for your permissions.'} rows={rows.map((row) => ({
          key: row.id,
          main: row.content_key + ' · v' + row.version,
          sub: row.locale + ' · updated ' + new Date(row.updated_at).toLocaleString(),
          right: <View style={{ alignItems: 'flex-end', gap: 4 }}><StatusPill label={row.status} small /><Txt size={9.5} mut>{selected?.id === row.id ? 'Selected' : 'Open ›'}</Txt></View>,
          onPress: () => openRow(row),
        }))} />
      </Section>
      {selected ? (
        <>
          <Section title={'Page payload · ' + selected.content_key}>
            <Txt size={10.1} mut>Source version v{selected.version} · {selected.status}. Edits are saved as a new draft through the existing Supabase CMS RPC.</Txt>
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
              <OutlineBtn onPress={() => setJson(JSON.stringify(selected.payload, null, 2))}>Reset edits</OutlineBtn>
              <OutlineBtn primary disabled={saving || !can(...REQ.content)} onPress={() => { void createDraft(); }}>{saving ? 'Saving…' : 'Save private draft'}</OutlineBtn>
            </View>
            {!can(...REQ.content) ? <Txt size={9.5} color={c.or} style={{ marginTop: 6 }}>View access only: draft saving is disabled.</Txt> : null}
          </Section>
          <Section title="Customer preview">
            {preview ? <GoodiesPhonePreview payload={preview} /> : <Txt size={11.5} color={c.or}>The payload must be valid JSON to render a preview.</Txt>}
          </Section>
        </>
      ) : null}
    </View>
  );
}
