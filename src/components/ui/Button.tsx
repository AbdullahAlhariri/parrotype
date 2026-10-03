import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'subtle' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({ variant = 'subtle', size = 'md', className = '', type = 'button', ...rest }: Props) {
  return <button type={type} className={`btn btn-${variant} btn-${size} ${className}`} {...rest} />
}
