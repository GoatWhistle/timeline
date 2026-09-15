import { describe, expect, it } from 'vitest'
import {
  USER_COLUMN_KEY,
  USER_FILTER_CHOICES,
  USER_FILTER_FIELD_KEY,
  USER_SORT_KEY,
} from '@/entities/user/user.views'
import { i18n } from '@/shared/i18n/config'

const LANGUAGES = ['en', 'ru']

function everyKey(): [string, string][] {
  const pairs: [string, string][] = []
  for (const [name, key] of Object.entries(USER_COLUMN_KEY)) pairs.push([`column ${name}`, key])
  for (const [name, key] of Object.entries(USER_SORT_KEY)) pairs.push([`sort ${name}`, key])
  for (const [name, key] of Object.entries(USER_FILTER_FIELD_KEY)) pairs.push([`filter ${name}`, key])
  for (const [field, choices] of Object.entries(USER_FILTER_CHOICES)) {
    for (const choice of choices) pairs.push([`choice ${field}=${choice.value}`, choice.labelKey])
  }
  return pairs
}

describe('the directory never shows a raw translation key on screen', () => {
  it('translates every column, sort and filter label in both languages', async () => {
    for (const language of LANGUAGES) {
      await i18n.changeLanguage(language)
      for (const [what, key] of everyKey()) {
        const text = i18n.t(key)
        expect(text, `${language}: ${what} fell back to the key ${key}`).not.toBe(key)
        expect(text.trim().length, `${language}: ${what} is blank`).toBeGreaterThan(0)
      }
    }
    await i18n.changeLanguage('en')
  })

  it('keeps those keys in the namespace the directory actually reads', async () => {
    await i18n.changeLanguage('en')
    for (const [what, key] of everyKey()) {
      expect(key, `${what} names a namespace the directory does not load`).not.toContain(':')
    }
  })
})
