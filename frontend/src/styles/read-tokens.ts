import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseOklch, type Srgb } from './oklch'

const STYLES_DIR = dirname(fileURLToPath(import.meta.url))

const DECLARATION = /(--[a-z0-9-]+)\s*:\s*([^;]+);/g

function blockStart(source: string, blockSelector: string): number {
  const direct = source.indexOf(`${blockSelector} {`)
  if (direct >= 0) return direct
  return source.indexOf(`${blockSelector},`)
}

function declarationsIn(file: string, blockSelector: string): Map<string, string> {
  const source = readFileSync(join(STYLES_DIR, file), 'utf8')
  const start = blockStart(source, blockSelector)
  if (start < 0) throw new Error(`Block ${blockSelector} not found in ${file}`)
  const end = source.indexOf('\n}', start)
  const block = source.slice(start, end)
  const found = new Map<string, string>()
  for (const match of block.matchAll(DECLARATION)) {
    const [, name, value] = match
    if (name && value) found.set(name, value.trim())
  }
  return found
}

function merge(...maps: Map<string, string>[]): Map<string, string> {
  const merged = new Map<string, string>()
  for (const map of maps) for (const [k, v] of map) merged.set(k, v)
  return merged
}

export function loadTheme(theme: 'light' | 'dark'): Map<string, string> {
  const base = merge(
    declarationsIn('tokens/palette.css', ':root'),
    declarationsIn('tokens/semantic.css', ':root'),
    declarationsIn('tokens/domain.css', ':root'),
  )
  return theme === 'light' ? base : merge(base, declarationsIn('tokens/dark.css', '.dark'))
}

export function resolve(tokens: Map<string, string>, name: string): Srgb {
  const seen = new Set<string>()
  let current = name
  for (;;) {
    if (seen.has(current)) throw new Error(`Circular token reference: ${name}`)
    seen.add(current)
    const value = tokens.get(current)
    if (value === undefined)
      throw new Error(`Token ${current} is not declared (referenced from ${name})`)
    const reference = value.match(/^var\(\s*(--[a-z0-9-]+)\s*\)$/)?.[1]
    if (reference) {
      current = reference
      continue
    }
    const colour = parseOklch(value)
    if (!colour) throw new Error(`Token ${current} is not a parsable oklch value: ${value}`)
    return colour
  }
}
