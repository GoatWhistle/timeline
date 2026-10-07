import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { ListToolbar } from '@/shared/ui/layout/list-toolbar'

const SRC = join(process.cwd(), 'src')
const read = (file: string) => readFileSync(join(SRC, file), 'utf8')

const BARRED_PAGES = [
  'features/schedule/my/schedule.tsx',
  'features/personal-history/history.tsx',
  'features/teams/teams.tsx',
  'features/teams/team-layout.tsx',
]

describe('every working page wears the same header bar as the list pages', () => {
  it('builds each page header from the page toolbar, with a bare title and no description', () => {
    for (const file of BARRED_PAGES) {
      const source = read(file)
      expect(source, `${file} went back to its own page header`).toContain('<PageToolbar')
      expect(source, file).not.toContain('<PageHeader')
      const bar = source.slice(source.indexOf('<PageToolbar'))
      expect(bar.slice(0, bar.indexOf('/>')), `${file} grew a description`).not.toContain(
        'description',
      )
    }
  })

  it('sets the schedule scales in the middle and the period on the right', () => {
    const source = read('features/schedule/my/schedule.tsx')
    expect(source).toMatch(/tools=\{<ScaleTabs\b/)
    expect(source).toMatch(/end=\{[\s\S]*?<PeriodNav\b/)
    expect(source, 'the old stacked bar came back above the grid').not.toContain('<ViewTabs')
  })

  it('sets the team sections in the middle and its actions on the right, with a way back', () => {
    const source = read('features/teams/team-layout.tsx')
    expect(source).toMatch(/tools=\{<TeamSectionNav\b/)
    expect(source).toMatch(/end=\{<TeamOwnActions\b/)
    expect(source).toMatch(/back=\{\{ to: '\/teams'/)
  })

  it('runs the page bar edge to edge, cancelling the padding of the scroll page', () => {
    const source = read('shared/ui/layout/list-toolbar.tsx')
    const wrapper = /data-page-toolbar=""\s+className="([^"]*)"/.exec(source)?.[1] ?? ''
    expect(wrapper).toContain('-mx-4')
    expect(wrapper).toContain('-mt-4')
    expect(read('app/layouts/scroll-page/scroll-page.tsx')).toContain('p-4')
  })

  it('lets a list toolbar go without a search field or tools', () => {
    const { container } = renderWithProviders(<ListToolbar title="History" />)
    expect(container.querySelector('input'), 'a search field appeared from nowhere').toBeNull()
    const header = container.querySelector('header')?.className ?? ''
    expect(header).toContain('lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]')
    expect(header, 'a bar without buttons sits shorter than its neighbours').toContain('min-h-15')
  })

  it('offers a way back beside the title when the page has a parent', () => {
    renderWithProviders(<ListToolbar title="Night shift" back={{ to: '/teams', label: 'Teams' }} />)
    expect(screen.getByRole('link', { name: 'Teams' })).toHaveAttribute('href', '/teams')
    expect(screen.getByRole('heading', { level: 1, name: 'Night shift' })).toBeInTheDocument()
  })
})
