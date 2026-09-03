import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { ADMIN_NAV, CATALOG_NAV, MINE_NAV, NavSection } from '@/app/sidebar/nav-section'

describe('the sidebar shows one section at a time', () => {
  it('stands the catalog on its own, with no headline over it', () => {
    const { container } = renderWithProviders(<NavSection items={CATALOG_NAV} />)
    expect(screen.getAllByRole('link')).toHaveLength(CATALOG_NAV.length)
    expect(container.querySelector('p')).toBeNull()
  })

  it('gathers what belongs to the reader under one headline', () => {
    const { container } = renderWithProviders(<NavSection title="Mine" items={MINE_NAV} />)
    expect(screen.getAllByRole('link')).toHaveLength(MINE_NAV.length)
    expect(container.querySelector('p')?.textContent).toBe('Mine')
  })

  it('keeps the participant entries in their agreed order', () => {
    expect([...CATALOG_NAV, ...MINE_NAV].map((item) => item.to)).toEqual([
      '/catalog',
      '/schedule',
      '/teams',
      '/history',
    ])
  })

  it('drops the possessive from entries the headline already claims', () => {
    for (const item of MINE_NAV) {
      expect(item.labelKey).not.toMatch(/^nav\.my/)
    }
  })

  it('sends every participant entry to a named address, never to the bare root', () => {
    for (const item of [...CATALOG_NAV, ...MINE_NAV]) {
      expect(item.to).not.toBe('/')
      expect(item.to.startsWith('/')).toBe(true)
      expect(item.to.length).toBeGreaterThan(1)
    }
  })

  it('offers no separate my-events entry, the catalog having absorbed it', () => {
    const targets = [...CATALOG_NAV, ...MINE_NAV].map((item) => item.to)
    expect(targets).not.toContain('/events')
    expect(targets.filter((to) => to.startsWith('/catalog'))).toHaveLength(1)
  })

  it('keeps the participant entries free of any admin destination', () => {
    expect(
      [...CATALOG_NAV, ...MINE_NAV].map((item) => item.to).filter((to) => to.startsWith('/admin')),
    ).toEqual([])
  })

  it('gives the administrator only administrative destinations', () => {
    const targets = ADMIN_NAV.map((item) => item.to)
    expect(targets.every((to) => to.startsWith('/admin/'))).toBe(true)
    expect(targets).not.toContain('/')
  })

  it('renders no headline for the administrative section either', () => {
    const { container } = renderWithProviders(<NavSection items={ADMIN_NAV} />)
    expect(container.querySelector('p')).toBeNull()
    expect(screen.getAllByRole('link')).toHaveLength(ADMIN_NAV.length)
  })

  it('still prints a headline when one is asked for', () => {
    renderWithProviders(<NavSection title="Views" items={MINE_NAV} />)
    expect(screen.getByText('Views')).toBeInTheDocument()
  })
})
