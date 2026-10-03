// Builds the README artwork: Kees SVGs, the two diagrams (light + dark) and the hero banner.
//   node scripts/readme/build-assets.mjs
// Diagrams embed the app's own fonts (Recursive) so they look the same on every machine.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'

const root = new URL('../../', import.meta.url)
const out = new URL('docs/readme/', root)
mkdirSync(out, { recursive: true })

const THEMES = {
  dark: {
    bg: '#272318', surface: '#312C1F', border: '#4A4433', text: '#EEE8D8', sub: '#9D957B', caret: '#B9CC5E',
    main: '#DDBE4F', error: '#FF9A6E', grammar: '#8EC3EA', ok: '#A3B860',
    head: '#8CA14A', body: '#7E9242', shade: '#5C6E2E', face: '#8CA14A', beak: '#D9D2C3', beakLo: '#A39B8A',
    ring: '#E7C653', flash: '#FF6A3D', flash2: '#F2A93B', eye: '#1C1A12',
  },
  light: {
    bg: '#E6E9D8', surface: '#DADEC9', border: '#B9BEA4', text: '#272318', sub: '#625E4C', caret: '#4E6018',
    main: '#6A4E0F', error: '#A32900', grammar: '#1D5486', ok: '#45561C',
    head: '#6C803A', body: '#627535', shade: '#46562A', face: '#6C803A', beak: '#4A463F', beakLo: '#2E2B26',
    ring: '#B08A1E', flash: '#D73202', flash2: '#E08A12', eye: '#1C1A12',
  },
}

const font = (file) => readFileSync(new URL(`public/fonts/${file}`, root)).toString('base64')
const FONTS = `@font-face{font-family:'RS';src:url(data:font/woff2;base64,${font('rec-sans.woff2')}) format('woff2');font-weight:300 1000}
@font-face{font-family:'RM';src:url(data:font/woff2;base64,${font('rec-mono-linear.woff2')}) format('woff2')}`
const SANS = `'RS', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif`
const MONO = `'RM', ui-monospace, 'SFMono-Regular', Menlo, monospace`

/* ---------------- Kees (static port of src/components/kees/KeesArt.tsx, detail 'l') ---------------- */

export function keesSvg(c, { size = 100, flash = false } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="Kees the kea">
<path d="M38 80 C31 86 23 93 16 98.5 C19.5 99.6 22.5 99.6 25 98.8 C31 94 37 89 43 85 Z" fill="${c.shade}"/>
<path d="M42 82 C37 88 32 94 28 99 C31 99.5 33.5 99 35.5 97.8 C39 93 43 89 47 86 Z" fill="${c.body}"/>
<g fill="none" stroke="${c.beakLo}" stroke-width="2.4" stroke-linecap="round"><path d="M45 89.5 C45 93 46.5 95 49.5 95.2"/><path d="M54 88.6 C54 92.2 55.5 94.2 58.5 94.4"/></g>
<path d="M44 46 C30 52 24 70 30 84 C34 92 46 95 55 90 C64 84 67 70 64 58 C62 50 56 46 50 45 Z" fill="${c.body}"/>
<path d="M55.5 63 q3 2.2 6 0 M54.5 70 q3 2.2 6 0 M51.5 77 q3 2.2 6 0" fill="none" stroke="${c.shade}" stroke-width="1.1" stroke-linecap="round" opacity=".55"/>
<path d="M52 50 C43 53 35 64 31.5 85 C38.5 79 46 70 53.5 60 Z" fill="${c.flash}"/>
<path d="M52 50 C46.5 56 41 66 38.5 80 C44.5 74 50 64 54.5 56 Z" fill="${c.flash2}"/>
<g${flash ? ' transform="rotate(-28 53 50)"' : ''}>
<path d="M52.5 48.5 C38 50 28 66 24.5 95 C34 90 46 80 54 66 C57.5 60 57 52 52.5 48.5 Z" fill="${c.shade}"/>
<g fill="none" stroke="${c.body}" stroke-width="1.2" stroke-linecap="round" opacity=".7"><path d="M47.5 62 C42 70 36 79 31.5 88"/><path d="M51.5 58 C47.5 66 42.5 74 37.5 82"/></g>
</g>
<g fill="${c.shade}"><path d="M41.5 27 C37.5 24.5 34.5 21 33.5 17 C38 17.5 42.5 20 45.5 23.5 Z"/><path d="M45 21.5 C42.5 17.5 41.5 13.5 42 9.5 C46 11.5 49 15 50.5 19 Z"/><path d="M50.5 18 C50.5 13.5 52 10 54.5 7.2 C56 11 56.5 14.5 56 18 Z"/></g>
<circle cx="56" cy="36" r="20" fill="${c.head}"/>
<ellipse cx="55.5" cy="32" rx="9.5" ry="9" fill="${c.face}"/>
<circle cx="55" cy="31.6" r="4.9" fill="#F6F1E4"/><circle cx="55.7" cy="31.6" r="3.3" fill="${c.eye}"/><circle cx="57" cy="30.2" r="1.15" fill="#FFFDF6"/>
<path d="M66.5 39.5 C71 39.5 74.6 41 75.6 44 C72.6 46.8 68.6 46 65.6 43.6 Q64.8 41.4 66.5 39.5 Z" fill="${c.beakLo}"/>
<path d="M66 23.5 C77 22 85.5 30 86 42 C86.3 49 84.6 54.5 81.6 58.6 C81.4 51.5 79.2 45.4 75 41.6 C72.5 40.2 69.5 39.6 66.4 39.6 C63.6 34.4 63.4 28.6 66 23.5 Z" fill="${c.beak}"/>
<circle cx="70" cy="27.4" r="1" fill="${c.beakLo}"/>
<path d="M50.8 37.6 C45 44 46.5 54 55 60.5" fill="none" stroke="${c.ring}" stroke-width="1.2" stroke-linecap="round" stroke-dasharray="0.01 2.4"/>
<path d="M55 23.6 V18.4" fill="none" stroke="${c.ring}" stroke-width="1.2" stroke-linecap="round" stroke-dasharray="0.01 2.4"/>
<circle cx="55" cy="31.6" r="8" fill="${c.ring}" fill-opacity=".14" stroke="${c.ring}" stroke-width="2.4"/>
<path d="M50.2 28.2 A5.6 5.6 0 0 1 53.6 25.6" fill="none" stroke="#FFFDF6" stroke-opacity=".7" stroke-width="1" stroke-linecap="round"/>
</svg>`
}

/* ---------------- diagram helpers ---------------- */

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
// rough advance widths for Recursive at these sizes (good enough for chip sizing)
const textW = (s, size, mono = false) => [...s].length * size * (mono ? 0.6 : 0.56)

function svgDoc(c, w, h, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img">
<style>${FONTS}
.t{font-family:${SANS};fill:${c.text}}.s{font-family:${SANS};fill:${c.sub}}.m{font-family:${MONO};fill:${c.text}}
</style>
<defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1 L9 5 L1 9" fill="none" stroke="${c.sub}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>
<rect width="${w}" height="${h}" rx="10" fill="${c.bg}"/>
${body}
</svg>`
}

const box = (c, x, y, w, h, { dashed = false, fill = c.surface, stroke = c.border } = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="1.2"${dashed ? ' stroke-dasharray="5 4"' : ''}/>`
const label = (x, y, s, { size = 15, cls = 't', weight = 600, anchor = 'start' } = {}) =>
  `<text x="${x}" y="${y}" class="${cls}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}">${esc(s)}</text>`
function chip(c, x, y, s, { color = c.text, mono = false, under = null } = {}) {
  const size = 12.5
  const w = textW(s, size, mono) + 18
  const u = under === 'wavy'
    ? `<path d="M${x + 9} ${y + 19} q2 -2.4 4 0 t4 0 t4 0 t4 0 t4 0 t4 0 t4 0" fill="none" stroke="${c.error}" stroke-width="1.2"/>`
    : under === 'dashed'
      ? `<path d="M${x + 9} ${y + 19.5} H${x + w - 9}" stroke="${c.grammar}" stroke-width="1.4" stroke-dasharray="3 2.5"/>`
      : ''
  return { w, svg: `<rect x="${x}" y="${y}" width="${w}" height="24" rx="12" fill="none" stroke="${c.border}" stroke-width="1.1"/>
<text x="${x + 9}" y="${y + 16.5}" font-family="${mono ? MONO : SANS}" font-size="${size}" fill="${color}">${esc(s)}</text>${u}` }
}
function chips(c, x, y, list, opts = {}) {
  let cx = x
  return list.map((s) => {
    const ch = chip(c, cx, y, s, opts)
    cx += ch.w + 8
    return ch.svg
  }).join('\n')
}
const arrow = (x1, y1, x2, y2, { dashed = false } = {}) =>
  `<path d="M${x1} ${y1} C${(x1 + x2) / 2} ${y1} ${(x1 + x2) / 2} ${y2} ${x2} ${y2}" fill="none" stroke="currentColor" stroke-width="1.6"${dashed ? ' stroke-dasharray="5 4"' : ''} marker-end="url(#a)"/>`

/* ---------------- diagram 1: how mistakes are caught ---------------- */

function pipeline(c) {
  const W = 980, H = 500
  const b = []
  b.push(`<g color="${c.sub}">`)
  // inputs
  b.push(label(28, 44, 'what you type', { cls: 's', size: 13, weight: 500 }))
  b.push(box(c, 28, 58, 210, 74), label(44, 86, 'Typing test, stories, drills'), label(44, 110, 'the target text is known', { cls: 's', size: 13, weight: 400 }))
  b.push(box(c, 28, 146, 210, 74), label(44, 174, 'Parrot says'), label(44, 198, 'heard, not seen: spelling', { cls: 's', size: 13, weight: 400 }))
  b.push(box(c, 28, 300, 210, 74), label(44, 328, 'Free writing'), label(44, 352, 'your own sentences', { cls: 's', size: 13, weight: 400 }))
  // known-text lane
  b.push(label(300, 44, 'known text', { cls: 's', size: 13, weight: 500 }))
  b.push(box(c, 300, 58, 320, 162))
  b.push(label(318, 86, 'Character diff + alignment'), label(318, 108, 'Damerau-Levenshtein, split/merged words', { cls: 's', size: 13, weight: 400 }))
  b.push(label(318, 140, 'Slip classifier', { size: 14 }))
  b.push(chips(c, 318, 152, ['neighbour key', 'swapped', 'missed double']))
  b.push(chips(c, 318, 184, ["its/it's", 'then/than', 'a/an', 'hamza', 'taa marbuta'], { color: c.main }))
  // free-text lane
  b.push(label(300, 266, 'free text, in a Web Worker', { cls: 's', size: 13, weight: 500 }))
  b.push(box(c, 300, 280, 320, 196))
  b.push(label(318, 308, 'Hunspell (WASM)'), label(318, 330, 'OpenTaal · SCOWL · Ayaspell', { cls: 's', size: 13, weight: 400 }))
  b.push(chips(c, 318, 342, ['definately', 'recieve'], { under: 'wavy', mono: true }))
  b.push(label(318, 390, 'Grammar rule packs  nl · en · ar', { size: 14 }))
  b.push(chips(c, 318, 402, ['could of', 'its a', 'taller then'], { under: 'dashed', mono: true }))
  b.push(`<rect x="318" y="438" width="284" height="26" rx="13" fill="none" stroke="${c.border}" stroke-dasharray="5 4"/>`)
  b.push(label(330, 455.5, '+ LanguageTool, if you switch it on', { cls: 's', size: 12.5, weight: 400 }))
  // outputs
  b.push(label(780, 44, 'what you get', { cls: 's', size: 13, weight: 500 }))
  const outs = [
    ['Weak keys and bigrams', 'turned into focus drills'],
    ['Mistake nest', 'spaced repetition'],
    ['The fix, and why', 'English, Dutch or Arabic'],
    ['Stats', 'accuracy first, then speed'],
  ]
  outs.forEach(([t, s2], i) => {
    const y = 58 + i * 104
    b.push(box(c, 780, y, 176, 74), label(796, y + 30, t, { size: 14 }), label(796, y + 52, s2, { cls: 's', size: 12.5, weight: 400 }))
  })
  // arrows: inputs -> lanes, lanes -> outputs (no crossings)
  b.push(arrow(238, 95, 298, 110), arrow(238, 183, 298, 160), arrow(238, 337, 298, 337))
  b.push(arrow(620, 95, 778, 95), arrow(620, 150, 778, 199), arrow(620, 200, 778, 290))
  b.push(arrow(620, 330, 778, 310), arrow(620, 420, 778, 395))
  b.push('</g>')
  return svgDoc(c, W, H, b.join('\n'))
}

/* ---------------- diagram 2: how the voices are made ---------------- */

function voices(c) {
  const W = 1030, H = 300
  const steps = [
    ['Dictation', 'nl · en · ar sentences,', 'each trains a trap'],
    ['Gemini 3.8 TTS', 'designed mascot voices', '+ native voices'],
    ['Listen back', 'Gemini transcribes it,', 'any wrong word: redo'],
    ['Trim + level', 'silence off, loudness', 'even, MP3 32 kbps'],
    ['In the app', 'a mix of voices,', 'slow mode, fallback'],
  ]
  const b = [`<g color="${c.sub}">`]
  const w = 182, gap = 20, y = 70
  steps.forEach(([t, s1, s2], i) => {
    const x = 24 + i * (w + gap)
    b.push(box(c, x, y, w, 112, i === 1 || i === 2 ? { stroke: c.main } : {}))
    b.push(label(x + 14, y + 32, t, { size: 14.5 }))
    b.push(label(x + 14, y + 60, s1, { cls: 's', size: 12.5, weight: 400 }), label(x + 14, y + 80, s2, { cls: 's', size: 12.5, weight: 400 }))
    if (i < steps.length - 1) b.push(arrow(x + w + 2, y + 56, x + w + gap - 2, y + 56))
  })
  b.push(label(28, 44, 'one-off, at build time (scripts/tts)', { cls: 's', size: 13, weight: 500 }))
  // voices row
  const vy = 214
  b.push(label(28, vy + 6, 'voices', { cls: 's', size: 13, weight: 500 }))
  b.push(chips(c, 90, vy - 11, ['Kees', 'Lies', 'Ans', 'Riet', 'Fleur', 'Daan'], { color: c.text }))
  b.push(chips(c, 90, vy + 21, ['Monty', 'Ollie', 'the narrator', 'Miss Hale', 'June', 'Walt'], { color: c.text }))
  b.push(chips(c, 90, vy + 53, ['فستق Fustuq', 'Huda', 'Layla', 'Nour', 'Salma', 'Sami', 'Karim', 'Omar'], { color: c.text }))
  b.push(label(1004, vy + 6, 'nl', { cls: 's', size: 12, anchor: 'end', weight: 500 }), label(1004, vy + 38, 'en', { cls: 's', size: 12, anchor: 'end', weight: 500 }), label(1004, vy + 70, 'ar', { cls: 's', size: 12, anchor: 'end', weight: 500 }))
  b.push('</g>')
  return svgDoc(c, W, H + 30, b.join('\n'))
}

/* ---------------- write SVGs ---------------- */

for (const [name, c] of Object.entries(THEMES)) {
  writeFileSync(new URL(`kees-${name}.svg`, out), keesSvg(c, { size: 160 }))
  writeFileSync(new URL(`kees-flash-${name}.svg`, out), keesSvg(c, { size: 160, flash: true }))
  writeFileSync(new URL(`pipeline-${name}.svg`, out), pipeline(c))
  writeFileSync(new URL(`voices-${name}.svg`, out), voices(c))
}

/* ---------------- hero banner (PNG, rendered with the real fonts) ---------------- */

const require = createRequire('/opt/node22/lib/node_modules/')
const { chromium } = require('playwright')
const fontUrl = (f) => `data:font/woff2;base64,${font(f)}`

function heroHtml(c, scheme) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Caprasimo;src:url(${fontUrl('caprasimo.woff2')})}
@font-face{font-family:RS;src:url(${fontUrl('rec-sans.woff2')})}
@font-face{font-family:RM;src:url(${fontUrl('rec-mono-linear.woff2')})}
@font-face{font-family:Bubble;src:url(${fontUrl('shantell-bubble.woff2')})}
html,body{margin:0;background:${c.bg};color-scheme:${scheme}}
.wrap{width:1280px;height:520px;box-sizing:border-box;padding:64px 88px;display:grid;grid-template-columns:1fr 300px;align-items:center;gap:40px}
h1{font-family:Caprasimo;font-weight:400;font-size:104px;line-height:1;margin:0;color:${c.text};letter-spacing:-1px}
h1 .q{display:inline-block;width:8px;height:84px;background:${c.caret};margin-left:10px;border-radius:4px;vertical-align:-6px}
p{font-family:RS;font-size:26px;line-height:1.45;color:${c.sub};margin:22px 0 34px;max-width:720px}
.type{font-family:RM;font-size:34px;letter-spacing:.5px;font-variant-ligatures:none;font-feature-settings:"liga" 0,"calt" 0,"locl" 0}
.caret{display:inline-block;width:3px;height:40px;background:${c.caret};vertical-align:-8px;margin:0 1px;border-radius:2px}
.langs{font-family:RS;font-size:18px;color:${c.sub};margin-top:26px;letter-spacing:.3px}
.langs b{color:${c.main};font-weight:600}
.bubble{font-family:Bubble;font-size:24px;color:${c.text};background:${c.surface};border:1.5px solid ${c.border};border-radius:18px;padding:12px 18px;display:inline-block;margin-bottom:14px}
.kees{display:flex;flex-direction:column;align-items:center}
</style></head><body><div class="wrap"><div>
<h1>parrotype<span class="q"></span></h1>
<p>Typing, spelling and grammar practice for people who make typos. Dutch, English and Arabic, accuracy first.</p>
<div class="type"><span style="color:${c.text}">she is taller</span> <span style="color:${c.text};text-decoration:underline;text-decoration-color:${c.error};text-decoration-thickness:3px;text-underline-offset:9px">th<span style="color:${c.error}">e</span>n</span> <span class="caret"></span><span style="color:${c.sub}">me</span></div>
<div class="langs">nl &nbsp;·&nbsp; <b>en</b> &nbsp;·&nbsp; ar &nbsp;&nbsp; typing test · parrot says · write · grammar gym · fix it · stories</div>
</div><div class="kees"><div class="bubble">than. than. than.</div>${keesSvg(c, { size: 270 })}</div></div></body></html>`
}

const browser = await chromium.launch()
for (const [name, c] of Object.entries(THEMES)) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 520 }, deviceScaleFactor: 2 })
  await page.setContent(heroHtml(c, name))
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300)
  await page.screenshot({ path: new URL(`hero-${name}.png`, out).pathname })
  await page.close()
}
await browser.close()
console.log('README assets written to docs/readme/')
