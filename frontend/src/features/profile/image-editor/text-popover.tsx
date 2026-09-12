import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Textarea } from '@/shared/ui/forms/textarea'
import { PANEL_SURFACE } from '@/shared/ui/overlays/overlay-chrome'
import { Button } from '@/shared/ui/primitives/button'
import type { Point } from './editor-model'

export function TextPopover({
  canvas,
  point,
  onCommit,
  onCancel,
}: {
  canvas: HTMLCanvasElement
  point: Point
  onCommit: (text: string) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const left = (point.x / canvas.width) * 100
  const top = (point.y / canvas.height) * 100

  return (
    <div
      className={`absolute z-10 flex w-56 flex-col gap-2 p-2 ${PANEL_SURFACE}`}
      style={{ left: `${left}%`, top: `${top}%` }}
    >
      <Textarea
        autoFocus
        rows={2}
        aria-label={t('imageEditor.textInputLabel')}
        placeholder={t('imageEditor.textInputPlaceholder')}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            onCancel()
          }
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            onCommit(value)
          }
        }}
        className="text-caption"
      />
      <div className="flex justify-end gap-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {t('imageEditor.cancel')}
        </Button>
        <Button type="button" size="sm" onClick={() => onCommit(value)}>
          {t('imageEditor.textConfirm')}
        </Button>
      </div>
    </div>
  )
}
