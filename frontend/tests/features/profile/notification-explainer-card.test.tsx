import { screen } from '@testing-library/react'
import { dictionaries, keyPaths, LOCALES } from '@tests/support/dictionaries'
import { renderWithProviders } from '@tests/support/render'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { NOTIFICATION_TYPE_KEY } from '@/entities/notification/notification.labels'
import { NotificationExplainerCard } from '@/features/profile/notification-explainer-card/notification-explainer-card'
import { ensureLocale, i18n, i18nReady } from '@/shared/i18n/config'

const TYPES = Object.keys(NOTIFICATION_TYPE_KEY)

beforeAll(async () => {
  await i18nReady
  for (const locale of LOCALES) await ensureLocale(locale)
})

afterAll(async () => {
  await i18n.changeLanguage('ru')
})

describe('the notification explainer names every type the domain can send', () => {
  it('explains each of the three types, none left as a machine code', async () => {
    await i18n.changeLanguage('en')
    renderWithProviders(<NotificationExplainerCard />)

    for (const type of TYPES) {
      const term = document.querySelector(`[data-explainer-type="${type}"]`)
      expect(term, `type ${type} has no entry`).not.toBeNull()
      expect(term?.textContent ?? '', `type ${type} renders its raw code`).not.toContain(type)
      expect((term?.textContent ?? '').length, `type ${type} is unnamed`).toBeGreaterThan(0)
    }
  })

  it('gives every type both a name and a sentence saying when it arrives', () => {
    for (const locale of LOCALES) {
      const paths = new Set(keyPaths(dictionaries[locale].notification))
      for (const type of TYPES) {
        expect(paths, `${locale} misses the name of ${type}`).toContain(
          `explainer.type.${type}.name`,
        )
        expect(paths, `${locale} misses the timing of ${type}`).toContain(
          `explainer.type.${type}.when`,
        )
      }
    }
  })
})

describe('the explainer tells the truth about the domain', () => {
  it('says marking the registration is what stops the reminders', async () => {
    await i18n.changeLanguage('en')
    renderWithProviders(<NotificationExplainerCard />)

    expect(screen.getByText(i18n.t('notification:explainer.stopTitle'))).toBeInTheDocument()
    expect(screen.getByText(i18n.t('notification:explainer.stopHint'))).toBeInTheDocument()
  })

  it('promises at least one delivery rather than exactly one', async () => {
    await i18n.changeLanguage('en')
    renderWithProviders(<NotificationExplainerCard />)

    const note = screen.getByText(i18n.t('notification:explainer.timingNote'))
    expect(note.textContent ?? '').toMatch(/at least one/i)
    expect(note.textContent ?? '').not.toMatch(/exactly once/i)
  })

  it('repeats the self-report caveat the event card already makes, in both languages', () => {
    for (const locale of LOCALES) {
      const explainer = (dictionaries[locale].notification as Record<string, unknown>)
        .explainer as Record<string, string | undefined>
      const caveat = (dictionaries[locale].registration as Record<string, unknown>)
        .statusHint as Record<string, string | undefined>
      const negation = (caveat.TODO ?? '').split(/[.!]/).at(-2)?.trim() ?? ''

      expect(negation.length, `${locale} has no caveat to borrow`).toBeGreaterThan(0)
      expect(explainer.stopHint ?? '', `${locale} drops the self-report caveat`).toContain(negation)
    }
  })
})
