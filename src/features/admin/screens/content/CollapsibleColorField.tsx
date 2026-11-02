import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Txt } from '../../ui/Txt';

/** Keeps the large color controls out of the way until the editor explicitly opens them. */
export function CollapsibleColorField({ label, value, disabled = false, children }: {
  label: string;
  value: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={{ marginTop: 8, marginBottom: 10 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded, disabled }}
        accessibilityLabel={label + ', current color ' + value + '. ' + (expanded ? 'Collapse' : 'Expand') + ' color editor'}
        disabled={disabled}
        onPress={() => setExpanded((open) => !open)}
        style={{ minHeight: 44, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#D8D8DE', borderRadius: 10, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 9 }}
      >
        <View style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: value, borderWidth: 1, borderColor: '#B8B8C0' }} />
        <View style={{ flex: 1 }}>
          <Txt size={10.5} weight={600}>{label}</Txt>
          <Txt size={9} mut>{value.toUpperCase()} · Tap to edit color</Txt>
        </View>
        <Txt size={10} weight={600} color="#5B5365">{expanded ? 'Hide color tools  ⌃' : 'Edit color  ⌄'}</Txt>
      </Pressable>
      {expanded ? <View style={{ marginTop: 8 }}>{children}</View> : null}
    </View>
  );
}
