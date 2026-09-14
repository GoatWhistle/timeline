import { type RefObject, useCallback, useRef } from 'react'
import { applyFill, drawBrushSegment, drawShape, pickColour, pointerPosition } from './canvas-ops'
import {
  type CropHandle,
  clampSquareTo,
  type EditorTool,
  moveRectBy,
  type Point,
  type Rect,
  resizeCropByHandle,
  squareFrom,
} from './editor-model'

export function usePointerGestures(options: {
  canvasRef: RefObject<HTMLCanvasElement | null>
  context: () => CanvasRenderingContext2D | null
  tool: EditorTool
  colour: string
  brushSize: number
  crop: Rect | null
  setCrop: (rect: Rect | null | ((current: Rect | null) => Rect | null)) => void
  setCropHandle: (handle: CropHandle | null) => void
  setCropMoving: (moving: boolean) => void
  setColour: (colour: string) => void
  beginText: (point: Point) => void
  pushHistory: () => void
}) {
  const {
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
    beginText,
    pushHistory,
  } = options
  const strokeStart = useRef<Point | null>(null)
  const strokeLast = useRef<Point | null>(null)
  const snapshot = useRef<ImageData | null>(null)
  const activeHandle = useRef<CropHandle | 'move' | null>(null)

  const begin = useCallback(
    (clientX: number, clientY: number, handle?: CropHandle | 'move') => {
      const canvas = canvasRef.current
      const ctx = context()
      if (!canvas || !ctx) return
      const point = pointerPosition(canvas, clientX, clientY)

      if (handle && crop) {
        strokeStart.current = point
        strokeLast.current = point
        activeHandle.current = handle
        setCropMoving(handle === 'move')
        setCropHandle(handle === 'move' ? null : handle)
        return
      }

      activeHandle.current = null

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
      if (tool === 'text') {
        beginText(point)
        return
      }

      strokeStart.current = point
      strokeLast.current = point
      if (tool === 'crop') {
        setCropMoving(false)
        setCropHandle(null)
        setCrop({ x: point.x, y: point.y, width: 0, height: 0 })
        return
      }
      pushHistory()
      snapshot.current = ctx.getImageData(0, 0, canvas.width, canvas.height)
      if (tool === 'brush') drawBrushSegment(ctx, point, point, colour, brushSize)
    },
    [
      brushSize,
      colour,
      context,
      crop,
      pushHistory,
      tool,
      beginText,
      setCrop,
      setCropHandle,
      setCropMoving,
      setColour,
      canvasRef,
    ],
  )

  const move = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current
      const ctx = context()
      const start = strokeStart.current
      if (!canvas || !ctx || !start) return
      const point = pointerPosition(canvas, clientX, clientY)

      const held = activeHandle.current
      if (held && crop) {
        if (held === 'move') {
          const dx = point.x - (strokeLast.current ?? point).x
          const dy = point.y - (strokeLast.current ?? point).y
          strokeLast.current = point
          setCrop(clampSquareTo(moveRectBy(crop, dx, dy), canvas.width, canvas.height))
          return
        }
        setCrop(clampSquareTo(resizeCropByHandle(crop, held, point), canvas.width, canvas.height))
        return
      }
      if (tool === 'crop') {
        setCrop(clampSquareTo(squareFrom(start, point), canvas.width, canvas.height))
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
    [brushSize, colour, context, crop, tool, setCrop, canvasRef],
  )

  const end = useCallback(() => {
    strokeStart.current = null
    strokeLast.current = null
    snapshot.current = null
    activeHandle.current = null
    setCropHandle(null)
    setCropMoving(false)
  }, [setCropHandle, setCropMoving])

  return { begin, move, end }
}
