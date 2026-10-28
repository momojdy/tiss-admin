import { ReactNode } from 'react';
import { Modal, Pressable, TextInput, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Pill } from '../../ui/Controls';
import { Txt } from '../../ui/Txt';

type DateRangeModalsProps = {
  customOpen: boolean;
  onCloseCustom: () => void;
  customStart: string;
  onChangeStart: (value: string) => void;
  customEnd: string;
  onChangeEnd: (value: string) => void;
  rangeError: string;
  onApply: () => void;
  customTitle: string;
  customDescription: string;
  expandedOpen: boolean;
  onCloseExpanded: () => void;
  chartTitle: string;
  rangeLabel: string;
  totalLabel: string;
  chartContent: ReactNode;
};

export function DateRangeModals({
  customOpen, onCloseCustom, customStart, onChangeStart, customEnd, onChangeEnd,
  rangeError, onApply, customTitle, customDescription, expandedOpen, onCloseExpanded,
  chartTitle, rangeLabel, totalLabel, chartContent,
}: DateRangeModalsProps) {
  const { c } = useTheme();
  return (
    <>
      <Modal transparent visible={customOpen} animationType="fade" onRequestClose={onCloseCustom}>
        <Pressable onPress={onCloseCustom} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.42)', justifyContent: 'center', padding: 20 }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: c.card, borderRadius: 16, padding: 18, gap: 10 }}>
            <Txt size={16} weight={600}>{customTitle}</Txt>
            <Txt size={10.1} mut>{customDescription}</Txt>
            <Txt size={10.1} mut>Start date (YYYY-MM-DD)</Txt>
            <TextInput value={customStart} onChangeText={onChangeStart} placeholder="2026-09-20" placeholderTextColor={c.mut} autoCapitalize="none" style={{ color: c.ink, borderWidth: 1, borderColor: c.bd, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 10, fontSize: 13 }} />
            <Txt size={10.1} mut>End date (YYYY-MM-DD)</Txt>
            <TextInput value={customEnd} onChangeText={onChangeEnd} placeholder="2026-10-17" placeholderTextColor={c.mut} autoCapitalize="none" style={{ color: c.ink, borderWidth: 1, borderColor: c.bd, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 10, fontSize: 13 }} />
            {rangeError ? <Txt size={10.1} color={c.or}>{rangeError}</Txt> : null}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <Pill onPress={onCloseCustom}>Cancel</Pill>
              <Pill onPress={onApply}>Apply range</Pill>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal transparent visible={expandedOpen} animationType="fade" onRequestClose={onCloseExpanded}>
        <Pressable onPress={onCloseExpanded} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.48)', justifyContent: 'center', padding: 14 }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: c.card, borderRadius: 16, padding: 18, gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Txt size={16} weight={600}>{chartTitle}</Txt>
              <Pill onPress={onCloseExpanded}>Close ×</Pill>
            </View>
            <Txt size={10.1} mut>{rangeLabel}</Txt>
            <Txt size={23} weight={600}>{totalLabel}</Txt>
            {chartContent}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
