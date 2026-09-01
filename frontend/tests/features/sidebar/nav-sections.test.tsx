import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { ADMIN_NAV, NavSection, USER_NAV } from '@/app/sidebar/nav-section'

describe('the sidebar shows one section at a time', () => {
  it('gives a participant every participant entry and no headline', () => {
    const { container } = renderWithProviders(<NavSection items={USER_NAV} />)
    expect(screen.getAllByRole('link')).toHaveLength(USER_NAV.length)
    expect(container.querySelector('p')).toBeNull()
  })

  it('keeps the participant entries in their agreed order', () => {
    expect(USER_NAV.map((item) => item.to)).toEqual(['/catalog', '/', '/schedule', '/teams'])
  })

  it('keeps the participant entries free of any admin destination', () => {
    expect(USER_NAV.map((item) => item.to).filter((to) => to.startsWith('/admin'))).toEqual([])
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
    renderWithProviders(<NavSection title="Views" items={USER_NAV} />)
    expect(screen.getByText('Views')).toBeInTheDocument()
  })
})
