import React, { useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { GoodiesApp } from '../../goodiesConsumer/GoodiesApp';
import { emit, IT, S, STB, useGoodies, setPreviewOnly, setEditLocked } from '../../goodiesConsumer/store';
import { BYO, fromTemplate } from '../../goodiesConsumer/builders/engine';
import { applyContent, clearContent, setDraftControlled } from '../../goodiesConsumer/content';
import { resolveForRender } from '../../goodiesConsumer/draft';
import { EditContext, type GoodiesSelection } from '../../goodiesConsumer/editContext';
import { PhoneFrame } from './PhoneFrame';

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
  { key: 'byo', label: 'Build your own' },
] as const;

/** Renders a resolved copy of the editor-owned draft and prevents consumer loading from overwriting it. */
export function GoodiesConsumerPreview({ editMode = false, contentDraft, assetUrls, selectedTarget, onSelectTarget }: {
  editMode?: boolean;
  contentDraft: any | null;
  assetUrls: Record<string, string>;
  selectedTarget: GoodiesSelection | null;
  onSelectTarget: (target: GoodiesSelection) => void;
}) {
  // Establish the safety boundaries before child screens can mount their effects.
  setPreviewOnly(true);
  setDraftControlled(true);
  useGoodies();

  // A local-only sample store keeps the real customer Build Your Own screen
  // available in Admin even when no live business has published a builder.
  const previewBuilders = useMemo(() => [fromTemplate('pizza'), fromTemplate('burger')], []);
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

  const navigate = useCallback((route: string) => {
    const itemId = Object.keys(IT)[0] || '';
    const liveStoreId = Object.keys(STB).find((id) => (BYO.cfg[id] || []).some((b: any) => b.enabled && b.available));
    const liveBuilder = liveStoreId ? (BYO.cfg[liveStoreId] || []).find((b: any) => b.enabled && b.available) : null;
    const storeId = Object.keys(STB)[0] || 's12';
    let builderParam = '';
    if (liveStoreId && liveBuilder) {
      builderParam = liveStoreId + '|' + liveBuilder.id;
    } else {
      // This is deliberately an in-memory preview fixture, not a store config.
      // It never asks the admin to create or enable a real business builder.
      const previewStoreId = '__admin_goodies_builder_preview__';
      STB[previewStoreId] = { id: previewStoreId, n: 'Build Your Own preview', open: true } as any;
      BYO.store[previewStoreId] = true;
      BYO.cfg[previewStoreId] = previewBuilders;
      builderParam = previewStoreId + '|' + previewBuilders[0].id;
    }
    const param = route === 'store' ? storeId : route === 'byo' ? builderParam : route === 'product' ? itemId : undefined;
    const now = Date.now();
    S.stack = route === 'home'
      ? [{ r: 'home', u: now }]
      : [{ r: 'home', u: now - 1 }, { r: route, p: param, u: now }];
    emit();
  }, []);

  const editValue = useMemo(() => (editMode ? { selected: selectedTarget, select: onSelectTarget } : null), [editMode, selectedTarget, onSelectTarget]);

  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: 390, marginBottom: 10, paddingHorizontal: 4 }}>
        <Text style={{ color: ink, fontSize: 12, fontWeight: '800' }}>{editMode ? 'Edit actual Goodies consumer screen' : 'Actual Goodies consumer screens'}</Text>
        <Text style={{ color: muted, fontSize: 10, lineHeight: 15, marginTop: 3 }}>
          {editMode ? 'Use the screen tabs to open a page, then tap editable text in the phone to select its matching field.' : 'Rendered from the consumer app source using the current draft. Placing orders is disabled in this preview.'}
        </Text>
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
        </ScrollView>
      </View>
      <PhoneFrame background="#FFFFFF">
        <EditContext.Provider value={editValue}>
          <GoodiesApp embedded previewMode />
        </EditContext.Provider>
      </PhoneFrame>
    </View>
  );
}
