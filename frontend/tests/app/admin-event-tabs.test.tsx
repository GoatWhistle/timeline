import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')

const PAGE = readFileSync(join(SRC, 'app/pages/admin-event-page.tsx'), 'utf8')

const TAB_COMPONENT = {
  stages: 'StagesTab',
  tracks: 'TracksTab',
  participants: 'ParticipantsTab',
  registration: 'RegistrationTab',
  statuses: 'StatusesTab',
} as const

function mounts(component: string): number {
  return PAGE.split(`<${component}`).length - 1
}

describe('a tab owns its content, and the general tab does not repeat it', () => {
  it.each(Object.entries(TAB_COMPONENT))(
    'the %s tab mounts its panel exactly once on the page',
    (_tab, component) => {
      expect(mounts(component)).toBe(1)
    },
  )

  it('the general tab does not carry the stages panel beside the stages tab', () => {
    const general = PAGE.slice(
      PAGE.indexOf('<TabsContent value="general">'),
      PAGE.indexOf('<TabsContent value="stages">'),
    )
    expect(general).not.toContain('StagesTab')
  })

  it('the general tab still carries the cover, which has no tab of its own', () => {
    const general = PAGE.slice(
      PAGE.indexOf('<TabsContent value="general">'),
      PAGE.indexOf('<TabsContent value="stages">'),
    )
    expect(general).toContain('CoverField')
    expect(mounts('CoverField')).toBe(1)
  })
})

const GENERAL = PAGE.slice(
  PAGE.indexOf('<TabsContent value="general">'),
  PAGE.indexOf('<TabsContent value="stages">'),
)

describe('the general tab spends the width it is given', () => {
  it('caps the tab at no fixed width, which is what left the right half empty', () => {
    expect(GENERAL).not.toMatch(/\bmax-w-(?:\d|sm|md|lg|xl|\dxl|screen|full|prose)/)
  })

  it('lays the form beside the cover rather than stacking two full-width cards', () => {
    expect(GENERAL).toContain('grid-cols-[minmax(0,1fr)_320px]')
  })

  it('measures that split against the tab, not the viewport, so the sidebar cannot squeeze the form', () => {
    expect(GENERAL).toContain('@container')
    const split = GENERAL.match(/@(\w+):grid-cols-\[minmax\(0,1fr\)_320px\]/)
    expect(split).not.toBeNull()
    expect(GENERAL).not.toMatch(/\bxl:grid-cols-\[minmax/)
  })

  it('keeps the cover in a side column the form flows around', () => {
    expect(GENERAL).toContain('<aside')
    expect(GENERAL).toMatch(/@\w+:col-start-2/)
    expect(GENERAL).toMatch(/@\w+:col-start-1/)
  })
})
