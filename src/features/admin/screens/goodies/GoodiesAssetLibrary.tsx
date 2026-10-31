import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, TextInput, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { listCmsAssets } from '../../lib/adminBackend';
import { useTheme } from '../../theme/ThemeContext';
import { Section } from '../../ui/Card';
import { OutlineBtn, Pill } from '../../ui/Controls';
import { Txt } from '../../ui/Txt';
import { GOODIES_CONTENT_KEY, imageKeyFor } from '../../goodiesConsumer/draft';

type Entry = { id: string; section: string; name: string; assetKey: string; url: string; status: string };

const BUCKET = 'wantiss-cms-assets';
const SOURCES = [
  { list: 'modes', section: 'Home · Service tiles', nameKey: 'title' },
  { list: 'cats', section: 'Home · Categories', nameKey: 'name' },
  { list: 'promos', section: 'Home · Promotion cards', nameKey: 'title' },
  { list: 'lib', section: 'Build Your Own · Ingredient artwork', nameKey: 'name' },
] as const;
const UNUSED = 'Uploaded, not used on any page yet';
const ORDER = [...SOURCES.map((s) => s.section), 'Products · Product images', 'Build Your Own · Pizza builder', 'Build Your Own · Burger builder', UNUSED];

const text = (value: any, fallback: string) => (typeof value === 'string' ? value : value?.en?.v) || fallback;

export function GoodiesAssetLibrary() {
  const { c } = useTheme();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [assetList, content] = await Promise.all([
        listCmsAssets(),
        supabase.from('wantiss_cms_content').select('content_key,version,payload')
          .in('content_key', [GOODIES_CONTENT_KEY, 'goodies']).eq('locale', 'en').in('status', ['draft', 'published'])
          .order('version', { ascending: false }).limit(40),
      ]);
      if (content.error) throw new Error('Goodies content could not be loaded.');
      const rows = content.data || [];
      const latest = (rows.filter((r: any) => r.content_key === GOODIES_CONTENT_KEY)[0] || rows[0])?.payload;

      const byKey = new Map<string, any>();
      (Array.isArray(assetList) ? assetList : [])
        .filter((a: any) => a.status !== 'archived' && String(a.content_type || '').startsWith('image/'))
        .forEach((a: any) => {
          const current = byKey.get(a.asset_key);
          if (!current || (current.status !== 'published' && a.status === 'published')) byKey.set(a.asset_key, a);
        });

      const next: Entry[] = [];
      const used = new Set<string>();
      SOURCES.forEach(({ list, section, nameKey }) => {
        (latest?.[list] || []).forEach((item: any) => {
          const image = item?.[imageKeyFor(list)];
          const assetKey = image?.assetKey || image?.asset_key || '';
          const url = image?.url || '';
          if (!assetKey && !url) return;
          if (assetKey) used.add(assetKey);
          next.push({ id: list + ':' + item.id, section, name: text(item[nameKey], String(item.id)), assetKey, url, status: assetKey ? byKey.get(assetKey)?.status || 'missing' : 'external link' });
        });
      });
      byKey.forEach((asset, key) => {
        // Include every image uploaded through Goodies, even when it is not
        // currently referenced by a draft or published content item.
        if (used.has(key) || !/^wantiss\.goodies\./i.test(key)) return;
        const normalized = key.toLowerCase();
        let section = UNUSED;
        if (/\.home\.(mode|service)/.test(normalized)) section = 'Home · Service tiles';
        else if (/\.home\.(cat|category)/.test(normalized)) section = 'Home · Categories';
        else if (/\.home\.(promo|promotion)/.test(normalized)) section = 'Home · Promotion cards';
        else if (/\.product/.test(normalized)) section = 'Products · Product images';
        else if (/\.builder\.pizza|\.pizza\.builder/.test(normalized)) section = 'Build Your Own · Pizza builder';
        else if (/\.builder\.burger|\.burger\.builder/.test(normalized)) section = 'Build Your Own · Burger builder';
        else if (/\.(lib|ingredient|ingredients)/.test(normalized)) section = 'Build Your Own · Ingredient artwork';
        next.push({ id: 'unused:' + key, section, name: key, assetKey: key, url: '', status: asset.status });
      });
      setEntries(next);

      const paths = Array.from(new Set(next.filter((e) => e.assetKey && byKey.get(e.assetKey)).map((e) => byKey.get(e.assetKey).storage_path)));
      const signed = paths.length ? await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600) : { data: [] as any[] };
      const byPath = new Map<string, string>();
      (signed.data || []).forEach((d: any) => { if (d?.path && d?.signedUrl) byPath.set(d.path, d.signedUrl); });
      const map: Record<string, string> = {};
      next.forEach((e) => { const asset = byKey.get(e.assetKey); const url = asset && byPath.get(asset.storage_path); if (url) map[e.assetKey] = url; });
      setUrls(map);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Goodies assets could not be loaded.');
      setEntries([]); setUrls({});
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const grouped: Record<string, Entry[]> = {};
    entries.filter((e) => !q || (e.name + ' ' + e.section + ' ' + e.assetKey).toLowerCase().includes(q))
      .forEach((e) => { (grouped[e.section] ||= []).push(e); });
    return ORDER.filter((section) => grouped[section]).map((section) => [section, grouped[section]] as const);
  }, [entries, search]);

  return (
    <Section title="Goodies assets">
      <Txt size={10} mut lh={1.4}>All images uploaded for Goodies, grouped by the page or section they belong to. Upload or replace images in the Goodies content editor.</Txt>
      <TextInput value={search} onChangeText={setSearch} placeholder="Search by name or section…" placeholderTextColor={c.mut} style={{ borderWidth: 1, borderColor: c.bd, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, color: c.ink, backgroundColor: c.card, fontSize: 12, marginTop: 10, marginBottom: 8 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Txt size={9.5} mut>{entries.length} image{entries.length === 1 ? '' : 's'}</Txt>
        <OutlineBtn onPress={() => { void reload(); }} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</OutlineBtn>
      </View>
      {error ? <Txt size={10} color={c.or}>{error}</Txt> : null}
      {!loading && !error && !entries.length ? <Txt size={10} mut>No Goodies images yet.</Txt> : null}
      {groups.map(([section, items]) => (
        <View key={section} style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
            <Txt size={11} weight={600}>{section}</Txt>
            <Pill>{items.length}</Pill>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
            {items.map((e) => {
              const uri = urls[e.assetKey] || e.url;
              return (
                <View key={e.id} style={{ width: '31%', minWidth: 92, borderWidth: 1, borderColor: c.bd, borderRadius: 10, overflow: 'hidden', backgroundColor: c.card }}>
                  {uri ? <Image source={{ uri }} resizeMode="contain" style={{ width: '100%', height: 92, backgroundColor: '#FFFFFF' }} /> : <View style={{ height: 92, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}><Txt size={9} mut>Preview unavailable</Txt></View>}
                  <View style={{ padding: 6, gap: 2 }}>
                    <Txt size={9.5} weight={600} numberOfLines={2}>{e.name}</Txt>
                    <Txt size={8.5} mut numberOfLines={2}>{e.section}</Txt>
                    <Txt size={8.5} mut>{e.status}</Txt>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ))}
      {!loading && entries.length > 0 && !groups.length ? <Txt size={10} mut>No images match this search.</Txt> : null}
    </Section>
  );
}
