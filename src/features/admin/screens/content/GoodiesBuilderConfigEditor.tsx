import { useCallback, useEffect, useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../theme/ThemeContext';
import { Section } from '../../ui/Card';
import { OutlineBtn } from '../../ui/Controls';
import { Txt } from '../../ui/Txt';
import { TEMPLATES } from '../../goodiesConsumer/builders/templates';

type BusinessRow = { business_id: string; business_name: string; goodies_store_id: string | null; is_live: boolean };

type BuilderRow = {
  business_id: string;
  business_name: string;
  builder_id: string;
  config: any;
  enabled: boolean;
  updated_at: string;
};

export function GoodiesBuilderConfigEditor({ canEdit }: { canEdit: boolean }) {
  const { c } = useTheme();
  const [rows, setRows] = useState<BuilderRow[]>([]);
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [selected, setSelected] = useState<BuilderRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [artworkItems, setArtworkItems] = useState<any[]>([]);
  const [artworkSearch, setArtworkSearch] = useState('');
  const [artworkError, setArtworkError] = useState('');
  const [libraryOpenGroup, setLibraryOpenGroup] = useState<number | null>(null);
  const [librarySearch, setLibrarySearch] = useState('');
  const [requestedIngredient, setRequestedIngredient] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(''); setNotice('');
    try {
      const [builderResult, businessResult] = await Promise.all([
        supabase.rpc('wantiss_admin_list_goodies_builder_configs'),
        supabase.rpc('wantiss_admin_list_goodies_builder_businesses'),
      ]);
      if (builderResult.error) throw builderResult.error;
      if (businessResult.error) throw businessResult.error;
      const next = (Array.isArray(builderResult.data) ? builderResult.data : []) as BuilderRow[];
      setRows(next);
      setBusinesses((Array.isArray(businessResult.data) ? businessResult.data : []) as BusinessRow[]);
      setSelected((current) => current ? next.find((r) => r.business_id === current.business_id && r.builder_id === current.builder_id) || current : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Builder configurations could not be loaded.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase.from('wantiss_cms_content')
          .select('payload,version,content_key')
          .in('content_key', ['goodies.content', 'goodies'])
          .eq('locale', 'en').eq('status', 'published')
          .order('version', { ascending: false }).limit(20);
        if (error) throw error;
        const row = (data || []).find((x: any) => Array.isArray(x.payload?.lib));
        const items = (row?.payload?.lib || []).filter((x: any) => x && x.id && x.st !== 'off')
          .map((x: any) => ({ id: String(x.id), name: String(x.name?.en?.v || x.name || x.id), status: x.st || 'on' }));
        if (active) { setArtworkItems(items); setArtworkError(''); }
      } catch (e) {
        if (active) setArtworkError(e instanceof Error ? e.message : 'Published artwork library could not be loaded.');
      }
    })();
    return () => { active = false; };
  }, []);

  const createFromTemplate = (business: BusinessRow, type: 'burger' | 'pizza' | 'custom') => {
    const template: any = TEMPLATES[type];
    const stamp = Date.now().toString(36);
    const id = 'admin-' + type + '-' + stamp;
    const config = {
      id, type: template.type || type, name: template.name || ('New ' + type), desc: template.desc || '', emoji: template.emoji || '✨',
      base: template.base ?? 0, enabled: false, available: false, notes: true,
      sizes: (Array.isArray(template.sizes) ? template.sizes : []).map((size: any, i: number) => ({
        id: 'size-' + stamp + '-' + i, name: String(size.name || 'Size ' + (i + 1)), add: size.add ?? 0, avail: true,
      })),
      groups: (Array.isArray(template.groups) ? template.groups : []).map((group: any, gi: number) => ({
        id: 'group-' + stamp + '-' + gi, name: String(group.name || 'Ingredients'), kind: group.kind === 'one' ? 'one' : 'many',
        req: !!group.req, min: Math.max(0, Number(group.min) || 0), max: Math.max(1, Number(group.max) || 1),
        inc: Math.max(0, Number(group.inc) || 0), me: Math.max(1, Number(group.me) || 1),
        items: (Array.isArray(group.items) ? group.items : []).map((item: any, ii: number) => ({
          id: 'ingredient-' + stamp + '-' + gi + '-' + ii, name: String(item.name || ''), price: Math.max(0, Number(item.price) || 0),
          free: !!item.free, avail: true, assetId: item.assetId || null, col: item.col || '#D9A441', ...(item.max ? { max: Math.max(1, Number(item.max) || 1) } : {}),
        })),
      })),
    };
    setSelected({ business_id: business.business_id, business_name: business.business_name, builder_id: id, config, enabled: false, updated_at: new Date().toISOString() });
    setError(''); setNotice('New builder draft created. Review its settings before saving.');
  };

  const patch = (p: Partial<BuilderRow>) => setSelected((current) => current ? { ...current, ...p } : current);
  const ingredientLibrary = useMemo(() => {
    const type = selected?.config?.type === 'burger' || selected?.config?.type === 'pizza' ? selected.config.type : 'custom';
    const template: any = TEMPLATES[type];
    return (template?.groups || []).map((group: any) => ({
      name: String(group.name || 'Ingredients'),
      items: (group.items || []).map((item: any) => ({ ...item, groupName: String(group.name || 'Ingredients') })),
    }));
  }, [selected?.config?.type]);
  const addLibraryIngredient = (gi: number, source: any) => {
    if (!selected || !canEdit || saving) return;
    const newItem = { id: 'ingredient-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6), name: String(source.name || ''), price: Math.max(0, Number(source.price) || 0), free: !!source.free, avail: true, assetId: source.assetId || null, col: source.col || '#D9A441' };
    patchConfig({ groups: (selected.config?.groups || []).map((x: any, j: number) => j === gi ? { ...x, items: [...(x.items || []), newItem] } : x) });
    setNotice('Ingredient added to this group. Save the builder to keep the change.');
  };
  const addRequestedIngredient = (gi: number) => {
    const name = requestedIngredient.trim();
    if (!name || !selected || !canEdit || saving) return;
    const newItem = { id: 'requested-' + Date.now().toString(36), name, price: 0, free: true, avail: true, assetId: null, col: '#D9A441', requestNote: 'Added from a restaurant ingredient request' };
    patchConfig({ groups: (selected.config?.groups || []).map((x: any, j: number) => j === gi ? { ...x, items: [...(x.items || []), newItem] } : x) });
    setRequestedIngredient('');
    setNotice('Requested ingredient added as a draft. Review its price and availability, then save the builder.');
  };
  const patchConfig = (p: Record<string, any>) => setSelected((current) => current ? { ...current, config: { ...current.config, ...p } } : current);
  const fieldStyle = { borderWidth: 1, borderColor: c.bd, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 7, marginTop: 4, marginBottom: 7, color: c.ink, backgroundColor: c.card, fontSize: 11 } as const;
  const input = (label: string, value: any, onChangeText: (v: string) => void, keyboardType?: 'default' | 'decimal-pad' | 'number-pad', multiline = false) => (
    <View style={{ flex: 1, minWidth: 110 }}>
      <Txt size={9.5} mut>{label}</Txt>
      <TextInput value={String(value ?? '')} onChangeText={onChangeText} keyboardType={keyboardType || 'default'} multiline={multiline} style={[fieldStyle, multiline ? { minHeight: 58, textAlignVertical: 'top' as const } : null]} />
    </View>
  );
  const save = async () => {
    if (!selected || !canEdit || saving) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const config = selected.config || {};
      config.id = selected.builder_id;
      const { error: rpcError } = await supabase.rpc('wantiss_admin_save_goodies_builder_config', {
        p_business_id: selected.business_id,
        p_builder_id: selected.builder_id,
        p_config: config,
        p_enabled: !!selected.enabled,
      });
      if (rpcError) throw rpcError;
      setNotice('Builder and ingredient configuration saved.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Builder configuration could not be saved.');
    } finally { setSaving(false); }
  };
  const toggle = (label: string, value: boolean, change: (v: boolean) => void) => (
    <OutlineBtn primary={value} onPress={() => change(!value)} disabled={!canEdit || saving}>{label}: {value ? 'Yes' : 'No'}</OutlineBtn>
  );

  return (
    <Section title="Build Your Own">
      {error ? <Txt size={10.5} color={c.or} style={{ marginBottom: 7 }}>{error}</Txt> : null}
      {notice ? <Txt size={10} mut style={{ marginBottom: 7 }}>{notice}</Txt> : null}
      {businesses.length ? <Txt size={10.5} weight={600} style={{ marginTop: 3, marginBottom: 5 }}>Create a builder</Txt> : null}
      {businesses.map((business) => (
        <View key={business.business_id} style={{ borderWidth: 1, borderColor: c.bd, borderRadius: 10, padding: 8, marginBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Txt size={10.5} weight={500}>{business.business_name}</Txt>
            <Txt size={9} mut>{business.goodies_store_id ? 'Goodies store ID: ' + business.goodies_store_id : 'No Goodies store mapping yet'} · {business.is_live ? 'Live' : 'Not live'}</Txt>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
            <OutlineBtn disabled={!canEdit || saving} onPress={() => createFromTemplate(business, 'burger')}>Add burger</OutlineBtn>
            <OutlineBtn disabled={!canEdit || saving} onPress={() => createFromTemplate(business, 'pizza')}>Add pizza</OutlineBtn>
            <OutlineBtn disabled={!canEdit || saving} onPress={() => createFromTemplate(business, 'custom')}>Add custom</OutlineBtn>
          </View>
        </View>
      ))}
      {rows.length ? <Txt size={10.5} weight={600} style={{ marginTop: 10, marginBottom: 5 }}>Saved builders</Txt> : null}
      {rows.map((row) => (
        <View key={row.business_id + ':' + row.builder_id} style={{ borderWidth: 1, borderColor: c.bd, borderRadius: 10, padding: 9, marginBottom: 7 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Txt size={11} weight={600}>{row.config?.name || row.builder_id}</Txt>
              <Txt size={9.5} mut>{row.business_name} · {row.config?.type || 'custom'} · {(row.config?.groups || []).length} groups · {(row.config?.groups || []).reduce((n: number, g: any) => n + (g.items || []).length, 0)} ingredients</Txt>
              <Txt size={9} mut>{row.enabled ? 'Available to customers' : 'Not currently published'}</Txt>
            </View>
            <OutlineBtn primary={selected?.business_id === row.business_id && selected?.builder_id === row.builder_id} onPress={() => { setSelected(JSON.parse(JSON.stringify(row))); setError(''); setNotice(''); }}>Edit configuration</OutlineBtn>
          </View>
        </View>
      ))}
      {selected ? (
        <View style={{ borderWidth: 1, borderColor: c.bd, borderRadius: 12, padding: 10, marginTop: 4 }}>
          <Txt size={12} weight={600}>{selected.business_name} · Build Your Own</Txt>
          <Txt size={9.5} mut style={{ marginTop: 2 }}>Builder ID: {selected.builder_id}</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {input('Builder name', selected.config?.name, (v) => patchConfig({ name: v }))}
            {input('Type', selected.config?.type, (v) => patchConfig({ type: v }))}
            {input('Emoji', selected.config?.emoji, (v) => patchConfig({ emoji: v }))}
            {input('Base price', selected.config?.base, (v) => patchConfig({ base: v }), 'decimal-pad')}
          </View>
          {input('Description', selected.config?.desc, (v) => patchConfig({ desc: v }), 'default', true)}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {toggle('Config enabled', !!selected.config?.enabled, (v) => patchConfig({ enabled: v }))}
            {toggle('Available now', !!selected.config?.available, (v) => patchConfig({ available: v }))}
            {toggle('Special instructions', !!selected.config?.notes, (v) => patchConfig({ notes: v }))}
            {toggle('Published to customers', !!selected.enabled, (v) => patch({ enabled: v }))}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 5 }}>
            <Txt size={11} weight={600}>Sizes</Txt>
            <OutlineBtn disabled={!canEdit || saving} onPress={() => patchConfig({ sizes: [...(selected.config?.sizes || []), { id: 'size-' + Date.now().toString(36), name: '', add: '0', avail: true }] })}>Add size</OutlineBtn>
          </View>
          {(selected.config?.sizes || []).map((size: any, i: number) => (
            <View key={size.id || i} style={{ borderTopWidth: 1, borderColor: c.bd, paddingTop: 7, marginTop: 3 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {input('Size name', size.name, (v) => patchConfig({ sizes: selected.config.sizes.map((x: any, j: number) => j === i ? { ...x, name: v } : x) }))}
                {input('Extra price', size.add, (v) => patchConfig({ sizes: selected.config.sizes.map((x: any, j: number) => j === i ? { ...x, add: v } : x) }), 'decimal-pad')}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {toggle('Size available', size.avail !== false, (v) => patchConfig({ sizes: selected.config.sizes.map((x: any, j: number) => j === i ? { ...x, avail: v } : x) }))}
                <OutlineBtn disabled={!canEdit || saving} onPress={() => patchConfig({ sizes: selected.config.sizes.filter((_: any, j: number) => j !== i) })}>Remove size</OutlineBtn>
              </View>
            </View>
          ))}

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 5 }}>
            <Txt size={11} weight={600}>Ingredient groups</Txt>
            <OutlineBtn disabled={!canEdit || saving} onPress={() => patchConfig({ groups: [...(selected.config?.groups || []), { id: 'group-' + Date.now().toString(36), name: '', kind: 'many', req: false, min: 0, max: 1, inc: 0, me: 1, items: [] }] })}>Add group</OutlineBtn>
          </View>
          {(selected.config?.groups || []).map((group: any, gi: number) => (
            <View key={group.id || gi} style={{ borderWidth: 1, borderColor: c.bd, borderRadius: 9, padding: 8, marginTop: 7 }}>
              {input('Group name', group.name, (v) => patchConfig({ groups: selected.config.groups.map((x: any, j: number) => j === gi ? { ...x, name: v } : x) }))}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                {toggle('Required', !!group.req, (v) => patchConfig({ groups: selected.config.groups.map((x: any, j: number) => j === gi ? { ...x, req: v, min: v ? Math.max(1, Number(x.min) || 0) : x.min } : x) }))}
                {toggle('Pick one', group.kind === 'one', (v) => patchConfig({ groups: selected.config.groups.map((x: any, j: number) => j === gi ? { ...x, kind: v ? 'one' : 'many', max: v ? 1 : Math.max(1, Number(x.max) || 1) } : x) }))}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {input('Minimum picks', group.min, (v) => patchConfig({ groups: selected.config.groups.map((x: any, j: number) => j === gi ? { ...x, min: Math.max(0, Number(v) || 0) } : x) }), 'number-pad')}
                {input('Maximum picks', group.max, (v) => patchConfig({ groups: selected.config.groups.map((x: any, j: number) => j === gi ? { ...x, max: Math.max(1, Number(v) || 1) } : x) }), 'number-pad')}
                {input('Included free', group.inc, (v) => patchConfig({ groups: selected.config.groups.map((x: any, j: number) => j === gi ? { ...x, inc: Math.max(0, Number(v) || 0) } : x) }), 'number-pad')}
                {input('Max same ingredient', group.me, (v) => patchConfig({ groups: selected.config.groups.map((x: any, j: number) => j === gi ? { ...x, me: Math.max(1, Number(v) || 1) } : x) }), 'number-pad')}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 4 }}>
                <Txt size={10.5} weight={600}>Ingredients ({(group.items || []).length})</Txt>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                  <OutlineBtn disabled={!canEdit || saving} onPress={() => patchConfig({ groups: selected.config.groups.map((x: any, j: number) => j === gi ? { ...x, items: [...(x.items || []), { id: 'item-' + Date.now().toString(36), name: '', price: 0, free: true, avail: true, assetId: null, col: '#D9A441' }] } : x) })}>Add manually</OutlineBtn>
                  <OutlineBtn primary={libraryOpenGroup === gi} disabled={!canEdit || saving} onPress={() => { setLibraryOpenGroup(libraryOpenGroup === gi ? null : gi); setLibrarySearch(''); }}>Add from ingredient list</OutlineBtn>
                </View>
              </View>
              {libraryOpenGroup === gi ? (
                <View style={{ borderWidth: 1, borderColor: c.bd, borderRadius: 9, padding: 8, marginBottom: 8, backgroundColor: c.card }}>
                  <Txt size={10.5} weight={600}>Ingredient library · {group.name || 'this section'}</Txt>
                  <Txt size={9.5} mut style={{ marginTop: 2, marginBottom: 5 }}>Choose an ingredient from the {selected.config?.type === 'burger' ? 'burger' : selected.config?.type === 'pizza' ? 'pizza' : 'starter'} list. You can edit its name and price after adding it.</Txt>
                  <TextInput value={librarySearch} onChangeText={setLibrarySearch} placeholder="Search ingredients…" placeholderTextColor={c.mut} style={fieldStyle} />
                  {ingredientLibrary.flatMap((sourceGroup: any) => sourceGroup.items.filter((ingredient: any) => !librarySearch.trim() || (ingredient.name + ' ' + sourceGroup.name).toLowerCase().includes(librarySearch.trim().toLowerCase())).map((ingredient: any) => ({ ...ingredient, sourceGroup: sourceGroup.name }))).map((ingredient: any, index: number) => (
                    <OutlineBtn key={ingredient.sourceGroup + ':' + ingredient.name + ':' + index} disabled={!canEdit || saving} onPress={() => addLibraryIngredient(gi, ingredient)}>
                      {ingredient.name + ' · ' + ingredient.sourceGroup + (ingredient.free ? ' · included' : ' · +' + Number(ingredient.price || 0).toFixed(2))}
                    </OutlineBtn>
                  ))}
                  {!ingredientLibrary.some((sourceGroup: any) => sourceGroup.items.some((ingredient: any) => !librarySearch.trim() || (ingredient.name + ' ' + sourceGroup.name).toLowerCase().includes(librarySearch.trim().toLowerCase()))) ? <Txt size={9.5} mut>No matching ingredients in this list.</Txt> : null}
                  <Txt size={10.5} weight={600} style={{ marginTop: 10 }}>Add an ingredient from a restaurant request</Txt>
                  <TextInput value={requestedIngredient} onChangeText={setRequestedIngredient} placeholder="Type the requested ingredient name…" placeholderTextColor={c.mut} style={fieldStyle} />
                  <OutlineBtn disabled={!canEdit || saving || !requestedIngredient.trim()} onPress={() => addRequestedIngredient(gi)}>Add requested ingredient</OutlineBtn>
                  <OutlineBtn onPress={() => setLibraryOpenGroup(null)} disabled={saving}>Close ingredient list</OutlineBtn>
                </View>
              ) : null}
              {(group.items || []).map((item: any, ii: number) => (
                <View key={item.id || ii} style={{ borderTopWidth: 1, borderColor: c.bd, paddingTop: 7, marginTop: 3 }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {input('Ingredient name', item.name, (v) => patchConfig({ groups: selected.config.groups.map((x: any, j: number) => j === gi ? { ...x, items: x.items.map((it: any, k: number) => k === ii ? { ...it, name: v } : it) } : x) }))}
                    {input('Price', item.price, (v) => patchConfig({ groups: selected.config.groups.map((x: any, j: number) => j === gi ? { ...x, items: x.items.map((it: any, k: number) => k === ii ? { ...it, price: Math.max(0, Number(v) || 0) } : it) } : x) }), 'decimal-pad')}
                    {input('Max per customer', item.max ?? '', (v) => patchConfig({ groups: selected.config.groups.map((x: any, j: number) => j === gi ? { ...x, items: x.items.map((it: any, k: number) => k === ii ? { ...it, max: v.trim() ? Math.max(1, Number(v) || 1) : undefined } : it) } : x) }), 'number-pad')}
                    <View style={{ flexBasis: '100%', minWidth: 220 }}>
                      <Txt size={9.5} mut>Artwork selection · current: {item.assetId || 'No artwork selected'}</Txt>
                      <TextInput value={artworkSearch} onChangeText={setArtworkSearch} placeholder="Search published ingredient artwork…" placeholderTextColor={c.mut} style={fieldStyle} />
                      {artworkError ? <Txt size={9} color={c.or}>{artworkError}</Txt> : null}
                      {!artworkItems.length && !artworkError ? <Txt size={9} mut>Load published Goodies content to select artwork.</Txt> : null}
                      {artworkItems.filter((asset) => !artworkSearch.trim() || (asset.id + ' ' + asset.name).toLowerCase().includes(artworkSearch.trim().toLowerCase())).map((asset) => (
                        <OutlineBtn key={asset.id} primary={item.assetId === asset.id} disabled={!canEdit || saving} onPress={() => patchConfig({ groups: selected.config.groups.map((x: any, j: number) => j === gi ? { ...x, items: x.items.map((it: any, k: number) => k === ii ? { ...it, assetId: asset.id } : it) } : x) })}>
                          {(item.assetId === asset.id ? 'Selected · ' : '') + asset.name + ' (' + asset.id + ')'}
                        </OutlineBtn>
                      ))}
                      {item.assetId ? <OutlineBtn disabled={!canEdit || saving} onPress={() => patchConfig({ groups: selected.config.groups.map((x: any, j: number) => j === gi ? { ...x, items: x.items.map((it: any, k: number) => k === ii ? { ...it, assetId: null } : it) } : x) })}>Clear artwork</OutlineBtn> : null}
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {toggle('Free', !!item.free, (v) => patchConfig({ groups: selected.config.groups.map((x: any, j: number) => j === gi ? { ...x, items: x.items.map((it: any, k: number) => k === ii ? { ...it, free: v, price: v ? 0 : it.price } : it) } : x) }))}
                    {toggle('Available', item.avail !== false, (v) => patchConfig({ groups: selected.config.groups.map((x: any, j: number) => j === gi ? { ...x, items: x.items.map((it: any, k: number) => k === ii ? { ...it, avail: v } : it) } : x) }))}
                    <OutlineBtn disabled={!canEdit || saving} onPress={() => patchConfig({ groups: selected.config.groups.map((x: any, j: number) => j === gi ? { ...x, items: x.items.filter((_: any, k: number) => k !== ii) } : x) })}>Remove ingredient</OutlineBtn>
                  </View>
                </View>
              ))}
              <View style={{ marginTop: 8 }}>
                <OutlineBtn disabled={!canEdit || saving} onPress={() => patchConfig({ groups: selected.config.groups.filter((_: any, j: number) => j !== gi) })}>Remove group</OutlineBtn>
              </View>
            </View>
          ))}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
            <OutlineBtn primary onPress={() => { void save(); }} disabled={!canEdit || saving}>{saving ? 'Saving…' : 'Save builder configuration'}</OutlineBtn>
            <OutlineBtn onPress={() => setSelected(null)} disabled={saving}>Close editor</OutlineBtn>
          </View>
        </View>
      ) : null}
      {!canEdit ? <Txt size={9.5} mut>View-only access. Editing requires operations edit permission.</Txt> : null}
    </Section>
  );
}
