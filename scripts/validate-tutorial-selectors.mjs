#!/usr/bin/env node
/**
 * validate-tutorial-selectors.mjs
 *
 * Stellt sicher, dass jeder im Tutorial verwendete [data-tour="…"]-Selektor
 * auch irgendwo in src/ als data-tour="…"-Attribut gesetzt ist.
 *
 * Läuft ohne externe Abhängigkeiten und ist CI-freundlich.
 * Exit 1 bei fehlenden Ankern (Fail), Exit 0 sonst.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

/** @param {string} dir @param {RegExp} fileRegex */
function walk(dir, fileRegex) {
  const out = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.next') continue
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      out.push(...walk(full, fileRegex))
    } else if (fileRegex.test(e.name)) {
      out.push(full)
    }
  }
  return out
}

/** Sammelt Quelltext aus zwei Zonen: Tutorial-Curriculum & Registry (Quelle) vs. gesamter src-Baum (Definitionen) */
const srcDir = path.join(repoRoot, 'src')
const tutorialDirs = [
  path.join(srcDir, 'lib'),
  path.join(srcDir, 'contexts'),
  path.join(srcDir, 'components', 'tutorial'),
]

const allFiles = walk(srcDir, /\.(tsx?|jsx?)$/)
const curriculumFiles = tutorialDirs
  .flatMap((d) => (fs.existsSync(d) ? walk(d, /\.(tsx?|jsx?)$/) : []))
  .filter((f) => /tutorial|curriculum|registry/i.test(f))

/** Extract data-tour selectors referenced in curriculum.
 *  Erkennt zwei Schemas:
 *  1. Klassisch: `'[data-tour="x"]'` als String (z. B. `nearSelector`).
 *  2. Neu (PR 1+): `anchor: { desktop: '[data-tour="x"]', mobile: '[data-tour="y"]' }`.
 *
 *  Regex 1 deckt 2 ohnehin ab; Regex 2 dient als zusaetzliche Sicherheit
 *  und dokumentiert die Anker-Konvention fuer das neue Step-Datenmodell. */
const referenced = new Set()
const SELECTOR_RX = /\[data-tour=["']([^"'\]]+)["']\]/g
const ANCHOR_BLOCK_RX = /anchor\s*:\s*\{([\s\S]*?)\}/g
for (const f of curriculumFiles) {
  const txt = fs.readFileSync(f, 'utf8')
  let m
  while ((m = SELECTOR_RX.exec(txt)) != null) referenced.add(m[1])
  let am
  while ((am = ANCHOR_BLOCK_RX.exec(txt)) != null) {
    const inner = am[1]
    let im
    const innerRx = /\[data-tour=["']([^"'\]]+)["']\]/g
    while ((im = innerRx.exec(inner)) != null) referenced.add(im[1])
  }
}

/** Extract data-tour (und props wie dataTour=) attribute present anywhere in src,
 *  BUT skip curriculum/registry sources so that `nearSelector: '[data-tour="x"]'`
 *  does not count as a DOM-Anchor. */
const curriculumSet = new Set(curriculumFiles.map((f) => path.resolve(f)))
const defined = new Set()
const ATTR_RX = /data-tour=["']([^"']+)["']/g
const PROP_RX = /\bdataTour=["']([^"']+)["']/g
// Dynamische Anker via JSX-Expression: data-tour={cond ? 'foo' : undefined}
// oder data-tour={isX ? 'foo' : 'bar'} – wir erfassen alle gequoteten Tokens
// innerhalb des Expression-Blocks, damit auch konditionale Anker als
// "definiert" gelten.
const ATTR_EXPR_RX = /data-tour=\{([^}]+)\}/g
for (const f of allFiles) {
  if (curriculumSet.has(path.resolve(f))) continue
  const txt = fs.readFileSync(f, 'utf8')
  let m
  while ((m = ATTR_RX.exec(txt)) != null) defined.add(m[1])
  while ((m = PROP_RX.exec(txt)) != null) defined.add(m[1])
  let em
  while ((em = ATTR_EXPR_RX.exec(txt)) != null) {
    const expr = em[1]
    const tokenRx = /['"]([a-zA-Z0-9_:-]+)['"]/g
    let tm
    while ((tm = tokenRx.exec(expr)) != null) defined.add(tm[1])
  }
}

const missing = [...referenced].filter((k) => !defined.has(k)).sort()
const unused = [...defined].filter((k) => !referenced.has(k)).sort()

if (missing.length > 0) {
  console.error('\n\u274c Tutorial-Selektoren ohne DOM-Anker:')
  for (const sel of missing) console.error(`  - [data-tour="${sel}"]`)
  console.error(`\n${missing.length} fehlende Anker. Bitte \`data-tour="…"\` an passender Stelle ergaenzen.\n`)
  process.exit(1)
}

console.log(`\u2713 ${referenced.size} Tutorial-Selektoren validiert.`)
if (unused.length > 0) {
  console.log(`(${unused.length} data-tour-Attribute ohne Referenz im Tutorial – vermutlich reine E2E-Hooks.)`)
}
