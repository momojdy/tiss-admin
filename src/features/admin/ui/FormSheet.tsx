import { ReactNode, useCallback, useState } from 'react';
import { Pressable, ScrollView, Switch, TextInput, View, TextInputProps } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { DialogCard, useOverlay } from './Overlay';
import { Txt } from './Txt';

export type FieldType = 'text' | 'email' | 'number' | 'date' | 'datetime-local' | 'textarea' | 'select' | 'check' | 'password';
export interface FieldSpec {
  id: string; label: string; type: FieldType; options?: string[]; required?: boolean; value?: string | number | boolean | null; placeholder?: string; maxLength?: number;
}
export interface FormButton { label: string; key: string; primary?: boolean }
export type FormValues = Record<string, string | boolean>;
/** Return a message to show an error and keep the form open; return nothing to close it. */
export type FormSubmit = (key: string, values: FormValues) => string | void | Promise<string | void>;

export interface FormConfig { title: string; fields: FieldSpec[]; buttons: FormButton[]; sub?: string; onSubmit?: FormSubmit }

/** `form(title, fields, buttons, sub, submit)` from the HTML as a hook. */
export function useForm() {
  const { openDialog } = useOverlay();
  return useCallback((cfg: FormConfig) => openDialog((close) => <FormSheet {...cfg} onClose={close} />), [openDialog]);
}

export function Field({ spec, value, onChange }: { spec: FieldSpec; value: string | boolean; onChange: (v: string | boolean) => void }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const label = spec.label + (spec.required ? ' *' : '');
  if (spec.type === 'check') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <Switch value={!!value} onValueChange={(v) => onChange(v)} trackColor={{ true: c.gr, false: c.inset }} accessibilityLabel={spec.label} />
        <Txt size={12} style={{ flex: 1 }}>{spec.label}</Txt>
      </View>
    );
  }
  const base = { backgroundColor: c.inset, borderColor: c.bd, borderWidth: 1, borderRadius: 12, padding: 10, color: c.ink, fontSize: 16, marginBottom: 6 };
  const kb: Partial<TextInputProps> =
    spec.type === 'email' ? { keyboardType: 'email-address', autoCapitalize: 'none', autoCorrect: false }
    : spec.type === 'number' ? { keyboardType: 'decimal-pad' }
    : spec.type === 'password' ? { secureTextEntry: true, autoCapitalize: 'none' }
    : spec.type === 'date' ? { placeholder: 'YYYY-MM-DD', keyboardType: 'numbers-and-punctuation' }
    : spec.type === 'datetime-local' ? { placeholder: 'YYYY-MM-DDTHH:MM' } : {};
  return (
    <View>
      <Txt size={12} mut style={{ marginTop: 6, marginBottom: 3 }}>{label}</Txt>
      {spec.type === 'select' ? (
        <View style={{ marginBottom: 6 }}>
          <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityLabel={spec.label} style={[base, { marginBottom: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
            <Txt size={16}>{String(value)}</Txt><Txt size={12} mut>{open ? '▴' : '▾'}</Txt>
          </Pressable>
          {open ? (
            <View style={{ borderColor: c.bd, borderWidth: 1, borderRadius: 12, marginTop: 4, backgroundColor: c.card, overflow: 'hidden', maxHeight: 220 }}>
              {/* scrollable so lists longer than ~5 options stay reachable */}
              <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {(spec.options ?? []).map((o) => (
                  <Pressable key={o} onPress={() => { onChange(o); setOpen(false); }} style={{ padding: 10, backgroundColor: o === value ? c.inset : 'transparent' }}>
                    <Txt size={14}>{o}</Txt>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>
      ) : (
        <TextInput
          value={String(value ?? '')} onChangeText={onChange} accessibilityLabel={spec.label}
          placeholder={spec.placeholder} placeholderTextColor={c.mut} maxLength={spec.maxLength}
          multiline={spec.type === 'textarea'} numberOfLines={spec.type === 'textarea' ? 3 : 1}
          style={[base, spec.type === 'textarea' ? { minHeight: 76, textAlignVertical: 'top' } : null]} {...kb}
        />
      )}
    </View>
  );
}

export function FormSheet({ title, fields, buttons, sub, onSubmit, onClose }: FormConfig & { onClose: () => void }) {
  const { c } = useTheme();
  const [vals, setVals] = useState<FormValues>(() => {
    const v: FormValues = {};
    fields.forEach((f) => { v[f.id] = f.type === 'check' ? !!f.value : f.value == null ? (f.type === 'select' ? (f.options?.[0] ?? '') : '') : String(f.value); });
    return v;
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const press = async (b: FormButton) => {
    if (busy) return;
    const out: FormValues = {};
    let e = '';
    fields.forEach((f, i) => {
      const raw = vals[f.id];
      out[f.id] = typeof raw === 'string' ? raw.trim() : raw;
      // drafts (keys starting with 'd') only require the first field, as in the HTML
      if (!e && f.required && (!b.key.startsWith('d') || i === 0) && !out[f.id]) e = `${f.label} is required.`;
    });
    if (!e && onSubmit) {
      setBusy(true);
      try { e = (await onSubmit(b.key, out)) || ''; }
      catch (error) { e = error instanceof Error ? error.message : 'The operation failed. Try again.'; }
      finally { setBusy(false); }
    }
    if (e) { setErr(e); return; }
    onClose();
  };
  return (
    <DialogCard title={title} onClose={onClose}>
      {sub ? <Txt size={12} mut lh={1.4} style={{ marginBottom: 6 }}>{sub}</Txt> : null}
      {fields.map((f) => <Field key={f.id} spec={f} value={vals[f.id]} onChange={(v) => { setVals((s) => ({ ...s, [f.id]: v })); if (err) setErr(''); }} />)}
      <View style={{ minHeight: 16, marginVertical: 4 }} accessibilityLiveRegion="polite">{err ? <Txt size={12} color={c.or}>{err}</Txt> : null}</View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
        <Pressable onPress={onClose} accessibilityRole="button" style={{ flex: 1, alignItems: 'center', padding: 11, borderRadius: 99, borderWidth: 1, borderColor: c.bd }}><Txt size={10.1}>Cancel</Txt></Pressable>
        {buttons.map((b) => (
          <Pressable key={b.key} onPress={() => { void press(b); }} disabled={busy} accessibilityRole="button" style={{ flex: 1, alignItems: 'center', padding: 11, borderRadius: 99, borderWidth: b.primary ? 0 : 1, borderColor: c.bd, backgroundColor: b.primary ? c.ink : 'transparent', opacity: busy ? 0.6 : 1 }}>
            <Txt size={10.1} color={b.primary ? c.on : c.ink}>{b.label}</Txt>
          </Pressable>
        ))}
      </View>
    </DialogCard>
  );
}

export const Note = ({ children }: { children: ReactNode }) => <Txt size={12} mut lh={1.4} style={{ marginBottom: 6 }}>{children}</Txt>;
