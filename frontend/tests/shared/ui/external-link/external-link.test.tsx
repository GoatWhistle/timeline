import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeEach, describe, expect, it } from 'vitest'
import { i18n } from '@/shared/i18n/config'
import { ExternalLink } from '@/shared/ui/navigation/external-link/external-link'
import {
  isBrowserScheme,
  isInsecureLink,
  linkHost,
  parseExternalUrl,
} from '@/shared/ui/navigation/external-link/external-url'
import { TooltipProvider } from '@/shared/ui/overlays/tooltip'

function renderLink(href: string, label = 'Open') {
  return renderWithProviders(
    <TooltipProvider>
      <ExternalLink href={href}>{label}</ExternalLink>
    </TooltipProvider>,
  )
}

describe('external url inspection', () => {
  it('parses an absolute address', () => {
    expect(parseExternalUrl('https://example.org/rules')?.host).toBe('example.org')
  })

  it('rejects text that is not an address', () => {
    expect(parseExternalUrl('just some text')).toBeNull()
    expect(parseExternalUrl('   ')).toBeNull()
  })

  it('marks http as insecure and https as secure', () => {
    expect(isInsecureLink('http://example.org')).toBe(true)
    expect(isInsecureLink('https://example.org')).toBe(false)
  })

  it('does not mark non-web schemes as insecure', () => {
    expect(isInsecureLink('tg://resolve?domain=team')).toBe(false)
    expect(isInsecureLink('mailto:crew@example.org')).toBe(false)
  })

  it('separates browser schemes from the rest', () => {
    expect(isBrowserScheme('http://example.org')).toBe(true)
    expect(isBrowserScheme('https://example.org')).toBe(true)
    expect(isBrowserScheme('tg://resolve?domain=team')).toBe(false)
  })

  it('reports the host of an address', () => {
    expect(linkHost('https://example.org/a/b')).toBe('example.org')
    expect(linkHost('mailto:crew@example.org')).toBeNull()
  })
})

describe('external link element', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ru')
  })

  it('always carries noopener and noreferrer', () => {
    renderLink('https://example.org/rules')
    const link = screen.getByRole('link', { name: /Open/ })
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('carries noopener and noreferrer on an insecure address too', () => {
    renderLink('http://example.org/rules')
    const link = screen.getByRole('link', { name: /Open/ })
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('marks an http address with text, not colour alone', () => {
    renderLink('http://example.org/rules')
    expect(screen.getByText(i18n.t('common:link.insecure'))).toBeInTheDocument()
  })

  it('leaves an https address unmarked', () => {
    renderLink('https://example.org/rules')
    expect(screen.queryByText(i18n.t('common:link.insecure'))).not.toBeInTheDocument()
  })

  it('renders a non-http scheme without blocking it', () => {
    renderLink('tg://resolve?domain=team')
    const link = screen.getByRole('link', { name: /Open/ })
    expect(link).toHaveAttribute('href', 'tg://resolve?domain=team')
    expect(screen.queryByText(i18n.t('common:link.insecure'))).not.toBeInTheDocument()
  })
})
