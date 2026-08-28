import { type RefObject, useMemo } from 'react'
import { type ShortcutDefinition, useShortcutScope } from '@/shared/keyboard/shortcut-registry'

export function useSearchShortcut(ref: RefObject<HTMLInputElement | null>) {
  const shortcuts = useMemo<ShortcutDefinition[]>(
    () => [
      {
        id: 'focus-search',
        keys: ['/'],
        titleKey: 'shortcuts.search',
        group: 'list',
        run: () => ref.current?.focus(),
      },
    ],
    [ref],
  )

  useShortcutScope('search', shortcuts)
}
