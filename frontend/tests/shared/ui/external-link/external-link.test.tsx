import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeEach, describe, expect, it } from 'vitest'
import { i18n } from '@/shared/i18n/config'
import { ExternalLink } from '@/shared/ui/navigation/external-link/external-link'
import {
  isBrowserScheme,
  isInsecureLink,
  isRenderableLink,
  linkHost,
  parseExternalUrl,
  safeLinkHref,
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

  it.each([
    ['javascript', 'javascript:alert(1)'],
    ['javascript with an authority', 'javascript://example.org/%0aalert(1)'],
    ['livescript alias', 'livescript://example.org/%0aalert(1)'],
    ['mocha alias', 'mocha://example.org/%0aalert(1)'],
    ['data', 'data:text/html,<script>alert(1)</script>'],
    ['vbscript', 'vbscript:msgbox(1)'],
    ['file', 'file:///etc/passwd'],
    ['ms-msdt operating system handler', 'ms-msdt://x'],
    ['search-ms operating system handler', 'search-ms://query=x'],
    ['chrome internals', 'chrome://settings'],
    ['blob', 'blob:https://example.org/x'],
  ])('never emits an href for %s', (_name, href) => {
    const { container } = renderLink(href)
    const anchor = container.querySelector('a')
    expect(anchor).not.toBeNull()
    expect(anchor?.hasAttribute('href')).toBe(false)
    expect(screen.queryByRole('link')).toBeNull()
  })
})

describe('renderable link scheme allowlist', () => {
  it('keeps the address of a scheme on the list', () => {
    expect(safeLinkHref('https://example.org/a')).toBe('https://example.org/a')
    expect(safeLinkHref('mailto:crew@example.org')).toBe('mailto:crew@example.org')
    expect(safeLinkHref('tg://resolve?domain=team')).toBe('tg://resolve?domain=team')
  })

  it('drops the address of a scheme off the list', () => {
    expect(safeLinkHref('javascript://example.org/%0aalert(1)')).toBeUndefined()
    expect(safeLinkHref('livescript://example.org/%0aalert(1)')).toBeUndefined()
    expect(safeLinkHref('ms-msdt://x')).toBeUndefined()
    expect(safeLinkHref('chrome://settings')).toBeUndefined()
  })

  it('drops text that is not an address at all', () => {
    expect(safeLinkHref('see the chat')).toBeUndefined()
    expect(safeLinkHref('   ')).toBeUndefined()
  })

  it('reports which schemes are renderable', () => {
    expect(isRenderableLink('https://example.org')).toBe(true)
    expect(isRenderableLink('javascript:alert(1)')).toBe(false)
  })
})
