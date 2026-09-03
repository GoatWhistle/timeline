import { useCallback, useRef } from 'react'
import { RangeThumb } from './range-thumb'
import { RangeTickLabels, RangeTickMarks } from './range-ticks'
import {
  nearestHandle,
  type RangeBounds,
  type RangeHandle,
  type RangeValue,
  ratioOf,
  valueAtRatio,
  withHandle,
} from './range-value'

export type { RangeBounds, RangeValue }

export function RangeSlider({
  id,
  bounds,
  value,
  lowLabel,
  highLabel,
  summary,
  ticks,
  valueText,
  describedBy,
  onChange,
}: {
  id: string
  bounds: RangeBounds
  value: RangeValue
  lowLabel: string
  highLabel: string
  summary?: string | undefined
  ticks?: boolean | undefined
  valueText: (amount: number) => string
  describedBy?: string | undefined
  onChange: (next: RangeValue) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<RangeHandle | null>(null)

  const fromPointer = useCallback(
    (clientX: number): number | null => {
      const track = trackRef.current
      if (!track) return null
      const rect = track.getBoundingClientRect()
      if (rect.width === 0) return null
      return valueAtRatio((clientX - rect.left) / rect.width, bounds)
    },
    [bounds],
  )

  const move = useCallback(
    (handle: RangeHandle, next: number) => onChange(withHandle(value, handle, next, bounds)),
    [bounds, onChange, value],
  )

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const target = fromPointer(event.clientX)
    if (target === null) return
    const handle = nearestHandle(target, value)
    dragging.current = handle
    event.currentTarget.setPointerCapture(event.pointerId)
    move(handle, target)
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const handle = dragging.current
    if (handle === null) return
    const target = fromPointer(event.clientX)
    if (target !== null) move(handle, target)
  }

  function releasePointer(event: React.PointerEvent<HTMLDivElement>) {
    if (dragging.current === null) return
    dragging.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const lowRatio = ratioOf(value.low, bounds)
  const highRatio = ratioOf(value.high, bounds)

  return (
    <div className="flex flex-col gap-2 px-2.5">
      {summary !== undefined && (
        <p aria-hidden="true" className="font-medium text-copy tabular-nums">
          {summary}
        </p>
      )}
      <div
        ref={trackRef}
        data-testid={`${id}-track`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={releasePointer}
        onPointerCancel={releasePointer}
        className="relative flex h-9 touch-none select-none items-center"
      >
        <div className="h-1.5 w-full rounded-pill bg-input" />
        <div
          aria-hidden="true"
          className="absolute h-1.5 rounded-pill bg-primary"
          style={{ left: `${lowRatio * 100}%`, right: `${(1 - highRatio) * 100}%` }}
        />
        {ticks && <RangeTickMarks bounds={bounds} value={value} />}
        <RangeThumb
          id={`${id}-min`}
          handle="low"
          bounds={bounds}
          value={value}
          ratio={lowRatio}
          label={lowLabel}
          valueText={valueText(value.low)}
          describedBy={describedBy}
          onMove={move}
        />
        <RangeThumb
          id={`${id}-max`}
          handle="high"
          bounds={bounds}
          value={value}
          ratio={highRatio}
          label={highLabel}
          valueText={valueText(value.high)}
          describedBy={describedBy}
          onMove={move}
        />
      </div>
      {ticks ? (
        <RangeTickLabels bounds={bounds} value={value} />
      ) : (
        <div aria-hidden="true" className="flex justify-between text-caption text-muted-foreground">
          <span className="tabular-nums">{bounds.min}</span>
          <span className="tabular-nums">{bounds.max}</span>
        </div>
      )}
    </div>
  )
}
