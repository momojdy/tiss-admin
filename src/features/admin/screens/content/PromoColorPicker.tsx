import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, TextInput, View } from 'react-native';
import Svg, { Defs, LinearGradient, Polygon, Rect, Stop } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Txt } from '../../ui/Txt';

/* Brand presets stay available; they are the first saved colors. */
const PRESETS = [
  { label: 'Plum', color: '#7B3FE4' },
  { label: 'Orange', color: '#FD802E' },
  { label: 'Green', color: '#1F7A5A' },
];
const SAVED_KEY = 'goodies-saved-colors-v1';
const BORDER = '#D8D8DE';
const INK = '#24232A';

const normalizeHex = (value: string) => {
  const raw = value.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(raw)) return '#' + raw.split('').map((p) => p + p).join('').toUpperCase();
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return '#' + raw.toUpperCase();
  return null;
};

type Hsv = { h: number; s: number; v: number };
const clamp = (n: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));

const hexToHsv = (hex: string): Hsv => {
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return { h, s: max ? d / max : 0, v: max };
};

const hsvToHex = ({ h, s, v }: Hsv) => {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + [r, g, b].map((n) => Math.round((n + m) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
};
const hueHex = (h: number) => hsvToHex({ h, s: 1, v: 1 });

/* Draggable surface: reports 0..1 positions for touch, mouse and pen. */
function useDrag(onMove: (x: number, y: number) => void, disabled: boolean) {
  const size = useRef({ w: 1, h: 1 });
  const handler = useRef(onMove);
  handler.current = onMove;
  const off = useRef(disabled);
  off.current = disabled;
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !off.current,
    onMoveShouldSetPanResponder: () => !off.current,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => handler.current(clamp(e.nativeEvent.locationX / size.current.w), clamp(e.nativeEvent.locationY / size.current.h)),
    onPanResponderMove: (e) => handler.current(clamp(e.nativeEvent.locationX / size.current.w), clamp(e.nativeEvent.locationY / size.current.h)),
  }), []);
  return { panHandlers: pan.panHandlers, onLayout: (e: any) => { size.current = { w: Math.max(1, e.nativeEvent.layout.width), h: Math.max(1, e.nativeEvent.layout.height) }; } };
}

/* Hexagon palette: centre is white, hue runs around the rings, outer rings are darker. */
const RINGS = 6;
const HEX_R = 11;
function hexagonCells() {
  const cells: { x: number; y: number; color: string }[] = [];
  const w = Math.sqrt(3) * HEX_R;
  for (let q = -RINGS; q <= RINGS; q++) {
    for (let r = Math.max(-RINGS, -q - RINGS); r <= Math.min(RINGS, -q + RINGS); r++) {
      const x = w * (q + r / 2), y = 1.5 * HEX_R * r;
      const ring = Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r));
      const angle = (Math.atan2(y, x) * 180) / Math.PI;
      const hue = (angle + 360) % 360;
      const t = ring / RINGS;
      const color = ring === 0 ? '#FFFFFF' : t <= 0.5 ? hsvToHex({ h: hue, s: t * 2, v: 1 }) : hsvToHex({ h: hue, s: 1, v: 1 - (t - 0.5) * 1.3 });
      cells.push({ x, y, color });
    }
  }
  return cells;
}
const CELLS = hexagonCells();
const GRAYS = ['#F5F5F5', '#D9D9D9', '#A6A6A6', '#737373', '#404040', '#171717', '#000000'];
const hexPoints = (cx: number, cy: number, r: number) => Array.from({ length: 6 }, (_, i) => {
  const a = (Math.PI / 180) * (60 * i - 30);
  return (cx + r * Math.cos(a)).toFixed(2) + ',' + (cy + r * Math.sin(a)).toFixed(2);
}).join(' ');

export function PromoColorPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
}) {
  const resolved = useMemo(() => {
    const preset = PRESETS.find((item) => item.label.toLowerCase() === value.toLowerCase());
    return normalizeHex(preset?.color || value) || PRESETS[0].color;
  }, [value]);

  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(resolved));
  const [hexText, setHexText] = useState(resolved.slice(1));
  const [hexError, setHexError] = useState('');
  const [saved, setSaved] = useState<string[]>([]);
  const lastEmitted = useRef(resolved);

  // Follow outside changes (another element selected, preset chosen) without losing hue on greys.
  useEffect(() => {
    if (resolved === lastEmitted.current) return;
    lastEmitted.current = resolved;
    setHsv(hexToHsv(resolved));
    setHexText(resolved.slice(1));
    setHexError('');
  }, [resolved]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SAVED_KEY);
        const list = raw ? JSON.parse(raw) : [];
        if (alive && Array.isArray(list)) setSaved(list.map((c: any) => normalizeHex(String(c))).filter(Boolean) as string[]);
      } catch { /* saved colors are a convenience only */ }
    })();
    return () => { alive = false; };
  }, []);

  const current = hsvToHex(hsv);

  const emit = useCallback((next: Hsv) => {
    const hex = hsvToHex(next);
    setHsv(next);
    setHexText(hex.slice(1));
    setHexError('');
    lastEmitted.current = hex;
    onChange(hex);
  }, [onChange]);

  const chooseHex = (hex: string) => {
    if (disabled) return;
    const normalized = normalizeHex(hex);
    if (!normalized) return;
    emit(hexToHsv(normalized));
  };

  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;
  const field = useDrag((x, y) => emit({ h: hsvRef.current.h, s: x, v: 1 - y }), disabled);
  const hue = useDrag((x) => emit({ h: x * 359.99, s: hsvRef.current.s, v: hsvRef.current.v }), disabled);

  const typeHex = (text: string) => {
    const cleaned = text.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
    setHexText(cleaned.toUpperCase());
    const normalized = cleaned.length === 3 || cleaned.length === 6 ? normalizeHex(cleaned) : null;
    if (normalized) { setHexError(''); lastEmitted.current = normalized; setHsv(hexToHsv(normalized)); onChange(normalized); }
    else setHexError(cleaned ? 'Enter 3 or 6 hex digits, e.g. BF008E.' : '');
  };

  const addSaved = async () => {
    if (disabled || saved.includes(current) || PRESETS.some((p) => p.color === current)) return;
    const next = [current, ...saved].slice(0, 14);
    setSaved(next);
    try { await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };
  const removeSaved = async (hex: string) => {
    const next = saved.filter((c) => c !== hex);
    setSaved(next);
    try { await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const FIELD_H = 150;
  const hexW = Math.sqrt(3) * HEX_R;
  const gridW = hexW * (RINGS * 2 + 1) + HEX_R, gridH = 1.5 * HEX_R * (RINGS * 2) + HEX_R * 2 + 4;
  const swatches = [...PRESETS.map((p) => ({ color: p.color, label: p.label, removable: false })), ...saved.filter((c) => !PRESETS.some((p) => p.color === c)).map((c) => ({ color: c, label: c, removable: true }))];

  return (
    <View style={{ marginTop: 12, gap: 14 }}>
      <View style={{ backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#ECECF0', padding: 12, gap: 12 }}>
        {/* Saturation / brightness field */}
        <View style={{ height: FIELD_H, borderRadius: 10, overflow: 'hidden' }} onLayout={field.onLayout} {...field.panHandlers}>
          <Svg width="100%" height="100%" pointerEvents="none">
            <Defs>
              <LinearGradient id="sat" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#FFFFFF" /><Stop offset="1" stopColor={hueHex(hsv.h)} /></LinearGradient>
              <LinearGradient id="val" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#000000" stopOpacity="0" /><Stop offset="1" stopColor="#000000" stopOpacity="1" /></LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#sat)" />
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#val)" />
          </Svg>
          <View pointerEvents="none" style={{ position: 'absolute', left: (hsv.s * 100) + '%', top: ((1 - hsv.v) * 100) + '%', width: 0, height: 0 }}>
            <View style={{ position: 'absolute', left: -9, top: -9, width: 18, height: 18, borderRadius: 9, borderWidth: 3, borderColor: '#FFFFFF', backgroundColor: current, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } }} />
          </View>
        </View>

        {/* Hue slider */}
        <View style={{ height: 22, justifyContent: 'center' }} onLayout={hue.onLayout} {...hue.panHandlers}>
          <Svg width="100%" height={12} pointerEvents="none" style={{ borderRadius: 6 }}>
            <Defs>
              <LinearGradient id="hue" x1="0" y1="0" x2="1" y2="0">
                {[0, 60, 120, 180, 240, 300, 360].map((d) => <Stop key={d} offset={d / 360} stopColor={hueHex(d % 360)} />)}
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="12" rx="6" fill="url(#hue)" />
          </Svg>
          <View pointerEvents="none" style={{ position: 'absolute', left: (hsv.h / 360 * 100) + '%', top: 0, width: 0, height: 22 }}>
            <View style={{ position: 'absolute', left: -9, top: 2, width: 18, height: 18, borderRadius: 9, borderWidth: 3, borderColor: '#FFFFFF', backgroundColor: hueHex(hsv.h), shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } }} />
          </View>
        </View>

        {/* Format and value */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ borderWidth: 1, borderColor: BORDER, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 9, minWidth: 64 }}>
            <Txt size={12} weight={500}>Hex</Txt>
          </View>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: hexError ? '#C0392B' : BORDER, borderRadius: 9, paddingHorizontal: 10, backgroundColor: '#FFFFFF' }}>
            <Txt size={12} mut>#</Txt>
            <TextInput
              value={hexText}
              onChangeText={typeHex}
              editable={!disabled}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              placeholder="BF008E"
              accessibilityLabel="Hex color value"
              style={{ flex: 1, minWidth: 0, paddingVertical: 9, paddingHorizontal: 6, color: INK, fontSize: 12 }}
            />
          </View>
          <View style={{ width: 38, height: 38, borderRadius: 9, backgroundColor: current, borderWidth: 1, borderColor: BORDER }} />
        </View>
        {hexError ? <Txt size={9} color="#C0392B">{hexError}</Txt> : null}

        {/* Saved colors */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Txt size={11} weight={600}>Saved colors:</Txt>
          <Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel="Save this color" onPress={() => { void addSaved(); }}>
            <Txt size={11} mut>+ Add</Txt>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {swatches.map((item) => {
            const active = current === item.color;
            return (
              <Pressable
                key={item.color}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={'Use ' + item.label}
                onPress={() => chooseHex(item.color)}
                onLongPress={item.removable ? () => { void removeSaved(item.color); } : undefined}
                style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: item.color, borderWidth: active ? 3 : 0, borderColor: '#D5D5DB' }}
              />
            );
          })}
        </View>
        {saved.length ? <Txt size={9} mut>Press and hold a saved color to remove it.</Txt> : null}
      </View>

      {/* Hexagon palette */}
      <View style={{ backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#ECECF0', padding: 12, alignItems: 'center', gap: 10 }}>
        <Svg width={gridW} height={gridH}>
          {CELLS.map((cell, i) => {
            const cx = cell.x + gridW / 2, cy = cell.y + gridH / 2;
            const active = cell.color === current;
            return (
              <Polygon
                key={i}
                points={hexPoints(cx, cy, HEX_R - 0.6)}
                fill={cell.color}
                stroke={active ? '#FFFFFF' : 'none'}
                strokeWidth={active ? 2 : 0}
                onPress={() => chooseHex(cell.color)}
              />
            );
          })}
        </Svg>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch' }}>
          <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', flex: 1 }}>
            {GRAYS.map((g) => (
              <Pressable key={g} disabled={disabled} accessibilityRole="button" accessibilityLabel={'Use gray ' + g} onPress={() => chooseHex(g)} style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: g, borderWidth: g === current ? 2 : 1, borderColor: g === current ? INK : '#E5E5E8' }} />
            ))}
          </View>
          <Svg width={42} height={42}>
            <Polygon points={hexPoints(21, 21, 19)} fill={current} stroke={BORDER} strokeWidth={1} />
          </Svg>
        </View>
      </View>
    </View>
  );
}
