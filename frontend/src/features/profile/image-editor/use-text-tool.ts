import { useCallback, useRef, useState } from 'react'
import { drawText, measureText } from './canvas-ops'
import type { Point } from './editor-model'
import {
  dropLayer,
  layerAt,
  moveLayer,
  newTextLayer,
  replaceLayer,
  type TextLayer,
  withoutEmpty,
} from './text-layers'

export function useTextTool(
  context: () => CanvasRenderingContext2D | null,
  pushHistory: () => void,
  colour: string,
  textSize: number,
) {
  const [layers, setLayers] = useState<TextLayer[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const layersRef = useRef<TextLayer[]>([])
  layersRef.current = layers

  const measure = useCallback(
    (text: string, size: number) => {
      const ctx = context()
      return ctx ? measureText(ctx, text, size) : text.length * size * 0.6
    },
    [context],
  )

  const beginText = useCallback(
    (point: Point) => {
      const existing = layerAt(layersRef.current, point, measure)
      if (existing) {
        setActiveId(existing.id)
        return
      }
      const layer = newTextLayer(point, colour, textSize)
      setLayers([...withoutEmpty(layersRef.current), layer])
      setActiveId(layer.id)
    },
    [colour, measure, textSize],
  )

  const editLayer = useCallback((id: string, text: string) => {
    setLayers((current) => current.map((layer) => (layer.id === id ? { ...layer, text } : layer)))
  }, [])

  const dragLayer = useCallback((id: string, dx: number, dy: number) => {
    setLayers((current) => {
      const layer = current.find((item) => item.id === id)
      return layer ? replaceLayer(current, moveLayer(layer, dx, dy)) : current
    })
  }, [])

  const removeLayer = useCallback((id: string) => {
    setLayers((current) => dropLayer(current, id))
    setActiveId((current) => (current === id ? null : current))
  }, [])

  const restyleLayer = useCallback((id: string, patch: Partial<TextLayer>) => {
    setLayers((current) =>
      current.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer)),
    )
  }, [])

  const blurText = useCallback(() => setActiveId(null), [])

  const bakeText = useCallback(() => {
    const ctx = context()
    const live = withoutEmpty(layers)
    if (!ctx || live.length === 0) {
      setLayers([])
      setActiveId(null)
      return
    }
    pushHistory()
    for (const layer of live) {
      drawText(ctx, { x: layer.x, y: layer.y }, layer.text, layer.colour, layer.size)
    }
    setLayers([])
    setActiveId(null)
  }, [context, layers, pushHistory])

  const clearText = useCallback(() => {
    setLayers([])
    setActiveId(null)
  }, [])

  return {
    layers,
    activeId,
    setActiveId,
    measure,
    beginText,
    editLayer,
    dragLayer,
    removeLayer,
    restyleLayer,
    blurText,
    bakeText,
    clearText,
  }
}
