// Screenshot helper for development: node scripts/shot.mjs <url> <out.png> [width] [height] [--dark|--light] [--type "text"] [--wait ms]
// Uses the globally installed Playwright + the preinstalled Chromium.
import { createRequire } from 'node:module'
const require = createRequire('/opt/node22/lib/node_modules/')
const { chromium } = require('playwright')

const args = process.argv.slice(2)
const flag = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args.splice(i, 2)[1] : undefined
}
const typeText = flag('--type')
const wait = Number(flag('--wait') ?? 400)
const scheme = args.includes('--light') ? 'light' : 'dark'
const [url, out = 'shot.png', w = '1280', h = '800'] = args.filter((a) => !a.startsWith('--'))

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) }, colorScheme: scheme })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(wait)
if (typeText) {
  await page.keyboard.type(typeText, { delay: 40 })
  await page.waitForTimeout(wait)
}
await page.screenshot({ path: out, fullPage: false })
await browser.close()
if (errors.length) console.log('page errors:\n' + errors.join('\n'))
console.log('saved', out)
