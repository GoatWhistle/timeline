import { describe, expect, it } from 'vitest'
import { markdownPreview, markdownToPlainText } from '@/features/inbox/markdown-preview'

describe('markdownToPlainText', () => {
  it('strips emphasis markers', () => {
    expect(markdownToPlainText('**Deadline:** *tomorrow*')).toBe('Deadline: tomorrow')
  })

  it('keeps link text and drops the URL', () => {
    expect(markdownToPlainText('See [the event](https://example.com/e)')).toBe('See the event')
  })

  it('drops heading and list markers', () => {
    expect(markdownToPlainText('# Title\n- one\n- two')).toBe('Title one two')
  })

  it('collapses blank lines into single spaces', () => {
    expect(markdownToPlainText('line one\n\n\nline two')).toBe('line one line two')
  })
})

describe('markdownPreview', () => {
  it('returns the plain text unchanged when short enough', () => {
    expect(markdownPreview('**Short** body')).toBe('Short body')
  })

  it('truncates with an ellipsis past the max length', () => {
    const long = 'word '.repeat(40).trim()
    const preview = markdownPreview(long, 20)
    expect(preview.endsWith('…')).toBe(true)
    expect(preview.length).toBeLessThanOrEqual(21)
  })

  it('keeps text exactly at the max length unchanged', () => {
    const exact = 'a'.repeat(20)
    expect(markdownPreview(exact, 20)).toBe(exact)
  })
})
