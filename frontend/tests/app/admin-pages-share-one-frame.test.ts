import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')

const read = (file: string) => readFileSync(join(SRC, file), 'utf8')

const LIST_PAGES = ['features/event-list/admin/event-list.tsx', 'features/user-list/user-list.tsx']

const TOOLBARS = [
  'features/event-list/admin/admin-toolbar.tsx',
  'features/user-list/user-toolbar.tsx',
]

describe('the admin list pages are built on one frame, so they line up with each other', () => {
  it('each list page carries its own pane instead of the padded scroll layout', () => {
    for (const file of LIST_PAGES) {
      const source = read(file)
      expect(source, `${file} must use the shared list pane`).toContain('<ThreePane>')
      expect(source, `${file} must use the shared list pane`).toContain('<ListPane>')
    }
  })

  it('neither list page sits inside ScrollPage, whose p-6 would push it off the shared edge', () => {
    const router = read('app/router.tsx')
    const scrollAt = router.indexOf('<Route element={<ScrollPage />}>')
    expect(scrollAt).toBeGreaterThan(-1)

    for (const path of ['/admin/events"', '/admin/users"']) {
      const at = router.indexOf(path)
      expect(at, `${path} is missing from the router`).toBeGreaterThan(-1)
      expect(
        at,
        `${path} must be mounted before ScrollPage or it gains 24px of padding`,
      ).toBeLessThan(scrollAt)
    }
  })

  it('both toolbars draw the same header bar, so the titles start at the same pixel', () => {
    for (const file of TOOLBARS) {
      const source = read(file)
      expect(source, file).toContain('border-border border-b px-4 py-3')
      expect(source, `${file} keeps the heading at the same scale`).toContain(
        'font-semibold text-screen tracking-tight',
      )
      expect(source, `${file} keeps the same gap after the heading`).toContain('mr-2')
    }
  })

  it('both list bodies pad their table the same way', () => {
    for (const file of LIST_PAGES) {
      expect(read(file), file).toContain('className="p-3 sm:p-4"')
    }
  })
})
