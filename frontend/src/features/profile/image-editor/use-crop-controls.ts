import { type RefObject, useCallback, useRef, useState } from 'react'
import { type CropHandle, clampCropZoom, clampRectTo, type Rect } from './editor-model'

export function useCropControls(canvasRef: RefObject<HTMLCanvasElement | null>) {
  const [crop, setCrop] = useState<Rect | null>(null)
  const [cropZoom, setCropZoom] = useState<number>(1)
  const [cropHandle, setCropHandle] = useState<CropHandle | null>(null)
  const cropZoomRef = useRef(1)
  cropZoomRef.current = cropZoom

  const resetCrop = useCallback(() => {
    setCrop(null)
    setCropZoom(1)
    setCropHandle(null)
  }, [])

  const zoomCrop = useCallback(
    (next: number) => {
      const canvas = canvasRef.current
      const nextZoom = clampCropZoom(next)
      setCropZoom(nextZoom)
      setCrop((current) => {
        if (!current || !canvas) return current
        const cx = current.x + current.width / 2
        const cy = current.y + current.height / 2
        const scale = nextZoom / cropZoomRef.current
        const width = current.width * scale
        const height = current.height * scale
        return clampRectTo(
          { x: cx - width / 2, y: cy - height / 2, width, height },
          canvas.width,
          canvas.height,
        )
      })
    },
    [canvasRef],
  )

  return { crop, setCrop, cropZoom, zoomCrop, cropHandle, setCropHandle, resetCrop }
}
