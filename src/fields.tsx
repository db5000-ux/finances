import { useEffect, useState } from 'react'

const groupInteger = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })
const groupDecimal = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 })

function formatDisplay(value: number, allowDecimal: boolean): string {
  if (!Number.isFinite(value)) return ''
  return (allowDecimal ? groupDecimal : groupInteger).format(value)
}

function formatPlain(value: number, allowDecimal: boolean): string {
  if (!Number.isFinite(value)) return ''
  if (!allowDecimal) return String(Math.round(value))
  return String(Math.round(value * 100) / 100).replace('.', ',')
}

// Чистит ввод и убирает лишний ноль впереди числа — иначе после сброса поля
// в 0 следующая цифра печатается после него ("05") вместо замены.
function sanitizeTyped(raw: string, allowDecimal: boolean): string {
  let cleaned = raw.replace(/[^\d,.\s]/g, '').replace(/\s/g, '')
  if (allowDecimal) {
    cleaned = cleaned.replace('.', ',')
    const firstComma = cleaned.indexOf(',')
    if (firstComma !== -1) {
      cleaned = cleaned.slice(0, firstComma + 1) + cleaned.slice(firstComma + 1).replace(/,/g, '')
    }
  } else {
    cleaned = cleaned.replace(/[,.]/g, '')
  }
  return cleaned.replace(/^0+(?=\d)/, '')
}

function parseTyped(text: string): number {
  const n = Number(text.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

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
  const allowDecimal = !Number.isInteger(step)
  const [focused, setFocused] = useState(false)
  const [text, setText] = useState(() => formatDisplay(value, allowDecimal))

  useEffect(() => {
    if (!focused) setText(formatDisplay(value, allowDecimal))
  }, [value, focused, allowDecimal])

  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="input-shell">
        <input
          type="text"
          inputMode={allowDecimal ? 'decimal' : 'numeric'}
          value={text}
          min={min}
          max={max}
          step={step}
          onFocus={() => {
            setFocused(true)
            setText(formatPlain(value, allowDecimal))
          }}
          onChange={(event) => {
            const cleaned = sanitizeTyped(event.target.value, allowDecimal)
            setText(cleaned)
            onChange(parseTyped(cleaned))
          }}
          onBlur={() => setFocused(false)}
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
