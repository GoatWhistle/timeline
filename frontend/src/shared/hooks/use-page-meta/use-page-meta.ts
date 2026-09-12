import { useEffect } from 'react'

export type PageMeta = {
  title: string
  description?: string
  image?: string
}

function setMetaTag(attribute: 'name' | 'property', key: string, value: string): () => void {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
  const created = tag === null
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attribute, key)
    document.head.appendChild(tag)
  }
  const previous = tag.getAttribute('content')
  tag.setAttribute('content', value)
  return () => {
    if (created) {
      tag?.remove()
    } else if (previous !== null) {
      tag?.setAttribute('content', previous)
    }
  }
}

export function usePageMeta({ title, description, image }: PageMeta): void {
  useEffect(() => {
    const previousTitle = document.title
    document.title = title
    const cleanups = [
      setMetaTag('property', 'og:title', title),
      ...(description ? [setMetaTag('property', 'og:description', description)] : []),
      ...(description ? [setMetaTag('name', 'description', description)] : []),
      ...(image ? [setMetaTag('property', 'og:image', image)] : []),
    ]
    return () => {
      document.title = previousTitle
      for (const cleanup of cleanups) cleanup()
    }
  }, [title, description, image])
}
