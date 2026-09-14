import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { CropOverlay } from './crop-overlay'
import { isUsableCrop } from './editor-model'
import { TextPopover } from './text-popover'
import type { useImageEditor } from './use-image-editor'

type Editor = ReturnType<typeof useImageEditor>

export function EditorCanvas({ editor }: { editor: Editor }) {
  const { t } = useTranslation()
  const cropReady = Boolean(editor.crop && isUsableCrop(editor.crop))

  return (
    <div className="flex items-center justify-center">
      <div
        className="relative inline-block touch-none"
        onPointerMove={(event) => {
          if (event.buttons === 0) return
          editor.move(event.clientX, event.clientY)
        }}
        onPointerUp={editor.end}
        onPointerCancel={editor.end}
      >
        <canvas
          ref={editor.canvasRef}
          aria-label={t('imageEditor.canvasLabel')}
          className={cn(
            'block max-h-[56vh] max-w-full touch-none rounded-badge',
            editor.ready ? 'opacity-100' : 'opacity-0',
            'transition-opacity duration-base ease-out',
          )}
          onPointerDown={(event) => {
            editor.begin(event.clientX, event.clientY)
          }}
        />
        {cropReady && editor.crop && editor.canvasSize ? (
          <CropOverlay
            canvas={editor.canvasSize}
            crop={editor.crop}
            onHandleDown={(handle, clientX, clientY) => editor.begin(clientX, clientY, handle)}
            onFrameDown={(clientX, clientY) => editor.begin(clientX, clientY, 'move')}
          />
        ) : null}
        {editor.pendingText && editor.canvasRef.current ? (
          <TextPopover
            canvas={editor.canvasRef.current}
            point={editor.pendingText}
            colour={editor.colour}
            size={editor.textSize}
            onCommit={editor.commitText}
            onCancel={editor.cancelText}
          />
        ) : null}
      </div>
    </div>
  )
}
