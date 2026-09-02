import { branch, keyPaths, LOCALES } from '@tests/support/dictionaries'
import { describe, expect, it } from 'vitest'
import { OUTCOME_KEY, OUTCOMES } from '@/entities/personal/outcome.queries'
import {
  ARTIFACT_KIND_ICON,
  ARTIFACT_KIND_KEY,
  ARTIFACT_KINDS,
} from '@/entities/personal/personal.labels'
import { i18n } from '@/shared/i18n/config'

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/

describe('the personal layer speaks both languages', () => {
  it('carries the same personal keys in Russian and English', () => {
    const [first, ...rest] = LOCALES.map(
      (locale) =>
        new Set(
          keyPaths(branch(locale, 'event', 'personal')).map((path) =>
            path.replace(PLURAL_SUFFIX, ''),
          ),
        ),
    )

    for (const other of rest) {
      expect(other).toEqual(first)
    }
  })

  it('counts submissions with the plural forms each language needs', () => {
    const ru = i18n.getFixedT('ru', 'event')
    expect(ru('personal.history.artifacts', { count: 1 })).toContain('1')
    expect(ru('personal.history.artifacts', { count: 2 })).not.toBe(
      ru('personal.history.artifacts', { count: 5 }),
    )

    const en = i18n.getFixedT('en', 'event')
    expect(en('personal.history.artifacts', { count: 1 })).not.toBe(
      en('personal.history.artifacts', { count: 5 }),
    )
  })

  it('names every artifact kind, with an icon each', () => {
    expect(ARTIFACT_KINDS).toHaveLength(6)
    for (const kind of ARTIFACT_KINDS) {
      expect(ARTIFACT_KIND_ICON[kind], `icon for ${kind}`).toBeDefined()
      for (const locale of LOCALES) {
        const label = i18n.getFixedT(locale)(ARTIFACT_KIND_KEY[kind])
        expect(label, `${locale}/${kind}`).not.toBe(ARTIFACT_KIND_KEY[kind])
      }
    }
  })

  it('names every outcome', () => {
    expect(OUTCOMES).toHaveLength(4)
    for (const outcome of OUTCOMES) {
      for (const locale of LOCALES) {
        const label = i18n.getFixedT(locale)(OUTCOME_KEY[outcome])
        expect(label, `${locale}/${outcome}`).not.toBe(OUTCOME_KEY[outcome])
      }
    }
  })

  it('translates every checklist item the server ships, in both languages', () => {
    const shipped = [
      'task.read_rules',
      'task.assemble_team',
      'task.register_on_site',
      'task.install_toolchain',
      'task.book_travel',
      'task.plan_idea',
      'task.create_repository',
      'task.split_the_work',
      'task.prepare_environment',
      'task.checkpoint_progress',
      'task.freeze_scope',
      'task.record_demo',
      'task.prepare_slides',
      'task.open_repository',
      'task.submit_the_work',
      'task.write_retrospective',
    ]

    for (const locale of LOCALES) {
      const t = i18n.getFixedT(locale)
      for (const key of shipped) {
        const label = t(`event:personal.template.item.${key}`)
        expect(label, `${locale}/${key}`).not.toContain('personal.template')
        expect(label, `${locale}/${key}`).not.toHaveLength(0)
      }
      for (const template of ['preparation', 'build_day', 'submission_day']) {
        const label = t(`event:personal.template.name.${template}`)
        expect(label, `${locale}/${template}`).not.toContain('personal.template')
      }
    }
  })
})

describe('the personal layer says it is private', () => {
  it('promises privacy in both languages without naming anybody else', () => {
    for (const locale of LOCALES) {
      const t = i18n.getFixedT(locale)
      expect(t('event:personal.subtitle')).not.toHaveLength(0)
      expect(t('event:personal.absentHint')).not.toHaveLength(0)
      expect(t('event:personal.absentHint').toLowerCase()).not.toContain('forbidden')
    }
  })
})
