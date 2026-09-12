import { Minus, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { Button } from '@/shared/ui/primitives/button'
import { CropOverlay } from './crop-overlay'
import { isUsableCrop, MAX_CROP_ZOOM, MIN_CROP_ZOOM } from './editor-model'
import { TextPopover } from './text-popover'
import type { useImageEditor } from './use-image-editor'

type Editor = ReturnType<typeof useImageEditor>

export function EditorCanvas({ editor }: { editor: Editor }) {
  const { t } = useTranslation()
  const cropReady = Boolean(editor.crop && isUsableCrop(editor.crop))

  return (
    <div className="flex flex-col gap-2">
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
          {cropReady && editor.crop && editor.canvasRef.current ? (
            <CropOverlay
              canvas={editor.canvasRef.current}
              crop={editor.crop}
              onHandleDown={(handle, clientX, clientY) => editor.begin(clientX, clientY, handle)}
            />
          ) : null}
          {editor.pendingText && editor.canvasRef.current ? (
            <TextPopover
              canvas={editor.canvasRef.current}
              point={editor.pendingText}
              onCommit={editor.commitText}
              onCancel={editor.cancelText}
            />
          ) : null}
        </div>
      </div>
      {editor.tool === 'crop' ? (
        <div className="flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('imageEditor.zoomOut')}
            disabled={editor.cropZoom <= MIN_CROP_ZOOM}
            onClick={() => editor.zoomCrop(editor.cropZoom - 0.25)}
          >
            <Minus className="size-4" />
          </Button>
          <span className="w-12 text-center text-caption text-muted-foreground tabular-nums">
            {Math.round(editor.cropZoom * 100)}%
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('imageEditor.zoomIn')}
            disabled={editor.cropZoom >= MAX_CROP_ZOOM}
            onClick={() => editor.zoomCrop(editor.cropZoom + 0.25)}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      ) : null}
    </div>
  )
}
