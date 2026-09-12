import { render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { usePageMeta } from '@/shared/hooks/use-page-meta/use-page-meta'

function Probe({
  title,
  description,
  image,
}: {
  title: string
  description?: string
  image?: string
}) {
  usePageMeta({ title, description, image })
  return null
}

function metaContent(attribute: 'name' | 'property', key: string): string | null {
  return document.head.querySelector(`meta[${attribute}="${key}"]`)?.getAttribute('content') ?? null
}

afterEach(() => {
  document.title = ''
  for (const tag of document.head.querySelectorAll('meta[property], meta[name="description"]')) {
    tag.remove()
  }
})

describe('usePageMeta', () => {
  it('sets the document title and og tags', () => {
    render(<Probe title="Jane Smith (@jsmith)" description="Backend developer" />)
    expect(document.title).toBe('Jane Smith (@jsmith)')
    expect(metaContent('property', 'og:title')).toBe('Jane Smith (@jsmith)')
    expect(metaContent('property', 'og:description')).toBe('Backend developer')
    expect(metaContent('name', 'description')).toBe('Backend developer')
  })

  it('sets og:image only when an image is given', () => {
    render(<Probe title="No avatar" />)
    expect(metaContent('property', 'og:image')).toBeNull()
  })

  it('restores the previous title and removes tags it created on unmount', () => {
    document.title = 'Timeline'
    const { unmount } = render(<Probe title="Jane Smith" description="Bio" image="/a.png" />)
    expect(document.title).toBe('Jane Smith')
    unmount()
    expect(document.title).toBe('Timeline')
    expect(metaContent('property', 'og:title')).toBeNull()
    expect(metaContent('property', 'og:description')).toBeNull()
    expect(metaContent('property', 'og:image')).toBeNull()
  })

  it('restores a pre-existing tag value instead of removing it', () => {
    const existing = document.createElement('meta')
    existing.setAttribute('property', 'og:title')
    existing.setAttribute('content', 'Timeline')
    document.head.appendChild(existing)

    const { unmount } = render(<Probe title="Jane Smith" />)
    expect(metaContent('property', 'og:title')).toBe('Jane Smith')
    unmount()
    expect(metaContent('property', 'og:title')).toBe('Timeline')
  })
})
