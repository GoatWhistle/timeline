import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')
const TOKENS = join(SRC, 'styles', 'tokens')

const SCALE = ['text-screen', 'text-heading', 'text-copy', 'text-meta', 'text-caption'] as const

const SCALE_PX: Record<(typeof SCALE)[number], string> = {
  'text-screen': '20px',
  'text-heading': '15px',
  'text-copy': '14px',
  'text-meta': '13px',
  'text-caption': '12px',
}

const TOKEN_FOR: Record<(typeof SCALE)[number], string> = {
  'text-screen': '--text-title',
  'text-heading': '--text-section',
  'text-copy': '--text-body',
  'text-meta': '--text-secondary',
  'text-caption': '--text-label',
}

const OFF_SCALE = /\btext-(?:xs|sm|base|lg|xl|[2-9]xl|\[[^\]]*(?:px|rem|em|pt)[^\]]*\])(?![\w-])/g

const FONT_SIZE = /font-size:\s*([^;]+);/g

function collect(dir: string, matcher: RegExp): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...collect(full, matcher))
    else if (matcher.test(entry.name)) found.push(full)
  }
  return found
}

const tsxFiles = collect(SRC, /\.tsx$/)
const moduleFiles = collect(SRC, /\.module\.css$/)

const show = (file: string) => relative(SRC, file).replaceAll('\\', '/')

describe('the five-step scale is the only way to size text', () => {
  it('no TSX file writes a font size outside the scale', () => {
    const found = tsxFiles.flatMap((file) => {
      const hits = readFileSync(file, 'utf8').match(OFF_SCALE) ?? []
      return hits.map((hit) => `${show(file)}: ${hit}`)
    })
    expect(found).toEqual([])
  })

  it('every CSS module sizes text with a scale token, never a bare length', () => {
    const allowed = new Set(Object.values(TOKEN_FOR).map((token) => `var(${token})`))
    const found = moduleFiles.flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(FONT_SIZE)]
        .map(([, value]) => (value ?? '').trim())
        .filter((value) => value.length > 0 && !allowed.has(value))
        .map((value) => `${show(file)}: ${value}`),
    )
    expect(found).toEqual([])
  })
})

describe('the scale keeps the steps it promises', () => {
  const typography = readFileSync(join(TOKENS, 'typography.css'), 'utf8')

  it.each(SCALE)('%s resolves to its documented size', (step) => {
    expect(typography).toContain(`${TOKEN_FOR[step]}: ${SCALE_PX[step]};`)
  })

  it('the five steps are five distinct sizes', () => {
    const sizes = SCALE.map((step) => SCALE_PX[step])
    expect(new Set(sizes).size).toBe(SCALE.length)
  })

  it('the steps descend without a gap or a repeat', () => {
    const sizes = SCALE.map((step) => Number.parseInt(SCALE_PX[step], 10))
    for (let index = 1; index < sizes.length; index += 1) {
      expect(sizes[index]).toBeLessThan(sizes[index - 1] as number)
    }
  })

  it.each(SCALE)('%s is wired into the Tailwind theme', (step) => {
    const index = readFileSync(join(SRC, 'styles', 'index.css'), 'utf8')
    expect(index).toContain(`--${step}: var(${TOKEN_FOR[step]});`)
  })
})
