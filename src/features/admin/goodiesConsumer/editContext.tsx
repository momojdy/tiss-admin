/* Element selection for the admin Goodies editor.
   The admin preview provides EditContext; the real consumer components wrap their
   editable elements in <Sel>. Without the provider (the normal consumer app, or the
   preview outside edit mode) <Sel> renders its children untouched: no wrapper, no
   outline, no extra handlers. */
import React, {createContext, useContext} from 'react';
import {Pressable, View, ViewStyle} from 'react-native';

export type GoodiesField = 'title' | 'sub' | 'btn' | 'text' | 'art';
export type GoodiesKind = 'mode' | 'promo' | 'category' | 'label';
export type GoodiesSelection = {kind: GoodiesKind; id: string; field: GoodiesField};

export const selKey = (s: GoodiesSelection) => s.kind + ':' + s.id + ':' + s.field;
export const sameSel = (a: GoodiesSelection | null | undefined, b: GoodiesSelection) => !!a && selKey(a) === selKey(b);

type EditCtx = {selected: GoodiesSelection | null; select: (selection: GoodiesSelection) => void};
export const EditContext = createContext<EditCtx | null>(null);

/** True only inside the admin editor's edit mode. */
export const useEditing = () => !!useContext(EditContext);

/* Outline props do not take part in layout, so selecting never moves the screen. */
const OUTLINE = {outlineWidth: 2, outlineStyle: 'dashed', outlineColor: '#FD802E', outlineOffset: -2} as ViewStyle;

export function Sel({sel, children, style}: {sel: GoodiesSelection; children?: React.ReactNode; style?: ViewStyle}) {
  const ctx = useContext(EditContext);
  if (!ctx) return <>{children}</>;
  const on = sameSel(ctx.selected, sel);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={'Edit ' + sel.kind + ' ' + sel.field} onPress={() => ctx.select(sel)} style={[style, on ? OUTLINE : null]}>
      <View pointerEvents="none">{children}</View>
    </Pressable>
  );
}
