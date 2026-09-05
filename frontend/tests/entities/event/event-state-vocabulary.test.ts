import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { EVENT_STATES } from '@/entities/event/event.labels'
import { EVENT_STATE_TEXT } from '@/entities/event/event-state-mark/event-state-sign'

const SRC = join(process.cwd(), 'src')

const SIGN_FILE = 'entities/event/event-state-mark/event-state-sign.tsx'

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

function sourcesNaming(pattern: RegExp): string[] {
  return tsFiles(SRC)
    .filter((file) => pattern.test(readFileSync(file, 'utf8')))
    .map(named)
    .sort()
}

describe('an event state wears one mark everywhere it is drawn', () => {
  it('keeps no surface drawing event state through the dot primitive', () => {
    expect(sourcesNaming(/EVENT_STATE_SHAPE|EVENT_STATE_COLOR/)).toEqual([])
  })

  it('keeps the glyph vocabulary in the sign alone, so no second spelling can appear', () => {
    expect(sourcesNaming(/data-event-state-sign/)).toEqual([SIGN_FILE])
  })

  it('gives every state its own colour token', () => {
    expect(new Set(Object.values(EVENT_STATE_TEXT)).size).toBe(EVENT_STATES.length)
    expect(Object.keys(EVENT_STATE_TEXT).sort()).toEqual([...EVENT_STATES].sort())
  })
})
