import { describe, expect, it } from 'vitest'
import { ADMIN_NAV, CATALOG_NAV, MINE_NAV } from '@/app/sidebar/nav-section'
import { GOTO_ADMIN, GOTO_USER } from '@/shared/keyboard/shortcut-catalog'

const NAV_PAIRS = [
  { name: 'user', nav: [...CATALOG_NAV, ...MINE_NAV], goto: GOTO_USER },
  { name: 'admin', nav: ADMIN_NAV, goto: GOTO_ADMIN },
]

describe('every place the sidebar offers is reachable from the keyboard', () => {
  for (const { name, nav, goto } of NAV_PAIRS) {
    it(`leaves no ${name} destination without a go-to key`, () => {
      const reachable = new Set(goto.map((target) => target.path.split('?')[0]))
      const missing = nav.map((item) => item.to).filter((to) => !reachable.has(to))

      expect(missing, `${name} destinations without a shortcut: ${missing.join(', ')}`).toEqual([])
    })
  }

  it('sends every go-to key somewhere the sidebar actually leads', () => {
    const offered = new Set([...CATALOG_NAV, ...MINE_NAV, ...ADMIN_NAV].map((item) => item.to))
    const stray = [...GOTO_USER, ...GOTO_ADMIN]
      .map((target) => target.path.split('?')[0] ?? '')
      .filter((path) => !offered.has(path))

    expect(stray, `go-to keys pointing nowhere: ${stray.join(', ')}`).toEqual([])
  })

  it('gives each destination its own letter', () => {
    const keys = [...GOTO_USER, ...GOTO_ADMIN].map((target) => target.key)

    expect(new Set(keys).size, `duplicate go-to letters in ${keys.join(', ')}`).toBe(keys.length)
  })
})
