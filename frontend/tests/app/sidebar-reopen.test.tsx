import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const SHELL = readFileSync(resolve(process.cwd(), 'src/app/app-shell.tsx'), 'utf8')
const SIDEBAR = readFileSync(resolve(process.cwd(), 'src/app/sidebar/app-sidebar.tsx'), 'utf8')

describe('a collapsed sidebar can still be brought back', () => {
  it('keeps a way back outside the pane, because the pane itself goes inert', () => {
    expect(SIDEBAR).toContain('inert')
    expect(SHELL).toMatch(/sidebar\.collapsed &&[\s\S]{0,400}data-sidebar-toggle/)
  })

  it('offers that way on a wide screen, not only on a phone', () => {
    const guard = SHELL.match(/\{!phone && !sidebar\.overlay && sidebar\.collapsed &&/)
    expect(guard, 'the reopen control must render when neither phone nor overlay').not.toBeNull()
  })

  it('names the control for a reader who cannot see the icon', () => {
    expect(SHELL).toContain("t('app.expandSidebar')")
  })

  it('points the control at the pane it reopens', () => {
    expect(SHELL).toContain('aria-controls="app-sidebar"')
    expect(SIDEBAR).toContain('id="app-sidebar"')
  })
})
