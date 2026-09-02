import { describe, expect, it } from 'vitest'
import {
  isAcceptedUrl,
  isLinkableUrl,
  normalizeFormUrl,
  normalizeLinkableUrl,
} from '@/shared/forms/url'

const INJECTION_SCHEMES = [
  'javascript:alert(document.cookie)',
  'JavaScript:alert(1)',
  'JaVaScRiPt://example.org/%0aalert(1)',
  'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
  'data://example.org/text/html,<script>alert(1)</script>',
  'vbscript:msgbox(1)',
  'vbscript://example.org/x',
  'file:///etc/passwd',
]

describe('a plain http address is accepted, not only https', () => {
  it('keeps http exactly as it was typed', () => {
    expect(normalizeFormUrl('http://example.org/rules')).toBe('http://example.org/rules')
    expect(isAcceptedUrl('http://example.org/rules')).toBe(true)
  })

  it('accepts an internal host reachable only over http', () => {
    expect(normalizeFormUrl('http://intranet.local:8080/form')).toBe(
      'http://intranet.local:8080/form',
    )
  })

  it('still accepts https', () => {
    expect(normalizeFormUrl('https://example.org/rules')).toBe('https://example.org/rules')
  })

  it('trims the surrounding whitespace instead of refusing the address', () => {
    expect(normalizeFormUrl('  http://example.org/x  ')).toBe('http://example.org/x')
  })
})

describe('an address typed without a scheme is completed with https', () => {
  it('completes a bare host', () => {
    expect(normalizeFormUrl('example.com')).toBe('https://example.com/')
  })

  it('completes a host carrying a path', () => {
    expect(normalizeFormUrl('example.com/rules')).toBe('https://example.com/rules')
  })

  it('refuses a bare word that is not a host, so it is never guessed at', () => {
    expect(normalizeFormUrl('localhost')).toBeNull()
    expect(normalizeFormUrl('ask me on the chat')).toBeNull()
  })

  it('refuses a relative path, which names no host to reach', () => {
    expect(normalizeFormUrl('/events/42')).toBeNull()
    expect(normalizeFormUrl('/')).toBeNull()
  })

  it('refuses a protocol-relative address instead of adopting its host', () => {
    expect(normalizeFormUrl('//evil.example/x')).toBeNull()
    expect(normalizeLinkableUrl('//evil.example/x')).toBeNull()
  })

  it('refuses a backslash path that a parser could read as a host', () => {
    expect(normalizeFormUrl('/\\evil.example')).toBeNull()
    expect(normalizeLinkableUrl('/\\evil.example')).toBeNull()
  })
})

describe('the scheme injection guard survives the protocol preference being dropped', () => {
  it('refuses every executable scheme in the browser-scheme fields', () => {
    for (const value of INJECTION_SCHEMES) {
      expect(normalizeFormUrl(value)).toBeNull()
      expect(isAcceptedUrl(value)).toBe(false)
    }
  })

  it('refuses every executable scheme in the wider linkable fields too', () => {
    for (const value of INJECTION_SCHEMES) {
      expect(normalizeLinkableUrl(value)).toBeNull()
      expect(isLinkableUrl(value)).toBe(false)
    }
  })

  it('refuses schemes that reach a handler outside the browser', () => {
    for (const value of [
      'ms-msdt://x',
      'search-ms://query=x',
      'steam://run/1',
      'chrome://settings',
      'about://blank',
      'intent://scan/#Intent;scheme=zxing;end',
    ]) {
      expect(isLinkableUrl(value)).toBe(false)
    }
  })
})

describe('the wider set mirrors the schemes the server accepts', () => {
  it('accepts the non-web schemes the server allows', () => {
    for (const value of [
      'tg://resolve?domain=hackathon_crew',
      'ftp://files.example.org/x',
      'ftps://files.example.org/x',
      'webcal://example.org/feed.ics',
      'ircs://irc.example.org/room',
    ]) {
      expect(isLinkableUrl(value)).toBe(true)
    }
  })

  it('refuses a scheme carrying no host, exactly as the server does', () => {
    expect(isLinkableUrl('xmpp:room@example.org')).toBe(false)
    expect(isLinkableUrl('matrix:r/room:example.org')).toBe(false)
  })

  it('keeps those schemes out of the fields that expect a web address', () => {
    expect(isAcceptedUrl('tg://resolve?domain=x')).toBe(false)
    expect(isAcceptedUrl('ftp://files.example.org/x')).toBe(false)
  })
})

describe('an empty value carries no address', () => {
  it('refuses the empty and blank cases', () => {
    expect(normalizeFormUrl('')).toBeNull()
    expect(normalizeFormUrl('   ')).toBeNull()
    expect(normalizeFormUrl('https://')).toBeNull()
  })
})
