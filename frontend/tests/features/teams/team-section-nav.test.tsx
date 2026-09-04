import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it } from 'vitest'
import { TeamSectionNav } from '@/features/teams/team-section-nav'
import { i18n } from '@/shared/i18n/config'

const TEAM = 'tm_42ej2s5gh7e8'

function renderNav(route: string) {
  return renderWithProviders(<TeamSectionNav teamId={TEAM} />, { route })
}

function nav() {
  return screen.getByRole('navigation', { name: 'Team sections' })
}

describe('the team sections are real addresses, not panels of one screen', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en')
  })

  it('offers every section as a link a keyboard can reach', () => {
    renderNav(`/teams/${TEAM}`)
    const links = within(nav()).getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      `/teams/${TEAM}`,
      `/teams/${TEAM}/members`,
      `/teams/${TEAM}/events`,
    ])
  })

  it('names each section from the dictionary, never from a literal', () => {
    renderNav(`/teams/${TEAM}`)
    for (const label of ['Overview', 'Members', 'Hackathons']) {
      expect(within(nav()).getByRole('link', { name: label })).toBeInTheDocument()
    }
  })

  it.each([
    ['members', 'Members'],
    ['events', 'Hackathons'],
  ])('marks %s as the current section when its address is open', (segment, label) => {
    renderNav(`/teams/${TEAM}/${segment}`)
    const current = within(nav()).getByRole('link', { name: label })
    expect(current).toHaveAttribute('aria-current', 'page')
  })

  it('marks exactly one section as current, never two at once', () => {
    renderNav(`/teams/${TEAM}/members`)
    const marked = within(nav())
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page')
    expect(marked).toHaveLength(1)
    expect(marked[0]).toHaveTextContent('Members')
  })

  it('keeps the overview from claiming a deeper section as its own', () => {
    renderNav(`/teams/${TEAM}/events`)
    const overview = within(nav()).getByRole('link', { name: 'Overview' })
    expect(overview).not.toHaveAttribute('aria-current')
  })

  it('marks the hackathons section on a single entry beneath it', () => {
    renderNav(`/teams/${TEAM}/events/ev_gma9hq8a96q5`)
    const current = within(nav()).getByRole('link', { name: 'Hackathons' })
    expect(current).toHaveAttribute('aria-current', 'page')
  })

  it('gives its icons no voice, so the label carries the meaning', () => {
    const { container } = renderNav(`/teams/${TEAM}`)
    const icons = container.querySelectorAll('nav svg')
    expect(icons.length).toBeGreaterThan(0)
    for (const icon of icons) expect(icon.getAttribute('aria-hidden')).toBe('true')
  })
})
