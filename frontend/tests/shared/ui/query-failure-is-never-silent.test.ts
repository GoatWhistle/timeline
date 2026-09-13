import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')

const USES_QUERY = /\buseQuery\(/
const HANDLES_FAILURE = /isError|QueryBoundary|ErrorState/

const PROMISES_NOTHING = [
  'app/app-shell.tsx',
  'entities/event/event-common-fields.tsx',
  'features/admin-stats/admin-stats.tsx',
  'features/admin-stats/coverage-metric/coverage-metric.tsx',
  'features/event-card/event-tracks.tsx',
  'features/finance/event-finance.tsx',
  'features/event-links/ui/pinned-links/pinned-links.tsx',
  'features/personal-layer/shell/personal-summary.tsx',
  'features/personal-layer/tasks/template-picker.tsx',
  'features/teams/team-overview.tsx',
]

function tsxFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...tsxFiles(full))
    else if (entry.name.endsWith('.tsx')) found.push(full)
  }
  return found
}

const named = (file: string) => relative(SRC, file).replaceAll('\\', '/')

function silentQueries(): string[] {
  return tsxFiles(SRC)
    .filter((file) => {
      const source = readFileSync(file, 'utf8')
      return USES_QUERY.test(source) && !HANDLES_FAILURE.test(source)
    })
    .map(named)
}

describe('a failed request is never dressed up as an empty screen', () => {
  it('lets no new component read a query without saying when it failed', () => {
    expect(silentQueries().filter((file) => !PROMISES_NOTHING.includes(file))).toEqual([])
  })

  it('keeps the exemption list honest, so a fixed file cannot stay exempt', () => {
    const silent = silentQueries()
    expect(PROMISES_NOTHING.filter((file) => !silent.includes(file))).toEqual([])
  })
})
