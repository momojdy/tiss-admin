import { useEffect, useMemo, useState } from 'react';
import { Image, TextInput, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { listCmsAssets } from '../../lib/adminBackend';
import { useTheme } from '../../theme/ThemeContext';
import { Section } from '../../ui/Card';
import { OutlineBtn, Pill } from '../../ui/Controls';
import { Txt } from '../../ui/Txt';

type Asset = {
  id: string;
  asset_key: string;
  storage_path: string;
  content_type: string;
  byte_size: number;
  status: string;
  alt_text?: Record<string, string>;
};

const placementFor = (key: string) => {
  const value = key.toLowerCase().replace(/[_/.-]+/g, ' ');
  if (value.includes('pizza')) return 'Pizza builder';
  if (value.includes('burger')) return 'Burger builder';
  if (value.includes('ingredient')) return 'Ingredients';
  if (value.includes('category')) return 'Categories';
  if (value.includes('product')) return 'Products';
  if (value.includes('promo') || value.includes('banner')) return 'Promotions';
  if (value.includes('home')) return 'Home';
  return 'Other Goodies assets';
};

export function GoodiesAssetLibrary() {
  const { c } = useTheme();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listCmsAssets();
      const goodies = (Array.isArray(result) ? result : []).filter((item: Asset) =>
        String(item.asset_key || '').toLowerCase().includes('goodies') &&
        String(item.content_type || '').startsWith('image/')
      ) as Asset[];
      setAssets(goodies);
      const entries = await Promise.all(goodies.map(async (asset) => {
        const { data, error: urlError } = await supabase.storage.from('wantiss-cms-assets').createSignedUrl(asset.storage_path, 3600);
        return [asset.id, !urlError && data?.signedUrl ? data.signedUrl : ''] as const;
      }));
      setUrls(Object.fromEntries(entries.filter((entry) => !!entry[1])));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Goodies assets could not be loaded.');
      setAssets([]);
      setUrls({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void reload(); }, []);

  const groups = useMemo(() => {
    const filtered = assets.filter((asset) => (asset.asset_key + ' ' + (asset.alt_text?.en || '')).toLowerCase().includes(search.trim().toLowerCase()));
    const grouped: Record<string, Asset[]> = {};
    filtered.forEach((asset) => {
      const group = placementFor(asset.asset_key);
      (grouped[group] ||= []).push(asset);
    });
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [assets, search]);

  return (
    <View>
      <Section title="Goodies asset library">
        <Txt size={10} mut lh={1.4}>A visual library of uploaded Goodies images. Product details and customer-facing text remain in their existing editors, so this page does not duplicate those controls.</Txt>
        <TextInput value={search} onChangeText={setSearch} placeholder="Search Goodies image names…" placeholderTextColor={c.mut} style={{ borderWidth: 1, borderColor: c.bd, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, color: c.ink, backgroundColor: c.card, fontSize: 12, marginTop: 10, marginBottom: 8 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Txt size={9.5} mut>{assets.length} uploaded image{assets.length === 1 ? '' : 's'}</Txt>
          <OutlineBtn onPress={() => { void reload(); }} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</OutlineBtn>
        </View>
        {error ? <Txt size={10} color={c.or}>{error}</Txt> : null}
        {!loading && !error && !assets.length ? <Txt size={10} mut>No uploaded Goodies images were found in the CMS asset library.</Txt> : null}
        {groups.map(([group, items]) => (
          <View key={group} style={{ marginTop: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
              <Txt size={11} weight={600}>{group}</Txt>
              <Pill>{items.length}</Pill>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
              {items.map((asset) => (
                <View key={asset.id} style={{ width: '31%', minWidth: 92, borderWidth: 1, borderColor: c.bd, borderRadius: 10, overflow: 'hidden', backgroundColor: c.card }}>
                  {urls[asset.id] ? <Image source={{ uri: urls[asset.id] }} resizeMode="cover" style={{ width: '100%', height: 92, backgroundColor: c.bg }} /> : <View style={{ height: 92, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}><Txt size={9} mut>Preview unavailable</Txt></View>}
                  <View style={{ padding: 6, gap: 3 }}>
                    <Txt size={9} weight={600} numberOfLines={2}>{asset.asset_key}</Txt>
                    <Txt size={8.5} mut>{Math.ceil((asset.byte_size || 0) / 1024)} KB</Txt>
                    <Txt size={8.5} mut>{asset.status}</Txt>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}
        {!loading && assets.length > 0 && groups.length === 0 ? <Txt size={10} mut>No images match this search.</Txt> : null}
      </Section>
    </View>
  );
}
