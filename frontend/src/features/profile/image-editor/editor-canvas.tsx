import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { isUsableCrop } from './editor-model'
import type { useImageEditor } from './use-image-editor'

type Editor = ReturnType<typeof useImageEditor>

export function EditorCanvas({ editor }: { editor: Editor }) {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-[22rem] items-center justify-center rounded-control border border-border bg-surface-2 p-4">
      <div className="relative inline-block">
        <canvas
          ref={editor.canvasRef}
          aria-label={t('imageEditor.canvasLabel')}
          className={cn(
            'block max-h-[46vh] max-w-full touch-none rounded-badge',
            editor.ready ? 'opacity-100' : 'opacity-0',
            'transition-opacity duration-base ease-out',
          )}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            editor.begin(event.clientX, event.clientY)
          }}
          onPointerMove={(event) => {
            if (event.buttons === 0) return
            editor.move(event.clientX, event.clientY)
          }}
          onPointerUp={editor.end}
          onPointerLeave={editor.end}
        />
        {editor.crop && isUsableCrop(editor.crop) ? <CropOverlay editor={editor} /> : null}
      </div>
    </div>
  )
}

function CropOverlay({ editor }: { editor: Editor }) {
  const canvas = editor.canvasRef.current
  const crop = editor.crop
  if (!canvas || !crop || canvas.width === 0 || canvas.height === 0) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute border-2 border-ring bg-ring/15"
      style={{
        left: `${(crop.x / canvas.width) * 100}%`,
        top: `${(crop.y / canvas.height) * 100}%`,
        width: `${(crop.width / canvas.width) * 100}%`,
        height: `${(crop.height / canvas.height) * 100}%`,
      }}
    />
  )
}
