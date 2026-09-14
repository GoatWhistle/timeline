import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { BioCard, bioSchema } from '@/features/profile/bio-card/bio-card'
import {
  PersonalDataCard,
  profileSchema,
} from '@/features/profile/personal-data-card/personal-data-card'
import {
  isAcceptedProfileLink,
  newLinkSchema,
} from '@/features/profile/profile-links-card/links-schema'
import { ProfileLinkPreview } from '@/features/profile/profile-links-card/profile-link-preview'
import { i18n } from '@/shared/i18n/config'
import { TooltipProvider } from '@/shared/ui/overlays/tooltip'

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

describe('profile schema', () => {
  const NAMES = { first_name: 'Ivan', middle_name: '', last_name: 'Petrov' }

  it('accepts a filled-in profile', () => {
    const result = profileSchema.safeParse({
      ...NAMES,
      bio: 'Backend developer',
    })
    expect(result.success).toBe(true)
  })

  it('carries no avatar address, because the avatar is an uploaded file', () => {
    expect(Object.keys(profileSchema.shape)).not.toContain('avatar_url')
  })

  it('bounds the bio at 2000 characters, matching the database constraint', () => {
    expect(bioSchema.safeParse({ bio: 'a'.repeat(2000) }).success).toBe(true)
    expect(bioSchema.safeParse({ bio: 'a'.repeat(2001) }).success).toBe(false)
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

describe('bio and avatar handling in the profile panel', () => {
  function renderCard(props: { avatarUrl?: string }) {
    return renderWithProviders(
      <PersonalDataCard
        userId="us_42ej2s5gh7e8"
        firstName="Ivan"
        lastName="Petrov"
        avatarUrl={props.avatarUrl}
      />,
    )
  }

  it('shows a bio containing markup as literal text in the editor', async () => {
    const bio = '<script>alert(1)</script> & "quotes"'
    renderWithProviders(<BioCard bio={bio} />)

    const field = await screen.findByLabelText(i18n.t('profile.bio'))
    expect((field as HTMLTextAreaElement).value).toBe(bio)
    expect(document.querySelector('script')).toBeNull()
  })

  it('offers no link preview for a bio, so its text can never become an anchor', () => {
    renderWithProviders(<BioCard bio="see https://evil.example.org" />)
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('offers no free-text avatar address field any more', () => {
    renderCard({ avatarUrl: '/api/v1/avatars/abc123.png' })
    expect(screen.queryByLabelText('profile.avatar_url')).toBeNull()
  })
})
