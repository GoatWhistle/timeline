import { act, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it } from 'vitest'
import { ShortcutSettings } from '@/features/shortcut-settings/shortcut-settings'
import { sessionQueryKey } from '@/shared/api/session'
import type { MeResponse, Shortcuts } from '@/shared/api/types.gen'
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

function session(shortcuts: Shortcuts): MeResponse {
  return {
    id: '4b7a7cf5-3f45-4b7e-a3d9-9f27b8a1c2d3',
    email: 'member@example.com',
    email_verified: true,
    display_name: 'Ivan Petrov',
    is_active: true,
    is_admin: false,
    locale: 'ru',
    telegram_linked: false,
    timezone: 'Europe/Moscow',
    shortcuts,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}

function renderWith(registry: ShortcutRegistry, shortcuts: Shortcuts = {}) {
  const result = renderWithProviders(
    <ShortcutProvider registry={registry}>
      <ShortcutSettings />
    </ShortcutProvider>,
  )
  act(() => {
    result.queryClient.setQueryData(sessionQueryKey, session(shortcuts))
  })
  return result
}

function appRegistry() {
  const registry = new ShortcutRegistry()
  registry.push({
    id: 'app',
    mode: 'normal',
    shortcuts: [shortcut('command-palette', ['mod+k'], 'shortcuts.palette')],
  })
  return registry
}

describe('shortcut settings view', () => {
  it('reads the shortcuts out of the registry rather than a static list', () => {
    renderWith(appRegistry())

    expect(screen.getByText('Палитра команд')).toBeInTheDocument()
    expect(screen.getByText('Ctrl')).toBeInTheDocument()
    expect(screen.getByText('k')).toBeInTheDocument()
  })

  it('groups the shortcuts by the scope they were registered in', () => {
    const registry = appRegistry()
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
    const registry = appRegistry()

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
    const registry = appRegistry()
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
    const registry = appRegistry()
    registry.push({
      id: 'shortcut-help',
      mode: 'exclusive',
      shortcuts: [shortcut('help-close', ['escape'], 'shortcuts.help')],
    })

    renderWith(registry)

    expect(screen.getByText('Палитра команд')).toBeInTheDocument()
    expect(screen.queryByText('Справка')).not.toBeInTheDocument()
  })

  it('shows an empty state when the registry holds nothing', () => {
    renderWith(new ShortcutRegistry())

    expect(screen.getByText('Сочетаний нет')).toBeInTheDocument()
  })
})

describe('remapping from the settings screen', () => {
  it('offers a way to change every shortcut, not a read-only list', () => {
    renderWith(appRegistry())

    expect(screen.getByRole('button', { name: 'Изменить' })).toBeInTheDocument()
    expect(screen.queryByText(/только для чтения/)).not.toBeInTheDocument()
  })

  it('shows the recorded combination of an override instead of the default', async () => {
    renderWith(appRegistry(), { 'command-palette': 'mod+u' })

    expect(await screen.findByText('u')).toBeInTheDocument()
    expect(screen.queryByText('k')).not.toBeInTheDocument()
  })

  it('asks for the keys once recording starts', async () => {
    const { user } = renderWith(appRegistry())

    await user.click(screen.getByRole('button', { name: 'Изменить' }))
    expect(screen.getByText('Нажмите клавиши…')).toBeInTheDocument()
  })

  it('refuses a combination another action already holds and names that action', async () => {
    const registry = appRegistry()
    registry.push({
      id: 'list',
      mode: 'normal',
      shortcuts: [shortcut('list-next', ['j'], 'shortcuts.listNext')],
    })
    const { user } = renderWith(registry)

    const buttons = screen.getAllByRole('button', { name: 'Изменить' })
    await user.click(buttons[1] as HTMLElement)
    await user.keyboard('{Control>}k{/Control}')

    expect(screen.getByRole('alert')).toHaveTextContent('Уже занято: Палитра команд')
  })

  it('refuses a combination the browser takes, and says so', async () => {
    const { user } = renderWith(appRegistry())

    await user.click(screen.getByRole('button', { name: 'Изменить' }))
    await user.keyboard('{Control>}w{/Control}')

    expect(screen.getByRole('alert')).toHaveTextContent('принадлежит браузеру')
  })

  it('refuses a key the interface needs to move focus', async () => {
    const { user } = renderWith(appRegistry())

    await user.click(screen.getByRole('button', { name: 'Изменить' }))
    await user.keyboard('{Tab}')

    expect(screen.getByRole('alert')).toHaveTextContent('перемещения по интерфейсу')
  })

  it('offers a per-action reset only while that action carries an override', async () => {
    const { unmount } = renderWith(appRegistry())
    expect(screen.getByRole('button', { name: 'Вернуть умолчание' })).toBeDisabled()
    unmount()

    renderWith(appRegistry(), { 'command-palette': 'mod+u' })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Вернуть умолчание' })).toBeEnabled()
    })
  })

  it('offers a full reset only while something is overridden', async () => {
    const { unmount } = renderWith(appRegistry())
    expect(screen.getByRole('button', { name: 'Сбросить всё' })).toBeDisabled()
    unmount()

    renderWith(appRegistry(), { 'command-palette': 'mod+u' })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Сбросить всё' })).toBeEnabled()
    })
  })

  it('stops recording when the user backs out with escape', async () => {
    const { user } = renderWith(appRegistry())

    await user.click(screen.getByRole('button', { name: 'Изменить' }))
    expect(screen.getByText('Нажмите клавиши…')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByText('Нажмите клавиши…')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
