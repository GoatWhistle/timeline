import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'frontend', 'node_modules', 'flag-icons', 'flags', '4x3')
const target = join(root, 'frontend', 'public', 'flags')
const manifest = join(root, 'frontend', 'src', 'shared', 'geo', 'flag-codes.gen.ts')

const GZIP_BUDGET = 400
const CODE = /^[a-z]{2}\.svg$/

if (!existsSync(source)) {
  console.error('flag-icons is not installed, run: npm ci')
  process.exit(1)
}

const picked = readdirSync(source)
  .filter((name) => CODE.test(name))
  .map((name) => ({ name, body: readFileSync(join(source, name)) }))
  .filter(({ body }) => gzipSync(body, { level: 9 }).length <= GZIP_BUDGET)
  .sort((a, b) => a.name.localeCompare(b.name))

rmSync(target, { recursive: true, force: true })
mkdirSync(target, { recursive: true })

for (const { name, body } of picked) writeFileSync(join(target, name), body)

const codes = picked.map(({ name }) => name.replace('.svg', ''))
const listing = codes.map((code) => `  '${code}',`).join('\n')

writeFileSync(
  manifest,
  `export const FLAG_CODES = new Set([\n${listing}\n])\n`,
)

const gzip = picked.reduce((sum, { body }) => sum + gzipSync(body, { level: 9 }).length, 0)
console.log(`flags: ${picked.length} vendored, ${gzip} B gzip`)
