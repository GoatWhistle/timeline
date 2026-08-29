import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SERVICE_GLYPHS } from '@/shared/ui/navigation/service-link/service-glyphs'
import { ServiceIcon, serviceLabel } from '@/shared/ui/navigation/service-link/service-icon'
import { SERVICES } from '@/shared/ui/navigation/service-link/service-registry'

describe('ServiceIcon', () => {
  it('draws the mark of a recognised service', () => {
    const { container } = render(<ServiceIcon href="https://github.com/ivan" />)
    const path = container.querySelector('path')
    expect(path?.getAttribute('d')).toBe(SERVICE_GLYPHS.github.path)
  })

  it('falls back to a plain link mark for an unknown domain, without failing', () => {
    const { container } = render(<ServiceIcon href="https://example.org/me" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(container.querySelector('path')?.getAttribute('d')).not.toBe(SERVICE_GLYPHS.github.path)
  })

  it('falls back for an address the browser must not open', () => {
    const hostile = ['java', 'script:alert(1)'].join('')
    const { container } = render(<ServiceIcon href={hostile} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('is hidden from assistive technology, the text beside it carries the name', () => {
    const { container } = render(<ServiceIcon href="https://github.com/ivan" />)
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('inherits the surrounding colour so it works in both themes', () => {
    const { container } = render(<ServiceIcon href="https://github.com/ivan" />)
    expect(container.querySelector('svg')?.getAttribute('fill')).toBe('currentColor')
  })

  it('carries no hard-coded brand colour in any vendored mark', () => {
    for (const [id, glyph] of Object.entries(SERVICE_GLYPHS)) {
      expect(glyph.path, id).not.toMatch(/#[0-9a-f]{3,8}/i)
    }
  })
})

describe('serviceLabel', () => {
  it('names a recognised service', () => {
    expect(serviceLabel('https://t.me/ivan')).toBe('Telegram')
    expect(serviceLabel('github.com/ivan')).toBe('GitHub')
  })

  it('returns null for an unknown or unusable address', () => {
    expect(serviceLabel('https://example.org')).toBeNull()
    expect(serviceLabel('javascript:alert(1)')).toBeNull()
  })

  it('names every registered service', () => {
    for (const service of SERVICES) {
      expect(serviceLabel(`https://${service.domains[0]}/x`), service.id).toBe(service.label)
    }
  })
})
