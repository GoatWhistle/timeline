import { act, screen, within } from '@testing-library/react'
import { dictionaries, type Tree } from '@tests/support/dictionaries'
import { beforeAll, describe, expect, it } from 'vitest'
import { i18n } from '@/shared/i18n/config'
import { LOCALES } from '@/shared/i18n/locale'
import { appRegistry, renderWith, shortcut } from './harness'

beforeAll(async () => {
  await i18n.changeLanguage('ru')
})

describe('shortcut settings view', () => {
  it('reads the shortcuts out of the registry rather than a static list', () => {
    renderWith(appRegistry())

    expect(screen.getByText(i18n.t('common:shortcuts.palette'))).toBeInTheDocument()
    expect(screen.getByText('Ctrl')).toBeInTheDocument()
    expect(screen.getByText('k')).toBeInTheDocument()
  })

  it('follows the registry when a scope is pushed after the first render', () => {
    const registry = appRegistry()

    renderWith(registry)
    expect(screen.queryByText(i18n.t('common:shortcuts.sidebar'))).not.toBeInTheDocument()

    act(() => {
      registry.push({
        id: 'sidebar',
        mode: 'normal',
        shortcuts: [shortcut('sidebar-toggle', ['mod+b'], 'shortcuts.sidebar')],
      })
    })

    expect(screen.getByText(i18n.t('common:shortcuts.sidebar'))).toBeInTheDocument()
    expect(screen.getByText('b')).toBeInTheDocument()
  })

  it('drops a scope from the view once it is removed from the registry', () => {
    const registry = appRegistry()
    registry.push({
      id: 'search',
      mode: 'normal',
      shortcuts: [shortcut('focus-search', ['/'], 'shortcuts.search')],
    })

    renderWith(registry)
    expect(screen.getByText(i18n.t('common:shortcuts.search'))).toBeInTheDocument()

    act(() => {
      registry.remove('search')
    })
    expect(screen.queryByText(i18n.t('common:shortcuts.search'))).not.toBeInTheDocument()
  })

  it('hides the scopes that only exist while their own overlay is open', () => {
    const registry = appRegistry()
    registry.push({
      id: 'shortcut-help',
      mode: 'exclusive',
      shortcuts: [shortcut('help-close', ['escape'], 'shortcuts.help')],
    })

    renderWith(registry)

    expect(screen.getByText(i18n.t('common:shortcuts.palette'))).toBeInTheDocument()
    expect(screen.queryByText(i18n.t('common:shortcuts.help'))).not.toBeInTheDocument()
  })
})

describe('the same two sections on every screen', () => {
  it('names the page it is showing, and does so on a page that registers nothing', () => {
    renderWith(appRegistry(), {}, '/schedule')

    expect(
      screen.getByText(
        i18n.t('common:shortcuts.scopePage', { page: i18n.t('common:nav.schedule') }),
      ),
    ).toBeInTheDocument()
    expect(screen.getByText(i18n.t('common:shortcuts.pageEmpty'))).toBeInTheDocument()
  })

  it('names a different page when the screen underneath is a different one', () => {
    renderWith(appRegistry(), {}, '/catalog')

    expect(
      screen.getByText(
        i18n.t('common:shortcuts.scopePage', { page: i18n.t('common:nav.catalog') }),
      ),
    ).toBeInTheDocument()
  })

  it('keeps both headings whether or not the page registered a scope', () => {
    const bare = renderWith(appRegistry(), {}, '/history')
    const headings = () =>
      screen.getAllByRole('heading', { level: 3 }).map((node) => node.textContent)
    expect(headings()).toHaveLength(2)
    expect(headings()[0]).toBe(i18n.t('common:shortcuts.scopeApp'))
    bare.unmount()

    const registry = appRegistry()
    registry.push({
      id: 'catalog-list',
      mode: 'normal',
      shortcuts: [shortcut('list-next', ['j'], 'shortcuts.listNext')],
    })
    renderWith(registry, {}, '/catalog')
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2)
    expect(screen.getByText(i18n.t('common:shortcuts.listNext'))).toBeInTheDocument()
  })

  it('files a page scope under the page and a global scope under the application', () => {
    const registry = appRegistry()
    registry.push({
      id: 'catalog-list',
      mode: 'normal',
      shortcuts: [shortcut('list-next', ['j'], 'shortcuts.listNext')],
    })
    renderWith(registry, {}, '/catalog')

    const sections = screen.getAllByRole('heading', { level: 3 }).map((node) => node.parentElement)
    expect(
      within(sections[0] as HTMLElement).getByText(i18n.t('common:shortcuts.palette')),
    ).toBeInTheDocument()
    expect(
      within(sections[1] as HTMLElement).getByText(i18n.t('common:shortcuts.listNext')),
    ).toBeInTheDocument()
  })

  it('no longer counts the shortcuts in a section, nor explains where the list came from', () => {
    const { container } = renderWith(appRegistry())

    const gone = ['settingsHint', 'scopeCount_one', 'scopeCount_few', 'scopeCount_many']
    for (const locale of LOCALES) {
      const shortcuts = dictionaries[locale].common.shortcuts as Tree
      for (const key of gone) expect(shortcuts[key], `${locale}.${key}`).toBeUndefined()
    }

    expect(container.querySelectorAll('h3')).toHaveLength(2)
    for (const heading of container.querySelectorAll('h3')) {
      expect(heading.textContent).not.toMatch(/\d/)
    }
  })

  it('carries every word the new controls need in both languages, not only the active one', () => {
    const needed = ['scopePage', 'pageEmpty', 'saveOne', 'cancelOne', 'resetOne', 'changeOne']
    for (const locale of LOCALES) {
      const shortcuts = dictionaries[locale].common.shortcuts as Tree
      for (const key of needed) {
        expect(typeof shortcuts[key], `${locale}.${key}`).toBe('string')
      }
      expect(shortcuts.scopePage, locale).toContain('{{page}}')
      for (const key of ['saveOne', 'cancelOne', 'resetOne', 'changeOne']) {
        expect(shortcuts[key], `${locale}.${key}`).toContain('{{name}}')
      }
    }
  })
})
