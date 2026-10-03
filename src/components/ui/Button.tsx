import type { ComponentPropsWithRef } from 'react'

type Props = ComponentPropsWithRef<'button'> & {
  variant?: 'primary' | 'ghost' | 'subtle' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

/** One primary per screen at most. Labels say what happens: "Again", "Practise these 6 words". */
export function Button({ variant = 'subtle', size = 'md', className = '', type = 'button', ...rest }: Props) {
  return <button type={type} className={`btn btn-${variant} btn-${size} ${className}`.trim()} {...rest} />
}
