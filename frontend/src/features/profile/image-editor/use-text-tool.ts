import { useCallback, useState } from 'react'
import { drawText } from './canvas-ops'
import type { Point } from './editor-model'

export function useTextTool(
  context: () => CanvasRenderingContext2D | null,
  pushHistory: () => void,
  colour: string,
  textSize: number,
) {
  const [pendingText, setPendingText] = useState<Point | null>(null)

  const beginText = useCallback((point: Point) => setPendingText(point), [])

  const commitText = useCallback(
    (text: string) => {
      const ctx = context()
      if (!ctx || !pendingText || text.trim() === '') {
        setPendingText(null)
        return
      }
      pushHistory()
      drawText(ctx, pendingText, text, colour, textSize)
      setPendingText(null)
    },
    [colour, context, pendingText, pushHistory, textSize],
  )

  const cancelText = useCallback(() => setPendingText(null), [])

  return { pendingText, setPendingText, beginText, commitText, cancelText }
}
