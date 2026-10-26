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

export function GoodiesConsumerPreview({ editMode = false, onEditTarget }: { editMode?: boolean; onEditTarget?: (target: EditTarget) => void }) {
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
        <Text style={{ color: ink, fontSize: 12, fontWeight: '800' }}>Actual Goodies consumer screens</Text>
        <Text style={{ color: muted, fontSize: 10, lineHeight: 15, marginTop: 3 }}>
          Rendered from the consumer app source. Published catalogue and content load from the configured Wantiss backend. Placing orders is disabled in this preview.
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
      <View style={{ width: '100%', maxWidth: 404, height: 720, borderRadius: 30, borderWidth: 7, borderColor: editMode ? orange : '#252529', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
        <GoodiesApp embedded previewMode />
        {editMode ? <Pressable accessibilityRole="button" accessibilityLabel="Select content in the Goodies phone preview" onPress={(event: any) => { const target = pickTarget(event.nativeEvent.locationY, event.nativeEvent.locationX); if (target) onEditTarget?.(target); }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(253,128,46,0.035)', borderWidth: 1, borderColor: 'rgba(253,128,46,0.45)' }}><View style={{ alignSelf: 'center', marginTop: 8, backgroundColor: orange, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 }}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>TAP CONTENT TO EDIT</Text></View></Pressable> : null}
      </View>
    </View>
  );
}
