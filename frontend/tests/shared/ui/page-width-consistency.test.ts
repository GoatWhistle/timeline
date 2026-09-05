import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PAGE_WIDTH } from '@/shared/ui/layout/page-width'

const SRC = join(process.cwd(), 'src')

function sourceFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...sourceFiles(full))
    else if (entry.name.endsWith('.tsx')) found.push(full)
  }
  return found
}

const named = (file: string) => relative(SRC, file).replaceAll('\\', '/')
const files = sourceFiles(SRC)

const EVENT_CARD = join(SRC, 'features/event-card/event-card.tsx')
const ADMIN_EVENT = join(SRC, 'app/pages/admin-event-page.tsx')
const SCROLL_PAGE = join(SRC, 'app/layouts/scroll-page/scroll-page.tsx')

const CAP = PAGE_WIDTH.match(/max-w-\[[^\]]+\]/)?.[0] ?? 'max-w-unknown'

describe('a wide screen is capped once, by one spelling', () => {
  it('states the cap as a shared constant rather than a number copied per page', () => {
    expect(PAGE_WIDTH).toContain('mx-auto')
    expect(PAGE_WIDTH).toMatch(/max-w-\[\d+px\]/)
  })

  it('never writes that cap a second time as a literal utility', () => {
    const offenders: string[] = []
    for (const file of files) {
      if (file.endsWith('page-width.ts')) continue
      const source = readFileSync(file, 'utf8')
      if (source.includes(CAP)) offenders.push(named(file))
    }
    expect(offenders).toEqual([])
  })

  it('caps the event card a participant reads', () => {
    expect(readFileSync(EVENT_CARD, 'utf8')).toContain('PAGE_WIDTH')
  })

  it('caps the event page an administrator edits, which is what smeared its tables', () => {
    expect(readFileSync(ADMIN_EVENT, 'utf8')).toContain('PAGE_WIDTH')
  })

  it('caps the scrolling layout every list page shares, which is what smeared teams and history', () => {
    const source = readFileSync(SCROLL_PAGE, 'utf8')
    expect(source).toContain('PAGE_WIDTH')
    expect(source).toMatch(/cn\(PAGE_WIDTH/)
  })

  it('applies the cap to the element that wraps the whole page, not to one card inside it', () => {
    for (const file of [EVENT_CARD, ADMIN_EVENT]) {
      const source = readFileSync(file, 'utf8')
      expect(source, named(file)).toMatch(/className=\{PAGE_WIDTH\}/)
    }
  })
})
