import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it } from 'vitest'
import { TeamLinksList } from '@/features/teams/team-links/team-links-list'
import type { TeamEventLink } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'
import { detectService } from '@/shared/ui/navigation/service-link/detect-service'

const TEAM = 'tm_42ej2s5gh7e8'
const EVENT = 'ev_gma9hq8a96q5'

function link(id: string, url: string, label?: string): TeamEventLink {
  return {
    id: `tl_${id}`,
    entry_id: 'te_42ej2s5gh7e8',
    url,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...(label === undefined ? {} : { label }),
  } as TeamEventLink
}

const LINKS = [
  link('1', 'https://github.com/team/project'),
  link('2', 'https://gitlab.com/team/notes'),
  link('3', 'https://example.org/board', 'Our board'),
]

function renderList(canWrite: boolean, links: TeamEventLink[] = LINKS) {
  return renderWithProviders(
    <TeamLinksList teamId={TEAM} eventId={EVENT} links={links} canWrite={canWrite} />,
  )
}

describe('team links list', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en')
  })

  it('shows every link the team added, named by its service or its own label', () => {
    renderList(true)
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    for (const name of ['GitHub', 'GitLab', 'Our board']) {
      expect(screen.getByRole('link', { name })).toBeTruthy()
    }
  })

  it('offers no editing control at all when the caller may not write', () => {
    renderList(false)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    for (const item of screen.getAllByRole('listitem')) {
      expect(item.getAttribute('draggable')).toBe('false')
    }
  })

  it('offers a control for every row when the caller may write', () => {
    renderList(true)
    for (const item of screen.getAllByRole('listitem')) {
      const buttons = within(item).getAllByRole('button')
      expect(buttons.length).toBeGreaterThanOrEqual(4)
      expect(item.getAttribute('draggable')).toBe('true')
    }
  })

  it('still shows the addresses themselves to a read-only member', () => {
    renderList(false)
    const hrefs = screen.getAllByRole('link').map((node) => node.getAttribute('href'))
    expect(hrefs).toEqual([
      'https://github.com/team/project',
      'https://gitlab.com/team/notes',
      'https://example.org/board',
    ])
  })

  it('names each row by its own link rather than a shared label', () => {
    renderList(true)
    const labels = screen.getAllByRole('listitem').map((node) => node.getAttribute('aria-label'))
    expect(labels[0]).toMatch(/^GitHub, /)
    expect(labels[1]).toMatch(/^GitLab, /)
    expect(labels[2]).toMatch(/^Our board, /)
    expect(new Set(labels).size).toBe(3)
  })

  it('reports the empty list rather than an empty ordered list', () => {
    renderList(true, [])
    expect(screen.queryByRole('list')).toBeNull()
    expect(screen.getByText(i18n.t('team:links.empty'))).toBeTruthy()
  })
})

describe('team links reuse the profile service detection', () => {
  it('resolves the same services the profile card resolves', () => {
    expect(detectService('https://github.com/team/project')?.label).toBe('GitHub')
    expect(detectService('https://gitlab.com/team/notes')?.label).toBe('GitLab')
    expect(detectService('https://example.org/board')).toBeNull()
  })
})
