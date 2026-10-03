import { describe, expect, test } from 'vitest'
import { THEMES, TEXT_TOKENS, getTheme, resolveTheme, themeName, THEME_CHOICES } from './themes'

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)

const luminance = (hex: string) => {
  const [r, g, b] = channels(hex).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const ratio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((m, n) => n - m)
  return (hi + 0.05) / (lo + 0.05)
}

/** HSL hue (degrees) and saturation (0-100), same maths as Krebs' slop detector. */
const hsl = (hex: string) => {
  const [r, g, b] = channels(hex)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return { h: 0, s: 0, l: l * 100 }
  const s = d / (1 - Math.abs(2 * l - 1))
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  h *= 60
  if (h < 0) h += 360
  return { h, s: s * 100, l: l * 100 }
}

describe('themes', () => {
  test('six themes, unique ids, kea-dark first', () => {
    expect(THEMES).toHaveLength(6)
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(6)
    expect(THEMES[0].id).toBe('kea-dark')
    expect(THEME_CHOICES[0].id).toBe('auto')
  })

  test('every theme defines the same token set', () => {
    const keys = Object.keys(THEMES[0].colors).sort()
    for (const t of THEMES) expect(Object.keys(t.colors).sort()).toEqual(keys)
  })

  test('every value is a 6-digit hex colour', () => {
    for (const t of THEMES) for (const v of Object.values(t.colors)) expect(v).toMatch(/^#[0-9a-f]{6}$/i)
  })

  for (const t of THEMES) {
    for (const k of TEXT_TOKENS) {
      for (const surf of ['--bg', '--surface'] as const) {
        test(`${t.id}: ${k} on ${surf} is at least 4.5:1`, () => {
          expect(ratio(t.colors[k], t.colors[surf])).toBeGreaterThanOrEqual(4.5)
        })
      }
    }
    for (const surf of ['--bg', '--surface'] as const) {
      test(`${t.id}: caret on ${surf} is at least 3:1`, () => {
        expect(ratio(t.colors['--caret'], t.colors[surf])).toBeGreaterThanOrEqual(3)
      })
    }
    test(`${t.id}: body text is at least 7:1 (no "perma dark" grey text)`, () => {
      expect(ratio(t.colors['--text'], t.colors['--bg'])).toBeGreaterThanOrEqual(7)
    })
    test(`${t.id}: primary button text (--bg on --main) is at least 4.5:1`, () => {
      expect(ratio(t.colors['--bg'], t.colors['--main'])).toBeGreaterThanOrEqual(4.5)
    })
    test(`${t.id}: no vibe-coded purple (hue 250-300, saturation > 25%)`, () => {
      for (const [k, v] of Object.entries(t.colors)) {
        const { h, s } = hsl(v)
        const purple = h >= 250 && h <= 300 && s > 25
        expect(purple, `${k} ${v} h=${h.toFixed(0)} s=${s.toFixed(0)}`).toBe(false)
      }
    })
    test(`${t.id}: background is tinted, never pure black or white`, () => {
      expect(t.colors['--bg'].toLowerCase()).not.toMatch(/^#(000000|ffffff)$/)
    })
  }

  test('unknown ids fall back to kea-dark', () => {
    expect(getTheme('serika_dark').id).toBe('kea-dark')
    expect(resolveTheme('').id).toBe('kea-dark')
    expect(resolveTheme('macaw').id).toBe('kea-dark')
  })

  test('auto resolves to a kea theme', () => {
    expect(['kea-dark', 'kea-light']).toContain(resolveTheme('auto').id)
    expect(themeName('auto')).toMatch(/^auto, kea (dark|light)$/)
    expect(themeName('lorikeet-light')).toBe('lorikeet light')
  })
})
