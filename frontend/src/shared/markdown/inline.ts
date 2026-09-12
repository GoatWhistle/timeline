import { isRenderableLink } from '@/shared/ui/navigation/external-link/external-url'
import { MARKDOWN_MAX_INLINE_NODES } from './limits'

export type InlineNode =
  | { kind: 'text'; value: string }
  | { kind: 'strong'; children: InlineNode[] }
  | { kind: 'emphasis'; children: InlineNode[] }
  | { kind: 'code'; value: string }
  | { kind: 'link'; href: string; children: InlineNode[] }

type Marker = { token: string; kind: 'strong' | 'emphasis'; wordBound: boolean }

const MARKERS: Marker[] = [
  { token: '**', kind: 'strong', wordBound: false },
  { token: '__', kind: 'strong', wordBound: true },
  { token: '*', kind: 'emphasis', wordBound: false },
  { token: '_', kind: 'emphasis', wordBound: true },
]

const WORD = /[\p{L}\p{N}]/u

const LINK = /^\[([^\]\n]*)\]\(([^\s)]*(?:\([^\s)]*\)[^\s)]*)*)\)/

function pushText(nodes: InlineNode[], value: string): void {
  if (value === '') return
  const last = nodes[nodes.length - 1]
  if (last && last.kind === 'text') last.value += value
  else nodes.push({ kind: 'text', value })
}

function codeSpan(source: string, at: number): { value: string; end: number } | null {
  let fence = 0
  while (source[at + fence] === '`') fence += 1
  const open = '`'.repeat(fence)
  const close = source.indexOf(open, at + fence)
  if (close === -1) return null
  if (source[close + fence] === '`') return null
  const raw = source.slice(at + fence, close)
  const value = raw.length > 1 && raw.startsWith(' ') && raw.endsWith(' ') ? raw.slice(1, -1) : raw
  return { value, end: close + fence }
}

function emphasisSpan(
  source: string,
  at: number,
  marker: Marker,
): { inner: string; end: number } | null {
  const from = at + marker.token.length
  if (source[from] === undefined || /\s/.test(source[from] as string)) return null
  if (marker.wordBound && at > 0 && WORD.test(source[at - 1] as string)) return null

  let search = from
  while (search < source.length) {
    const close = source.indexOf(marker.token, search)
    if (close === -1) return null
    if (close === from) return null
    const before = source[close - 1] as string
    const after = source[close + marker.token.length]
    if (/\s/.test(before) || (marker.wordBound && after !== undefined && WORD.test(after))) {
      search = close + marker.token.length
      continue
    }
    return { inner: source.slice(from, close), end: close + marker.token.length }
  }
  return null
}

export function parseInline(
  source: string,
  budget = { left: MARKDOWN_MAX_INLINE_NODES },
): InlineNode[] {
  const nodes: InlineNode[] = []
  let at = 0
  let plain = ''

  while (at < source.length) {
    if (budget.left <= 0) break
    const char = source[at] as string

    if (char === '\\' && at + 1 < source.length) {
      plain += source[at + 1] as string
      at += 2
      continue
    }

    if (char === '`') {
      const span = codeSpan(source, at)
      if (span) {
        pushText(nodes, plain)
        plain = ''
        budget.left -= 1
        nodes.push({ kind: 'code', value: span.value })
        at = span.end
        continue
      }
    }

    if (char === '[') {
      const match = LINK.exec(source.slice(at))
      if (match) {
        const href = (match[2] ?? '').trim()
        if (isRenderableLink(href)) {
          pushText(nodes, plain)
          plain = ''
          budget.left -= 1
          nodes.push({ kind: 'link', href, children: parseInline(match[1] ?? '', budget) })
          at += match[0].length
          continue
        }
        pushText(nodes, plain + (match[0] as string))
        plain = ''
        at += match[0].length
        continue
      }
    }

    const marker = MARKERS.find((candidate) => source.startsWith(candidate.token, at))
    if (marker) {
      const span = emphasisSpan(source, at, marker)
      if (span) {
        pushText(nodes, plain)
        plain = ''
        budget.left -= 1
        nodes.push({ kind: marker.kind, children: parseInline(span.inner, budget) })
        at = span.end
        continue
      }
    }

    plain += char
    at += 1
  }

  pushText(nodes, plain)
  return nodes
}
