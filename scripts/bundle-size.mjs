// Measurement of the frontend production bundle size (task 16 of the
// refactoring plan). The baseline is needed by the "growth no more than a tenth"
// rule: without it there is nothing to compare against. The result is written to
// docs/baselines/bundle-size.json.
//
//   node scripts/bundle-size.mjs           compare against the baseline
//   node scripts/bundle-size.mjs --update  rewrite the baseline

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

const files = walk(dist)
  .map((full) => ({ name: relative(dist, full).split(sep).join('/'), buffer: readFileSync(full) }))
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

const report = { measuredAt: new Date().toISOString().slice(0, 10), growthLimit, total, files }

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

if (total.gzip > allowed) {
  console.error('bundle size grew by more than a tenth over the baseline')
  process.exit(1)
}
