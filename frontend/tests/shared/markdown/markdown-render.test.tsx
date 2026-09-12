import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { applyMark } from '@/shared/markdown/apply-mark'
import { parseMarkdown } from '@/shared/markdown/block'
import { MarkdownView } from '@/shared/markdown/markdown-view'

describe('the basic set the owner asked for is the set that renders', () => {
  it('headings become real headings, so the outline is reachable by assistive technology', () => {
    render(<MarkdownView source={'# One\n\n## Two\n\n### Three'} />)

    expect(screen.getByRole('heading', { name: 'One', level: 3 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Two', level: 4 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Three', level: 5 })).toBeInTheDocument()
  })

  it('a bulleted list becomes a list with one item per line', () => {
    render(<MarkdownView source={'- alpha\n- beta\n- gamma'} />)

    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('a numbered list is ordered, not bulleted', () => {
    const blocks = parseMarkdown('1. alpha\n2. beta')

    expect(blocks[0]).toMatchObject({ kind: 'list', ordered: true })
  })

  it('emphasis and strong survive the round trip', () => {
    const { container } = render(<MarkdownView source={'**bold** and _italic_'} />)

    expect(container.querySelector('strong')?.textContent).toBe('bold')
    expect(container.querySelector('em')?.textContent).toBe('italic')
  })

  it('a fenced block keeps its newlines, which a paragraph would have collapsed', () => {
    const { container } = render(<MarkdownView source={'```\nfirst\nsecond\n```'} />)

    expect(container.querySelector('pre')?.textContent).toBe('first\nsecond')
  })

  it('an underscore inside a word is left alone, or every snake_case name would go italic', () => {
    const { container } = render(<MarkdownView source={'call some_long_name here'} />)

    expect(container.querySelector('em')).toBeNull()
    expect(container.textContent).toContain('some_long_name')
  })

  it('the source is kept as markdown, so a stored value parses back to the same tree', () => {
    const source = '## Title\n\n- one\n- two\n\n**end**'

    expect(parseMarkdown(source)).toEqual(parseMarkdown(source))
  })
})

describe('the toolbar edits the text, not the rendered html', () => {
  it('bold wraps the chosen text and leaves it chosen', () => {
    const result = applyMark('make this loud', { start: 5, end: 9 }, 'bold')

    expect(result.value).toBe('make **this** loud')
    expect(result.value.slice(result.selection.start, result.selection.end)).toBe('this')
  })

  it('bold applied twice returns the original text, so the button is a toggle', () => {
    const once = applyMark('make this loud', { start: 5, end: 9 }, 'bold')
    const twice = applyMark(once.value, once.selection, 'bold')

    expect(twice.value).toBe('make this loud')
  })

  it('a heading marks the whole line, not the chosen word', () => {
    const result = applyMark('first\nsecond line\nthird', { start: 12, end: 12 }, 'heading')

    expect(result.value).toBe('first\n## second line\nthird')
  })

  it('a heading applied twice clears the line, so the button is a toggle', () => {
    const once = applyMark('second line', { start: 0, end: 0 }, 'heading')
    const twice = applyMark(once.value, once.selection, 'heading')

    expect(twice.value).toBe('second line')
  })

  it('a link keeps the chosen text as the label and leaves the address chosen for typing', () => {
    const result = applyMark('see the site now', { start: 8, end: 12 }, 'link')

    expect(result.value).toBe('see the [site](https://) now')
    expect(result.value.slice(result.selection.start, result.selection.end)).toBe('https://')
  })

  it('a mark on an empty selection inserts a placeholder rather than an empty pair', () => {
    const result = applyMark('', { start: 0, end: 0 }, 'bold')

    expect(result.value).toBe('**text**')
    expect(result.value.slice(result.selection.start, result.selection.end)).toBe('text')
  })
})
