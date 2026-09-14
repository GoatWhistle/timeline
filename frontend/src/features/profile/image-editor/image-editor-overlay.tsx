import { Redo2, Undo2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { PANEL_SURFACE } from '@/shared/ui/overlays/overlay-chrome'
import { Button } from '@/shared/ui/primitives/button'
import { CloseButton } from '@/shared/ui/primitives/close-button'
import { EditorCanvas } from './editor-canvas'
import { isUsableCrop } from './editor-model'
import { EditorToolbar } from './editor-toolbar'
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
    if (editor.crop && isUsableCrop(editor.crop)) editor.applyCrop()
    const blob = await editor.toBlob()
    if (blob) onSave(blob)
  }

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
        className="absolute inset-0 cursor-default bg-scrim"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('imageEditor.title')}
        className={cn(
          'relative flex max-h-[min(94vh,56rem)] w-[min(94vw,56rem)] flex-col gap-4 overflow-y-auto p-5',
          PANEL_SURFACE,
          'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95',
          'motion-safe:duration-zoom motion-safe:ease-out',
        )}
      >
        <div className="flex items-center gap-3">
          <div className="ml-auto flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t('imageEditor.undo')}
              title={t('imageEditor.undo')}
              onClick={editor.undo}
              disabled={!editor.canUndo || busy}
            >
              <Undo2 className="size-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t('imageEditor.redo')}
              title={t('imageEditor.redo')}
              onClick={editor.redo}
              disabled={!editor.canRedo || busy}
            >
              <Redo2 className="size-4" aria-hidden="true" />
            </Button>
            <CloseButton aria-label={t('imageEditor.cancel')} onClick={onCancel} />
          </div>
        </div>

        <EditorCanvas editor={editor} />

        <EditorToolbar
          tool={editor.tool}
          onToolChange={editor.setTool}
          colour={editor.colour}
          onColourChange={editor.setColour}
          brushSize={editor.brushSize}
          onBrushSizeChange={editor.setBrushSize}
          textSize={editor.textSize}
          onTextSizeChange={editor.setTextSize}
        />

        <div className="flex items-center justify-end">
          <Button type="button" onClick={save} disabled={!editor.ready || busy}>
            {t('imageEditor.save')}
          </Button>
        </div>
      </div>
    </div>
  )
}
