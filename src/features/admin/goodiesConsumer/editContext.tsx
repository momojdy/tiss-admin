/* Edit selection stays isolated; outside edit mode, consumer elements render unchanged. */
import React, {createContext, useContext} from 'react';
import {Pressable, Text, View, ViewStyle} from 'react-native';

export type GoodiesField = 'title' | 'sub' | 'btn' | 'text' | 'art';
export type GoodiesKind = 'mode' | 'promo' | 'category' | 'label';
export type GoodiesSelection = {kind: GoodiesKind; id: string; field: GoodiesField};

export const selKey = (s: GoodiesSelection) => s.kind + ':' + s.id + ':' + s.field;
export const sameSel = (a: GoodiesSelection | null | undefined, b: GoodiesSelection) => !!a && selKey(a) === selKey(b);

/** A part of a saved Build Your Own builder that the admin can tap in the phone preview. */
export type BuilderTarget = {builderId: string; part: 'builder' | 'group' | 'ingredient' | 'addGroup' | 'addIngredient'; groupId?: string; itemId?: string};
export const sameTarget = (a: BuilderTarget | null | undefined, b: BuilderTarget) => !!a && a.builderId === b.builderId && a.part === b.part && (a.groupId || '') === (b.groupId || '') && (a.itemId || '') === (b.itemId || '');

type EditCtx = {selected: GoodiesSelection | null; select: (selection: GoodiesSelection) => void; pick?: (target: BuilderTarget) => void; picked?: BuilderTarget | null};
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

/** Tap target for saved-builder parts. Outside the admin editor it renders its children unchanged. */
export function BSel({target, children, style}: {target: BuilderTarget; children?: React.ReactNode; style?: ViewStyle}) {
  const ctx = useContext(EditContext);
  if (!ctx || !ctx.pick) return <>{children}</>;
  const on = sameTarget(ctx.picked, target);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={'Edit builder ' + target.part} onPress={() => ctx.pick && ctx.pick(target)} style={[style, on ? OUTLINE : null]}>
      <View pointerEvents="none">{children}</View>
    </Pressable>
  );
}

/** Small "+ Add" chip shown only in the admin editor. */
export function AddChip({target, label}: {target: BuilderTarget; label: string}) {
  const ctx = useContext(EditContext);
  if (!ctx || !ctx.pick) return null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => ctx.pick && ctx.pick(target)} style={[{alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, backgroundColor: '#FFF1E8'}, sameTarget(ctx.picked, target) ? OUTLINE : null]}>
      <Text style={{fontSize: 12, fontWeight: '800', color: '#FD802E'}}>{'+ ' + label}</Text>
    </Pressable>
  );
}
