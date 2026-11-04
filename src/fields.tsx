export function NumericField({
  label,
  value,
  suffix,
  min = 0,
  max,
  step = 1,
  hint,
  onChange,
}: {
  label: string
  value: number
  suffix: string
  min?: number
  max?: number
  step?: number
  hint?: string
  onChange: (value: number) => void
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="input-shell">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          inputMode="decimal"
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span>{suffix}</span>
      </span>
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function SegmentedField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="segmented">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={option.value === value ? 'segment active' : 'segment'}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </span>
    </label>
  )
}

export function CheckboxField({
  label,
  checked,
  hint,
  onChange,
}: {
  label: string
  checked: boolean
  hint?: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="field checkbox-field">
      <span className="checkbox-shell">
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <span className="field-label">{label}</span>
      </span>
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}
