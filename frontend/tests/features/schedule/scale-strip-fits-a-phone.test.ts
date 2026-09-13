import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const barStyles = readFileSync(
  resolve(process.cwd(), 'src/features/schedule/ui/view-tabs/view-tabs.module.css'),
  'utf8',
)

describe('the schedule scale strip can shrink on a narrow screen', () => {
  it('lets the first child of the bar shrink below its content width', () => {
    const rule = barStyles.match(/\.bar\s*>\s*\*:first-child\s*\{([^}]*)\}/)
    expect(rule).not.toBeNull()
    expect(rule?.[1]).toContain('min-width: 0')
  })

  it('caps that child at the width of the bar', () => {
    const rule = barStyles.match(/\.bar\s*>\s*\*:first-child\s*\{([^}]*)\}/)
    expect(rule?.[1]).toContain('max-width: 100%')
  })
})
