import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { parseMarkdown } from '@/shared/markdown/block'
import { parseInline } from '@/shared/markdown/inline'
import {
  MARKDOWN_MAX_LENGTH,
  MARKDOWN_MAX_LINES,
  MARKDOWN_MAX_LIST_DEPTH,
} from '@/shared/markdown/limits'
import { MarkdownView } from '@/shared/markdown/markdown-view'

function hrefs(nodes: ReturnType<typeof parseInline>): string[] {
  return nodes.flatMap((node) => {
    if (node.kind === 'link') return [node.href, ...hrefs(node.children)]
    if (node.kind === 'strong' || node.kind === 'emphasis') return hrefs(node.children)
    return []
  })
}

describe('markdown is rendered as elements, so raw html can never become markup', () => {
  it('a script tag written in a description stays text and never reaches the document', () => {
    const { container } = render(
      <MarkdownView source={'hello <script>window.stolen = 1</script> world'} />,
    )

    expect(container.querySelector('script')).toBeNull()
    expect(container.textContent).toContain('<script>window.stolen = 1</script>')
  })

  it('an img with an inline handler stays text, so no event handler is ever attached', () => {
    const { container } = render(<MarkdownView source={'<img src=x onerror="alert(1)">'} />)

    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('[onerror]')).toBeNull()
    expect(container.innerHTML).toContain('&lt;img')
    expect(container.textContent).toContain('<img src=x onerror="alert(1)">')
  })

  it('a javascript: link is refused and its label is kept as plain text', () => {
    const nodes = parseInline('[click me](javascript:alert(1))')

    expect(hrefs(nodes)).toEqual([])
    expect(nodes.map((node) => (node.kind === 'text' ? node.value : '')).join('')).toBe(
      '[click me](javascript:alert(1))',
    )
  })

  it('a data: link is refused, because data urls carry markup of their own', () => {
    const nodes = parseInline('[x](data:text/html;base64,PHNjcmlwdD4=)')

    expect(hrefs(nodes)).toEqual([])
  })

  it('an https link survives and renders with both noopener and noreferrer', () => {
    render(<MarkdownView source={'[site](https://example.com/a)'} />)
    const anchor = screen.getByRole('link', { name: /site/ })

    expect(anchor).toHaveAttribute('href', 'https://example.com/a')
    expect(anchor).toHaveAttribute('rel', 'noopener noreferrer')
    expect(anchor).toHaveAttribute('target', '_blank')
  })

  it('no image is ever produced, the content policy allowing only self and data', () => {
    const { container } = render(<MarkdownView source={'![alt](https://example.com/a.png)'} />)

    expect(container.querySelector('img')).toBeNull()
  })
})

describe('markdown has bounds, so one pasted paragraph cannot take the page down', () => {
  it('input beyond the length limit is dropped rather than parsed', () => {
    const blocks = parseMarkdown('a'.repeat(MARKDOWN_MAX_LENGTH + 5000))
    const text = blocks
      .flatMap((block) => (block.kind === 'paragraph' ? block.children : []))
      .map((node) => (node.kind === 'text' ? node.value : ''))
      .join('')

    expect(text.length).toBeLessThanOrEqual(MARKDOWN_MAX_LENGTH)
  })

  it('input beyond the line limit is dropped rather than parsed', () => {
    const blocks = parseMarkdown(
      Array.from({ length: MARKDOWN_MAX_LINES + 200 }, (_, index) => `line ${index}`).join('\n\n'),
    )

    expect(blocks.length).toBeLessThanOrEqual(MARKDOWN_MAX_LINES)
  })

  it('list nesting is clamped, so deep indentation cannot grow the tree without end', () => {
    const source = Array.from(
      { length: 12 },
      (_, index) => `${' '.repeat(index * 2)}- item ${index}`,
    ).join('\n')
    const blocks = parseMarkdown(source)
    const list = blocks.find((block) => block.kind === 'list')

    expect(list?.kind).toBe('list')
    if (list?.kind !== 'list') return
    for (const item of list.items) {
      expect(item.depth).toBeLessThanOrEqual(MARKDOWN_MAX_LIST_DEPTH - 1)
    }
  })

  it('an unterminated emphasis run does not hang the parser', () => {
    const nodes = parseInline('*'.repeat(2000))

    expect(Array.isArray(nodes)).toBe(true)
  })
})
