import { useId } from 'react';

/** Labeled, wrapping buttons: native keyboard behavior, no hover-only actions. */
export default function SectionPicker<T extends string>({ label, options, value, onChange }: {
  label: string;
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const id = useId();
  return <div className="section-picker" role="group" aria-labelledby={id}>
    <span id={id} className="section-picker-label">{label}</span>
    <div>{options.map(option => <button key={option.id} type="button" aria-pressed={value === option.id} onClick={() => onChange(option.id)}>{option.label}</button>)}</div>
  </div>;
}
