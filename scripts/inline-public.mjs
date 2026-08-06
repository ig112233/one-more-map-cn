// Inlines every external asset referenced from the single-file build
// (fonts, bg, icons, panel frames) as base64 data URIs, then deletes the
// leftover asset files and renames index.html to a shareable name.
//
// Usage: node scripts/inline-public.mjs
import { readFileSync, writeFileSync, existsSync, rmSync, renameSync, readdirSync } from 'node:fs'
import { resolve, dirname, join, extname } from 'node:path'

const outDir = resolve('dist-single')
const htmlPath = join(outDir, 'index.html')
const finalName = 'Allflame航行求解器-单文件版.html'

const MIME = {
  woff: 'font/woff',
  woff2: 'font/woff2',
  webp: 'image/webp',
  png: 'image/png',
  jpg: 'image/jpeg',
  svg: 'image/svg+xml',
  gif: 'image/gif',
}

let html = readFileSync(htmlPath, 'utf8')

// url(./xxx) or url('./xxx') or url("./xxx")
const urlRe = /url\(\s*['"]?(\.\/[^'")]+)['"]?\s*\)/g
const inlined = []
for (const m of html.matchAll(urlRe)) {
  const rel = m[1]
  const file = resolve(outDir, rel)
  if (!existsSync(file)) {
    console.warn(`skip missing: ${rel}`)
    continue
  }
  const ext = extname(file).slice(1).toLowerCase()
  const mime = MIME[ext] ?? 'application/octet-stream'
  const dataUri = `data:${mime};base64,${readFileSync(file).toString('base64')}`
  html = html.split(m[0]).join(`url("${dataUri}")`)
  inlined.push(`${rel} (${mime}, ${(readFileSync(file).length / 1024).toFixed(0)}KB)`)
}

// Also inline favicon/referenced files at the top level? index.html links are
// handled by vite-plugin-singlefile already; only url() refs are left.
writeFileSync(htmlPath, html)

// Remove remaining external asset files referenced nowhere else
const keep = new Set(['index.html'])
for (const f of readdirSync(outDir)) {
  if (!keep.has(f)) rmSync(join(outDir, f), { recursive: true, force: true })
}

renameSync(htmlPath, join(outDir, finalName))
console.log('Inlined assets:')
for (const i of inlined) console.log('  -', i)
console.log(`\nDone -> dist-single/${finalName} (${(readFileSync(join(outDir, finalName)).length / 1024 / 1024).toFixed(2)} MB, fully self-contained)`)
