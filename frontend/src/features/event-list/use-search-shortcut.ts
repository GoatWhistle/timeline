import { type RefObject, useMemo } from 'react'
import { catalogEntry } from '@/shared/keyboard/shortcut-catalog'
import { type ShortcutDefinition, useShortcutScope } from '@/shared/keyboard/shortcut-registry'

export function useSearchShortcut(ref: RefObject<HTMLInputElement | null>) {
  const shortcuts = useMemo<ShortcutDefinition[]>(
    () => [{ ...catalogEntry('focus-search'), run: () => ref.current?.focus() }],
    [ref],
  )

  useShortcutScope('search', shortcuts)
}
