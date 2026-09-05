import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  resolve(process.cwd(), 'src/features/registration/registration-tab.tsx'),
  'utf8',
)

describe('reminder rules and the channel matrix share a row on a wide screen', () => {
  it('pairs the two companion cards in one grid instead of stacking them alone', () => {
    const rulesIndex = source.indexOf('<RulesEditor')
    const matrixIndex = source.indexOf('<ChannelMatrix')
    expect(rulesIndex).toBeGreaterThan(-1)
    expect(matrixIndex).toBeGreaterThan(-1)

    const between = source.slice(rulesIndex, matrixIndex)
    expect(between).not.toMatch(/<\/Card>\s*\)\s*}\s*\n\s*{registration && \(\s*<Card>/)
  })

  it('splits the pair only once the shared container is wide enough for two tables', () => {
    const pairWrapper = source.match(/<div className="grid items-start gap-6 (@\w+):grid-cols-2">/)
    expect(pairWrapper).not.toBeNull()

    const breakpoint = pairWrapper?.[1] ?? ''
    const order = [
      '@3xs',
      '@2xs',
      '@xs',
      '@sm',
      '@md',
      '@lg',
      '@xl',
      '@2xl',
      '@3xl',
      '@4xl',
      '@5xl',
      '@6xl',
      '@7xl',
    ]
    const asideBreakpoint = source.match(/(@\w+):grid-cols-\[minmax\(0,1fr\)_320px\]/)?.[1] ?? ''

    expect(order.indexOf(breakpoint)).toBeGreaterThan(order.indexOf(asideBreakpoint))
  })

  it('never reintroduces a viewport breakpoint for a split that lives inside a container query', () => {
    const pairLine = source.split('\n').find((line) => line.includes('grid-cols-2'))
    expect(pairLine).toBeDefined()
    expect(pairLine).not.toMatch(/\blg:grid-cols-2\b/)
    expect(pairLine).toMatch(/@\w+:grid-cols-2/)
  })
})
