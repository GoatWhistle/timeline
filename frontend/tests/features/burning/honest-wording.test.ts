import { branch, dictionaries, leaves, type Tree, text } from '@tests/support/dictionaries'
import { afterAll, describe, expect, it } from 'vitest'
import { i18n } from '@/shared/i18n/config'
import { LOCALES } from '@/shared/i18n/locale'

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
      registration: dictionaries.en.registration,
      urgency: dictionaries.en.event.urgency as Tree,
      burning: dictionaries.en.event.burning as Tree,
      card: dictionaries.en.event.card as Tree,
    }
    const suspects = leaves(scoped).filter(([, value]) =>
      CLAIMS_A_CHECK.some((claim) => value.toLowerCase().includes(claim)),
    )
    expect(suspects).toEqual([])
  })

  it('describes DONE as an act of the participant, not of the system', () => {
    const done = text('en', 'registration', 'status.DONE').toLowerCase()
    expect(done).toContain('you')
    expect(done).not.toContain('confirmed')
  })

  it('keeps NOT_REQUIRED distinct from DONE in both languages', () => {
    for (const locale of LOCALES) {
      const status = branch(locale, 'registration', 'status')
      expect(status.DONE).not.toEqual(status.NOT_REQUIRED)
      expect(text(locale, 'event', 'urgency.done')).not.toEqual(
        text(locale, 'event', 'urgency.waived'),
      )
    }
  })

  it('explains each status with a hint in both languages', () => {
    for (const locale of LOCALES) {
      const hints = branch(locale, 'registration', 'statusHint')
      for (const status of ['TODO', 'DONE', 'NOT_REQUIRED'] as const) {
        expect(String(hints[status]).length, `${locale}/${status}`).toBeGreaterThan(20)
      }
    }
  })

  it('warns that the mark is a self report wherever the mark is offered', () => {
    for (const locale of LOCALES) {
      expect(text(locale, 'event', 'card.selfReport').length).toBeGreaterThan(20)
      expect(text(locale, 'event', 'burning.team.selfReport').length).toBeGreaterThan(20)
    }
  })

  it('states the team ratio in numbers and never in names', () => {
    for (const locale of LOCALES) {
      const ratio = text(locale, 'event', 'burning.team.ratio')
      expect(ratio).toContain('{{done}}')
      expect(ratio).toContain('{{required}}')
      expect(ratio).not.toContain('{{name}}')
      expect(ratio).not.toContain('{{names}}')
    }
  })
})
