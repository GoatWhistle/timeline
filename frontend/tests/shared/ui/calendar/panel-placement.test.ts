import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')
const OVERLAYS_PREFIX = 'shared/ui/overlays/'

function sourceFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...sourceFiles(full))
    else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) found.push(full)
  }
  return found
}

const named = (file: string) => relative(SRC, file).replaceAll('\\', '/')

describe('there is exactly one floating surface, and it lives in overlays/', () => {
  it('lets no component outside overlays/ hand-compute top/left for a fixed panel', () => {
    const offenders: string[] = []

    for (const file of sourceFiles(SRC)) {
      const relPath = named(file)
      if (relPath.startsWith(OVERLAYS_PREFIX)) continue
      const source = readFileSync(file, 'utf8')

      const openingTags = source.matchAll(/<[A-Za-z][\w.]*(?:\s+[^<>]*?)?\/?>/gs)
      for (const tag of openingTags) {
        const attrs = tag[0]
        const styleMatch = attrs.match(/style=\{\{([^}]*)\}\}/s)
        if (!styleMatch) continue
        const style = styleMatch[1] ?? ''
        const hasTopLeft = /\btop\s*:/.test(style) && /\bleft\s*:/.test(style)
        const isFixed = /\bfixed\b/.test(attrs)
        if (hasTopLeft && isFixed) offenders.push(relPath)
      }
    }

    expect(offenders).toEqual([])
  })

  it('no longer carries a bespoke anchored-panel positioning module', () => {
    const readdirSafe = (dir: string) => {
      try {
        return readdirSync(dir)
      } catch {
        return []
      }
    }
    const calendarFiles = readdirSafe(join(SRC, 'shared/ui/forms/calendar'))
    expect(calendarFiles).not.toContain('use-anchored-panel.ts')
  })

  it('places the calendar panel through the shared Popover, not a hand-measured position', () => {
    const picker = readFileSync(join(SRC, 'shared/ui/forms/calendar/date-picker.tsx'), 'utf8')
    expect(picker).toContain('PopoverContent')
    expect(picker).toContain("from '@/shared/ui/overlays/popover'")
    expect(picker).not.toContain('useAnchoredPanel')
    expect(picker).not.toContain('createPortal')
  })
})
