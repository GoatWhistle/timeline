import { toRgba } from './editor-model'

const CHANNELS = 4

export function pixelAt(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
): [number, number, number, number] {
  const offset = (y * width + x) * CHANNELS
  return [data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0, data[offset + 3] ?? 0]
}

function matches(
  data: Uint8ClampedArray,
  offset: number,
  target: [number, number, number, number],
  tolerance: number,
): boolean {
  return (
    Math.abs((data[offset] ?? 0) - target[0]) <= tolerance &&
    Math.abs((data[offset + 1] ?? 0) - target[1]) <= tolerance &&
    Math.abs((data[offset + 2] ?? 0) - target[2]) <= tolerance &&
    Math.abs((data[offset + 3] ?? 0) - target[3]) <= tolerance
  )
}

export function floodFill(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  colour: string,
  tolerance = 2,
): boolean {
  if (startX < 0 || startY < 0 || startX >= width || startY >= height) return false

  const target = pixelAt(data, width, startX, startY)
  const [r, g, b, a] = toRgba(colour)
  if (target[0] === r && target[1] === g && target[2] === b && target[3] === a) {
    return false
  }

  const stack: number[] = [startX, startY]
  const seen = new Uint8Array(width * height)
  let changed = false

  while (stack.length > 0) {
    const y = stack.pop() as number
    const x = stack.pop() as number
    const index = y * width + x
    if (seen[index] === 1) continue
    seen[index] = 1

    const offset = index * CHANNELS
    if (!matches(data, offset, target, tolerance)) continue

    data[offset] = r
    data[offset + 1] = g
    data[offset + 2] = b
    data[offset + 3] = a
    changed = true

    if (x > 0) stack.push(x - 1, y)
    if (x + 1 < width) stack.push(x + 1, y)
    if (y > 0) stack.push(x, y - 1)
    if (y + 1 < height) stack.push(x, y + 1)
  }

  return changed
}
