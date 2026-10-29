import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, PanResponder, View } from 'react-native';

// Port of MainDragCarousel from the customer app (src/screens/Main/mainHomeScreen.tsx) at its 390 point width:
// five categories in one row; dragging sideways slides them away and opens the full 20-category grid.
export const CATEGORY_ITEMS: { label: string; file: string }[] = [
  { label: 'Goodies', file: 'Goodies.PNG' }, { label: 'Woulib', file: 'Woulib.PNG' }, { label: 'Services', file: 'Services.PNG' }, { label: 'Globiz', file: 'Globiz.PNG' }, { label: 'Konsoliss', file: 'Konsoliss.PNG' },
  { label: 'Stays', file: 'stays.PNG' }, { label: 'Flyz', file: 'Flyz.PNG' }, { label: 'Habita', file: 'Habita.PNG' }, { label: 'Rideza', file: 'Rideza%20.PNG' }, { label: 'Frenzies', file: 'Frenzies.PNG' },
  { label: 'Arts & Lits', file: 'Arts_lits.PNG' }, { label: 'Streamz', file: 'Streamz.PNG' }, { label: 'Gatherz', file: 'Gatherz.PNG' }, { label: 'Glowz', file: 'Glowz.PNG' }, { label: 'Prezo', file: 'Prezo%20.PNG' },
  { label: 'Top Up', file: 'Topup.PNG' }, { label: 'Deals', file: 'Deals.PNG' }, { label: 'Bidz', file: 'Bidz.PNG' }, { label: 'Lutz', file: 'Lutz.PNG' }, { label: 'More', file: 'More.PNG' },
];

const MAGENTA = '#BF008E';
const WIDTH = 390;
const COLUMNS = 5;
const DRAG_SENSITIVITY = 850;
export const ROW_H = 78;
const INDICATOR_H = 10;
export const TEASER_H = 156;
const COLLAPSED_H = ROW_H + INDICATOR_H;
const EXPANDED_CONTENT_H = ROW_H * 3;
const EXPANDED_H = EXPANDED_CONTENT_H + INDICATOR_H;
const EASE_OUT_CUBIC = Easing.bezier(0.215, 0.61, 0.355, 1);

type Entry = { key: string; item: { label: string; file: string }; kind: 'collapsed' | 'stays' | 'row1' | 'grid'; x0: number; x1: number; y1: number };

/** `p` is shared with the teaser cards: 0 = collapsed row, 1 = full grid. */
export function CategoryCarousel({ p, renderItem, onDragActive }: { p: Animated.Value; renderItem: (item: { label: string; file: string }) => ReactNode; onDragActive: (active: boolean) => void }) {
  const ew = WIDTH / COLUMNS;
  const cw = WIDTH / 5.59;
  const value = useRef(0);
  const lastDx = useRef(0);
  const dragCb = useRef(onDragActive);
  dragCb.current = onDragActive;
  const [flags, setFlags] = useState({ zoneFull: false, collapsedOn: true, expandedOn: false });

  useEffect(() => {
    const id = p.addListener(({ value: v }) => {
      value.current = v;
      const next = { zoneFull: v > 0.5, collapsedOn: v <= 0.3, expandedOn: v >= 0.15 };
      setFlags((prev) => (prev.zoneFull === next.zoneFull && prev.collapsedOn === next.collapsedOn && prev.expandedOn === next.expandedOn ? prev : next));
    });
    return () => p.removeListener(id);
  }, [p]);

  const settle = (target: number) => {
    p.stopAnimation();
    Animated.timing(p, { toValue: target, duration: 450, easing: EASE_OUT_CUBIC, useNativeDriver: false }).start();
  };

  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => { p.stopAnimation(); lastDx.current = 0; dragCb.current(true); },
    onPanResponderMove: (_e, g) => {
      const d = g.dx - lastDx.current;
      lastDx.current = g.dx;
      p.setValue(Math.min(1, Math.max(0, value.current - d / DRAG_SENSITIVITY)));
    },
    onPanResponderRelease: (_e, g) => {
      dragCb.current(false);
      const v = g.vx * 1000;
      settle(v < -200 ? 1 : v > 200 ? 0 : value.current >= 0.5 ? 1 : 0);
    },
    onPanResponderTerminate: () => { dragCb.current(false); settle(value.current >= 0.5 ? 1 : 0); },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const entries = useMemo<Entry[]>(() => {
    const list: Entry[] = [];
    CATEGORY_ITEMS.slice(0, 5).forEach((item, i) => list.push({ key: item.label, item, kind: 'collapsed', x0: i * cw, x1: (i - 5) * ew, y1: 0 }));
    CATEGORY_ITEMS.slice(5).forEach((item, index) => {
      const row = Math.floor(index / COLUMNS);
      const col = index % COLUMNS;
      if (index === 0) list.push({ key: item.label, item, kind: 'stays', x0: 5 * cw, x1: 0, y1: 0 });
      else if (row === 0) list.push({ key: item.label, item, kind: 'row1', x0: (5 + col) * cw, x1: col * ew, y1: 0 });
      else list.push({ key: item.label, item, kind: 'grid', x0: (6 + col) * cw, x1: col * ew, y1: row * ROW_H });
    });
    return list;
  }, [cw, ew]);

  const height = p.interpolate({ inputRange: [0, 1], outputRange: [COLLAPSED_H, EXPANDED_H] });
  const indY = p.interpolate({ inputRange: [0, 1], outputRange: [ROW_H, EXPANDED_CONTENT_H] });
  const indOpacity = p.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 0.25, 1] });
  const lineColor = p.interpolate({ inputRange: [0, 1], outputRange: [MAGENTA, '#E0E0E0'] });
  const dotColor = p.interpolate({ inputRange: [0, 1], outputRange: ['#E0E0E0', MAGENTA] });

  return (
    <Animated.View style={{ width: WIDTH, height, overflow: 'hidden' }}>
      <View {...pan.panHandlers} style={{ position: 'absolute', left: 0, top: 0, width: WIDTH, height: flags.zoneFull ? EXPANDED_CONTENT_H : ROW_H }}>
        {entries.map((entry) => {
          const translateX = p.interpolate({ inputRange: [0, 1], outputRange: [entry.x0, entry.x1] });
          const translateY = p.interpolate({ inputRange: [0, 1], outputRange: [0, entry.y1] });
          let opacity: Animated.AnimatedInterpolation<number> | number;
          let active = true;
          if (entry.kind === 'collapsed') { opacity = p.interpolate({ inputRange: [0, 0.5], outputRange: [1, 0], extrapolate: 'clamp' }); active = flags.collapsedOn; }
          else if (entry.kind === 'stays') opacity = 1;
          else { opacity = p.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }); active = flags.expandedOn; }
          return (
            <Animated.View key={entry.key} pointerEvents={active ? 'box-none' : 'none'} style={{ position: 'absolute', left: 0, top: 0, width: ew, height: ROW_H, opacity, transform: [{ translateX }, { translateY }] }}>
              {renderItem(entry.item)}
            </Animated.View>
          );
        })}
      </View>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: INDICATOR_H, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', opacity: indOpacity, transform: [{ translateY: indY }] }}>
        <Animated.View style={{ width: 14, height: 4, marginHorizontal: 2, borderRadius: 2, backgroundColor: lineColor }} />
        <Animated.View style={{ width: 6, height: 6, marginHorizontal: 2, borderRadius: 3, backgroundColor: dotColor }} />
      </Animated.View>
    </Animated.View>
  );
}
