import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  type RegistrationStatus,
  URGENCY_KEY,
  URGENCY_ORDER,
  URGENCY_TEXT,
} from '@/entities/deadline/urgency/urgency'

const SRC = join(process.cwd(), 'src')

const DOMAIN = join(SRC, 'styles/tokens/domain.css')
const DARK = join(SRC, 'styles/tokens/dark.css')
const INDEX = join(SRC, 'styles/index.css')
const CLASS_NAMES = join(SRC, 'shared/styling/class-names/class-names.ts')

const EN = join(SRC, 'shared/i18n/locales/en/event-schedule.json')
const RU = join(SRC, 'shared/i18n/locales/ru/event-schedule.json')

const STATUSES: RegistrationStatus[] = ['TODO', 'DONE', 'NOT_REQUIRED']

const kebab = (level: string) => level.replaceAll(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

const urgencyBlock = (file: string) =>
  (JSON.parse(readFileSync(file, 'utf8')) as { urgency: Record<string, string> }).urgency

describe('an urgency level never names a registration status the system does not have', () => {
  it('spells no level after a status outside TODO, DONE and NOT_REQUIRED', () => {
    const known = new Set(STATUSES.map((status) => status.toLowerCase().replaceAll('_', '')))
    const statusShaped = URGENCY_ORDER.filter((level) => /required|waiv|exempt|skip/i.test(level))

    for (const level of statusShaped) {
      expect(known).toContain(level.toLowerCase().replaceAll('_', ''))
    }
  })

  it('carries no trace of WAIVED, which was never a status in the contract', () => {
    for (const file of [DOMAIN, DARK, INDEX, CLASS_NAMES]) {
      expect(readFileSync(file, 'utf8')).not.toMatch(/urgency-waived/i)
    }

    for (const file of [EN, RU]) {
      expect(Object.keys(urgencyBlock(file)).join(' ')).not.toMatch(/waiv/i)
    }

    for (const level of URGENCY_ORDER) {
      expect(level).not.toMatch(/waiv/i)
      expect(URGENCY_TEXT[level]).not.toMatch(/waiv/i)
      expect(URGENCY_KEY[level]).not.toMatch(/waiv/i)
    }
  })

  it('gives every level a token that both themes actually define', () => {
    const domain = readFileSync(DOMAIN, 'utf8')
    const dark = readFileSync(DARK, 'utf8')
    const index = readFileSync(INDEX, 'utf8')

    for (const level of URGENCY_ORDER) {
      const utility = URGENCY_TEXT[level].match(/text-(urgency-[a-z-]+)/)?.[1]
      if (!utility) continue

      expect(domain).toContain(`--${utility}:`)
      expect(dark).toContain(`--${utility}:`)
      expect(index).toContain(`--color-${utility}: var(--${utility})`)
      expect(readFileSync(CLASS_NAMES, 'utf8')).toContain(`'${utility}'`)
    }
  })

  it('names the NOT_REQUIRED token after the status it paints', () => {
    expect(URGENCY_TEXT.notRequired).toContain(`urgency-${kebab('notRequired')}`)
    expect(URGENCY_KEY.notRequired).toBe('event:urgency.notRequired')
  })

  it('keeps both dictionaries carrying exactly the levels the table declares', () => {
    const levels = [...URGENCY_ORDER].sort()

    for (const file of [EN, RU]) {
      expect(Object.keys(urgencyBlock(file)).sort()).toEqual(levels)
    }
  })
})
