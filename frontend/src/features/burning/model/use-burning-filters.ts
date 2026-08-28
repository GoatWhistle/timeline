import { useCallback, useMemo } from 'react'
import { useUrlFilters } from '@/shared/hooks/use-url-filters/use-url-filters'
import type { BurningFilters, BurningSort } from './burning'
import { DEFAULT_FILTERS } from './burning'

const DEFAULTS = { sort: '', active: '', action: '', selected: '' }

export function parseSort(raw: string): BurningSort {
  return raw === 'start' ? 'start' : 'urgency'
}

export function parseFilters(raw: {
  sort: string
  active: string
  action: string
}): BurningFilters {
  return {
    sort: parseSort(raw.sort),
    activeOnly: raw.active === '0' ? false : DEFAULT_FILTERS.activeOnly,
    needsAction: raw.action === '1',
  }
}

export function useBurningFilters() {
  const [raw, setRaw] = useUrlFilters(DEFAULTS)

  const filters = useMemo(
    () => parseFilters({ sort: raw.sort, active: raw.active, action: raw.action }),
    [raw.sort, raw.active, raw.action],
  )

  const setSort = useCallback(
    (sort: BurningSort) => setRaw({ sort: sort === 'urgency' ? undefined : sort }),
    [setRaw],
  )

  const setActiveOnly = useCallback(
    (activeOnly: boolean) => setRaw({ active: activeOnly ? undefined : '0' }),
    [setRaw],
  )

  const setNeedsAction = useCallback(
    (needsAction: boolean) => setRaw({ action: needsAction ? '1' : undefined }),
    [setRaw],
  )

  const setSelected = useCallback(
    (id: string | undefined) => setRaw({ selected: id }, { resetPage: false }),
    [setRaw],
  )

  return {
    filters,
    selected: raw.selected || null,
    setSort,
    setActiveOnly,
    setNeedsAction,
    setSelected,
  }
}
