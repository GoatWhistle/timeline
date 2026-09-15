import { useCallback, useEffect, useRef, useState } from 'react'
import { cropCanvas } from './canvas-ops'
import {
  centredSquareIn,
  EDITOR_PALETTE_FALLBACK_HEX,
  type EditorTool,
  fitWithin,
  isUsableCrop,
  MAX_EDIT_DIMENSION,
} from './editor-model'
import {
  emptyHistory,
  type HistoryStack,
  pushHistory as pushOnto,
  redoHistory,
  undoHistory,
} from './history-stack'
import { useCropControls } from './use-crop-controls'
import { usePointerGestures } from './use-pointer-gestures'
import { useTextTool } from './use-text-tool'

const HISTORY_LIMIT = 20

export function useImageEditor(source: Blob) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const historyRef = useRef<HistoryStack<ImageData>>(emptyHistory())

  const [tool, setTool] = useState<EditorTool>('crop')
  const [colour, setColour] = useState<string>(EDITOR_PALETTE_FALLBACK_HEX)
  const [brushSize, setBrushSize] = useState<number>(6)
  const [textSize, setTextSize] = useState<number>(24)
  const { crop, setCrop, setCropHandle, setCropMoving, resetCrop } = useCropControls()
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number } | null>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const context = useCallback(() => canvasRef.current?.getContext('2d') ?? null, [])

  const pushHistory = useCallback(() => {
    const ctx = context()
    const canvas = canvasRef.current
    if (!ctx || !canvas || canvas.width === 0) return
    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height)
    historyRef.current = pushOnto(historyRef.current, snapshot, HISTORY_LIMIT)
    setCanUndo(true)
    setCanRedo(false)
  }, [context])

  const text = useTextTool(context, pushHistory, colour, textSize)

  const { begin, move, end } = usePointerGestures({
    canvasRef,
    context,
    tool,
    colour,
    brushSize,
    crop,
    setCrop,
    setCropHandle,
    setCropMoving,
    setColour,
    beginText: text.beginText,
    pushHistory,
  })

  useEffect(() => {
    let cancelled = false
    let bitmap: ImageBitmap | null = null
    setFailed(false)
    setReady(false)

    createImageBitmap(source)
      .then((decoded) => {
        bitmap = decoded
        if (cancelled) return
        const canvas = canvasRef.current
        if (!canvas) return
        const [width, height] = fitWithin(decoded.width, decoded.height, MAX_EDIT_DIMENSION)
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, width, height)
          ctx.drawImage(decoded, 0, 0, width, height)
        }
        historyRef.current = emptyHistory()
        setCanUndo(false)
        setCanRedo(false)
        resetCrop()
        setCanvasSize({ width, height })
        setCrop(centredSquareIn(width, height))
        text.clearText()
        setReady(true)
      })
      .catch(() => {
        if (cancelled) return
        setReady(false)
        setFailed(true)
      })

    return () => {
      cancelled = true
      bitmap?.close()
    }
  }, [source, resetCrop, setCrop, text.clearText])

  const undo = useCallback(() => {
    const ctx = context()
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    const current = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const outcome = undoHistory(historyRef.current, current, HISTORY_LIMIT)
    if (!outcome) return
    historyRef.current = outcome.history
    canvas.width = outcome.restored.width
    canvas.height = outcome.restored.height
    ctx.putImageData(outcome.restored, 0, 0)
    setCanvasSize({ width: canvas.width, height: canvas.height })
    setCrop(centredSquareIn(canvas.width, canvas.height))
    setCanUndo(outcome.history.undoStack.length > 0)
    setCanRedo(true)
  }, [context, setCrop])

  const redo = useCallback(() => {
    const ctx = context()
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    const current = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const outcome = redoHistory(historyRef.current, current, HISTORY_LIMIT)
    if (!outcome) return
    historyRef.current = outcome.history
    canvas.width = outcome.restored.width
    canvas.height = outcome.restored.height
    ctx.putImageData(outcome.restored, 0, 0)
    setCanvasSize({ width: canvas.width, height: canvas.height })
    setCrop(centredSquareIn(canvas.width, canvas.height))
    setCanUndo(true)
    setCanRedo(outcome.history.redoStack.length > 0)
  }, [context, setCrop])

  const applyCrop = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = context()
    if (!canvas || !ctx || !crop || !isUsableCrop(crop)) return
    const cropped = cropCanvas(canvas, crop)
    if (!cropped) return
    pushHistory()
    canvas.width = cropped.width
    canvas.height = cropped.height
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(cropped, 0, 0)
    setCanvasSize({ width: canvas.width, height: canvas.height })
    setCrop(centredSquareIn(canvas.width, canvas.height))
  }, [context, crop, pushHistory, setCrop])

  const toBlob = useCallback(
    () =>
      new Promise<Blob | null>((resolve) => {
        const canvas = canvasRef.current
        if (!canvas) {
          resolve(null)
          return
        }
        canvas.toBlob((blob) => resolve(blob), 'image/png')
      }),
    [],
  )

  return {
    canvasRef,
    tool,
    setTool,
    colour,
    setColour,
    brushSize,
    setBrushSize,
    textSize,
    setTextSize,
    crop,
    canvasSize,
    text,
    ready,
    failed,
    canUndo,
    canRedo,
    begin,
    move,
    end,
    undo,
    redo,
    applyCrop,
    toBlob,
  }
}
