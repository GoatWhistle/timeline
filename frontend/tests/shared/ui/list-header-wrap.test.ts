import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')

const read = (file: string) => readFileSync(join(SRC, file), 'utf8')

const HEADERS = [
  { file: 'features/event-list/admin/event-list.tsx', anchor: '<header' },
  { file: 'features/catalog/catalog-toolbar.tsx', anchor: 'border-border border-b px-4 py-3' },
]

function barClassName(source: string, anchor: string): string {
  const at = source.indexOf(anchor)
  if (at < 0) return ''
  const slice = source.slice(Math.max(0, at - 200), at + 300)
  const match = /className="([^"]*border-border border-b px-4 py-3[^"]*)"/.exec(slice)
  return match?.[1] ?? ''
}

describe('a list header wraps its controls instead of pushing the page wider', () => {
  it('every list header bar is allowed to wrap, which is what stopped admin events scrolling at 360', () => {
    for (const { file, anchor } of HEADERS) {
      const bar = barClassName(read(file), anchor)
      expect(bar, file).not.toBe('')
      expect(bar, file).toContain('flex-wrap')
    }
  })

  it('the control cluster beside the title may shrink, so a fixed field cannot pin it open', () => {
    const source = read('features/event-list/admin/event-list.tsx')
    const cluster = /className="([^"]*\bflex-1\b[^"]*\bflex-wrap\b[^"]*)"/.exec(source)?.[1] ?? ''
    expect(cluster).not.toBe('')
    expect(cluster).toContain('min-w-0')
    expect(cluster).toContain('justify-end')
  })

  it('no control in that header holds a fixed width down to the phone', () => {
    const source = read('features/event-list/admin/event-list.tsx')
    const fixed: string[] = []
    for (const match of source.matchAll(/className="([^"]*)"/g)) {
      const cls = match[1] ?? ''
      if (!/(^|\s)w-\d+(\s|$)/.test(cls)) continue
      if (/\bsm:w-\d+\b/.test(cls)) continue
      fixed.push(cls)
    }
    expect(fixed).toEqual([])
  })
})
