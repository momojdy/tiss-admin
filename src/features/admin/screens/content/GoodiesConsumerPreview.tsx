import React, { useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { GoodiesApp } from '../../goodiesConsumer/GoodiesApp';
import { emit, IT, S, STB, useGoodies, setPreviewOnly, setEditLocked } from '../../goodiesConsumer/store';
import { applyContent, clearContent, setDraftControlled } from '../../goodiesConsumer/content';
import { resolveForRender } from '../../goodiesConsumer/draft';
import { EditContext, type GoodiesSelection } from '../../goodiesConsumer/editContext';

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
    const storeId = Object.keys(STB)[0] || 's12';
    const itemId = Object.keys(IT)[0] || '';
    const param = route === 'store' || route === 'byo' ? storeId : route === 'product' ? itemId : undefined;
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
          {editMode ? 'Scroll the phone and tap an element to select it. Navigation is paused while editing.' : 'Rendered from the consumer app source using the current draft. Placing orders is disabled in this preview.'}
        </Text>
        {!editMode ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 10 }}>
          {screens.map((screen) => {
            const active = S.stack?.[S.stack.length - 1]?.r === screen.key;
            return (
              <Pressable key={screen.key} onPress={() => navigate(screen.key)} accessibilityRole="button" accessibilityState={{ selected: active }}
                style={{ borderRadius: 18, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: active ? orange : '#F1F1F2', borderWidth: active ? 0 : 1, borderColor: '#E5E5E7' }}>
                <Text style={{ fontSize: 10, fontWeight: active ? '800' : '600', color: active ? '#FFFFFF' : ink }}>{screen.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView> : null}
      </View>
      <View style={{ width: '100%', maxWidth: 404, height: 720, borderRadius: 30, borderWidth: 7, borderColor: '#252529', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
        <EditContext.Provider value={editValue}>
          <GoodiesApp embedded previewMode />
        </EditContext.Provider>
      </View>
    </View>
  );
}
