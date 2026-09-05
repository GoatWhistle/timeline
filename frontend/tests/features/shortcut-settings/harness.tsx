import { act, screen, within } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { ShortcutSettings } from '@/features/shortcut-settings/shortcut-settings'
import { sessionQueryKey } from '@/shared/api/session'
import type { MeResponse, Shortcuts } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'
import { ShortcutProvider, ShortcutRegistry } from '@/shared/keyboard/shortcut-registry'

function session(shortcuts: Shortcuts): MeResponse {
  return {
    id: '4b7a7cf5-3f45-4b7e-a3d9-9f27b8a1c2d3',
    email: 'member@example.com',
    email_verified: true,
    first_name: 'Ivan',
    last_name: 'Petrov',
    display_name: 'Petrov Ivan',
    profile_public: false,
    is_active: true,
    is_admin: false,
    locale: 'ru',
    telegram_linked: false,
    notification_channels: ['TELEGRAM', 'EMAIL'],
    timezone: 'Europe/Moscow',
    shortcuts,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}

export function renderWith(shortcuts: Shortcuts = {}, route = '/catalog') {
  const result = renderWithProviders(
    <ShortcutProvider registry={new ShortcutRegistry()}>
      <ShortcutSettings />
    </ShortcutProvider>,
    { route },
  )
  act(() => {
    result.queryClient.setQueryData(sessionQueryKey, session(shortcuts))
  })
  return result
}

const MARK = ' '

function labelled(key: string): HTMLElement[] {
  const prefix = (i18n.t(`common:shortcuts.${key}`, { name: MARK }).split(MARK)[0] ?? '')
    .replace(/[«»“”"]/g, '')
    .trim()
  return screen
    .getAllByRole('button')
    .filter((node) => (node.getAttribute('aria-label') ?? '').startsWith(prefix))
}

export const changeButtons = () => labelled('changeOne')
export const saveButtons = () => labelled('saveOne')
export const cancelButtons = () => labelled('cancelOne')
export const revertButtons = () => labelled('resetOne')

export function rowNamed(title: string): HTMLElement {
  const cell = screen.getByText(title)
  const row = cell.closest('div')
  if (!row) throw new Error(`no row for ${title}`)
  return row
}

export function revertFor(title: string): HTMLElement {
  const buttons = within(rowNamed(title)).getAllByRole('button')
  const revert = buttons[buttons.length - 1]
  if (!(revert instanceof HTMLElement)) throw new Error(`no revert for ${title}`)
  return revert
}

export function pencilFor(title: string): HTMLElement {
  const button = rowNamed(title).querySelector('[data-row-action="edit"]')
  if (!(button instanceof HTMLElement)) throw new Error(`no pencil for ${title}`)
  return button
}

export const drafts = (kind?: string) =>
  Array.from(
    document.querySelectorAll(
      kind === undefined ? '[data-shortcut-draft]' : `[data-shortcut-draft="${kind}"]`,
    ),
  )

export function recordedVariables(queryClient: ReturnType<typeof renderWith>['queryClient']) {
  const seen: unknown[] = []
  const ids = new Set<number>()
  queryClient.getMutationCache().subscribe((event) => {
    const mutation = event.mutation
    if (mutation === undefined) return
    if (mutation.state.status !== 'pending' || ids.has(mutation.mutationId)) return
    ids.add(mutation.mutationId)
    seen.push(mutation.state.variables)
  })
  return seen
}
