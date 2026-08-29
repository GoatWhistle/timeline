import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { initials, isDisplayableAvatar, UserAvatar } from '@/entities/user/user-avatar'

const SEED = '5f0d2b7a-0000-4000-8000-000000000001'

describe('avatar source acceptance', () => {
  it('accepts ordinary web addresses', () => {
    expect(isDisplayableAvatar('https://example.org/a.png')).toBe(true)
    expect(isDisplayableAvatar('http://example.org/a.png')).toBe(true)
  })

  it('refuses an executable scheme so it never reaches an image source', () => {
    expect(isDisplayableAvatar('javascript:alert(1)')).toBe(false)
    expect(isDisplayableAvatar('JavaScript:alert(1)')).toBe(false)
    expect(isDisplayableAvatar('data:image/svg+xml,<svg onload=alert(1)>')).toBe(false)
    expect(isDisplayableAvatar('vbscript:msgbox(1)')).toBe(false)
    expect(isDisplayableAvatar('file:///etc/passwd')).toBe(false)
  })

  it('refuses a scheme a browser cannot render as an image', () => {
    expect(isDisplayableAvatar('tg://resolve?domain=team')).toBe(false)
    expect(isDisplayableAvatar('mailto:crew@example.org')).toBe(false)
  })

  it('refuses empty and absent values', () => {
    expect(isDisplayableAvatar('')).toBe(false)
    expect(isDisplayableAvatar('   ')).toBe(false)
    expect(isDisplayableAvatar(null)).toBe(false)
    expect(isDisplayableAvatar(undefined)).toBe(false)
  })
})

describe('avatar rendering', () => {
  it('keeps the initials when no address is given', () => {
    renderWithProviders(<UserAvatar seed={SEED} displayName="Ivan Petrov" />)
    expect(screen.getByText(initials('Ivan Petrov'))).toBeInTheDocument()
    expect(document.querySelector('img')).toBeNull()
  })

  it('keeps the initials underneath a supplied image', () => {
    renderWithProviders(
      <UserAvatar seed={SEED} displayName="Ivan Petrov" avatarUrl="https://example.org/a.png" />,
    )
    expect(screen.getByText(initials('Ivan Petrov'))).toBeInTheDocument()

    const image = document.querySelector('img')
    expect(image).not.toBeNull()
    expect(image?.getAttribute('src')).toBe('https://example.org/a.png')
  })

  it('hides the image until it has actually loaded, so a slow address shows initials', () => {
    renderWithProviders(
      <UserAvatar seed={SEED} displayName="Ivan Petrov" avatarUrl="https://example.org/a.png" />,
    )
    const image = document.querySelector('img')
    expect(image?.className).toContain('opacity-0')
    expect(image?.className).not.toContain('opacity-100')
  })

  it('never puts an executable address into the image source', () => {
    renderWithProviders(
      <UserAvatar seed={SEED} displayName="Ivan Petrov" avatarUrl="javascript:alert(1)" />,
    )
    expect(document.querySelector('img')).toBeNull()
    expect(screen.getByText(initials('Ivan Petrov'))).toBeInTheDocument()
  })
})
