import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { ADMIN_NAV, CATALOG_NAV, MINE_NAV } from '@/app/sidebar/nav-section'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value/use-debounced-value'
import { useReturnFocus } from '@/shared/hooks/use-return-focus/use-return-focus'
import { useShortcutScope } from '@/shared/keyboard/shortcut-registry'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/overlays/dialog'
import { PaletteHintBar } from './palette-hint-bar'
import { PaletteList } from './palette-list'
import { isHelpQuery, parseQuery } from './palette-prefix'
import { PalettePrefixList } from './palette-prefix-list'
import type { PaletteResult } from './palette-results'
import { buildResults } from './palette-results'
import { pushRecent, readRecent } from './recent-store'
import { usePaletteSearch } from './use-palette-search'

export type Command = PaletteResult

export function CommandPalette({
  open,
  onOpenChange,
  commands,
  isAdmin,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  commands: Command[]
  isAdmin: boolean
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<string | null>(null)
  const chosen = useRef(false)
  const returnFocus = useReturnFocus(open)

  const parsed = parseQuery(query)
  const debouncedTerm = useDebouncedValue(parsed.term, 250)
  const search = usePaletteSearch(parsed.mode, debouncedTerm)

  const pages = useMemo(
    () => [...CATALOG_NAV, ...MINE_NAV].map((item) => ({ item, label: t(item.labelKey) })),
    [t],
  )
  const adminPages = useMemo(
    () => ADMIN_NAV.map((item) => ({ item, label: t(item.labelKey) })),
    [t],
  )

  const results = useMemo(() => {
    if (parsed.mode === 'admin' && !isAdmin) return []
    return buildResults({
      mode: parsed.mode,
      term: parsed.term,
      events: search.events,
      teams: search.teams,
      pages,
      adminPages,
      commands,
      recent: readRecent(),
    })
  }, [parsed.mode, parsed.term, search.events, search.teams, pages, adminPages, commands, isAdmin])

  useEffect(() => {
    if (!open) {
      setQuery('')
    }
    if (open) chosen.current = false
    setActive(null)
  }, [open])

  useEffect(() => {
    setActive((current) => {
      if (current !== null && results.some((result) => result.id === current)) return current
      return results[0]?.id ?? null
    })
  }, [results])

  useEffect(() => {
    if (active === null) return
    const row = document.getElementById(`command-${active}`)
    row?.scrollIntoView({ block: 'nearest' })
  }, [active])

  useShortcutScope('command-palette', [], { mode: 'exclusive', enabled: open })

  function choose(result: PaletteResult | undefined) {
    if (!result) return
    chosen.current = true
    onOpenChange(false)
    if (result.run) {
      result.run()
      return
    }
    if (result.path) {
      pushRecent({ id: result.id, title: result.title, path: result.path })
      navigate(result.path)
    }
  }

  function moveActive(delta: number) {
    if (results.length === 0) return
    const index = active ? results.findIndex((result) => result.id === active) : -1
    const next = index === -1 ? (delta > 0 ? 0 : results.length - 1) : index + delta
    const wrapped = ((next % results.length) + results.length) % results.length
    setActive(results[wrapped]?.id ?? null)
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (isHelpQuery(query) && event.key !== 'Escape') return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveActive(1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveActive(-1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      setActive(results[0]?.id ?? null)
    } else if (event.key === 'End') {
      event.preventDefault()
      setActive(results[results.length - 1]?.id ?? null)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      choose(results.find((result) => result.id === active))
    }
  }

  const showHelp = isHelpQuery(query)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        still
        className="top-[20%] max-w-xl translate-y-0 gap-0 p-0"
        onCloseAutoFocus={(event) => {
          if (!chosen.current) returnFocus(event)
        }}
      >
        <DialogTitle className="sr-only">{t('palette.title')}</DialogTitle>
        <div className="flex h-14 items-center gap-2 border-border border-b px-4">
          <input
            autoFocus
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-list"
            aria-activedescendant={active ? `command-${active}` : undefined}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t('palette.placeholder')}
            aria-label={t('palette.title')}
            className="w-full bg-transparent text-copy outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div
          id="command-palette-list"
          role="listbox"
          aria-label={t('palette.title')}
          className="max-h-[19rem] overflow-y-auto p-1 [scrollbar-gutter:stable]"
        >
          {showHelp ? (
            <PalettePrefixList className="flex flex-col gap-2 px-3 py-2" isAdmin={isAdmin} />
          ) : results.length === 0 ? (
            <p className="px-3 py-6 text-center text-muted-foreground text-meta">
              {search.isSearching ? t('palette.searching') : t('palette.empty')}
            </p>
          ) : (
            <PaletteList
              results={results}
              activeId={active}
              onHover={setActive}
              onChoose={choose}
            />
          )}
        </div>

        <PaletteHintBar mode={parsed.mode} isAdmin={isAdmin} />
      </DialogContent>
    </Dialog>
  )
}
