import { dictionaries, keyPaths, LOCALES } from '@tests/support/dictionaries'
import { renderWithProviders } from '@tests/support/render'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { NOTIFICATION_TYPE_KEY } from '@/entities/notification/notification.labels'
import { NotificationExplainerCard } from '@/features/profile/notification-explainer-card/notification-explainer-card'
import type { Channel, NotificationOccasion, NotificationPreference } from '@/shared/api/types.gen'
import { ensureLocale, i18n, i18nReady } from '@/shared/i18n/config'

const OCCASIONS = Object.keys(NOTIFICATION_TYPE_KEY) as NotificationOccasion[]
const TYPES = OCCASIONS
const CHANNELS: Channel[] = ['TELEGRAM', 'EMAIL']
const LIVE = new Set<Channel>(CHANNELS)

const ALL_ENABLED: NotificationPreference[] = OCCASIONS.flatMap((occasion) =>
  CHANNELS.map((channel) => ({ occasion, channel, enabled: true })),
)

beforeAll(async () => {
  await i18nReady
  for (const locale of LOCALES) await ensureLocale(locale)
})

afterAll(async () => {
  await i18n.changeLanguage('ru')
})

describe('the notification explainer names every type the domain can send', () => {
  it('explains every type the domain can send, none left as a machine code', async () => {
    await i18n.changeLanguage('en')
    renderWithProviders(<NotificationExplainerCard preferences={ALL_ENABLED} liveChannels={LIVE} />)

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
