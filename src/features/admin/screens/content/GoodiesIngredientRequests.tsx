import { useCallback, useEffect, useState } from 'react';
import { Image, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { publishCmsAsset, uploadCmsAsset } from '../../lib/adminBackend';
import { useTheme } from '../../theme/ThemeContext';
import { Section } from '../../ui/Card';
import { OutlineBtn } from '../../ui/Controls';
import { Txt } from '../../ui/Txt';

type Req = { id: string; business_name: string; name: string; builder: string; role: string | null; note: string | null; status: string; review_note: string | null; image_path: string | null; admin_asset_key: string | null; library_id: string | null };
type Lib = { id: string; builder: string; role: string | null; name: string; asset_key: string | null; active: boolean };
type Picked = { uri: string; fileName: string; contentType: string; byteSize: number };

const REQ_BUCKET = 'goodies-ingredient-requests';
const CMS_BUCKET = 'wantiss-cms-assets';
const BUILDERS = ['pizza', 'burger', 'custom'];
const STATUS: Record<string, string> = { submitted: 'Waiting', approved: 'Approved', denied: 'Declined', needs_info: 'Needs info' };
const slug = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ingredient';

async function pickImage(): Promise<Picked | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 });
  if (result.canceled || !result.assets?.[0]) return null;
  const file = result.assets[0];
  const contentType = file.mimeType || 'image/jpeg';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) throw new Error('Choose a JPEG, PNG or WebP image.');
  let byteSize = file.fileSize || 0;
  if (!byteSize) byteSize = (await (await fetch(file.uri)).blob()).size;
  return { uri: file.uri, fileName: file.fileName || 'ingredient.jpg', contentType, byteSize };
}

/** Uploads an image to the CMS asset library and publishes it, returning its asset key. */
async function storeAsset(name: string, file: Picked): Promise<string> {
  const key = 'wantiss.goodies.ingredient.' + slug(name) + '.' + crypto.randomUUID().slice(0, 8);
  const id = await uploadCmsAsset({ key, ...file, altText: { en: name } });
  await publishCmsAsset(String(id));
  return key;
}

export function GoodiesIngredientRequests({ canEdit }: { canEdit: boolean }) {
  const { c } = useTheme();
  const [requests, setRequests] = useState<Req[]>([]);
  const [library, setLibrary] = useState<Lib[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [rules, setRules] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [newName, setNewName] = useState('');
  const [newBuilder, setNewBuilder] = useState('pizza');

  const load = useCallback(async () => {
    try {
      const [reqs, libs, rule] = await Promise.all([
        supabase.rpc('wantiss_admin_list_ingredient_requests'),
        supabase.rpc('wantiss_admin_list_library_ingredients'),
        supabase.rpc('goodies_get_ingredient_rules'),
      ]);
      if (reqs.error) throw reqs.error;
      const reqRows = (reqs.data || []) as Req[];
      const libRows = (libs.data || []) as Lib[];
      setRequests(reqRows); setLibrary(libRows); setRules(typeof rule.data === 'string' ? rule.data : '');
      const next: Record<string, string> = {};
      const vendorPaths = reqRows.map((r) => r.image_path).filter(Boolean) as string[];
      if (vendorPaths.length) {
        const { data } = await supabase.storage.from(REQ_BUCKET).createSignedUrls(vendorPaths, 3600);
        (data || []).forEach((d: any) => { if (d?.path && d?.signedUrl) next['v:' + d.path] = d.signedUrl; });
      }
      const { data: assets } = await supabase.rpc('wantiss_admin_list_cms_assets');
      const keys = new Set([...reqRows.map((r) => r.admin_asset_key), ...libRows.map((l) => l.asset_key)].filter(Boolean) as string[]);
      const picked = (Array.isArray(assets) ? assets : []).filter((a: any) => keys.has(a.asset_key));
      if (picked.length) {
        const { data } = await supabase.storage.from(CMS_BUCKET).createSignedUrls(picked.map((a: any) => a.storage_path), 3600);
        const byPath = new Map<string, string>();
        (data || []).forEach((d: any) => { if (d?.path && d?.signedUrl) byPath.set(d.path, d.signedUrl); });
        picked.forEach((a: any) => { const u = byPath.get(a.storage_path); if (u) next['a:' + a.asset_key] = u; });
      }
      setUrls(next);
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Ingredient requests could not be loaded.'); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const run = async (label: string, work: () => Promise<void>) => {
    if (busy) return;
    setBusy(label); setMsg('');
    try { await work(); await load(); } catch (e: any) { setMsg(e?.message || 'That did not work.'); } finally { setBusy(''); }
  };

  const review = (r: Req, status: 'approved' | 'denied' | 'needs_info', replacement?: Picked | null) => run(r.id, async () => {
    let assetKey: string | null = null;
    if (replacement) assetKey = await storeAsset(r.name, replacement);
    else if (status === 'approved' && !r.admin_asset_key && r.image_path && urls['v:' + r.image_path]) {
      const ext = (r.image_path.split('.').pop() || 'jpg').toLowerCase();
      const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const blob = await (await fetch(urls['v:' + r.image_path])).blob();
      assetKey = await storeAsset(r.name, { uri: urls['v:' + r.image_path], fileName: 'vendor.' + ext, contentType: type, byteSize: blob.size });
    }
    const { error } = await supabase.rpc('wantiss_admin_review_ingredient_request', { p_request_id: r.id, p_status: status, p_review_note: notes[r.id] || null, p_admin_asset_key: assetKey, p_role: null });
    if (error) throw new Error(error.message);
    setMsg(status === 'approved' ? 'Approved. It is now in the ingredient list.' : 'Saved.');
  });

  const replacePhoto = (r: Req) => run(r.id, async () => {
    const file = await pickImage(); if (!file) return;
    const key = await storeAsset(r.name, file);
    const { error } = await supabase.rpc('wantiss_admin_review_ingredient_request', { p_request_id: r.id, p_status: r.status === 'approved' ? 'approved' : 'needs_info', p_review_note: r.status === 'approved' ? r.review_note : (notes[r.id] || 'We replaced your photo to fit the builder.'), p_admin_asset_key: key, p_role: null });
    if (error) throw new Error(error.message);
    setMsg('Photo replaced.');
  });

  const saveLib = (l: Partial<Lib> & { name: string; builder: string }, file?: Picked | null) => run('lib', async () => {
    const key = file ? await storeAsset(l.name, file) : l.asset_key || null;
    const { error } = await supabase.rpc('wantiss_admin_save_library_ingredient', { p_id: l.id || null, p_builder: l.builder, p_role: l.role || null, p_name: l.name, p_asset_key: key, p_active: l.active ?? true });
    if (error) throw new Error(error.message);
    setNewName('');
  });

  const saveRules = () => run('rules', async () => {
    const { error } = await supabase.rpc('wantiss_admin_set_ingredient_rules', { p_rules: rules });
    if (error) throw new Error(error.message);
    setMsg('Photo rules saved. Vendors see them when they request an ingredient.');
  });

  const field = { borderWidth: 1, borderColor: c.bd, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 7, marginTop: 4, marginBottom: 7, color: c.ink, backgroundColor: c.card, fontSize: 11 } as const;
  const thumb = (uri?: string) => uri ? <Image source={{ uri }} resizeMode="contain" style={{ width: 72, height: 72, borderRadius: 8, backgroundColor: '#FFFFFF' }} /> : <View style={{ width: 72, height: 72, borderRadius: 8, backgroundColor: c.inset, alignItems: 'center', justifyContent: 'center' }}><Txt size={8.5} mut>No photo</Txt></View>;
  const shown = requests.filter((r) => showAll || r.status === 'submitted' || r.status === 'needs_info');
  const off = !canEdit || !!busy;

  return (
    <Section title="Ingredient requests">
      {msg ? <Txt size={10} color={c.or} style={{ marginBottom: 7 }}>{msg}</Txt> : null}

      <Txt size={11} weight={600}>Photo rules vendors see</Txt>
      <TextInput value={rules} onChangeText={setRules} multiline editable={canEdit} style={[field, { minHeight: 110, textAlignVertical: 'top' }]} />
      <OutlineBtn disabled={off} onPress={saveRules}>{busy === 'rules' ? 'Saving…' : 'Save rules'}</OutlineBtn>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 6 }}>
        <Txt size={11} weight={600}>{showAll ? 'All requests' : 'Waiting for review'} ({shown.length})</Txt>
        <OutlineBtn onPress={() => setShowAll(!showAll)}>{showAll ? 'Show waiting' : 'Show all'}</OutlineBtn>
      </View>
      {!shown.length ? <Txt size={10} mut>No requests here.</Txt> : null}
      {shown.map((r) => (
        <View key={r.id} style={{ borderWidth: 1, borderColor: c.bd, borderRadius: 10, padding: 9, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ alignItems: 'center', gap: 3 }}>{thumb(r.image_path ? urls['v:' + r.image_path] : undefined)}<Txt size={8.5} mut>Vendor</Txt></View>
            {r.admin_asset_key ? <View style={{ alignItems: 'center', gap: 3 }}>{thumb(urls['a:' + r.admin_asset_key])}<Txt size={8.5} mut>Used</Txt></View> : null}
            <View style={{ flex: 1 }}>
              <Txt size={11} weight={600}>{r.name}</Txt>
              <Txt size={9.5} mut>{r.business_name || 'Business'} · {r.builder}{r.role ? ' · ' + r.role : ''}</Txt>
              <Txt size={9.5} mut>{STATUS[r.status] || r.status}</Txt>
              {r.note ? <Txt size={9.5} style={{ marginTop: 3 }}>{r.note}</Txt> : null}
            </View>
          </View>
          <TextInput value={notes[r.id] ?? ''} onChangeText={(v) => setNotes({ ...notes, [r.id]: v })} placeholder="Note to the vendor (required to decline or ask for info)" placeholderTextColor={c.mut} style={field} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <OutlineBtn primary disabled={off || r.status === 'approved'} onPress={() => review(r, 'approved')}>{busy === r.id ? 'Working…' : 'Approve'}</OutlineBtn>
            <OutlineBtn disabled={off} onPress={() => replacePhoto(r)}>Replace photo</OutlineBtn>
            <OutlineBtn disabled={off} onPress={() => review(r, 'needs_info')}>Ask for info</OutlineBtn>
            <OutlineBtn disabled={off} onPress={() => review(r, 'denied')}>Decline</OutlineBtn>
          </View>
        </View>
      ))}

      <Txt size={11} weight={600} style={{ marginTop: 14 }}>Ingredient list ({library.length})</Txt>
      <Txt size={9.5} mut style={{ marginBottom: 6 }}>Approved and manually added ingredients. These appear in "Add from ingredient list" in the builder editor and for vendors.</Txt>
      <TextInput value={newName} onChangeText={setNewName} placeholder="New ingredient name (e.g. Whipped cream)" placeholderTextColor={c.mut} style={field} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
        {BUILDERS.map((b) => <OutlineBtn key={b} primary={newBuilder === b} onPress={() => setNewBuilder(b)}>{b}</OutlineBtn>)}
        <OutlineBtn disabled={off || newName.trim().length < 2} onPress={() => saveLib({ name: newName.trim(), builder: newBuilder })}>Add</OutlineBtn>
        <OutlineBtn disabled={off || newName.trim().length < 2} onPress={async () => { try { const f = await pickImage(); if (f) await saveLib({ name: newName.trim(), builder: newBuilder }, f); } catch (e: any) { setMsg(e?.message || 'Photo failed.'); } }}>Add with photo</OutlineBtn>
      </View>
      {library.map((l) => (
        <View key={l.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderColor: c.bd, paddingVertical: 7 }}>
          {thumb(l.asset_key ? urls['a:' + l.asset_key] : undefined)}
          <View style={{ flex: 1 }}>
            <Txt size={10.5} weight={600}>{l.name}</Txt>
            <Txt size={9} mut>{l.builder}{l.role ? ' · ' + l.role : ''}{l.active ? '' : ' · hidden'}</Txt>
          </View>
          <View style={{ gap: 5 }}>
            <OutlineBtn disabled={off} onPress={async () => { try { const f = await pickImage(); if (f) await saveLib(l, f); } catch (e: any) { setMsg(e?.message || 'Photo failed.'); } }}>Photo</OutlineBtn>
            <OutlineBtn disabled={off} onPress={() => saveLib({ ...l, active: !l.active })}>{l.active ? 'Hide' : 'Show'}</OutlineBtn>
          </View>
        </View>
      ))}
    </Section>
  );
}
