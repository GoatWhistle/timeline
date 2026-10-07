import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { ListToolbar } from '@/shared/ui/layout/list-toolbar'

const SRC = join(process.cwd(), 'src')
const read = (file: string) => readFileSync(join(SRC, file), 'utf8')

describe('the schedule wears the same header as the list pages', () => {
  it('builds its header from the list toolbar, scales in the middle and the period on the right', () => {
    const source = read('features/schedule/my/schedule.tsx')
    expect(source, 'the schedule went back to its own page header').toContain('<ListToolbar')
    expect(source).not.toContain('<PageHeader')
    expect(source).toMatch(/tools=\{<ScaleTabs\b/)
    expect(source).toMatch(/end=\{[\s\S]*?<PeriodNav\b/)
    expect(source, 'the old stacked bar came back above the grid').not.toContain('<ViewTabs')
  })

  it('runs that header edge to edge, cancelling the padding of the scroll page', () => {
    const source = read('features/schedule/my/schedule.tsx')
    const wrapper = /data-schedule-toolbar=""\s+className="([^"]*)"/.exec(source)?.[1] ?? ''
    expect(wrapper).toContain('-mx-4')
    expect(wrapper).toContain('-mt-4')
    expect(read('app/layouts/scroll-page/scroll-page.tsx')).toContain('p-4')
  })

  it('lets a list toolbar go without a search field', () => {
    const { container } = renderWithProviders(
      <ListToolbar title="Schedule" tools={<span>tabs</span>} end={<span>period</span>} />,
    )
    expect(container.querySelector('input'), 'a search field appeared from nowhere').toBeNull()
    expect(container.querySelector('header')?.className).toContain(
      'lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]',
    )
    expect(container.textContent).toContain('tabs')
    expect(container.textContent).toContain('period')
  })
})
