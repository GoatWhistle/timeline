// Замер размера production-сборки фронтенда (задача 16 плана рефакторинга).
// Базовый уровень нужен правилу «рост не больше десятой»: без него сравнивать
// не с чем. Результат пишется в docs/baselines/bundle-size.json.
//
//   node scripts/bundle-size.mjs           сравнить с базовым уровнем
//   node scripts/bundle-size.mjs --update  перезаписать базовый уровень

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'frontend', 'dist')
const baselinePath = join(root, 'docs', 'baselines', 'bundle-size.json')
const growthLimit = 1.1

if (!existsSync(dist)) {
  console.error('нет frontend/dist, выполните: make build')
  process.exit(1)
}

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })

const files = walk(dist)
  .map((full) => ({ name: relative(dist, full).split(sep).join('/'), buffer: readFileSync(full) }))
  .filter(({ name }) => name !== 'mockServiceWorker.js')
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
  console.log(`базовый уровень записан: ${relative(root, baselinePath)}`)
  console.log(`итого gzip ${total.gzip} Б, без сжатия ${total.bytes} Б`)
  process.exit(0)
}

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
const allowed = Math.round(baseline.total.gzip * (baseline.growthLimit ?? growthLimit))

console.log(
  `сборка: gzip ${total.gzip} Б, базовый уровень ${baseline.total.gzip} Б, предел ${allowed} Б`,
)

if (total.gzip > allowed) {
  console.error('размер сборки вырос больше чем на десятую от базового уровня')
  process.exit(1)
}
