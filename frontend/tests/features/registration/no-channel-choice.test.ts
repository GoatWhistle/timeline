import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')

const REGISTRATION_FILES = [
  join(SRC, 'features/registration/registration-tab.tsx'),
  join(SRC, 'features/registration/registration-facts.tsx'),
]

const BANNED_WORDS = ['channel', 'Channel', 'matrix', 'Matrix', 'mirror', 'Mirror']

describe('the event author picks when and what, never where', () => {
  it('never brings the channel-matrix feature or entity back', () => {
    expect(existsSync(join(SRC, 'features/channel-matrix'))).toBe(false)
    expect(existsSync(join(SRC, 'entities/channel-matrix'))).toBe(false)
  })

  it('keeps the registration screen free of channel wording', () => {
    for (const file of REGISTRATION_FILES) {
      const source = readFileSync(file, 'utf8')
      for (const word of BANNED_WORDS) {
        expect(source.includes(word), `${file} mentions "${word}"`).toBe(false)
      }
    }
  })

  it('leaves the organizer no reminder-rule editor, the schedule belonging to the reader', () => {
    expect(existsSync(join(SRC, 'features/registration/rules-editor.tsx'))).toBe(false)
    expect(existsSync(join(SRC, 'features/registration/rule-dialog'))).toBe(false)
    const source = readFileSync(join(SRC, 'features/registration/registration-tab.tsx'), 'utf8')
    expect(source).not.toContain('RulesEditor')
    expect(source).not.toContain("t('rules.")
  })

  it('leaves no orphan channel or mirror keys in the registration dictionary', () => {
    for (const locale of ['en', 'ru']) {
      const path = join(SRC, `shared/i18n/locales/${locale}/registration.json`)
      const source = readFileSync(path, 'utf8')
      for (const word of ['channel', 'Channel', 'matrix', 'Matrix', 'mirror', 'Mirror']) {
        expect(source.includes(word), `${path} mentions "${word}"`).toBe(false)
      }
    }
  })
})
