import { describe, expect, it } from 'vitest'
import { catalogFor, GOTO_ADMIN } from '@/shared/keyboard/shortcut-catalog'

const ADMIN_IDS = GOTO_ADMIN.map((target) => `goto-${target.id}`)

function idsIn(sections: { shortcuts: { id: string }[] }[]): string[] {
  return sections.flatMap((section) => section.shortcuts.map((entry) => entry.id))
}

describe('the shortcut list keeps administration out of an ordinary account', () => {
  it('offers no administrative destination to a member', () => {
    const listed = idsIn(catalogFor(false))
    const leaked = ADMIN_IDS.filter((id) => listed.includes(id))

    expect(leaked, `a member is shown ${leaked.join(', ')}`).toEqual([])
  })

  it('still offers every administrative destination to an administrator', () => {
    const listed = idsIn(catalogFor(true))
    const missing = ADMIN_IDS.filter((id) => !listed.includes(id))

    expect(missing, `an administrator is missing ${missing.join(', ')}`).toEqual([])
  })

  it('leaves the shortcuts both roles share untouched', () => {
    const member = idsIn(catalogFor(false))

    expect(member).toContain('command-palette')
    expect(member).toContain('goto-catalog')
  })
})
