import { useTranslation } from 'react-i18next'
import { CROP_HANDLES, type CropHandle, type Rect } from './editor-model'

const HANDLE_POSITION: Record<CropHandle, string> = {
  nw: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize',
  ne: 'top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize',
  sw: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize',
  se: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize',
}

export function CropOverlay({
  canvas,
  crop,
  onHandleDown,
}: {
  canvas: HTMLCanvasElement
  crop: Rect
  onHandleDown: (handle: CropHandle, clientX: number, clientY: number) => void
}) {
  const { t } = useTranslation()
  const left = (crop.x / canvas.width) * 100
  const top = (crop.y / canvas.height) * 100
  const width = (crop.width / canvas.width) * 100
  const height = (crop.height / canvas.height) * 100

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute border-2 border-ring"
        style={{
          left: `${left}%`,
          top: `${top}%`,
          width: `${width}%`,
          height: `${height}%`,
          boxShadow: '0 0 0 2000px var(--color-scrim)',
        }}
      />
      {CROP_HANDLES.map((handle) => (
        <button
          key={handle}
          type="button"
          aria-label={t('imageEditor.cropHandle', { corner: handle })}
          onPointerDown={(event) => {
            event.stopPropagation()
            event.currentTarget.setPointerCapture(event.pointerId)
            onHandleDown(handle, event.clientX, event.clientY)
          }}
          className={`pointer-events-auto absolute size-5 touch-none rounded-pill border-2 border-ring bg-card ${HANDLE_POSITION[handle]}`}
          style={{
            left: `${left + (handle === 'ne' || handle === 'se' ? width : 0)}%`,
            top: `${top + (handle === 'sw' || handle === 'se' ? height : 0)}%`,
          }}
        />
      ))}
    </div>
  )
}
