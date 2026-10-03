import type { ComponentPropsWithRef } from 'react'

export interface SelectOption<T extends string> {
  value: T
  label: string
}

type Props<T extends string> = Omit<ComponentPropsWithRef<'select'>, 'onChange' | 'value'> & {
  options: SelectOption<T>[]
  value: T
  onChange: (v: T) => void
}

/** A native select in Parrotype clothes (keyboard and screen readers for free). */
export function Select<T extends string>({ options, value, onChange, className = '', ...rest }: Props<T>) {
  return (
    <select className={`select ${className}`.trim()} value={value} onChange={(e) => onChange(e.target.value as T)} {...rest}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
