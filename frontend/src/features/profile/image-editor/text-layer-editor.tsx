import type * as React from 'react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'

export function TextLayerEditor({
  initial,
  style,
  onCommit,
  onDiscard,
}: {
  initial: string
  style: React.CSSProperties
  onCommit: (text: string) => void
  onDiscard: () => void
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(initial)
  const field = useRef<HTMLInputElement | null>(null)
  const settled = useRef(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      field.current?.focus()
      field.current?.select()
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  function finish(text: string) {
    if (settled.current) return
    settled.current = true
    if (text.trim() === '') onDiscard()
    else onCommit(text)
  }

  return (
    <input
      ref={field}
      data-text-input
      aria-label={t('imageEditor.textInputLabel')}
      placeholder={t('imageEditor.textInputPlaceholder')}
      value={draft}
      size={Math.max(draft.length + 1, 6)}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => finish(draft)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          finish(draft)
        }
        if (event.key === 'Escape') {
          event.preventDefault()
          settled.current = true
          onDiscard()
        }
      }}
      className={cn(
        'pointer-events-auto absolute border border-primary border-dashed bg-transparent',
        'p-0 outline-none placeholder:text-muted-foreground',
      )}
      style={style}
    />
  )
}
