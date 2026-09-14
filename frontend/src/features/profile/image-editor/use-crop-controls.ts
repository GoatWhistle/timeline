import { useCallback, useState } from 'react'
import type { CropHandle, Rect } from './editor-model'

export function useCropControls() {
  const [crop, setCrop] = useState<Rect | null>(null)
  const [cropHandle, setCropHandle] = useState<CropHandle | null>(null)
  const [cropMoving, setCropMoving] = useState(false)

  const resetCrop = useCallback(() => {
    setCrop(null)
    setCropHandle(null)
    setCropMoving(false)
  }, [])

  return {
    crop,
    setCrop,
    cropHandle,
    setCropHandle,
    cropMoving,
    setCropMoving,
    resetCrop,
  }
}
