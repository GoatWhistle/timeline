import { dictionaries, keyPaths, LOCALES } from '@tests/support/dictionaries'
import { describe, expect, it } from 'vitest'
import rulesEditorSource from '@/features/registration/rules-editor.tsx?raw'

describe('the reminder rules editor states who is actually reminded', () => {
  it('renders the audience note next to the rule list', () => {
    expect(rulesEditorSource).toContain("t('rules.audienceTitle')")
    expect(rulesEditorSource).toContain("t('rules.audienceHint')")
  })

  it('carries the note in both languages', () => {
    for (const locale of LOCALES) {
      const paths = new Set(keyPaths(dictionaries[locale].registration))
      expect(paths, `${locale} misses the audience title`).toContain('rules.audienceTitle')
      expect(paths, `${locale} misses the audience hint`).toContain('rules.audienceHint')
    }
  })

  it('names the one notification that arrives without any rule at all', () => {
    for (const locale of LOCALES) {
      const registration = dictionaries[locale].registration as Record<string, unknown>
      const notification = dictionaries[locale].notification as Record<string, unknown>
      const rules = registration.rules as Record<string, string | undefined>
      const types = notification.type as Record<string, string | undefined>
      const hint = rules.audienceHint ?? ''
      const required = types.REGISTRATION_REQUIRED ?? ''

      expect(required.length, `${locale} has no name for the first notification`).toBeGreaterThan(0)
      expect(
        hint.toLowerCase(),
        `${locale} never mentions the ruleless first notification`,
      ).toContain(required.toLowerCase())
    }
  })
})
