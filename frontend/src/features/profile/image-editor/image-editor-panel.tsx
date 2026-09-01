import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { Button } from '@/shared/ui/primitives/button'
import { isUsableCrop } from './editor-model'
import { EditorToolbar } from './editor-toolbar'
import { useImageEditor } from './use-image-editor'

export function ImageEditorPanel({
  source,
  busy,
  onCancel,
  onSave,
}: {
  source: Blob
  busy?: boolean
  onCancel: () => void
  onSave: (blob: Blob) => void
}) {
  const { t } = useTranslation()
  const editor = useImageEditor(source)

  async function save() {
    const blob = await editor.toBlob()
    if (blob) onSave(blob)
  }

  return (
    <section
      aria-label={t('imageEditor.title')}
      className={cn(
        'flex flex-col gap-4 rounded-surface border bg-surface-1 p-4',
        'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1',
        'motion-safe:duration-panel motion-safe:ease-out',
      )}
    >
      <div className="flex flex-col gap-1">
        <h3 className="font-medium text-copy">{t('imageEditor.title')}</h3>
        <p className="text-caption text-muted-foreground">
          {editor.tool === 'crop' ? t('imageEditor.cropHint') : t('imageEditor.hint')}
        </p>
      </div>

      <EditorToolbar
        tool={editor.tool}
        onToolChange={editor.setTool}
        colour={editor.colour}
        onColourChange={editor.setColour}
        brushSize={editor.brushSize}
        onBrushSizeChange={editor.setBrushSize}
      />

      <div className="relative self-start overflow-hidden rounded-md border bg-surface-2">
        <canvas
          ref={editor.canvasRef}
          aria-label={t('imageEditor.canvasLabel')}
          className="block max-h-80 max-w-full touch-none"
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

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
          {t('imageEditor.cancel')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={editor.undo}
          disabled={!editor.canUndo || busy}
        >
          {t('imageEditor.undo')}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={editor.applyCrop}
          disabled={!editor.crop || !isUsableCrop(editor.crop) || busy}
        >
          {t('imageEditor.apply')}
        </Button>
        <Button type="button" size="sm" onClick={save} disabled={!editor.ready || busy}>
          {t('imageEditor.save')}
        </Button>
      </div>
    </section>
  )
}

function CropOverlay({ editor }: { editor: ReturnType<typeof useImageEditor> }) {
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
