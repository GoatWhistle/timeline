import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it } from 'vitest'
import { COVER_MAX_BYTES, coverRejectionFor } from '@/features/event-cover/cover-file'
import { CoverMissing } from '@/features/event-cover/cover-missing'
import { EventCover } from '@/features/event-cover/event-cover'
import { i18n } from '@/shared/i18n/config'

function file(name: string, type: string, size: number): File {
  const blob = new Blob([new Uint8Array(size)], { type })
  return new File([blob], name, { type })
}

describe('event cover', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en')
  })

  it('shows the image when a cover exists', () => {
    renderWithProviders(<EventCover coverUrl="/api/v1/covers/a.png" title="AI Hackathon" />)
    const image = screen.getByRole('img', { name: 'Cover of AI Hackathon' })
    expect(image).toHaveAttribute('src', '/api/v1/covers/a.png')
  })

  it('falls back to the placeholder when no cover is set', () => {
    renderWithProviders(<EventCover title="AI Hackathon" />)
    expect(screen.queryByRole('img', { name: 'Cover of AI Hackathon' })).toBeNull()
    expect(screen.getByRole('img', { name: 'No cover' })).toBeInTheDocument()
  })

  it('falls back to the placeholder when the stored file cannot be loaded', () => {
    renderWithProviders(<EventCover coverUrl="/api/v1/covers/gone.png" title="AI Hackathon" />)
    const image = screen.getByRole('img', { name: 'Cover of AI Hackathon' })
    fireEvent.error(image)
    expect(screen.getByRole('img', { name: 'No cover' })).toBeInTheDocument()
  })

  it('keeps the placeholder animation behind motion-safe', () => {
    const { container } = renderWithProviders(<CoverMissing />)
    const spinner = container.querySelector('[class*="animate-"]')
    expect(spinner?.getAttribute('class')).toContain('motion-safe:')
  })

  it('labels the placeholder for assistive technology', () => {
    renderWithProviders(<CoverMissing />)
    expect(screen.getByRole('img', { name: 'No cover' })).toBeInTheDocument()
  })
})

describe('cover file validation', () => {
  it('rejects a type the server would refuse', () => {
    expect(coverRejectionFor(file('a.svg', 'image/svg+xml', 10))).toBe('type')
    expect(coverRejectionFor(file('a.gif', 'image/gif', 10))).toBe('type')
  })

  it('rejects a file over the size limit', () => {
    expect(coverRejectionFor(file('a.png', 'image/png', COVER_MAX_BYTES + 1))).toBe('size')
  })

  it('accepts the supported types within the limit', () => {
    expect(coverRejectionFor(file('a.png', 'image/png', 1024))).toBeNull()
    expect(coverRejectionFor(file('a.jpg', 'image/jpeg', 1024))).toBeNull()
    expect(coverRejectionFor(file('a.webp', 'image/webp', 1024))).toBeNull()
  })
})
