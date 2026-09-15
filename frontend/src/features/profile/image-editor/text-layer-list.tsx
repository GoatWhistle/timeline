import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { TextLayerEditor } from './text-layer-editor'
import type { TextLayer } from './text-layers'

export function TextLayerList({
  canvas,
  scale,
  layers,
  activeId,
  onSelect,
  onEdit,
  onDrag,
  onRemove,
  onBlur,
}: {
  canvas: { width: number; height: number }
  scale: number
  layers: readonly TextLayer[]
  activeId: string | null
  onSelect: (id: string) => void
  onEdit: (id: string, text: string) => void
  onDrag: (id: string, dx: number, dy: number) => void
  onRemove: (id: string) => void
  onBlur: () => void
}) {
  const { t } = useTranslation()
  const dragFrom = useRef<{ x: number; y: number } | null>(null)

  return (
    <div className="pointer-events-none absolute inset-0">
      {layers.map((layer) => {
        const style = {
          left: `${(layer.x / canvas.width) * 100}%`,
          top: `${(layer.y / canvas.height) * 100}%`,
          color: layer.colour,
          fontSize: `${layer.size * scale}px`,
          lineHeight: 1.3,
        }

        if (layer.id === activeId) {
          return (
            <TextLayerEditor
              key={layer.id}
              initial={layer.text}
              style={style}
              onCommit={(text) => {
                onEdit(layer.id, text)
                onBlur()
              }}
              onDiscard={() => {
                onRemove(layer.id)
                onBlur()
              }}
            />
          )
        }

        return (
          <button
            key={layer.id}
            type="button"
            data-text-layer={layer.id}
            aria-label={t('imageEditor.textLayer', { text: layer.text })}
            onPointerDown={(event) => {
              event.stopPropagation()
              event.currentTarget.setPointerCapture(event.pointerId)
              dragFrom.current = { x: event.clientX, y: event.clientY }
            }}
            onPointerMove={(event) => {
              const from = dragFrom.current
              if (!from || event.buttons === 0) return
              onDrag(layer.id, event.clientX - from.x, event.clientY - from.y)
              dragFrom.current = { x: event.clientX, y: event.clientY }
            }}
            onPointerUp={(event) => {
              const from = dragFrom.current
              dragFrom.current = null
              const moved =
                from !== null &&
                (Math.abs(event.clientX - from.x) > 3 || Math.abs(event.clientY - from.y) > 3)
              if (!moved) onSelect(layer.id)
            }}
            className={cn(
              'pointer-events-auto absolute cursor-move touch-none whitespace-pre',
              'border border-transparent p-0 text-left',
              'hover:border-primary hover:border-dashed',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            )}
            style={style}
          >
            {layer.text}
          </button>
        )
      })}
    </div>
  )
}
