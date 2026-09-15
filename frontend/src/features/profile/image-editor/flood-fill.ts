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
  edge = 10,
): boolean {
  if (startX < 0 || startY < 0 || startX >= width || startY >= height) return false

  const [r, g, b, a] = toRgba(colour)
  const start = pixelAt(data, width, startX, startY)
  if (start[0] === r && start[1] === g && start[2] === b && start[3] === a) return false

  const original = new Uint8ClampedArray(data)
  const seen = new Uint8Array(width * height)
  const stack: number[] = [startX, startY]
  seen[startY * width + startX] = 1
  let changed = false

  while (stack.length > 0) {
    const y = stack.pop() as number
    const x = stack.pop() as number
    const index = y * width + x
    const offset = index * CHANNELS

    data[offset] = r
    data[offset + 1] = g
    data[offset + 2] = b
    data[offset + 3] = a
    changed = true

    const here = pixelAt(original, width, x, y)
    const step = (nx: number, ny: number) => {
      const next = ny * width + nx
      if (seen[next] === 1) return
      if (!matches(original, next * CHANNELS, here, edge)) return
      seen[next] = 1
      stack.push(nx, ny)
    }

    if (x > 0) step(x - 1, y)
    if (x + 1 < width) step(x + 1, y)
    if (y > 0) step(x, y - 1)
    if (y + 1 < height) step(x, y + 1)
  }

  return changed
}
