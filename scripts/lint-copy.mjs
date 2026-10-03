#!/usr/bin/env node
/**
 * Copy lint: flags banned marketing words, sparkle/rocket emoji and the em dash (U+2014) in UI copy.
 *
 *   node scripts/lint-copy.mjs            # src/ and index.html
 *   node scripts/lint-copy.mjs src/features/write
 *
 * What counts as copy: string and template literals and JSX text in .ts/.tsx, `content:`
 * strings in .css, text and attribute values in .html. Comments, regex literals, identifiers
 * and *.test.ts(x) files are ignored. Practice content (src/content/**) is only checked for
 * em dashes, since a story may honestly say "journey". Silence one line with: copy-lint-ignore
 * Exits 1 and lists every hit.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative, resolve, extname, sep } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const BANNED = [
  /\bunlock(s|ed|ing)?\b/i,
  /\bunleash(es|ed|ing)?\b/i,
  /\bsupercharg(e|es|ed|ing)\b/i,
  /\belevat(e|es|ed|ing)\b/i,
  /\bseamless(ly)?\b/i,
  /\beffortless(ly)?\b/i,
  /\bempower(s|ed|ing|ment)?\b/i,
  /\bjourneys?\b/i,
  /\bget started\b/i,
  /\blearn more\b/i,
  /\bmagic(al|ally)?\b/i,
  // the rest of the list in docs/research/design-not-ai.md section 4.9
  /(^\s*|[.!?]\s+)ready to\b/i,
  /\bleverag(e|es|ed|ing)\b/i,
  /\bdelv(e|es|ed|ing)\b/i,
  /\brevolutioni[sz](e|es|ed|ing)\b/i,
  /\bgame[- ]changer\b/i,
  /\bnext[- ]level\b/i,
  /\bcutting[- ]edge\b/i,
  /\bsay goodbye to\b/i,
  /\bpowered by ai\b/i,
  /[\u2728\u{1F680}]/u,
]
const EM_DASH = '—'
const EXTS = new Set(['.ts', '.tsx', '.css', '.html'])
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git'])

function walk(path, out) {
  if (!existsSync(path)) return out
  const st = statSync(path)
  if (st.isFile()) {
    if (EXTS.has(extname(path)) && !/\.test\.tsx?$/.test(path) && !path.endsWith('.d.ts')) out.push(path)
    return out
  }
  for (const name of readdirSync(path)) if (!SKIP_DIRS.has(name)) walk(join(path, name), out)
  return out
}

/** Pieces of copy with the line they start on. */
function scriptCopy(src, jsx) {
  const pieces = []
  let line = 1
  let i = 0
  const n = src.length
  let lastSignificant = ''
  let lastWord = ''
  const templateDepth = [] // brace depth when entering each ${ }
  let braceDepth = 0

  const push = (text, at) => text.trim() && pieces.push({ text, line: at })

  const readString = (q) => {
    // i points after the opening quote
    const start = line
    let buf = ''
    while (i < n) {
      const c = src[i]
      if (c === '\\') {
        buf += src[i + 1] ?? ''
        if (src[i + 1] === '\n') line++
        i += 2
        continue
      }
      if (c === '\n') line++
      if (c === q) {
        i++
        push(buf, start)
        return 'closed'
      }
      if (q === '`' && c === '$' && src[i + 1] === '{') {
        i += 2
        push(buf, start)
        templateDepth.push(braceDepth)
        braceDepth++
        return 'expr'
      }
      buf += c
      i++
    }
    push(buf, start)
    return 'closed'
  }

  // '<' and '>' are left out on purpose: in JSX they precede closing tags and text, not regexes
  const regexAllowed = () => !lastSignificant || '(,=:[!&|?{};+-*%~^'.includes(lastSignificant) || ['return', 'typeof', 'case', 'in', 'of', 'new', 'delete', 'void', 'throw', 'yield', 'await'].includes(lastWord)

  while (i < n) {
    const c = src[i]
    const d = src[i + 1]
    if (c === '\n') {
      line++
      i++
      continue
    }
    if (c === '/' && d === '/') {
      while (i < n && src[i] !== '\n') i++
      continue
    }
    if (c === '/' && d === '*') {
      const end = src.indexOf('*/', i + 2)
      const stop = end === -1 ? n : end + 2
      for (let k = i; k < stop; k++) if (src[k] === '\n') line++
      i = stop
      continue
    }
    if (c === "'" || c === '"' || c === '`') {
      i++
      readString(c)
      lastSignificant = c
      lastWord = ''
      continue
    }
    if (c === '/' && regexAllowed()) {
      // skip a regex literal
      i++
      let inClass = false
      while (i < n && src[i] !== '\n') {
        const r = src[i]
        if (r === '\\') {
          i += 2
          continue
        }
        if (r === '[') inClass = true
        else if (r === ']') inClass = false
        else if (r === '/' && !inClass) break
        i++
      }
      if (src[i] === '/') i++
      while (i < n && /[a-z]/i.test(src[i])) i++
      lastSignificant = '/'
      lastWord = ''
      continue
    }
    if (c === '{') braceDepth++
    if (c === '}') {
      braceDepth--
      if (templateDepth.length && braceDepth === templateDepth[templateDepth.length - 1]) {
        templateDepth.pop()
        i++
        readString('`')
        lastSignificant = '`'
        continue
      }
    }
    if (jsx && c === '>') {
      // JSX text: from > up to the next < or {, when it reads like words rather than code
      let k = i + 1
      let buf = ''
      const start = line
      while (k < n && src[k] !== '<' && src[k] !== '{') buf += src[k++]
      const looksLikeCode = /=|&&|\|\||;|\(|\)|`|\?\s*\S.*:|\b(const|let|return|export|import|class)\b/.test(buf)
      if (/\p{L}/u.test(buf) && !looksLikeCode) push(buf, start)
    }
    if (/\s/.test(c)) {
      i++
      continue
    }
    if (/[\w$]/.test(c)) {
      let w = ''
      while (i < n && /[\w$]/.test(src[i])) w += src[i++]
      lastWord = w
      lastSignificant = 'w'
      continue
    }
    lastSignificant = c
    lastWord = ''
    i++
  }
  return pieces
}

function cssCopy(src) {
  const pieces = []
  const noComments = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  const re = /content\s*:\s*(['"])(.*?)\1/g
  let m
  while ((m = re.exec(noComments))) pieces.push({ text: m[2], line: noComments.slice(0, m.index).split('\n').length })
  return pieces
}

function htmlCopy(src) {
  const blank = (m) => m.replace(/[^\n]/g, ' ')
  const clean = src.replace(/<!--[\s\S]*?-->/g, blank).replace(/<(script|style)[\s\S]*?<\/\1>/gi, blank)
  const pieces = []
  const lines = clean.split('\n')
  lines.forEach((l, idx) => {
    const text = l.replace(/<[^>]*?(?:content|title|alt|aria-label|placeholder)="([^"]*)"[^>]*>/gi, ' $1 ').replace(/<[^>]*>/g, ' ')
    if (text.trim()) pieces.push({ text, line: idx + 1 })
  })
  return pieces
}

const targets = process.argv.slice(2)
const roots = targets.length ? targets.map((t) => resolve(process.cwd(), t)) : [join(ROOT, 'src'), join(ROOT, 'index.html')]
const files = roots.flatMap((r) => walk(r, []))
const hits = []
const contentDir = `${sep}src${sep}content${sep}`

for (const file of files) {
  const raw = readFileSync(file, 'utf8')
  const rawLines = raw.split('\n')
  const ext = extname(file)
  const pieces = ext === '.css' ? cssCopy(raw) : ext === '.html' ? htmlCopy(raw) : scriptCopy(raw, ext === '.tsx')
  const isContent = file.includes(contentDir)
  for (const p of pieces) {
    const lineText = rawLines[p.line - 1] ?? ''
    if (lineText.includes('copy-lint-ignore')) continue
    if (p.text.includes(EM_DASH)) hits.push({ file, line: p.line, what: 'em dash (—)', text: p.text })
    if (isContent) continue
    for (const re of BANNED) {
      const m = p.text.match(re)
      if (m) hits.push({ file, line: p.line, what: `"${m[0]}"`, text: p.text })
    }
  }
}

if (hits.length) {
  const fileCount = new Set(hits.map((h) => h.file)).size
  console.log(`copy-lint: ${hits.length} problem${hits.length === 1 ? '' : 's'} in ${fileCount} file${fileCount === 1 ? '' : 's'}\n`)
  for (const h of hits) console.log(`${relative(process.cwd(), h.file)}:${h.line}  ${h.what}\n    ${h.text.trim().replace(/\s+/g, ' ').slice(0, 140)}`)
  process.exit(1)
}
console.log(`copy-lint: ${files.length} files clean`)
