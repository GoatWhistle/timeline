import { screen, within } from '@testing-library/react'
import { dictionaries, type Tree } from '@tests/support/dictionaries'
import { beforeAll, describe, expect, it } from 'vitest'
import { i18n } from '@/shared/i18n/config'
import { LOCALES } from '@/shared/i18n/locale'
import { catalogFor } from '@/shared/keyboard/shortcut-catalog'
import { changeButtons, renderWith, rowNamed } from './harness'

beforeAll(async () => {
  await i18n.changeLanguage('ru')
})

const headings = () =>
  screen.getAllByRole('heading', { level: 3 }).map((node) => node.textContent ?? '')

const MEMBER_CATALOG = catalogFor(false)

const everyEntry = () => MEMBER_CATALOG.flatMap((section) => section.shortcuts)

describe('the settings screen does not depend on the page underneath', () => {
  it('lists every shortcut the catalogue holds, whatever page is open', () => {
    renderWith({}, '/schedule')

    for (const entry of everyEntry()) {
      expect(screen.getByText(i18n.t(`common:${entry.titleKey}`)), entry.id).toBeInTheDocument()
    }
  })

  it('shows the very same shortcuts from a page that registers none of them', () => {
    const onCatalog = renderWith({}, '/catalog')
    const fromCatalog = headings()
    const rows = screen.getAllByRole('definition').length
    onCatalog.unmount()

    renderWith({}, '/history')
    expect(headings()).toEqual(fromCatalog)
    expect(screen.getAllByRole('definition')).toHaveLength(rows)
  })

  it('offers a pencil for every shortcut, so any of them is rebindable from anywhere', () => {
    renderWith({}, '/schedule')

    expect(changeButtons()).toHaveLength(everyEntry().length)
  })

  it('groups the list rather than pouring it out flat', () => {
    renderWith()

    expect(headings()).toEqual(
      MEMBER_CATALOG.map((section) => i18n.t(`common:${section.titleKey}`)),
    )
  })

  it('files a shortcut under the group the catalogue puts it in', () => {
    renderWith()

    const sections = screen.getAllByRole('heading', { level: 3 }).map((node) => node.parentElement)
    MEMBER_CATALOG.forEach((section, index) => {
      const host = sections[index] as HTMLElement
      for (const entry of section.shortcuts) {
        expect(
          within(host).getByText(i18n.t(`common:${entry.titleKey}`)),
          `${section.id}/${entry.id}`,
        ).toBeInTheDocument()
      }
    })
  })

  it('keeps one setting for the list actions rather than one per page', () => {
    renderWith()

    for (const title of ['shortcuts.listNext', 'shortcuts.listPrevious', 'shortcuts.listClear']) {
      expect(screen.getAllByText(i18n.t(`common:${title}`)), title).toHaveLength(1)
    }
  })
})

describe('what the screen no longer says', () => {
  it('does not count the shortcuts, explain the registry, or name the current page', () => {
    renderWith({}, '/catalog')

    const gone = [
      'settingsHint',
      'scopeCount_one',
      'scopeCount_few',
      'scopeCount_many',
      'scopePage',
      'pageEmpty',
      'scopeOther',
    ]
    for (const locale of LOCALES) {
      const shortcuts = dictionaries[locale].common.shortcuts as Tree
      for (const key of gone) expect(shortcuts[key], `${locale}.${key}`).toBeUndefined()
    }

    for (const heading of headings()) expect(heading).not.toMatch(/\d/)
    for (const heading of headings()) {
      expect(heading).not.toContain(i18n.t('common:nav.catalog'))
    }
  })

  it('carries every word the controls need in both languages, not only the active one', () => {
    const needed = [
      'scopeApp',
      'scopeNavigation',
      'scopeLists',
      'saveOne',
      'cancelOne',
      'resetOne',
      'changeOne',
    ]
    for (const locale of LOCALES) {
      const shortcuts = dictionaries[locale].common.shortcuts as Tree
      for (const key of needed) {
        expect(typeof shortcuts[key], `${locale}.${key}`).toBe('string')
      }
      for (const key of ['saveOne', 'cancelOne', 'resetOne', 'changeOne']) {
        expect(shortcuts[key], `${locale}.${key}`).toContain('{{name}}')
      }
    }
  })

  it('names every catalogue group and every shortcut in both languages', () => {
    for (const locale of LOCALES) {
      const common = dictionaries[locale].common as Tree
      for (const section of MEMBER_CATALOG) {
        expect(i18n.getFixedT(locale, 'common')(section.titleKey), section.id).not.toBe(
          section.titleKey,
        )
        for (const entry of section.shortcuts) {
          expect(i18n.getFixedT(locale, 'common')(entry.titleKey), entry.id).not.toBe(
            entry.titleKey,
          )
        }
      }
      expect(common).toBeTruthy()
    }
  })
})

describe('an override reaches the screen', () => {
  it('shows the recorded combination of an override instead of the default', async () => {
    renderWith({ 'command-palette': 'mod+u' })

    const row = rowNamed(i18n.t('common:shortcuts.palette'))
    expect(await within(row).findByText('u')).toBeInTheDocument()
    expect(within(row).queryByText('k')).not.toBeInTheDocument()
  })

  it('leaves every other row on its default while one is overridden', () => {
    renderWith({ 'command-palette': 'mod+u' })

    const row = rowNamed(i18n.t('common:shortcuts.listPrevious'))
    expect(within(row).getByText('k')).toBeInTheDocument()
  })
})
