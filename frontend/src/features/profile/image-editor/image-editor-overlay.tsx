import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { Button } from '@/shared/ui/primitives/button'
import { EditorCanvas } from './editor-canvas'
import { EditorToolbar } from './editor-toolbar'
import { isUsableCrop } from './editor-model'
import { useFocusScope } from './use-focus-scope'
import { useImageEditor } from './use-image-editor'

export function ImageEditorOverlay({
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
  const panelRef = useRef<HTMLDivElement | null>(null)
  const closeRef = useRef<() => void>(onCancel)

  closeRef.current = onCancel
  useFocusScope(panelRef, () => closeRef.current())

  useEffect(() => {
    if (editor.failed) closeRef.current()
  }, [editor.failed])

  async function save() {
    const blob = await editor.toBlob()
    if (blob) onSave(blob)
  }

  const cropReady = Boolean(editor.crop && isUsableCrop(editor.crop))

  return (
    <div
      className={cn(
        'fixed inset-0 z-60 flex items-center justify-center p-4',
        'motion-safe:animate-in motion-safe:fade-in-0',
        'motion-safe:duration-base motion-safe:ease-out',
      )}
    >
      <button
        type="button"
        aria-label={t('imageEditor.cancel')}
        tabIndex={-1}
        onClick={onCancel}
        className="absolute inset-0 cursor-default bg-black/70"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('imageEditor.title')}
        className={cn(
          'relative flex max-h-[min(92vh,50rem)] w-[min(94vw,46rem)] flex-col gap-4',
          'overflow-y-auto rounded-surface border border-border bg-background p-5 shadow-lg',
          'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95',
          'motion-safe:duration-zoom motion-safe:ease-out',
        )}
      >
        <div className="flex flex-col gap-1">
          <h2 className="font-semibold text-heading">{t('imageEditor.title')}</h2>
          <p className="text-caption text-muted-foreground">
            {editor.tool === 'crop' ? t('imageEditor.cropHint') : t('imageEditor.hint')}
          </p>
        </div>

        <EditorCanvas editor={editor} />

        <EditorToolbar
          tool={editor.tool}
          onToolChange={editor.setTool}
          colour={editor.colour}
          onColourChange={editor.setColour}
          brushSize={editor.brushSize}
          onBrushSizeChange={editor.setBrushSize}
        />

        <div className="flex flex-wrap items-center justify-end gap-2 border-border border-t pt-4">
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
            disabled={!cropReady || busy}
          >
            {t('imageEditor.apply')}
          </Button>
          <Button type="button" size="sm" onClick={save} disabled={!editor.ready || busy}>
            {t('imageEditor.save')}
          </Button>
        </div>
      </div>
    </div>
  )
}
