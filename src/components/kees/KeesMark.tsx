/**
 * Kees's head as the brand mark (design-not-ai.md §4.5): head, crest, hooked kea beak,
 * monocled eye and the underwing crescent. Same drawing and pivots as the full Kees, so the
 * logo and the mascot are one character. Colours come from the theme's --kees-* tokens.
 */
export function KeesMark({ size = 28, className = '', label }: { size?: number; className?: string; label?: string }) {
  const tiny = size < 22
  return (
    <svg
      className={`kees-mark ${className}`.trim()}
      width={size}
      height={size}
      viewBox="31 4.5 57 57"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {!tiny && (
        <g fill="var(--kees-shade)">
          <path d="M41.5 27 C37.5 24.5 34.5 21 33.5 17 C38 17.5 42.5 20 45.5 23.5 Z" />
          <path d="M45 21.5 C42.5 17.5 41.5 13.5 42 9.5 C46 11.5 49 15 50.5 19 Z" />
          <path d="M50.5 18 C50.5 13.5 52 10 54.5 7.2 C56 11 56.5 14.5 56 18 Z" />
        </g>
      )}
      <circle cx="56" cy="36" r={tiny ? 21.5 : 20} fill="var(--kees-head)" />
      <ellipse cx="55.5" cy="32" rx="9.5" ry="9" fill="var(--kees-face)" />
      {!tiny && <path d="M38.4 42.9 C41.6 52.4 48.9 56.5 56.2 56.2 C49.6 52.5 45.3 48.7 43.1 42.2 Z" fill="var(--kees-flash)" />}
      <path d="M66.5 39.5 C71 39.5 74.6 41 75.6 44 C72.6 46.8 68.6 46 65.6 43.6 Q64.8 41.4 66.5 39.5 Z" fill="var(--kees-beak-lo)" />
      <path
        d="M66 23.5 C77 22 85.5 30 86 42 C86.3 49 84.6 54.5 81.6 58.6 C81.4 51.5 79.2 45.4 75 41.6 C72.5 40.2 69.5 39.6 66.4 39.6 C63.6 34.4 63.4 28.6 66 23.5 Z"
        fill="var(--kees-beak)"
      />
      <circle cx="55" cy="31.6" r={tiny ? 6 : 5} fill="#F6F1E4" />
      <circle cx="55.8" cy="31.6" r={tiny ? 4.2 : 3.4} fill="var(--kees-eye)" />
      {!tiny && <circle cx="57.1" cy="30.2" r="1.2" fill="#FFFDF6" />}
      <circle
        cx="55"
        cy="31.6"
        r={tiny ? 9.2 : 8.4}
        fill="none"
        stroke="var(--kees-ring)"
        strokeWidth={tiny ? 4 : 3}
      />
    </svg>
  )
}
