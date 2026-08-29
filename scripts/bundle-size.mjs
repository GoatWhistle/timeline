// Measurement of the frontend production bundle size (task 16 of the
// refactoring plan). The baseline is needed by the "growth no more than a tenth"
// rule: without it there is nothing to compare against. The result is written to
// docs/baselines/bundle-size.json.
//
//   node scripts/bundle-size.mjs           compare against the baseline
//   node scripts/bundle-size.mjs --update  rewrite the baseline
//
// Two figures are tracked, because they answer different questions and one
// cannot stand in for the other:
//
//   total    every file in dist. Catches overall bloat, but it does not move
//            when work only shifts weight out of the initial download: code
//            splitting and lazy loading leave the sum roughly where it was, or
//            raise it slightly through per-chunk gzip framing.
//   initial  what a first-time visitor actually downloads. Locale bundles for
//            the language the visitor is not using are excluded, since they are
//            fetched on a language switch and never on load.
//
// Reporting only the total would have made lazy loading the dictionaries look
// like a regression while every visitor started downloading less.

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'frontend', 'dist')
const baselinePath = join(root, 'docs', 'baselines', 'bundle-size.json')
const growthLimit = 1.1

if (!existsSync(dist)) {
  console.error('no frontend/dist, run: make build')
  process.exit(1)
}

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })

const reportName = 'bundle-size.json'

const files = walk(dist)
  .map((full) => ({ name: relative(dist, full).split(sep).join('/'), buffer: readFileSync(full) }))
  .filter(({ name }) => name !== reportName)
  .map(({ name, buffer }) => ({
    file: name.replace(/-[A-Za-z0-9_-]{8}\./, '-[hash].'),
    bytes: buffer.length,
    gzip: gzipSync(buffer, { level: 9 }).length,
  }))
  .sort((a, b) => b.gzip - a.gzip)

const total = files.reduce(
  (acc, f) => ({ bytes: acc.bytes + f.bytes, gzip: acc.gzip + f.gzip }),
  { bytes: 0, gzip: 0 },
)

const localeRoot = join(root, 'frontend', 'src', 'shared', 'i18n', 'locales')
const locales = readdirSync(localeRoot)
const initialLocale = 'en'

// Which dist chunk holds which dictionary is not a guess: the lazy loader is an
// import.meta.glob, and the build emits its map verbatim, keyed by the source
// path. Parsing that map is exact where heuristics are not. Content sniffing was
// tried first and was wrong: the main chunk carries the date-fns Russian locale,
// so "has Cyrillic" swallowed 159 KB of code that every visitor downloads.
const globEntry = /\.\/locales\/([a-z-]+)\/([a-z0-9-]+)\.json["'`]\s*:\s*\(\)\s*=>[^`]*`\.\/([^`]+)`/g

const dictionaryChunks = new Map()
for (const full of walk(dist).filter((name) => name.endsWith('.js'))) {
  const source = readFileSync(full, 'utf8')
  globEntry.lastIndex = 0
  let match = globEntry.exec(source)
  while (match) {
    dictionaryChunks.set(`${match[1]}/${match[2]}`, match[3])
    match = globEntry.exec(source)
  }
}

const expected = locales.reduce(
  (acc, locale) =>
    acc + readdirSync(join(localeRoot, locale)).filter((name) => name.endsWith('.json')).length,
  0,
)

if (dictionaryChunks.size !== expected) {
  console.error(
    `locale chunk map has ${dictionaryChunks.size} entries, ${expected} dictionaries on disk`,
  )
  console.error('the initial-download figure cannot be trusted, rebuild with a clean vite cache')
  process.exit(1)
}

// A chunk is deferred only when no locale the visitor loads on start references
// it. Two locales can share one chunk when their dictionaries are byte
// identical, and such a chunk stays in the initial download.
const initialChunks = new Set(
  [...dictionaryChunks].filter(([key]) => key.startsWith(`${initialLocale}/`)).map(([, v]) => v),
)

const deferredChunks = new Set(
  [...dictionaryChunks]
    .filter(([key]) => !key.startsWith(`${initialLocale}/`))
    .map(([, chunk]) => chunk)
    .filter((chunk) => !initialChunks.has(chunk)),
)

const deferredBytes = walk(dist)
  .filter((full) => deferredChunks.has(relative(dist, full).split(sep).join('/').split('/').pop()))
  .reduce((acc, full) => acc + gzipSync(readFileSync(full), { level: 9 }).length, 0)

const initial = { gzip: total.gzip - deferredBytes }

const report = {
  measuredAt: new Date().toISOString().slice(0, 10),
  growthLimit,
  total,
  initial,
  files,
}

// The measured report is left in dist so the CI summary can print what this run
// actually built. Without it the summary read the baseline back and reported it
// as the measurement, which always agreed with itself.
writeFileSync(join(dist, reportName), `${JSON.stringify(report, null, 2)}
`)

if (process.argv.includes('--update') || !existsSync(baselinePath)) {
  writeFileSync(baselinePath, `${JSON.stringify(report, null, 2)}\n`)
  console.log(`baseline written: ${relative(root, baselinePath)}`)
  console.log(`total gzip ${total.gzip} B, uncompressed ${total.bytes} B`)
  process.exit(0)
}

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
const allowed = Math.round(baseline.total.gzip * (baseline.growthLimit ?? growthLimit))

console.log(
  `bundle: gzip ${total.gzip} B, baseline ${baseline.total.gzip} B, limit ${allowed} B`,
)

let failed = false

if (total.gzip > allowed) {
  console.error('bundle size grew by more than a tenth over the baseline')
  failed = true
}

if (baseline.initial) {
  const allowedInitial = Math.round(baseline.initial.gzip * (baseline.growthLimit ?? growthLimit))
  console.log(
    `initial download: gzip ${initial.gzip} B, baseline ${baseline.initial.gzip} B, limit ${allowedInitial} B`,
  )
  if (initial.gzip > allowedInitial) {
    console.error('initial download grew by more than a tenth over the baseline')
    failed = true
  }
}

if (failed) process.exit(1)
