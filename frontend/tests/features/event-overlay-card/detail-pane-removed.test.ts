import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const SRC = resolve(process.cwd(), 'src')
const TESTS = resolve(process.cwd(), 'tests')

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) out.push(...walk(path))
    else if (/\.tsx?$/.test(path)) out.push(path)
  }
  return out
}

const sources = [...walk(SRC), ...walk(TESTS)].filter(
  (path) => !path.endsWith('.gen.ts') && path !== fileURLToPath(import.meta.url),
)

describe('the right-hand statistics panel is gone', () => {
  it('leaves no event-detail-pane package behind', () => {
    expect(existsSync(join(SRC, 'features', 'event-detail-pane'))).toBe(false)
  })

  it('leaves no catalog detail pane behind', () => {
    expect(existsSync(join(SRC, 'features', 'catalog', 'catalog-detail.tsx'))).toBe(false)
  })

  it('leaves no reference to the deleted components anywhere', () => {
    const orphans = ['EventDetailPane', 'AdminDetailPane', 'CatalogDetail', 'EventDetailView']
    for (const path of sources) {
      const text = readFileSync(path, 'utf8')
      for (const orphan of orphans) {
        expect(text.includes(orphan), `${path} still mentions ${orphan}`).toBe(false)
      }
    }
  })

  it('drops the DetailPane layout the panel needed', () => {
    const threePane = readFileSync(
      join(SRC, 'shared', 'ui', 'layout', 'three-pane', 'three-pane.tsx'),
      'utf8',
    )
    expect(threePane).not.toContain('DetailPane')
    expect(threePane).not.toContain('border-l')

    for (const path of sources) {
      expect(readFileSync(path, 'utf8')).not.toContain('DetailPane')
    }
  })

  it('leaves no dictionary key that only the panel used', () => {
    for (const locale of ['ru', 'en']) {
      const shell = readFileSync(
        join(SRC, 'shared', 'i18n', 'locales', locale, 'shell.json'),
        'utf8',
      )
      expect(JSON.parse(shell)).not.toHaveProperty('pane')

      const eventCard = JSON.parse(
        readFileSync(join(SRC, 'shared', 'i18n', 'locales', locale, 'event-card.json'), 'utf8'),
      ) as { detail: Record<string, string> }
      expect(eventCard.detail).not.toHaveProperty('openFull')
    }
  })
})
