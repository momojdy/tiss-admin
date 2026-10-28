import { SelectMenu } from '../../ui/Controls';

export function FeaturePicker<T extends string>({ options, value, onChange, label = 'Customer feature' }: { options: readonly T[]; value: T; onChange: (value: T) => void; label?: string }) {
  return <SelectMenu label={label} options={options} value={value} onChange={onChange} />;
}
