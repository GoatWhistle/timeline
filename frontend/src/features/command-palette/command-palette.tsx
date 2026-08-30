import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useReturnFocus } from '@/shared/hooks/use-return-focus/use-return-focus'
import { matchesQuery } from '@/shared/keyboard/layout-map'
import { useShortcutScope } from '@/shared/keyboard/shortcut-registry'
import { cn } from '@/shared/styling/class-names/class-names'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/overlays/dialog'

export type Command = {
  id: string
  title: string
  hint?: string
  keys?: string[]
  run: () => void
}

export function CommandPalette({
  open,
  onOpenChange,
  commands,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  commands: Command[]
}) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const chosen = useRef(false)
  const returnFocus = useReturnFocus(open)

  const results = useMemo(() => {
    if (!query.trim()) return commands
    return commands.filter(
      (command) => matchesQuery(command.title, query) || matchesQuery(command.hint ?? '', query),
    )
  }, [commands, query])

  useEffect(() => {
    if (!open) setQuery('')
    if (open) chosen.current = false
    setActive(0)
  }, [open])

  useShortcutScope('command-palette', [], { mode: 'exclusive', enabled: open })

  function choose(index: number) {
    const command = results[index]
    if (!command) return
    chosen.current = true
    onOpenChange(false)
    command.run()
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((current) => (results.length ? (current + 1) % results.length : 0))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((current) => (results.length ? (current - 1 + results.length) % results.length : 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      choose(active)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-[20%] max-w-xl translate-y-0 gap-0 p-0"
        onCloseAutoFocus={(event) => {
          if (!chosen.current) returnFocus(event)
        }}
      >
        <DialogTitle className="sr-only">{t('palette.title')}</DialogTitle>
        <input
          autoFocus
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls="command-palette-list"
          aria-activedescendant={results[active] ? `command-${results[active].id}` : undefined}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setActive(0)
          }}
          onKeyDown={onKeyDown}
          placeholder={t('palette.placeholder')}
          aria-label={t('palette.title')}
          className="w-full border-border border-b bg-transparent px-4 py-3 text-copy outline-none placeholder:text-muted-foreground"
        />

        <div
          id="command-palette-list"
          ref={listRef}
          role="listbox"
          aria-label={t('palette.title')}
          className="max-h-80 overflow-y-auto p-1"
        >
          {results.length === 0 && (
            <p className="px-3 py-6 text-center text-muted-foreground text-meta">
              {t('palette.empty')}
            </p>
          )}
          {results.map((command, index) => (
            <button
              key={command.id}
              type="button"
              id={`command-${command.id}`}
              role="option"
              aria-selected={index === active}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(index)}
              className={cn(
                'flex h-row-roomy w-full items-center gap-3 rounded-control px-3 text-left',
                'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
                index === active ? 'bg-accent-surface' : 'hover:bg-surface-2',
              )}
            >
              <span className="min-w-0 flex-1 truncate text-copy">{command.title}</span>
              {command.hint && (
                <span className="shrink-0 text-muted-foreground text-caption">{command.hint}</span>
              )}
              {command.keys && (
                <span className="shrink-0 font-mono text-faint-foreground text-caption">
                  {command.keys.join(' ')}
                </span>
              )}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
