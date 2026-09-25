import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { QueryBoundary } from '@/shared/ui/states'

const ROOT = process.cwd()

function source(relative: string): string {
  return readFileSync(join(ROOT, relative), 'utf8')
}

function classAttribute(text: string, anchor: string): string {
  const at = text.indexOf(anchor)
  expect(at, `anchor ${anchor} is present`).toBeGreaterThan(-1)
  const opened = text.lastIndexOf('<div', at)
  const closed = text.indexOf('>', opened)
  return text.slice(opened, closed)
}

function isFlexColumn(className: string): boolean {
  return /\bflex\b/.test(className) && /\bflex-col\b/.test(className)
}

function stretches(className: string): boolean {
  return /\bflex-1\b/.test(className)
}

describe('a stretched column reaches the empty pane without a block box in between', () => {
  it('keeps the scroll layout a flex column, not a block that swallows flex-1', () => {
    const text = source('src/app/layouts/scroll-page/scroll-page.tsx')
    const className = classAttribute(text, '<Outlet />')

    expect(isFlexColumn(className), `scroll-page wrapper: ${className}`).toBe(true)
    expect(stretches(className), `scroll-page wrapper: ${className}`).toBe(true)
  })

  it('keeps the query boundary a flex column, since it wraps every settled page', () => {
    const { container } = renderWithProviders(
      <QueryBoundary isPending={false} hasData>
        <p>settled content</p>
      </QueryBoundary>,
    )

    const wrapper = screen.getByText('settled content').parentElement as HTMLElement
    expect(container.contains(wrapper)).toBe(true)
    expect(isFlexColumn(wrapper.className), wrapper.className).toBe(true)
    expect(stretches(wrapper.className), wrapper.className).toBe(true)
  })

  it('still stretches while a refetch dims the region, not only when settled', () => {
    renderWithProviders(
      <QueryBoundary isPending={false} isFetching hasData>
        <p>stale content</p>
      </QueryBoundary>,
    )

    const wrapper = screen.getByText('stale content').parentElement as HTMLElement
    expect(isFlexColumn(wrapper.className), wrapper.className).toBe(true)
    expect(stretches(wrapper.className), wrapper.className).toBe(true)
    expect(wrapper.className).toContain('opacity-60')
  })

  it.each([
    ['src/features/teams/teams.tsx', '<PageHeader'],
    ['src/features/audit-log/audit-log.tsx', "<PageHeader title={t('audit.title')}"],
  ])('gives %s a stretched column root so its pane can fill the pane', (file, anchor) => {
    const className = classAttribute(source(file), anchor)

    expect(isFlexColumn(className), `${file}: ${className}`).toBe(true)
    expect(stretches(className), `${file}: ${className}`).toBe(true)
  })

  it.each(['src/features/event-list/admin/event-list.tsx', 'src/features/user-list/user-list.tsx'])(
    'stretches the padded wrapper that %s puts around its empty pane',
    (file) => {
      const className = classAttribute(source(file), '<EmptyState')

      expect(isFlexColumn(className), `${file}: ${className}`).toBe(true)
      expect(stretches(className), `${file}: ${className}`).toBe(true)
      expect(className, `${file} keeps its padding`).toContain('p-4')
    },
  )

  it('leaves the pagination wrapper alone, because only the empty pane should stretch', () => {
    const text = source('src/features/event-list/admin/event-list.tsx')
    const className = classAttribute(text, '<Pagination')

    expect(stretches(className), `pagination wrapper: ${className}`).toBe(false)
  })
})
