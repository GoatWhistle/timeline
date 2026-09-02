import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Badge } from '@/shared/ui/primitives/badge'

const LONG_LABEL = 'Not on the roster for this hackathon yet'

function classesOf(container: HTMLElement): string[] {
  const badge = container.firstElementChild
  if (!badge) throw new Error('the badge did not render')
  return badge.className.split(/\s+/)
}

describe('a badge keeps one line whatever the translation gives it', () => {
  it('renders the text it is handed', () => {
    const { container } = render(<Badge>{LONG_LABEL}</Badge>)
    expect(container.textContent).toBe(LONG_LABEL)
  })

  it('refuses to wrap, so a long label cannot grow it into a block', () => {
    const { container } = render(<Badge>{LONG_LABEL}</Badge>)
    expect(classesOf(container)).toContain('whitespace-nowrap')
  })

  it('sizes itself to its content rather than stretching to its cell', () => {
    const { container } = render(<Badge>{LONG_LABEL}</Badge>)
    expect(classesOf(container)).toContain('w-fit')
  })

  it('holds that shape in every tone', () => {
    for (const tone of ['neutral', 'outline', 'primary', 'danger'] as const) {
      const { container } = render(<Badge tone={tone}>{LONG_LABEL}</Badge>)
      const classes = classesOf(container)
      expect(classes).toContain('whitespace-nowrap')
      expect(classes).toContain('w-fit')
    }
  })

  it('gives a short and a long label the same set of shape classes', () => {
    const shape = (text: string) =>
      classesOf(render(<Badge>{text}</Badge>).container)
        .filter((token) => !token.startsWith('bg-') && !token.startsWith('text-'))
        .sort()
        .join(' ')

    expect(shape(LONG_LABEL)).toBe(shape('Yes'))
  })
})
