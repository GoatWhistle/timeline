import { act, screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it } from 'vitest'
import { ShortcutSettings } from '@/features/shortcut-settings/shortcut-settings'
import { i18n } from '@/shared/i18n/config'
import {
  type ShortcutDefinition,
  ShortcutProvider,
  ShortcutRegistry,
} from '@/shared/keyboard/shortcut-registry'

beforeAll(async () => {
  await i18n.changeLanguage('ru')
})

function shortcut(id: string, keys: string[], titleKey: string): ShortcutDefinition {
  return { id, keys, titleKey, group: 'global', run: () => {} }
}

function renderWith(registry: ShortcutRegistry) {
  return renderWithProviders(
    <ShortcutProvider registry={registry}>
      <ShortcutSettings />
    </ShortcutProvider>,
  )
}

describe('shortcut settings view', () => {
  it('reads the shortcuts out of the registry rather than a static list', () => {
    const registry = new ShortcutRegistry()
    registry.push({
      id: 'app',
      mode: 'normal',
      shortcuts: [shortcut('command-palette', ['mod+k'], 'shortcuts.palette')],
    })

    renderWith(registry)

    expect(screen.getByText('Палитра команд')).toBeInTheDocument()
    expect(screen.getByText('⌘ / Ctrl')).toBeInTheDocument()
    expect(screen.getByText('k')).toBeInTheDocument()
  })

  it('groups the shortcuts by the scope they were registered in', () => {
    const registry = new ShortcutRegistry()
    registry.push({
      id: 'app',
      mode: 'normal',
      shortcuts: [shortcut('command-palette', ['mod+k'], 'shortcuts.palette')],
    })
    registry.push({
      id: 'list',
      mode: 'normal',
      shortcuts: [shortcut('list-next', ['j'], 'shortcuts.listNext')],
    })

    renderWith(registry)

    expect(screen.getByText('Приложение')).toBeInTheDocument()
    expect(screen.getByText('Список')).toBeInTheDocument()
    expect(screen.getByText('Палитра команд')).toBeInTheDocument()
    expect(screen.getByText('Следующая строка')).toBeInTheDocument()
  })

  it('follows the registry when a scope is pushed after the first render', () => {
    const registry = new ShortcutRegistry()
    registry.push({
      id: 'app',
      mode: 'normal',
      shortcuts: [shortcut('command-palette', ['mod+k'], 'shortcuts.palette')],
    })

    renderWith(registry)
    expect(screen.queryByText('Боковая панель')).not.toBeInTheDocument()

    act(() => {
      registry.push({
        id: 'sidebar',
        mode: 'normal',
        shortcuts: [shortcut('sidebar-toggle', ['mod+b'], 'shortcuts.listClear')],
      })
    })

    expect(screen.getByText('Боковая панель')).toBeInTheDocument()
    expect(screen.getByText('Снять выделение')).toBeInTheDocument()
    expect(screen.getByText('b')).toBeInTheDocument()
  })

  it('drops a scope from the view once it is removed from the registry', () => {
    const registry = new ShortcutRegistry()
    registry.push({
      id: 'app',
      mode: 'normal',
      shortcuts: [shortcut('command-palette', ['mod+k'], 'shortcuts.palette')],
    })
    registry.push({
      id: 'search',
      mode: 'normal',
      shortcuts: [shortcut('focus-search', ['/'], 'shortcuts.search')],
    })

    renderWith(registry)
    expect(screen.getByText('Перейти к поиску')).toBeInTheDocument()

    act(() => {
      registry.remove('search')
    })
    expect(screen.queryByText('Перейти к поиску')).not.toBeInTheDocument()
  })

  it('hides the scopes that only exist while their own overlay is open', () => {
    const registry = new ShortcutRegistry()
    registry.push({
      id: 'app',
      mode: 'normal',
      shortcuts: [shortcut('command-palette', ['mod+k'], 'shortcuts.palette')],
    })
    registry.push({
      id: 'shortcut-help',
      mode: 'exclusive',
      shortcuts: [shortcut('help-close', ['escape'], 'shortcuts.help')],
    })

    renderWith(registry)

    expect(screen.getByText('Палитра команд')).toBeInTheDocument()
    expect(screen.queryByText('Справка')).not.toBeInTheDocument()
  })

  it('says nothing about remapping being available', () => {
    const registry = new ShortcutRegistry()
    registry.push({
      id: 'app',
      mode: 'normal',
      shortcuts: [shortcut('command-palette', ['mod+k'], 'shortcuts.palette')],
    })

    renderWith(registry)

    expect(screen.queryByRole('button', { name: /Изменить/ })).not.toBeInTheDocument()
    expect(screen.getByText(/только для чтения/)).toBeInTheDocument()
  })

  it('shows an empty state when the registry holds nothing', () => {
    renderWith(new ShortcutRegistry())

    expect(screen.getByText('Сочетаний нет')).toBeInTheDocument()
  })
})
