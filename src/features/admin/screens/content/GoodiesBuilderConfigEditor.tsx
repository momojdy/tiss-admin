import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, TextInput, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../theme/ThemeContext';
import { Section } from '../../ui/Card';
import { OutlineBtn } from '../../ui/Controls';
import { Txt } from '../../ui/Txt';
import { PromoColorPicker } from './PromoColorPicker';
import { chooseAndUploadIngredientImage } from './builderImages';
import type { BuilderTarget } from '../../goodiesConsumer/editContext';

type BuilderRow = { business_id: string; business_name: string; builder_id: string; config: any; enabled: boolean; updated_at: string };
type Part = { part: 'builder' | 'group' | 'ingredient'; groupId?: string; itemId?: string; isNew?: boolean };

/**
 * Small editor under the phone. It shows only the part that was tapped:
 * the builder title, a section name, or one ingredient (picture, name, card color).
 * Minimum / maximum picks, prices and availability belong to the merchant and are not shown.
 */
export function GoodiesBuilderConfigEditor({ canEdit, focus = null, imageUrls = {}, onRows, onDraft, onClose }: {
  canEdit: boolean;
  focus?: BuilderTarget | null;
  imageUrls?: Record<string, string>;
  onRows?: (rows: BuilderRow[]) => void;
  onDraft?: (row: BuilderRow | null) => void;
  onClose?: () => void;
}) {
  const { c } = useTheme();
  const [rows, setRows] = useState<BuilderRow[]>([]);
  const [selected, setSelected] = useState<BuilderRow | null>(null);
  const [part, setPart] = useState<Part | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [library, setLibrary] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const handled = useRef<BuilderTarget | null>(null);

  const load = useCallback(async () => {
    try {
      const { data, error: rpcError } = await supabase.rpc('wantiss_admin_list_goodies_builder_configs');
      if (rpcError) throw rpcError;
      setRows(Array.isArray(data) ? (data as BuilderRow[]) : []);
    } catch (e) { setError((e as any)?.message || 'Builders could not be loaded.'); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    (async () => {
      const [lib, req] = await Promise.all([supabase.rpc('wantiss_admin_list_library_ingredients'), supabase.rpc('wantiss_admin_list_ingredient_requests')]);
      setLibrary(Array.isArray(lib.data) ? lib.data : []);
      setRequests(Array.isArray(req.data) ? req.data : []);
    })().catch(() => {});
  }, []);
  useEffect(() => { onRows?.(rows); }, [rows]);
  useEffect(() => { onDraft?.(selected); }, [selected]);

  // Open the part that was tapped in the phone. New sections / ingredients start empty and are kept only when saved.
  useEffect(() => {
    if (!focus || handled.current === focus) return;
    const row = rows.find((r) => r.builder_id === focus.builderId);
    if (!row) {
      if (rows.length) { handled.current = focus; setPart(null); setError('This is a sample, not one of your saved builders, so it cannot be edited.'); }
      return;
    }
    handled.current = focus; setError(''); setNotice('');
    const adding = focus.part === 'addGroup' || focus.part === 'addIngredient';
    if (adding && !canEdit) { setPart(null); setError('View access only: editing and saving are disabled.'); return; }
    let base: BuilderRow = selected && selected.builder_id === focus.builderId ? selected : JSON.parse(JSON.stringify(row));
    let next: Part = { part: focus.part === 'addGroup' ? 'group' : focus.part === 'addIngredient' ? 'ingredient' : focus.part, groupId: focus.groupId, itemId: focus.itemId };
    if (focus.part === 'addGroup') {
      const group = { id: 'group-' + Date.now().toString(36), name: '', kind: 'many', req: false, min: 0, max: 10, inc: 0, me: 1, items: [] };
      base = { ...base, config: { ...base.config, groups: [...(base.config?.groups || []), group] } };
      next = { part: 'group', groupId: group.id, isNew: true };
    }
    if (focus.part === 'addIngredient') {
      const item = { id: 'item-' + Date.now().toString(36), name: '', price: 0, free: false, avail: false, assetId: null, col: '#D9A441' };
      base = { ...base, config: { ...base.config, groups: (base.config?.groups || []).map((g: any) => g.id === focus.groupId ? { ...g, items: [...(g.items || []), item] } : g) } };
      next = { part: 'ingredient', groupId: focus.groupId, itemId: item.id, isNew: true };
    }
    setSelected(base); setPart(next);
  }, [focus, rows]);

  const patchBuilder = (p: Record<string, any>) => setSelected((cur) => cur && { ...cur, config: { ...cur.config, ...p } });
  const patchGroup = (gid: string, change: (g: any) => any) => setSelected((cur) => cur && { ...cur, config: { ...cur.config, groups: (cur.config?.groups || []).map((g: any) => g.id === gid ? change(g) : g) } });
  const patchItem = (gid: string, iid: string, p: Record<string, any>) => patchGroup(gid, (g) => ({ ...g, items: (g.items || []).map((it: any) => it.id === iid ? { ...it, ...p } : it) }));

  const group = (selected?.config?.groups || []).find((g: any) => g.id === part?.groupId);
  const item = (group?.items || []).find((it: any) => it.id === part?.itemId);
  const requestsHere = useMemo(() => requests.filter((r: any) => selected && r.business_id === selected.business_id && r.status !== 'rejected'), [requests, selected?.business_id]);

  const persist = async (row: BuilderRow) => {
    const names = [row.config?.name, ...(row.config?.groups || []).flatMap((g: any) => [g.name, ...(g.items || []).map((i: any) => i.name)])];
    if (names.some((n: any) => !String(n || '').trim())) { setError('Give every title, section and ingredient a name first.'); return false; }
    setSaving(true); setError(''); setNotice('');
    try {
      const config = { ...row.config, id: row.builder_id };
      const { error: rpcError } = await supabase.rpc('wantiss_admin_save_goodies_builder_config', {
        p_business_id: row.business_id, p_builder_id: row.builder_id, p_config: config, p_enabled: !!row.enabled,
      });
      if (rpcError) throw rpcError;
      setSelected({ ...row, config }); setNotice('Saved.'); await load(); return true;
    } catch (e) { setError((e as any)?.message || 'It could not be saved.'); return false; }
    finally { setSaving(false); }
  };
  const save = () => { if (selected && canEdit && !saving) void persist(selected); };
  const close = () => { setPart(null); setSelected(null); setNotice(''); setError(''); onClose?.(); };
  const remove = async () => {
    if (!selected || !part || !canEdit || saving) return;
    const config = part.part === 'ingredient'
      ? { ...selected.config, groups: (selected.config?.groups || []).map((g: any) => g.id === part.groupId ? { ...g, items: (g.items || []).filter((i: any) => i.id !== part.itemId) } : g) }
      : { ...selected.config, groups: (selected.config?.groups || []).filter((g: any) => g.id !== part.groupId) };
    if (await persist({ ...selected, config })) close();
  };
  const upload = async (source: 'photos' | 'files') => {
    if (!canEdit || busy || !part?.groupId || !part.itemId) return;
    setBusy(source); setError('');
    try {
      const key = await chooseAndUploadIngredientImage(source, part.itemId);
      if (key) { patchItem(part.groupId, part.itemId, { img: { assetKey: key } }); setNotice('Picture added. Tap Save to keep it.'); }
    } catch (e) { setError(e instanceof Error ? e.message : 'The picture could not be uploaded.'); }
    finally { setBusy(''); }
  };
  const useRequest = (request: any) => {
    if (!part?.groupId || !part.itemId) return;
    const lib = library.find((x: any) => x.request_id === request.id || x.id === request.library_id);
    patchItem(part.groupId, part.itemId, { name: String(request.name || ''), img: lib?.asset_key ? { assetKey: lib.asset_key } : undefined });
    setNotice(lib?.asset_key ? 'Merchant request added with its approved picture.' : 'Merchant request added. Add a picture, then Save.');
  };

  if (!part && !error) return null;
  const field = { borderWidth: 1, borderColor: c.bd, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 9, marginTop: 4, marginBottom: 10, color: c.ink, backgroundColor: c.card, fontSize: 13 } as const;
  const nameInput = (label: string, value: string, onChange: (v: string) => void) => (
    <View>
      <Txt size={10} mut>{label}</Txt>
      <TextInput value={value} onChangeText={onChange} editable={canEdit && !saving} placeholder={label} placeholderTextColor={c.mut} style={field} />
    </View>
  );
  const url = item?.img?.assetKey ? imageUrls[item.img.assetKey] : '';
  const title = !part ? 'Build Your Own' : part.part === 'builder' ? 'Title' : part.part === 'group' ? 'Section' : 'Ingredient';

  return (
    <Section title={title}>
      {error ? <Txt size={10.5} color={c.or} style={{ marginBottom: 8 }}>{error}</Txt> : null}
      {notice ? <Txt size={10} mut style={{ marginBottom: 8 }}>{notice}</Txt> : null}
      {!canEdit && part ? <Txt size={9.5} color={c.or} style={{ marginBottom: 8 }}>View access only: editing and saving are disabled.</Txt> : null}
      {part?.part === 'builder' ? (
        <View>
          {nameInput('Title', String(selected?.config?.name ?? ''), (v) => patchBuilder({ name: v }))}
          <Txt size={10} mut>Build Your Own artwork background color</Txt>
          <View style={{ marginTop: 4, marginBottom: 10 }}>
            <PromoColorPicker value={String(selected?.config?.stageBgColor || '#2C4A5B')} onChange={(hex) => patchBuilder({ stageBgColor: hex })} disabled={!canEdit || saving} />
          </View>
        </View>
      ) : null}
      {part?.part === 'group' && group ? nameInput('Section name', String(group.name ?? ''), (v) => patchGroup(group.id, (g) => ({ ...g, name: v }))) : null}
      {part?.part === 'ingredient' && group && item ? (
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            {url ? <Image source={{ uri: url }} resizeMode="contain" style={{ width: 96, height: 64, borderRadius: 10, backgroundColor: item.bg || '#F4F4F5' }} />
              : <View style={{ width: 96, height: 64, borderRadius: 10, backgroundColor: item.bg || c.inset, alignItems: 'center', justifyContent: 'center' }}><Txt size={9.5} mut>{item.img?.assetKey ? 'Picture saved' : 'No picture'}</Txt></View>}
            <View style={{ flex: 1, minWidth: 150, gap: 6 }}>
              <OutlineBtn onPress={() => { void upload('photos'); }} disabled={!canEdit || !!busy}>{busy === 'photos' ? 'Uploading…' : 'Choose from Photos / Live Photos'}</OutlineBtn>
              <OutlineBtn onPress={() => { void upload('files'); }} disabled={!canEdit || !!busy}>{busy === 'files' ? 'Uploading…' : 'Choose from Files'}</OutlineBtn>
              {item.img?.assetKey ? <OutlineBtn onPress={() => patchItem(group.id, item.id, { img: undefined })} disabled={!canEdit || !!busy}>Remove picture</OutlineBtn> : null}
            </View>
          </View>
          {nameInput('Ingredient name', String(item.name ?? ''), (v) => patchItem(group.id, item.id, { name: v }))}
          
          {part.isNew && requestsHere.length ? (
            <View style={{ marginBottom: 10 }}>
              <Txt size={10} mut>Or use a request from this merchant</Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 5 }}>
                {requestsHere.map((request: any) => <OutlineBtn key={request.id} onPress={() => useRequest(request)} disabled={!canEdit || saving}>{request.name + ' · ' + request.status}</OutlineBtn>)}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
      {part ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <OutlineBtn primary onPress={save} disabled={!canEdit || saving || !!busy}>{saving ? 'Saving…' : 'Save'}</OutlineBtn>
          {part.part !== 'builder' ? <OutlineBtn onPress={() => { void remove(); }} disabled={!canEdit || saving || !!busy}>{part.part === 'group' ? 'Remove section' : 'Remove ingredient'}</OutlineBtn> : null}
          <OutlineBtn onPress={close} disabled={saving}>Close</OutlineBtn>
        </View>
      ) : <OutlineBtn onPress={close}>Close</OutlineBtn>}
    </Section>
  );
}
