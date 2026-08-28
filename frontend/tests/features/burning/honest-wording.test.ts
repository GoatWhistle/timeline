import { afterAll, describe, expect, it } from 'vitest'
import { i18n, resources } from '@/shared/i18n/config'
import { LOCALES } from '@/shared/i18n/locale'

type Tree = { [key: string]: string | Tree }

function leaves(tree: Tree, prefix = ''): [string, string][] {
  const out: [string, string][] = []
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') out.push([path, value])
    else out.push(...leaves(value, path))
  }
  return out
}

const CLAIMS_A_CHECK = [
  'confirmed',
  'verified',
  'validated',
  'we checked',
  'the system checked',
  'proof of registration',
]

afterAll(async () => {
  await i18n.changeLanguage('ru')
})

describe('registration wording stays a self report', () => {
  it('never claims a check in the registration or urgency wording', () => {
    const scoped: Tree = {
      registration: resources.en.registration as unknown as Tree,
      urgency: resources.en.event.urgency as unknown as Tree,
      burning: resources.en.event.burning as unknown as Tree,
      card: resources.en.event.card as unknown as Tree,
    }
    const suspects = leaves(scoped).filter(([, value]) =>
      CLAIMS_A_CHECK.some((claim) => value.toLowerCase().includes(claim)),
    )
    expect(suspects).toEqual([])
  })

  it('describes DONE as an act of the participant, not of the system', () => {
    const done = resources.en.registration.status.DONE.toLowerCase()
    expect(done).toContain('you')
    expect(done).not.toContain('confirmed')
  })

  it('keeps NOT_REQUIRED distinct from DONE in both languages', () => {
    for (const locale of LOCALES) {
      const status = resources[locale].registration.status
      expect(status.DONE).not.toEqual(status.NOT_REQUIRED)
      expect(resources[locale].event.urgency.done).not.toEqual(
        resources[locale].event.urgency.waived,
      )
    }
  })

  it('explains each status with a hint in both languages', () => {
    for (const locale of LOCALES) {
      const hints = resources[locale].registration.statusHint
      for (const status of ['TODO', 'DONE', 'NOT_REQUIRED'] as const) {
        expect(hints[status].length, `${locale}/${status}`).toBeGreaterThan(20)
      }
    }
  })

  it('warns that the mark is a self report wherever the mark is offered', () => {
    for (const locale of LOCALES) {
      expect(resources[locale].event.card.selfReport.length).toBeGreaterThan(20)
      expect(resources[locale].event.burning.team.selfReport.length).toBeGreaterThan(20)
    }
  })

  it('states the team ratio in numbers and never in names', () => {
    for (const locale of LOCALES) {
      const ratio = resources[locale].event.burning.team.ratio
      expect(ratio).toContain('{{done}}')
      expect(ratio).toContain('{{required}}')
      expect(ratio).not.toContain('{{name}}')
      expect(ratio).not.toContain('{{names}}')
    }
  })
})
