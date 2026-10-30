import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Txt } from '../../ui/Txt';

const PRESETS = [
  { label: 'Plum', color: '#7B3FE4' },
  { label: 'Orange', color: '#FD802E' },
  { label: 'Green', color: '#1F7A5A' },
];

const PALETTE = [
  '#FFFFFF', '#F5F5F5', '#D9D9D9', '#A6A6A6', '#737373', '#404040', '#171717', '#000000',
  '#FCE4EC', '#F8BBD0', '#F06292', '#E91E63', '#C2185B', '#880E4F',
  '#F3E5F5', '#CE93D8', '#AB47BC', '#8E24AA', '#7B3FE4', '#4527A0',
  '#E3F2FD', '#90CAF9', '#42A5F5', '#1976D2', '#0D47A1', '#00BCD4',
  '#E0F2F1', '#80CBC4', '#26A69A', '#00897B', '#1F7A5A', '#1B5E20',
  '#FFF8E1', '#FFE082', '#FFCA28', '#FF9800', '#FD802E', '#E65100',
  '#FBE9E7', '#FFAB91', '#FF7043', '#F44336', '#C62828', '#7F0000',
];

const normalizeHex = (value: string) => {
  const raw = value.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return '#' + raw.split('').map((part) => part + part).join('').toUpperCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return '#' + raw.toUpperCase();
  return null;
};

const hexToRgb = (hex: string) => ({
  r: parseInt(hex.slice(1, 3), 16),
  g: parseInt(hex.slice(3, 5), 16),
  b: parseInt(hex.slice(5, 7), 16),
});

const rgbToHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((value) => Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0')).join('').toUpperCase();

const fieldStyle = {
  borderWidth: 1,
  borderColor: '#D8D8DE',
  borderRadius: 9,
  paddingHorizontal: 10,
  paddingVertical: 9,
  color: '#24232A',
  backgroundColor: '#FFFFFF',
  fontSize: 12,
  minWidth: 0,
} as const;

export function PromoColorPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
}) {
  const resolvedValue = useMemo(() => {
    const preset = PRESETS.find((item) => item.label.toLowerCase() === value.toLowerCase());
    return normalizeHex(preset?.color || value) || PRESETS[0].color;
  }, [value]);

  const [hexInput, setHexInput] = useState(resolvedValue);
  const [rgbInput, setRgbInput] = useState(() => hexToRgb(resolvedValue));
  const [hexError, setHexError] = useState('');

  useEffect(() => {
    setHexInput(resolvedValue);
    setRgbInput(hexToRgb(resolvedValue));
    setHexError('');
  }, [resolvedValue]);

  const selectColor = (color: string) => {
    if (disabled) return;
    const normalized = normalizeHex(color);
    if (!normalized) return;
    setHexInput(normalized);
    setRgbInput(hexToRgb(normalized));
    setHexError('');
    onChange(normalized);
  };

  const updateHex = (text: string) => {
    setHexInput(text);
    const normalized = normalizeHex(text);
    if (normalized) {
      setHexError('');
      setRgbInput(hexToRgb(normalized));
      onChange(normalized);
    } else {
      setHexError(text.trim() ? 'Enter a valid HEX value, e.g. #BF008E.' : '');
    }
  };

  const updateRgb = (channel: 'r' | 'g' | 'b', text: string) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, 3);
    const next = { ...rgbInput, [channel]: digits === '' ? 0 : Math.min(255, Number(digits)) };
    setRgbInput(next);
    const nextHex = rgbToHex(next.r, next.g, next.b);
    setHexInput(nextHex);
    onChange(nextHex);
    setHexError('');
  };

  const activeHex = normalizeHex(hexInput) || resolvedValue;

  return (
    <View style={{ marginTop: 12, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: activeHex, borderWidth: 1, borderColor: '#D8D8DE' }} />
        <View style={{ flex: 1 }}>
          <Txt size={11} weight={600}>Selected color</Txt>
          <Txt size={10} mut>{activeHex}</Txt>
        </View>
      </View>

      <View>
        <Txt size={10.5} weight={600}>Brand colors</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {PRESETS.map((preset) => {
            const active = activeHex === preset.color;
            return (
              <Pressable
                key={preset.label}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={'Select ' + preset.label}
                onPress={() => selectColor(preset.color)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 9, borderRadius: 18, borderWidth: active ? 2 : 1, borderColor: active ? '#24232A' : '#D8D8DE' }}
              >
                <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: preset.color }} />
                <Txt size={10} weight={active ? 700 : 400}>{preset.label}</Txt>
                {active ? <Txt size={10}>✓</Txt> : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View>
        <Txt size={10.5} weight={600}>Color palette</Txt>
        <Txt size={9.5} mut style={{ marginTop: 2 }}>Choose a color swatch. Your selection updates the preview immediately.</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 9 }}>
          {PALETTE.map((color) => {
            const active = activeHex === color;
            return (
              <Pressable
                key={color}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={'Select color ' + color}
                onPress={() => selectColor(color)}
                style={{ width: 29, height: 29, borderRadius: 8, backgroundColor: color, borderWidth: active ? 3 : 1, borderColor: active ? '#24232A' : '#D8D8DE', alignItems: 'center', justifyContent: 'center' }}
              >
                {active ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color === '#FFFFFF' || color === '#F5F5F5' || color === '#FCE4EC' ? '#24232A' : '#FFFFFF' }} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ borderTopWidth: 1, borderTopColor: '#E7E7EB', paddingTop: 11 }}>
        <Txt size={10.5} weight={600}>Custom color</Txt>
        <Txt size={9.5} mut style={{ marginTop: 2 }}>Enter a HEX code or RGB values if you already know the exact color.</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <View style={{ flex: 1 }}>
            <Txt size={9.5} mut>HEX</Txt>
            <TextInput
              value={hexInput}
              onChangeText={updateHex}
              onEndEditing={() => {
                const normalized = normalizeHex(hexInput);
                if (normalized) selectColor(normalized);
              }}
              editable={!disabled}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="#BF008E"
              style={{ ...fieldStyle, marginTop: 4 }}
            />
          </View>
          <View style={{ width: 42, height: 38, borderRadius: 9, backgroundColor: activeHex, borderWidth: 1, borderColor: '#D8D8DE', marginTop: 16 }} />
        </View>
        {hexError ? <Txt size={9} color="#C0392B" style={{ marginTop: 3 }}>{hexError}</Txt> : null}

        <Txt size={9.5} mut style={{ marginTop: 8 }}>RGB</Txt>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          {(['r', 'g', 'b'] as const).map((channel) => (
            <View key={channel} style={{ flex: 1 }}>
              <Txt size={9} mut>{channel.toUpperCase()}</Txt>
              <TextInput
                value={String(rgbInput[channel])}
                onChangeText={(text) => updateRgb(channel, text)}
                editable={!disabled}
                keyboardType="number-pad"
                maxLength={3}
                style={{ ...fieldStyle, marginTop: 4, textAlign: 'center' }}
              />
            </View>
          ))}
        </View>
        <Txt size={9} mut style={{ marginTop: 4 }}>RGB values range from 0 to 255.</Txt>
      </View>
    </View>
  );
}
