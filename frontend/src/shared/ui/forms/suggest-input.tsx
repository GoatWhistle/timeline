import { type ComponentProps, type KeyboardEvent, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { FLOATING_SURFACE } from '@/shared/ui/overlays/overlay-chrome'
import { Input } from './input'

type SuggestInputProps = Omit<ComponentProps<'input'>, 'type' | 'role'> & {
  suggestions: readonly string[]
  onPick: (value: string) => void
}

function clampIndex(index: number, length: number): number {
  if (length === 0) return -1
  if (index < 0) return length - 1
  if (index >= length) return 0
  return index
}

export function SuggestInput({
  suggestions,
  onPick,
  className,
  onKeyDown,
  onBlur,
  onChange,
  ...props
}: SuggestInputProps) {
  const { t } = useTranslation()
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const holding = useRef(false)

  const visible = open && suggestions.length > 0

  function choose(value: string) {
    onPick(value)
    setOpen(false)
    setActive(-1)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(event)
    if (event.defaultPrevented) return
    if (event.key === 'Escape') {
      if (!visible) return
      event.preventDefault()
      setOpen(false)
      setActive(-1)
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        setActive(suggestions.length > 0 ? 0 : -1)
        return
      }
      setActive((current) =>
        clampIndex(current + (event.key === 'ArrowDown' ? 1 : -1), suggestions.length),
      )
      return
    }
    if (event.key === 'Enter' && visible && active >= 0) {
      const picked = suggestions[active]
      if (picked === undefined) return
      event.preventDefault()
      choose(picked)
    }
  }

  return (
    <div className="relative">
      <Input
        {...props}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-expanded={visible}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={visible && active >= 0 ? `${listId}-option-${active}` : undefined}
        className={className}
        onChange={(event) => {
          onChange?.(event)
          setOpen(true)
          setActive(-1)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        onBlur={(event) => {
          onBlur?.(event)
          if (holding.current) return
          setOpen(false)
          setActive(-1)
        }}
      />

      <div
        id={listId}
        role="listbox"
        aria-label={t('suggest.legend')}
        hidden={!visible}
        className={cn(
          FLOATING_SURFACE,
          'absolute top-full right-0 left-0 mt-1 max-h-56 overflow-y-auto py-1',
          'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1',
          'motion-safe:duration-fast motion-safe:ease-out',
        )}
      >
        {suggestions.map((suggestion, index) => (
          <button
            key={suggestion}
            id={`${listId}-option-${index}`}
            type="button"
            tabIndex={-1}
            role="option"
            aria-selected={index === active}
            data-active={index === active ? 'true' : undefined}
            className={cn(
              'block w-full cursor-pointer truncate px-3 py-1.5 text-left text-copy',
              'transition-colors duration-fast ease-out',
              index === active ? 'bg-accent-surface text-foreground' : 'text-muted-foreground',
            )}
            onMouseDown={() => {
              holding.current = true
            }}
            onMouseUp={() => {
              holding.current = false
            }}
            onClick={() => choose(suggestion)}
            onMouseEnter={() => setActive(index)}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}
