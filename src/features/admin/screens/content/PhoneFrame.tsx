import type { ReactNode } from 'react';
import { View, useWindowDimensions } from 'react-native';

// Customer screens are laid out on a 390 x 844 point phone; the frame draws that layout scaled down to fit.
export const PHONE_W = 390;
export const PHONE_H = 844;
const BEZEL = 7;
const MAX_SCALE = 0.82;

export function PhoneFrame({ children, background = '#fff' }: { children: ReactNode; background?: string }) {
  const { width } = useWindowDimensions();
  const scale = Math.min(MAX_SCALE, Math.max(0.5, (width - 48) / (PHONE_W + BEZEL * 2)));
  return (
    <View style={{ width: PHONE_W * scale + BEZEL * 2, height: PHONE_H * scale + BEZEL * 2, borderRadius: 30, borderWidth: BEZEL, borderColor: '#252529', overflow: 'hidden', backgroundColor: background }}>
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, top: 0, width: PHONE_W, height: PHONE_H, transform: [{ translateX: -(PHONE_W * (1 - scale)) / 2 }, { translateY: -(PHONE_H * (1 - scale)) / 2 }, { scale }] }}>
        {children}
      </View>
    </View>
  );
}
