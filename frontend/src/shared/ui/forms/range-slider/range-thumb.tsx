import { keyTarget, type RangeBounds, type RangeHandle, type RangeValue } from './range-value'

export function RangeThumb({
  id,
  handle,
  bounds,
  value,
  ratio,
  label,
  valueText,
  describedBy,
  onMove,
}: {
  id: string
  handle: RangeHandle
  bounds: RangeBounds
  value: RangeValue
  ratio: number
  label: string
  valueText: string
  describedBy?: string | undefined
  onMove: (handle: RangeHandle, next: number) => void
}) {
  const own = handle === 'low' ? value.low : value.high

  return (
    <button
      id={id}
      type="button"
      role="slider"
      data-handle={handle}
      aria-label={label}
      aria-valuemin={bounds.min}
      aria-valuemax={bounds.max}
      aria-valuenow={own}
      aria-valuetext={valueText}
      aria-describedby={describedBy}
      aria-orientation="horizontal"
      onKeyDown={(event) => {
        const target = keyTarget(event.key, handle, value, bounds)
        if (target === null) return
        event.preventDefault()
        onMove(handle, target)
      }}
      className={
        '-translate-x-1/2 absolute top-1/2 z-10 size-5 -translate-y-1/2 cursor-grab rounded-full border-2 border-primary bg-background shadow-sm ' +
        'transition-colors motion-safe:duration-instant hover:bg-accent-surface active:cursor-grabbing ' +
        'focus-visible:z-20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
      }
      style={{ left: `${ratio * 100}%` }}
    />
  )
}
