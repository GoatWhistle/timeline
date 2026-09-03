import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { EVENT_KIND_ICON, EVENT_KIND_KEY } from '@/entities/catalog/catalog.kind'
import {
  EVENT_KIND_ICON as SCHEDULE_KIND_ICON,
  EVENT_KIND_KEY as SCHEDULE_KIND_KEY,
} from '@/features/schedule/model/event-kind'

const SRC = join(process.cwd(), 'src')

const KIND_MAPPING = /MEETUP:\s*([A-Z][A-Za-z]*)\s*,/g

function tsFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...tsFiles(full))
    else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) found.push(full)
  }
  return found
}

const named = (file: string) => relative(SRC, file).replaceAll('\\', '/')

describe('an event kind wears one glyph everywhere it is drawn', () => {
  it('gives the catalog the same icon component the schedule uses', () => {
    expect(EVENT_KIND_ICON.HACKATHON).toBe(SCHEDULE_KIND_ICON.HACKATHON)
    expect(EVENT_KIND_ICON.MEETUP).toBe(SCHEDULE_KIND_ICON.MEETUP)
  })

  it('names the kind with the same dictionary key on both surfaces', () => {
    expect(EVENT_KIND_KEY).toEqual(SCHEDULE_KIND_KEY)
  })

  it('lets no surface spell the meetup glyph its own way', () => {
    const spellings = new Map<string, string[]>()

    for (const file of tsFiles(SRC)) {
      const source = readFileSync(file, 'utf8')
      for (const match of source.matchAll(KIND_MAPPING)) {
        const icon = match[1]
        if (icon === undefined || !/^[A-Z]/.test(icon)) continue
        spellings.set(icon, [...(spellings.get(icon) ?? []), named(file)])
      }
    }

    expect([...spellings.keys()].sort()).toEqual(['Martini'])
  })
})
