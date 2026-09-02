export type RangeBounds = { min: number; max: number }

export type RangeValue = { low: number; high: number }

export type RangeHandle = 'low' | 'high'

export function clamp(value: number, { min, max }: RangeBounds): number {
  if (value < min) return min
  if (value > max) return max
  return value
}

export function withHandle(
  value: RangeValue,
  handle: RangeHandle,
  next: number,
  bounds: RangeBounds,
): RangeValue {
  const settled = clamp(Math.round(next), bounds)
  if (handle === 'low') return { low: Math.min(settled, value.high), high: value.high }
  return { low: value.low, high: Math.max(settled, value.low) }
}

export function keyStep(key: string, shiftKey: boolean, bounds: RangeBounds): number | null {
  const span = Math.max(1, Math.round((bounds.max - bounds.min) / 10))
  switch (key) {
    case 'ArrowLeft':
    case 'ArrowDown':
      return -1
    case 'ArrowRight':
    case 'ArrowUp':
      return 1
    case 'PageDown':
      return shiftKey ? -span * 2 : -span
    case 'PageUp':
      return shiftKey ? span * 2 : span
    default:
      return null
  }
}

export function keyTarget(
  key: string,
  handle: RangeHandle,
  value: RangeValue,
  bounds: RangeBounds,
): number | null {
  if (key === 'Home') return bounds.min
  if (key === 'End') return bounds.max
  const step = keyStep(key, false, bounds)
  if (step === null) return null
  return (handle === 'low' ? value.low : value.high) + step
}

export function ratioOf(value: number, { min, max }: RangeBounds): number {
  if (max === min) return 0
  return (value - min) / (max - min)
}

export function valueAtRatio(ratio: number, bounds: RangeBounds): number {
  return clamp(Math.round(bounds.min + ratio * (bounds.max - bounds.min)), bounds)
}

export function nearestHandle(target: number, value: RangeValue): RangeHandle {
  const toLow = Math.abs(target - value.low)
  const toHigh = Math.abs(target - value.high)
  if (toLow === toHigh) return target < value.low ? 'low' : 'high'
  return toLow < toHigh ? 'low' : 'high'
}
