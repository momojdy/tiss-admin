import React, { useCallback } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { GoodiesApp } from '../../goodiesConsumer/GoodiesApp';
import { emit, IT, S, STB, useGoodies, setPreviewOnly } from '../../goodiesConsumer/store';
import { C } from '../../goodiesConsumer/content';

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

type EditTarget = { kind: 'mode' | 'promo' | 'category' | 'label'; id: string; title: string };

export function GoodiesConsumerPreview({ editMode = false, selectedTarget, onEditTarget }: { editMode?: boolean; selectedTarget?: EditTarget | null; onEditTarget?: (target: EditTarget) => void }) {
  // Establish the safety boundary before child screens can mount their effects.
  setPreviewOnly(true);
  useGoodies();
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

  const pickTarget = (y: number, x: number): EditTarget | null => {
    const content: any = C;
    if (!content) return { kind: 'label', id: 'lbl.search', title: 'Search placeholder' };
    if (y < 160) return { kind: 'label', id: 'lbl.search', title: 'Search placeholder' };
    if (y < 290) {
      const list = (content.modes || []).filter((v: any) => v.st === 'Live');
      const i = x < 170 ? 0 : x < 280 ? 1 : 2;
      const v = list[i] || list[0];
      return v ? { kind: 'mode', id: v.id, title: 'Service tile · ' + (v.title?.en?.v || v.id) } : null;
    }
    if (y < 390) {
      const list = (content.cats || []).filter((v: any) => v.st === 'on').sort((a: any,b: any) => (a.ord || 0) - (b.ord || 0));
      const i = Math.min(list.length - 1, Math.max(0, Math.floor(Math.max(0, x) / 62)));
      const v = list[i];
      return v ? { kind: 'category', id: v.id, title: 'Category · ' + (v.name?.en?.v || v.id) } : null;
    }
    if (y < 525) {
      const list = (content.promos || []).filter((v: any) => v.st === 'Live').sort((a: any,b: any) => (a.ord || 0) - (b.ord || 0));
      const v = list[0];
      return v ? { kind: 'promo', id: v.id, title: 'Promotion · ' + (v.title?.en?.v || v.id) } : null;
    }
    const labels = y < 625 ? ['lbl.coupons','lbl.coupons2'] : ['lbl.flash','lbl.again','lbl.recent','lbl.popular','lbl.produce','lbl.haitian','lbl.trending'];
    const id = labels[Math.min(labels.length - 1, Math.floor((y - (y < 625 ? 525 : 625)) / 45))] || labels[0];
    const item = (content.labels || []).find((v: any) => v.id === id);
    return { kind: 'label', id, title: item?.label || 'Customer text' };
  };

  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: 390, marginBottom: 10, paddingHorizontal: 4 }}>
        <Text style={{ color: ink, fontSize: 12, fontWeight: '800' }}>{editMode ? 'Edit actual Goodies consumer screen' : 'Actual Goodies consumer screens'}</Text>
        <Text style={{ color: muted, fontSize: 10, lineHeight: 15, marginTop: 3 }}>
          {editMode ? 'Phone navigation is paused. Tap a visible section to select its content for editing.' : 'Rendered from the consumer app source. Published catalogue and content load from the configured Wantiss backend. Placing orders is disabled in this preview.'}
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
      <View style={{ width: '100%', maxWidth: 404, height: 720, borderRadius: 30, borderWidth: 7, borderColor: editMode ? orange : '#252529', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
        <View pointerEvents={editMode ? 'none' : 'auto'} style={{ flex: 1 }}><GoodiesApp embedded previewMode /></View>
        {editMode ? (
          <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 999, elevation: 999 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Select Goodies content at this position"
              onPress={(event: any) => {
                const y = Number(event?.nativeEvent?.locationY ?? 330);
                const x = Number(event?.nativeEvent?.locationX ?? 80);
                const target = pickTarget(y, x);
                if (target) onEditTarget?.(target);
              }}
              style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
            />
            {[
              { top: 0, height: 22, target: pickTarget(70, 100), label: 'Search / top text' },
              { top: '22%', height: '19%', target: pickTarget(210, 80), label: 'Service tiles' },
              { top: '41%', height: '15%', target: pickTarget(330, 80), label: 'Categories' },
              { top: '56%', height: '20%', target: pickTarget(450, 80), label: 'Promotions' },
              { top: '76%', height: '24%', target: pickTarget(590, 80), label: 'Section titles' },
            ].map((zone) => zone.target ? (
              <Pressable key={zone.label} accessibilityRole="button" accessibilityLabel={'Select ' + zone.label} onPress={() => onEditTarget?.(zone.target!)}
                style={{
                  position: 'absolute', left: 0, right: 0, top: zone.top as any, height: zone.height as any,
                  borderWidth: selectedTarget?.kind === zone.target.kind && selectedTarget?.id === zone.target.id ? 2 : 0,
                  borderStyle: 'dashed',
                  borderColor: orange,
                  backgroundColor: 'transparent',
                }} />
            ) : null)}
          </View>
        ) : null}
      </View>
      {editMode ? (
        <View style={{ width: '100%', maxWidth: 404, marginTop: 12, gap: 7 }}>
          <Text style={{ color: ink, fontSize: 12, fontWeight: '800' }}>Select content to edit</Text>
          {[
            ...((C as any)?.modes || []).filter((v: any) => v.st === 'Live').map((v: any) => ({ kind: 'mode' as const, id: v.id, title: 'Service tile · ' + (v.title?.en?.v || v.id) })),
            ...((C as any)?.cats || []).filter((v: any) => v.st === 'on').map((v: any) => ({ kind: 'category' as const, id: v.id, title: 'Category · ' + (v.name?.en?.v || v.id) })),
            ...((C as any)?.promos || []).filter((v: any) => v.st === 'Live').map((v: any) => ({ kind: 'promo' as const, id: v.id, title: 'Promotion · ' + (v.title?.en?.v || v.id) })),
            ...((C as any)?.labels || []).map((v: any) => ({ kind: 'label' as const, id: v.id, title: 'Text · ' + (v.label || v.id) })),
          ].map((target) => (
            <Pressable key={target.kind + ':' + target.id} accessibilityRole="button" onPress={() => onEditTarget?.(target)}
              style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E5E5E7', backgroundColor: '#FFFFFF' }}>
              <Text style={{ color: ink, fontSize: 11, fontWeight: '600' }}>{target.title}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
