import { act, screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { ShortcutSettings } from '@/features/shortcut-settings/shortcut-settings'
import { sessionQueryKey } from '@/shared/api/session'
import type { MeResponse, Shortcuts } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'
import {
  type ShortcutDefinition,
  ShortcutProvider,
  ShortcutRegistry,
} from '@/shared/keyboard/shortcut-registry'

export function shortcut(id: string, keys: string[], titleKey: string): ShortcutDefinition {
  return { id, keys, titleKey, group: 'global', run: () => {} }
}

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
    timezone: 'Europe/Moscow',
    shortcuts,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}

export function renderWith(
  registry: ShortcutRegistry,
  shortcuts: Shortcuts = {},
  route = '/catalog',
) {
  const result = renderWithProviders(
    <ShortcutProvider registry={registry}>
      <ShortcutSettings />
    </ShortcutProvider>,
    { route },
  )
  act(() => {
    result.queryClient.setQueryData(sessionQueryKey, session(shortcuts))
  })
  return result
}

export function appRegistry() {
  const registry = new ShortcutRegistry()
  registry.push({
    id: 'app',
    mode: 'normal',
    shortcuts: [shortcut('command-palette', ['mod+k'], 'shortcuts.palette')],
  })
  return registry
}

export function twoRowRegistry() {
  const registry = appRegistry()
  registry.push({
    id: 'sidebar',
    mode: 'normal',
    shortcuts: [shortcut('sidebar-toggle', ['mod+b'], 'shortcuts.sidebar')],
  })
  return registry
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
