import { appendFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')

function read(path) {
  try {
    return JSON.parse(readFileSync(resolve(root, path), 'utf8'))
  } catch {
    return null
  }
}

function percent(total, key) {
  const entry = total?.[key]
  return entry && typeof entry.pct === 'number' ? `${entry.pct}%` : 'n/a'
}

function kilobytes(bytes) {
  return typeof bytes === 'number' ? `${Math.round(bytes / 1024)} KB` : 'n/a'
}

function table(title, rows) {
  return [`## ${title}`, '', '| Check | Result |', '|----|----|']
    .concat(rows.map(([name, value]) => `| ${name} | ${value} |`))
    .join('\n')
}

const coverage = read('frontend/coverage/coverage-summary.json')
const baseline = read('docs/baselines/bundle-size.json')
const built = read('frontend/dist/bundle-size.json') ?? baseline

const rows = [
  ['Statements', percent(coverage?.total, 'statements')],
  ['Lines', percent(coverage?.total, 'lines')],
  ['Functions', percent(coverage?.total, 'functions')],
  ['Branches', percent(coverage?.total, 'branches')],
  ['Bundle, gzip', kilobytes(built?.total?.gzip)],
  ['Bundle baseline, gzip', kilobytes(baseline?.total?.gzip)],
  ['Initial download, gzip', kilobytes(built?.initial?.gzip)],
  ['Initial download baseline, gzip', kilobytes(baseline?.initial?.gzip)],
]

const summary = table('Frontend', rows)
const target = process.env.GITHUB_STEP_SUMMARY

if (target) {
  appendFileSync(target, `${summary}\n`)
} else {
  process.stdout.write(`${summary}\n`)
}
