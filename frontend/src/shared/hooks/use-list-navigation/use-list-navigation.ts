import { useCallback, useEffect, useMemo } from 'react'
import { type ShortcutDefinition, useShortcutScope } from '@/shared/keyboard/shortcut-registry'

export function step(ids: string[], current: string | null, delta: number): string | null {
  if (ids.length === 0) return null
  const first = ids[0] ?? null
  if (current === null) return delta > 0 ? first : (ids[ids.length - 1] ?? null)
  const index = ids.indexOf(current)
  if (index === -1) return first
  const next = index + delta
  if (next < 0 || next >= ids.length) return current
  return ids[next] ?? current
}

export function useListNavigation({
  ids,
  selected,
  onSelect,
  onClear,
  scopeId = 'list',
}: {
  ids: string[]
  selected: string | null
  onSelect: (id: string) => void
  onClear?: () => void
  scopeId?: string
}) {
  const move = useCallback(
    (delta: number) => {
      const next = step(ids, selected, delta)
      if (next) onSelect(next)
    },
    [ids, selected, onSelect],
  )

  const shortcuts = useMemo<ShortcutDefinition[]>(
    () => [
      {
        id: 'list-next',
        keys: ['j', 'arrowdown'],
        titleKey: 'shortcuts.listNext',
        group: 'list',
        run: () => move(1),
      },
      {
        id: 'list-previous',
        keys: ['k', 'arrowup'],
        titleKey: 'shortcuts.listPrevious',
        group: 'list',
        run: () => move(-1),
      },
      {
        id: 'list-clear',
        keys: ['escape'],
        titleKey: 'shortcuts.listClear',
        group: 'list',
        when: () => selected !== null,
        run: () => onClear?.(),
      },
    ],
    [move, selected, onClear],
  )

  useShortcutScope(scopeId, shortcuts)

  useEffect(() => {
    if (!selected) return
    const row = document.querySelector<HTMLElement>(`[data-event-row="${selected}"]`)
    if (!row) return
    row.scrollIntoView({ block: 'nearest' })
    const active = document.activeElement
    const inList = active instanceof HTMLElement && active.hasAttribute('data-event-row')
    if (inList && active !== row) row.focus({ preventScroll: true })
  }, [selected])
}
