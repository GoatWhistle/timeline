import { type InlineNode, parseInline } from './inline'
import {
  MARKDOWN_MAX_INLINE_NODES,
  MARKDOWN_MAX_LENGTH,
  MARKDOWN_MAX_LINES,
  MARKDOWN_MAX_LIST_DEPTH,
} from './limits'

export type ListItem = { children: InlineNode[]; depth: number }

export type BlockNode =
  | { kind: 'heading'; level: 1 | 2 | 3; children: InlineNode[] }
  | { kind: 'paragraph'; children: InlineNode[] }
  | { kind: 'quote'; children: InlineNode[] }
  | { kind: 'code'; value: string }
  | { kind: 'list'; ordered: boolean; items: ListItem[] }
  | { kind: 'rule' }

const HEADING = /^(#{1,3})\s+(.*)$/
const BULLET = /^(\s*)[-*+]\s+(.*)$/
const ORDERED = /^(\s*)\d{1,9}[.)]\s+(.*)$/
const QUOTE = /^\s*>\s?(.*)$/
const RULE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/
const FENCE = /^\s*(?:```|~~~)/

function depthOf(indent: string): number {
  const width = indent.replaceAll('\t', '  ').length
  return Math.min(Math.floor(width / 2), MARKDOWN_MAX_LIST_DEPTH - 1)
}

export function parseMarkdown(source: string): BlockNode[] {
  const text = source.slice(0, MARKDOWN_MAX_LENGTH).replaceAll('\r\n', '\n').replaceAll('\r', '\n')
  const lines = text.split('\n').slice(0, MARKDOWN_MAX_LINES)
  const budget = { left: MARKDOWN_MAX_INLINE_NODES }
  const blocks: BlockNode[] = []
  let at = 0

  while (at < lines.length) {
    const line = lines[at] as string

    if (line.trim() === '') {
      at += 1
      continue
    }

    if (FENCE.test(line)) {
      const body: string[] = []
      at += 1
      while (at < lines.length && !FENCE.test(lines[at] as string)) {
        body.push(lines[at] as string)
        at += 1
      }
      at += 1
      blocks.push({ kind: 'code', value: body.join('\n') })
      continue
    }

    if (RULE.test(line)) {
      blocks.push({ kind: 'rule' })
      at += 1
      continue
    }

    const heading = HEADING.exec(line)
    if (heading) {
      const level = (heading[1] as string).length as 1 | 2 | 3
      blocks.push({ kind: 'heading', level, children: parseInline(heading[2] as string, budget) })
      at += 1
      continue
    }

    const quote = QUOTE.exec(line)
    if (quote) {
      const body: string[] = [quote[1] as string]
      at += 1
      while (at < lines.length) {
        const next = QUOTE.exec(lines[at] as string)
        if (!next) break
        body.push(next[1] as string)
        at += 1
      }
      blocks.push({ kind: 'quote', children: parseInline(body.join(' ').trim(), budget) })
      continue
    }

    const bullet = BULLET.exec(line)
    const ordered = ORDERED.exec(line)
    if (bullet || ordered) {
      const isOrdered = ordered !== null && bullet === null
      const items: ListItem[] = []
      while (at < lines.length) {
        const current = lines[at] as string
        const match = isOrdered ? ORDERED.exec(current) : BULLET.exec(current)
        if (!match) break
        items.push({
          depth: depthOf(match[1] as string),
          children: parseInline(match[2] as string, budget),
        })
        at += 1
      }
      blocks.push({ kind: 'list', ordered: isOrdered, items })
      continue
    }

    const body: string[] = []
    while (at < lines.length) {
      const current = lines[at] as string
      if (
        current.trim() === '' ||
        HEADING.test(current) ||
        BULLET.test(current) ||
        ORDERED.test(current) ||
        QUOTE.test(current) ||
        RULE.test(current) ||
        FENCE.test(current)
      ) {
        break
      }
      body.push(current.trim())
      at += 1
    }
    blocks.push({ kind: 'paragraph', children: parseInline(body.join(' '), budget) })
  }

  return blocks
}
