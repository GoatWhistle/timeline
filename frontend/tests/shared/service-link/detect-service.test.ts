import { describe, expect, it } from 'vitest'
import {
  detectService,
  linkHostname,
  normalizeLinkUrl,
} from '@/shared/ui/navigation/service-link/detect-service'
import { SERVICE_GLYPHS } from '@/shared/ui/navigation/service-link/service-glyphs'
import { SERVICES, type ServiceId } from '@/shared/ui/navigation/service-link/service-registry'

describe('detectService: every registered service', () => {
  for (const service of SERVICES) {
    it(`recognises ${service.label} on each of its domains`, () => {
      for (const domain of service.domains) {
        expect(detectService(`https://${domain}/someone`)?.id).toBe(service.id)
      }
    })
  }
})

describe('detectService: address shapes', () => {
  it('accepts an address without a scheme', () => {
    expect(detectService('github.com/user')?.id).toBe('github')
  })

  it('ignores a www prefix', () => {
    expect(detectService('https://www.linkedin.com/in/user')?.id).toBe('linkedin')
  })

  it('matches a fully qualified host written with a trailing dot', () => {
    expect(detectService('https://github.com./user')?.id).toBe('github')
    expect(detectService('https://www.gitlab.com./user')?.id).toBe('gitlab')
    expect(linkHostname('https://example.org.')).toBe('example.org')
  })

  it('ignores letter case in the host', () => {
    expect(detectService('HTTPS://GitHub.COM/User')?.id).toBe('github')
    expect(detectService('WWW.GitLab.Com/user')?.id).toBe('gitlab')
  })

  it('matches a subdomain against its registrable parent', () => {
    expect(detectService('https://gist.github.com/user/abc')?.id).toBe('github')
    expect(detectService('https://user.gitlab.io/page')?.id).toBe('gitlab')
    expect(detectService('https://ru.stackoverflow.com/users/1')?.id).toBe('stackOverflow')
  })

  it('recognises short links', () => {
    expect(detectService('https://t.me/durov')?.id).toBe('telegram')
    expect(detectService('t.me/durov')?.id).toBe('telegram')
    expect(detectService('https://youtu.be/abc')?.id).toBe('youtube')
    expect(detectService('https://redd.it/abc')?.id).toBe('reddit')
  })

  it('keeps http and https apart from the host match', () => {
    expect(detectService('http://github.com/user')?.id).toBe('github')
  })

  it('does not confuse a lookalike host for the real one', () => {
    expect(detectService('https://github.com.evil.example/user')).toBeNull()
    expect(detectService('https://notgithub.com/user')).toBeNull()
    expect(detectService('https://mygithub.com/user')).toBeNull()
  })

  it('returns null for an unknown domain rather than failing', () => {
    expect(detectService('https://example.org/me')).toBeNull()
    expect(detectService('https://some.personal.site')).toBeNull()
  })
})

describe('normalizeLinkUrl: schemes', () => {
  it('rejects schemes a browser must not follow', () => {
    expect(normalizeLinkUrl('javascript:alert(1)')).toBeNull()
    expect(normalizeLinkUrl('JavaScript:alert(1)')).toBeNull()
    expect(normalizeLinkUrl('data:text/html;base64,PHN2Zz4=')).toBeNull()
    expect(normalizeLinkUrl('vbscript:msgbox(1)')).toBeNull()
    expect(normalizeLinkUrl('file:///etc/passwd')).toBeNull()
  })

  it('rejects a blank or unparsable address', () => {
    expect(normalizeLinkUrl('')).toBeNull()
    expect(normalizeLinkUrl('   ')).toBeNull()
    expect(normalizeLinkUrl('https://')).toBeNull()
  })

  it('does not treat a relative path or bare word as an address', () => {
    expect(normalizeLinkUrl('/events/42')).toBeNull()
    expect(normalizeLinkUrl('ask me on the chat')).toBeNull()
    expect(normalizeLinkUrl('localhost')).toBeNull()
    expect(normalizeLinkUrl('/')).toBeNull()
  })

  it('accepts http and https', () => {
    expect(normalizeLinkUrl('https://example.org')?.protocol).toBe('https:')
    expect(normalizeLinkUrl('http://example.org')?.protocol).toBe('http:')
  })

  it('assumes https for a schemeless address', () => {
    expect(normalizeLinkUrl('example.org/path')?.protocol).toBe('https:')
  })

  it('rejects a blocked scheme that still parses with a real host', () => {
    expect(normalizeLinkUrl('javascript://github.com/%0aalert(1)')).toBeNull()
    expect(normalizeLinkUrl('data://github.com/x')).toBeNull()
    expect(normalizeLinkUrl('vbscript://github.com/x')).toBeNull()
    expect(normalizeLinkUrl('file://github.com/x')).toBeNull()
  })

  it('never detects a service behind a blocked scheme', () => {
    expect(detectService('javascript://github.com/%0aalert(1)')).toBeNull()
    expect(detectService('data://github.com/x')).toBeNull()
    expect(detectService('javascript:alert(1)')).toBeNull()
  })
})

describe('linkHostname', () => {
  it('strips www and lowercases', () => {
    expect(linkHostname('https://WWW.Example.ORG/path')).toBe('example.org')
  })

  it('returns null when there is no host', () => {
    expect(linkHostname('javascript:void(0)')).toBeNull()
  })
})

describe('service registry', () => {
  it('has a glyph for every service', () => {
    for (const service of SERVICES) {
      expect(SERVICE_GLYPHS[service.id]).toBeDefined()
      expect(SERVICE_GLYPHS[service.id].path.length).toBeGreaterThan(0)
    }
  })

  it('has no glyph without a service', () => {
    const ids = new Set<ServiceId>(SERVICES.map((s) => s.id))
    for (const id of Object.keys(SERVICE_GLYPHS) as ServiceId[]) {
      expect(ids.has(id)).toBe(true)
    }
  })

  it('never maps one domain to two services', () => {
    const seen = new Map<string, ServiceId>()
    for (const service of SERVICES) {
      for (const domain of service.domains) {
        expect(seen.has(domain)).toBe(false)
        seen.set(domain, service.id)
      }
    }
  })
})
