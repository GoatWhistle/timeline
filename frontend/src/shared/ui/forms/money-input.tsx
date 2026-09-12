import { useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toLocale } from '@/shared/i18n/locale'
import { groupDigits, reformat } from '@/shared/money/money-input-format'
import { cn } from '@/shared/styling/class-names/class-names'

export function MoneyInput({
  id,
  value,
  invalid,
  describedBy,
  required,
  disabled,
  onChange,
  onBlur,
  className,
}: {
  id: string
  value: string
  invalid?: boolean
  describedBy?: string | undefined
  required?: boolean
  disabled?: boolean
  onChange: (digits: string) => void
  onBlur?: () => void
  className?: string
}) {
  const { i18n } = useTranslation()
  const locale = toLocale(i18n.language)
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingCaret = useRef<number | null>(null)
  const [formatted, setFormatted] = useState(() => groupDigits(value, locale))

  useLayoutEffect(() => {
    setFormatted(groupDigits(value, locale))
  }, [value, locale])

  useLayoutEffect(() => {
    const caret = pendingCaret.current
    if (caret === null) return
    pendingCaret.current = null
    inputRef.current?.setSelectionRange(caret, caret)
  })

  function apply(nextRaw: string, caretPos: number) {
    const result = reformat(formatted, nextRaw, caretPos, locale)
    pendingCaret.current = result.caret
    setFormatted(result.formatted)
    if (result.digits !== value) onChange(result.digits)
  }

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={formatted}
      disabled={disabled}
      data-value={value || undefined}
      aria-invalid={invalid ? true : undefined}
      aria-describedby={describedBy}
      aria-required={required ? true : undefined}
      onChange={(event) => {
        apply(event.target.value, event.target.selectionStart ?? event.target.value.length)
      }}
      onPaste={(event) => {
        const pasted = event.clipboardData.getData('text')
        if (!/\d/.test(pasted)) return
        event.preventDefault()
        const target = event.currentTarget
        const start = target.selectionStart ?? target.value.length
        const end = target.selectionEnd ?? target.value.length
        const nextRaw = target.value.slice(0, start) + pasted + target.value.slice(end)
        apply(nextRaw, start + pasted.length)
      }}
      onBlur={onBlur}
      className={cn(
        'flex h-9 w-full rounded-control border border-input bg-transparent px-3 py-1 text-copy tabular-nums shadow-flat transition-colors',
        'placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-destructive aria-invalid:outline-destructive',
        className,
      )}
    />
  )
}
