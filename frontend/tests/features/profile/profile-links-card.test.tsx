import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import {
  isAcceptedProfileLink,
  linksSchema,
  newLinkSchema,
} from '@/features/profile/profile-links-card/links-schema'
import { ProfileLinkPreview } from '@/features/profile/profile-links-card/profile-link-preview'
import { ProfileLinksCard } from '@/features/profile/profile-links-card/profile-links-card'
import type { MeResponse } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'
import { TooltipProvider } from '@/shared/ui/overlays/tooltip'

const BLANK_USER = {
  id: '5f0d2b7a-0000-4000-8000-000000000001',
  display_name: 'Ivan Petrov',
  email: 'ivan@example.org',
  email_verified: true,
  telegram_linked: false,
  locale: 'ru',
  timezone: 'Europe/Moscow',
  is_admin: false,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
} as MeResponse

function renderPreview(href: string) {
  return renderWithProviders(
    <TooltipProvider>
      <ProfileLinkPreview href={href} />
    </TooltipProvider>,
  )
}

describe('profile link acceptance', () => {
  it('accepts an empty value, because the field is optional', () => {
    expect(isAcceptedProfileLink('')).toBe(true)
    expect(isAcceptedProfileLink('   ')).toBe(true)
  })

  it('accepts ordinary addresses, http included', () => {
    expect(isAcceptedProfileLink('https://github.com/ivan')).toBe(true)
    expect(isAcceptedProfileLink('http://intranet.local:8080/me')).toBe(true)
  })

  it('refuses the schemes the server refuses', () => {
    expect(isAcceptedProfileLink('javascript:alert(document.cookie)')).toBe(false)
    expect(isAcceptedProfileLink('JavaScript:alert(1)')).toBe(false)
    expect(isAcceptedProfileLink('data:text/html,<script>alert(1)</script>')).toBe(false)
    expect(isAcceptedProfileLink('vbscript:msgbox(1)')).toBe(false)
    expect(isAcceptedProfileLink('file:///etc/passwd')).toBe(false)
  })

  it('refuses an executable scheme disguised with an authority', () => {
    expect(isAcceptedProfileLink('javascript://example.org/%0aalert(1)')).toBe(false)
    expect(isAcceptedProfileLink('JaVaScRiPt://example.org/%0aalert(1)')).toBe(false)
  })

  it('refuses free text that is not an address', () => {
    expect(isAcceptedProfileLink('ask me on the chat')).toBe(false)
    expect(isAcceptedProfileLink('/events/42')).toBe(false)
  })

  it('accepts an address typed without a scheme', () => {
    expect(isAcceptedProfileLink('github.com/ivan')).toBe(true)
  })
})

describe('profile links schema', () => {
  it('rejects an executable address in the avatar field', () => {
    const result = linksSchema.safeParse({ avatar_url: 'javascript:alert(1)', bio: '' })
    expect(result.success).toBe(false)
  })

  it('accepts a filled-in profile', () => {
    const result = linksSchema.safeParse({
      avatar_url: 'https://example.org/a.png',
      bio: 'Backend developer',
    })
    expect(result.success).toBe(true)
  })

  it('bounds the bio at 2000 characters, matching the database constraint', () => {
    const base = { avatar_url: '' }
    expect(linksSchema.safeParse({ ...base, bio: 'a'.repeat(2000) }).success).toBe(true)
    expect(linksSchema.safeParse({ ...base, bio: 'a'.repeat(2001) }).success).toBe(false)
  })
})

describe('new profile link schema', () => {
  it('requires an address', () => {
    expect(newLinkSchema.safeParse({ url: '', label: '' }).success).toBe(false)
    expect(newLinkSchema.safeParse({ url: '   ', label: '' }).success).toBe(false)
  })

  it('refuses an address the browser must not follow', () => {
    for (const url of [
      'javascript:alert(1)',
      'javascript://github.com/%0aalert(1)',
      'data:text/html,<script>alert(1)</script>',
      'file:///etc/passwd',
    ]) {
      expect(newLinkSchema.safeParse({ url, label: '' }).success, url).toBe(false)
    }
  })

  it('accepts an ordinary address with and without a caption', () => {
    expect(newLinkSchema.safeParse({ url: 'https://github.com/ivan', label: '' }).success).toBe(
      true,
    )
    expect(newLinkSchema.safeParse({ url: 'github.com/ivan', label: 'Code' }).success).toBe(true)
  })

  it('bounds the caption at 100 characters, matching the database constraint', () => {
    const url = 'https://github.com/ivan'
    expect(newLinkSchema.safeParse({ url, label: 'a'.repeat(100) }).success).toBe(true)
    expect(newLinkSchema.safeParse({ url, label: 'a'.repeat(101) }).success).toBe(false)
  })
})

describe('profile link preview', () => {
  it('shows the host of an accepted address', () => {
    renderPreview('https://github.com/ivan')
    expect(screen.getByText('github.com')).toBeInTheDocument()
  })

  it('renders the address through a safe anchor', () => {
    renderPreview('https://github.com/ivan')
    const anchor = screen.getByRole('link')
    expect(anchor.getAttribute('href')).toBe('https://github.com/ivan')
    expect(anchor.getAttribute('rel')).toBe('noopener noreferrer')
    expect(anchor.getAttribute('target')).toBe('_blank')
  })

  it('renders nothing for an executable address, so no anchor ever carries it', () => {
    renderPreview('javascript:alert(1)')
    expect(screen.queryByRole('link')).toBeNull()
    expect(document.querySelector('a')).toBeNull()
  })

  it('renders nothing for an executable address that carries a host', () => {
    renderPreview('javascript://example.org/%0aalert(1)')
    expect(screen.queryByRole('link')).toBeNull()
    expect(document.querySelector('a')).toBeNull()
  })

  it('renders nothing for an empty value', () => {
    renderPreview('')
    expect(screen.queryByRole('link')).toBeNull()
  })
})

describe('bio handling in the card', () => {
  it('shows a bio containing markup as literal text in the editor', async () => {
    const bio = '<script>alert(1)</script> & "quotes"'
    renderWithProviders(<ProfileLinksCard user={{ ...BLANK_USER, bio }} />)

    const field = await screen.findByLabelText(i18n.t('profile.bio'))
    expect((field as HTMLTextAreaElement).value).toBe(bio)
    expect(document.querySelector('script')).toBeNull()
  })

  it('offers no link preview for a bio, so its text can never become an anchor', () => {
    renderWithProviders(
      <ProfileLinksCard user={{ ...BLANK_USER, bio: 'see https://evil.example.org' }} />,
    )
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('previews an avatar address the user has already saved', async () => {
    renderWithProviders(
      <ProfileLinksCard user={{ ...BLANK_USER, avatar_url: 'https://example.org/a.png' }} />,
    )
    expect(await screen.findByText('example.org')).toBeInTheDocument()
  })

  it('shows no preview for a saved address the browser cannot open', () => {
    renderWithProviders(
      <ProfileLinksCard user={{ ...BLANK_USER, avatar_url: 'javascript:alert(1)' }} />,
    )
    expect(screen.queryByRole('link')).toBeNull()
  })
})
