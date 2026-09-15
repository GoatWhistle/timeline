import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { CROP_HANDLES, type CropHandle, type Rect } from './editor-model'

const HANDLE_CURSOR: Record<CropHandle, string> = {
  nw: 'cursor-nwse-resize',
  n: 'cursor-ns-resize',
  ne: 'cursor-nesw-resize',
  e: 'cursor-ew-resize',
  se: 'cursor-nwse-resize',
  s: 'cursor-ns-resize',
  sw: 'cursor-nesw-resize',
  w: 'cursor-ew-resize',
}

const CORNER: CropHandle[] = ['nw', 'ne', 'se', 'sw']

function offsetOf(handle: CropHandle): { x: number; y: number } {
  const x = handle.includes('w') ? 0 : handle.includes('e') ? 1 : 0.5
  const y = handle.includes('n') ? 0 : handle.includes('s') ? 1 : 0.5
  return { x, y }
}

export function CropOverlay({
  canvas,
  crop,
  onHandleDown,
  onFrameDown,
}: {
  canvas: { width: number; height: number }
  crop: Rect
  onHandleDown: (handle: CropHandle, clientX: number, clientY: number) => void
  onFrameDown?: (clientX: number, clientY: number) => void
}) {
  const { t } = useTranslation()
  const left = (crop.x / canvas.width) * 100
  const top = (crop.y / canvas.height) * 100
  const width = (crop.width / canvas.width) * 100
  const height = (crop.height / canvas.height) * 100

  return (
    <>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          aria-hidden="true"
          data-crop-frame
          onPointerDown={(event) => {
            if (!onFrameDown) return
            event.stopPropagation()
            onFrameDown(event.clientX, event.clientY)
          }}
          className={cn(
            'absolute border-2 border-primary',
            onFrameDown && 'pointer-events-auto cursor-move touch-none',
          )}
          style={{
            left: `${left}%`,
            top: `${top}%`,
            width: `${width}%`,
            height: `${height}%`,
            boxShadow: '0 0 0 2000px var(--color-scrim)',
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-pill border border-primary/50"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-40"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((cell) => (
              <div key={cell} className="border-primary/25 border-r border-b last:border-r-0" />
            ))}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0">
        {CROP_HANDLES.map((handle) => {
          const offset = offsetOf(handle)
          const corner = CORNER.includes(handle)
          return (
            <button
              key={handle}
              type="button"
              aria-label={t('imageEditor.cropHandle', { corner: handle })}
              onPointerDown={(event) => {
                event.stopPropagation()
                onHandleDown(handle, event.clientX, event.clientY)
              }}
              className={cn(
                'pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 touch-none',
                'border-2 border-background bg-primary shadow-raised',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                corner ? 'size-4 rounded-badge' : 'size-3 rounded-pill',
                HANDLE_CURSOR[handle],
              )}
              style={{
                left: `${left + width * offset.x}%`,
                top: `${top + height * offset.y}%`,
              }}
            />
          )
        })}
      </div>
    </>
  )
}
