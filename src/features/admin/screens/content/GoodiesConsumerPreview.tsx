import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { GoodiesApp } from '../../goodiesConsumer/GoodiesApp';
import { emit, IT, S, STB, useGoodies, setPreviewOnly, setEditLocked } from '../../goodiesConsumer/store';
import { BYO, bClean, fromTemplate, setBD } from '../../goodiesConsumer/builders/engine';
import { applyContent, clearContent, setDraftControlled } from '../../goodiesConsumer/content';
import { resolveForRender } from '../../goodiesConsumer/draft';
import { EditContext, type BuilderTarget, type GoodiesSelection } from '../../goodiesConsumer/editContext';
import { PhoneFrame } from './PhoneFrame';
import { LANGS } from '../../goodiesConsumer/i18n';

const orange = '#FD802E';
const ink = '#1B1B1F';
const muted = '#74747C';
const screens = [
  { key: 'home', label: 'Home' },
  { key: 'cats', label: 'Categories' },
  { key: 'orders', label: 'Orders' },
  { key: 'settings', label: 'Account' },
  { key: 'cart', label: 'Cart' },
  { key: 'store', label: 'Store' },
  { key: 'product', label: 'Product' },
  { key: 'checkout', label: 'Checkout' },
  { key: 'search', label: 'Search' },
  { key: 'explore', label: 'Explore' },
  { key: 'promos', label: 'Promotions' },
  { key: 'flashdeals', label: 'Flash deals' },
  { key: 'favs', label: 'Favorites' },
  { key: 'confirm', label: 'Confirmation' },
  { key: 'track', label: 'Tracking' },
  { key: 'notifs', label: 'Notifications' },
  { key: 'profile', label: 'Profile' },
  { key: 'addresses', label: 'Addresses' },
  { key: 'payments', label: 'Payments' },
  { key: 'help', label: 'Help' },
  { key: 'contact', label: 'Contact' },
  { key: 'policies', label: 'Policies' },
] as const;

/** Renders a resolved copy of the editor-owned draft and prevents consumer loading from overwriting it. */
export function GoodiesConsumerPreview({ editMode = false, contentDraft, assetUrls, selectedTarget, onSelectTarget, savedBuilders, builderTarget, onPickBuilder }: {
  editMode?: boolean;
  contentDraft: any | null;
  assetUrls: Record<string, string>;
  selectedTarget: GoodiesSelection | null;
  onSelectTarget: (target: GoodiesSelection) => void;
  /** Saved builder configs from the server. When present they replace the built-in samples. */
  savedBuilders?: any[];
  builderTarget?: BuilderTarget | null;
  onPickBuilder?: (target: BuilderTarget) => void;
}) {
  // Establish the safety boundaries before child screens can mount their effects.
  setPreviewOnly(true);
  setDraftControlled(true);
  useGoodies();

  // A local-only sample store keeps the real customer Build Your Own screen
  // available in Admin even when no live business has published a builder.
  const sampleBuilders = useMemo(() => [fromTemplate('pizza'), fromTemplate('burger')], []);
  const previewBuilders = useMemo(() => {
    const saved = (savedBuilders || []).map((config) => bClean(config)).filter(Boolean) as any[];
    return saved.length ? saved : sampleBuilders;
  }, [savedBuilders, sampleBuilders]);
  const [builderMenuOpen, setBuilderMenuOpen] = useState(false);
  const [selectedBuilderId, setSelectedBuilderId] = useState('');
  const [zoom, setZoom] = useState(1);
  const selectedBuilder = previewBuilders.find((builder: any) => builder.id === selectedBuilderId) || previewBuilders[0];
  // Keep the preview store in step with edits and drop the old in-progress order so removed items cannot linger.
  useEffect(() => {
    const previewStoreId = '__admin_goodies_builder_preview__';
    if (!BYO.cfg[previewStoreId]) return;
    BYO.cfg[previewStoreId] = previewBuilders;
    setBD(null);
    emit();
  }, [previewBuilders]);
  const resolved = useMemo(() => {
    if (!contentDraft) return null;
    try { return resolveForRender(contentDraft, assetUrls); } catch { return null; }
  }, [contentDraft, assetUrls]);

  // Runs before the children's effects on first mount, and on every draft change.
  useLayoutEffect(() => {
    try {
      if (resolved) applyContent(resolved); else void clearContent();
    } catch { void clearContent(); }
    emit();
  }, [resolved]);

  useEffect(() => {
    setEditLocked(editMode);
    if (editMode) { S.stack = [{ r: 'home', u: Date.now() }]; emit(); }
    return () => setEditLocked(false);
  }, [editMode]);

  useEffect(() => () => { setDraftControlled(false); void clearContent(); }, []);

  const navigate = useCallback((route: string, builderId?: string) => {
    const itemId = Object.keys(IT)[0] || '';
    const storeId = Object.keys(STB).find((id) => !id.startsWith('__admin_goodies_')) || 's12';
    // A preview-only store lets the admin open each actual customer builder even
    // when no live store has published one. Nothing from this fixture is saved.
    const previewStoreId = '__admin_goodies_builder_preview__';
    STB[previewStoreId] = { id: previewStoreId, n: 'Build Your Own preview', open: true } as any;
    BYO.store[previewStoreId] = true;
    BYO.cfg[previewStoreId] = previewBuilders;
    const chosen = previewBuilders.find((builder: any) => builder.id === (builderId || selectedBuilder?.id)) || previewBuilders[0];
    const param = route === 'store' ? storeId : route === 'byo' ? previewStoreId + '|' + chosen.id : route === 'product' ? itemId : undefined;
    if (route === 'checkout') {
      // A local-only fixture gives the checkout editor a complete journey without
      // loading a real customer's cart, wallet, address or payment methods.
      const checkoutStoreId = '__admin_goodies_checkout_preview__';
      const checkoutItemId = '__admin_goodies_checkout_item__';
      STB[checkoutStoreId] = {
        id: checkoutStoreId, n: 'Demo Goodies shop', c: 'groceries', e: '🛍️', bg: 'bg0',
        r: 0, rv: 0, km: 0, km0: 0, eta: '20–30', eta0: '20–30', fee: 0, min: 0,
        pr: '', k: 'Demo store', it: [], open: 1, h: 'Open for demo', nx: 'Demo preview',
        far: false, live: false, acceptScheduledOrders: true,
      } as any;
      IT[checkoutItemId] = {
        id: checkoutItemId, s: checkoutStoreId, n: 'Demo checkout item', p: 5.99,
        e: '🥭', stock: 1, oos: 0, d: 'Preview-only item', al: '', w: false, restriction: 'none',
      } as any;
      S.cart = { sid: checkoutStoreId, lines: [{ k: checkoutItemId, id: checkoutItemId, n: 'Demo checkout item', e: '🥭', p: 5.99, q: 1, d: 'Preview item' }] };
      S.addr = [{ id: 1, l: 'Demo delivery address', t: '123 Demo Street', apt: '', inst: '', def: 1, z: 0, cc: 'US' }];
      S.as = 1;
      S.pf = { ...S.pf, n: 'Demo customer', ph: '2025550100' };
      S.cc = 'w'; S.mode = 'delivery'; S.pay = 'cash'; S.cs = 0; S.sch = 0; S.tip = 0; S.note = '';
      S.hasWallet = true; S.wallet = 25;
      S.cards = [{ id: 'preview-demo-card', b: 'Demo card', l4: '4242', expiryMonth: 12, expiryYear: 2030, isDefault: true }];
      S.selectedCardId = 'preview-demo-card';
    }
    const now = Date.now();
    S.stack = route === 'home'
      ? [{ r: 'home', u: now }]
      : [{ r: 'home', u: now - 1 }, { r: route, p: param, u: now }];
    emit();
  }, [previewBuilders, selectedBuilder]);

  const editValue = useMemo(() => (editMode ? { selected: selectedTarget, select: onSelectTarget, pick: onPickBuilder, picked: builderTarget || null } : null), [editMode, selectedTarget, onSelectTarget, onPickBuilder, builderTarget]);

  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: 390, marginBottom: 10, paddingHorizontal: 4 }}>
        <Text style={{ color: ink, fontSize: 12, fontWeight: '800' }}>{editMode ? 'Edit Goodies content preview' : 'Goodies content preview'}</Text>
        <Text style={{ color: muted, fontSize: 10, lineHeight: 15, marginTop: 3 }}>
          {editMode ? 'Use the screen tabs to open a page, then tap editable text in the phone to select its matching field.' : 'Rendered using the current draft and isolated sample data. Placing orders is disabled in this preview.'}
        </Text>
        <Text style={{ color: muted, fontSize: 10, marginTop: 6 }}>Draft preview · Sample data only · Unreviewed translations may appear here; customers receive reviewed translations or English.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 8 }}>
          {LANGS.map(locale => <Pressable key={locale.code} accessibilityRole="button" accessibilityLabel={'Preview in ' + locale.label} accessibilityState={{selected: S.lang === locale.code}} onPress={() => {S.lang = locale.code; emit();}} style={{padding: 7, borderRadius: 12, backgroundColor: S.lang === locale.code ? orange : '#F1F1F2'}}><Text style={{fontSize: 10, color: S.lang === locale.code ? '#FFFFFF' : ink}}>{locale.label}</Text></Pressable>)}
          {[0.75, 1, 1.25].map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={'Preview zoom ' + Math.round(value * 100) + '%'} accessibilityState={{selected: zoom === value}} onPress={() => setZoom(value)} style={{padding: 7, borderRadius: 12, backgroundColor: zoom === value ? orange : '#F1F1F2'}}><Text style={{fontSize: 10, color: zoom === value ? '#FFFFFF' : ink}}>{Math.round(value * 100)}%</Text></Pressable>)}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 10 }}>
          {screens.map((screen) => {
            const active = S.stack?.[S.stack.length - 1]?.r === screen.key;
            return (
              <Pressable key={screen.key} onPress={() => navigate(screen.key)} accessibilityRole="button" accessibilityState={{ selected: active }}
                style={{ borderRadius: 18, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: active ? orange : '#F1F1F2', borderWidth: active ? 0 : 1, borderColor: '#E5E5E7' }}>
                <Text style={{ fontSize: 10, fontWeight: active ? '800' : '600', color: active ? '#FFFFFF' : ink }}>{screen.label}</Text>
              </Pressable>
            );
          })}
          <Pressable onPress={() => setBuilderMenuOpen((open) => !open)} accessibilityRole="button" accessibilityState={{ expanded: builderMenuOpen, selected: S.stack?.[S.stack.length - 1]?.r === 'byo' }}
            style={{ borderRadius: 18, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: S.stack?.[S.stack.length - 1]?.r === 'byo' ? orange : '#F1F1F2', borderWidth: S.stack?.[S.stack.length - 1]?.r === 'byo' ? 0 : 1, borderColor: '#E5E5E7', flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: S.stack?.[S.stack.length - 1]?.r === 'byo' ? '#FFFFFF' : ink }}>Build Your Own ▾</Text>
          </Pressable>
        </ScrollView>
        {builderMenuOpen ? (
          <View style={{ borderWidth: 1, borderColor: '#E5E5E7', borderRadius: 12, padding: 8, marginBottom: 8, backgroundColor: '#FFFFFF' }}>
            <Text style={{ color: muted, fontSize: 10, marginBottom: 6 }}>Choose the customer page to preview and edit</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {previewBuilders.map((builder: any) => {
                const active = selectedBuilder?.id === builder.id;
                return <Pressable key={builder.id} onPress={() => { setSelectedBuilderId(builder.id); setBuilderMenuOpen(false); navigate('byo', builder.id); }} accessibilityRole="button" accessibilityState={{ selected: active }}
                  style={{ borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: active ? orange : '#E5E5E7', backgroundColor: active ? '#FFF1E8' : '#F8F8F9' }}>
                  <Text style={{ color: ink, fontSize: 11, fontWeight: active ? '800' : '600' }}>{builder.emoji || '🍽️'}  {builder.name || builder.type}</Text>
                  <Text style={{ color: muted, fontSize: 9, marginTop: 2 }}>{builder.type === 'pizza' ? 'Pizza builder' : builder.type === 'burger' ? 'Burger builder' : 'Custom builder'}</Text>
                </Pressable>;
              })}
            </View>
          </View>
        ) : null}
      </View>
      <ScrollView horizontal contentContainerStyle={{flexGrow: 1, justifyContent: 'center'}}>
      <PhoneFrame background="#FFFFFF" zoom={zoom}>
        <EditContext.Provider value={editValue}>
          <GoodiesApp embedded previewMode />
        </EditContext.Provider>
      </PhoneFrame>
      </ScrollView>
    </View>
  );
}
