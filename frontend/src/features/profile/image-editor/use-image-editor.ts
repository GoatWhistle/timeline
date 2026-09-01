import { useCallback, useEffect, useRef, useState } from 'react'
import {
  applyFill,
  cropCanvas,
  drawBrushSegment,
  drawShape,
  pickColour,
  pointerPosition,
} from './canvas-ops'
import {
  clampRectTo,
  EDITOR_PALETTE,
  type EditorTool,
  fitWithin,
  isUsableCrop,
  MAX_EDIT_DIMENSION,
  normaliseRect,
  type Point,
  type Rect,
} from './editor-model'

const HISTORY_LIMIT = 20

export function useImageEditor(source: Blob) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const historyRef = useRef<ImageData[]>([])
  const strokeStart = useRef<Point | null>(null)
  const strokeLast = useRef<Point | null>(null)
  const snapshot = useRef<ImageData | null>(null)

  const [tool, setTool] = useState<EditorTool>('crop')
  const [colour, setColour] = useState<string>(EDITOR_PALETTE[0])
  const [brushSize, setBrushSize] = useState<number>(6)
  const [crop, setCrop] = useState<Rect | null>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [canUndo, setCanUndo] = useState(false)

  const context = useCallback(() => canvasRef.current?.getContext('2d') ?? null, [])

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
        historyRef.current = []
        setCanUndo(false)
        setCrop(null)
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
  }, [source])

  const pushHistory = useCallback(() => {
    const ctx = context()
    const canvas = canvasRef.current
    if (!ctx || !canvas || canvas.width === 0) return
    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
    if (historyRef.current.length > HISTORY_LIMIT) historyRef.current.shift()
    setCanUndo(true)
  }, [context])

  const undo = useCallback(() => {
    const ctx = context()
    const canvas = canvasRef.current
    const previous = historyRef.current.pop()
    if (!ctx || !canvas || !previous) return
    canvas.width = previous.width
    canvas.height = previous.height
    ctx.putImageData(previous, 0, 0)
    setCrop(null)
    setCanUndo(historyRef.current.length > 0)
  }, [context])

  const begin = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current
      const ctx = context()
      if (!canvas || !ctx) return
      const point = pointerPosition(canvas, clientX, clientY)

      if (tool === 'picker') {
        const picked = pickColour(ctx, point)
        if (picked) setColour(picked)
        return
      }
      if (tool === 'fill') {
        pushHistory()
        applyFill(ctx, point, colour)
        return
      }

      strokeStart.current = point
      strokeLast.current = point
      if (tool === 'crop') {
        setCrop({ x: point.x, y: point.y, width: 0, height: 0 })
        return
      }
      pushHistory()
      snapshot.current = ctx.getImageData(0, 0, canvas.width, canvas.height)
      if (tool === 'brush') drawBrushSegment(ctx, point, point, colour, brushSize)
    },
    [brushSize, colour, context, pushHistory, tool],
  )

  const move = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current
      const ctx = context()
      const start = strokeStart.current
      if (!canvas || !ctx || !start) return
      const point = pointerPosition(canvas, clientX, clientY)

      if (tool === 'crop') {
        setCrop(clampRectTo(normaliseRect(start, point), canvas.width, canvas.height))
        return
      }
      if (tool === 'brush') {
        drawBrushSegment(ctx, strokeLast.current ?? point, point, colour, brushSize)
        strokeLast.current = point
        return
      }
      if (snapshot.current) ctx.putImageData(snapshot.current, 0, 0)
      drawShape(ctx, tool, start, point, colour, brushSize)
    },
    [brushSize, colour, context, tool],
  )

  const end = useCallback(() => {
    strokeStart.current = null
    strokeLast.current = null
    snapshot.current = null
  }, [])

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
    setCrop(null)
  }, [context, crop, pushHistory])

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
    crop,
    ready,
    failed,
    canUndo,
    begin,
    move,
    end,
    undo,
    applyCrop,
    toBlob,
  }
}
