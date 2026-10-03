import { Parrot } from './Parrot'

/** Wordmark + mark. The design owner replaces the art. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="logo">
      <Parrot size={size} />
      <span className="logo-word">parrotype</span>
    </span>
  )
}
