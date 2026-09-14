import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Point } from './editor-model'

export function TextPopover({
  canvas,
  point,
  colour,
  size,
  onCommit,
  onCancel,
}: {
  canvas: HTMLCanvasElement
  point: Point
  colour: string
  size: number
  onCommit: (text: string) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const left = (point.x / canvas.width) * 100
  const top = (point.y / canvas.height) * 100
  const scale = canvas.getBoundingClientRect().width / canvas.width || 1

  return (
    <input
      autoFocus
      data-text-input
      aria-label={t('imageEditor.textInputLabel')}
      placeholder={t('imageEditor.textInputPlaceholder')}
      value={value}
      size={Math.max(value.length + 1, 8)}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => (value.trim() === '' ? onCancel() : onCommit(value))}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          onCancel()
        }
        if (event.key === 'Enter') {
          event.preventDefault()
          if (value.trim() === '') onCancel()
          else onCommit(value)
        }
      }}
      className="-translate-y-1/2 absolute z-10 border-0 bg-transparent p-0 outline-none placeholder:text-muted-foreground"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        color: colour,
        fontSize: `${size * scale}px`,
        lineHeight: 1.1,
        caretColor: colour,
      }}
    />
  )
}
