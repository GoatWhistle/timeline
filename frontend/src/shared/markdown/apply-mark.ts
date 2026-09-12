export type MarkName = 'bold' | 'italic' | 'heading' | 'bullet' | 'ordered' | 'link' | 'code'

export type Selection = { start: number; end: number }

export type MarkResult = { value: string; selection: Selection }

type Wrap = { token: string; placeholder: string }

const WRAPS: Record<'bold' | 'italic' | 'code', Wrap> = {
  bold: { token: '**', placeholder: 'text' },
  italic: { token: '_', placeholder: 'text' },
  code: { token: '`', placeholder: 'code' },
}

const PREFIXES: Record<'heading' | 'bullet' | 'ordered', string> = {
  heading: '## ',
  bullet: '- ',
  ordered: '1. ',
}

function lineBounds(value: string, at: number): Selection {
  const start = value.lastIndexOf('\n', at - 1) + 1
  const found = value.indexOf('\n', at)
  return { start, end: found === -1 ? value.length : found }
}

function toggleWrap(value: string, selection: Selection, wrap: Wrap): MarkResult {
  const { token, placeholder } = wrap
  const chosen = value.slice(selection.start, selection.end)
  const before = value.slice(0, selection.start)
  const after = value.slice(selection.end)

  if (chosen.length >= token.length * 2 && chosen.startsWith(token) && chosen.endsWith(token)) {
    const inner = chosen.slice(token.length, chosen.length - token.length)
    return {
      value: before + inner + after,
      selection: { start: selection.start, end: selection.start + inner.length },
    }
  }

  if (before.endsWith(token) && after.startsWith(token)) {
    const trimmed = before.slice(0, before.length - token.length)
    return {
      value: trimmed + chosen + after.slice(token.length),
      selection: { start: trimmed.length, end: trimmed.length + chosen.length },
    }
  }

  const body = chosen === '' ? placeholder : chosen
  return {
    value: `${before}${token}${body}${token}${after}`,
    selection: {
      start: selection.start + token.length,
      end: selection.start + token.length + body.length,
    },
  }
}

function togglePrefix(value: string, selection: Selection, prefix: string): MarkResult {
  const bounds = lineBounds(value, selection.start)
  const line = value.slice(bounds.start, bounds.end)
  const before = value.slice(0, bounds.start)
  const after = value.slice(bounds.end)

  if (line.startsWith(prefix)) {
    const stripped = line.slice(prefix.length)
    return {
      value: before + stripped + after,
      selection: {
        start: Math.max(bounds.start, selection.start - prefix.length),
        end: Math.max(bounds.start, selection.end - prefix.length),
      },
    }
  }

  return {
    value: before + prefix + line + after,
    selection: { start: selection.start + prefix.length, end: selection.end + prefix.length },
  }
}

export function applyMark(value: string, selection: Selection, mark: MarkName): MarkResult {
  const safe: Selection = {
    start: Math.min(selection.start, selection.end),
    end: Math.max(selection.start, selection.end),
  }

  if (mark === 'bold' || mark === 'italic' || mark === 'code') {
    return toggleWrap(value, safe, WRAPS[mark])
  }

  if (mark === 'link') {
    const chosen = value.slice(safe.start, safe.end)
    const label = chosen === '' ? 'text' : chosen
    const before = value.slice(0, safe.start)
    const after = value.slice(safe.end)
    const head = `${before}[${label}](`
    return {
      value: `${head}https://)${after}`,
      selection: { start: head.length, end: head.length + 'https://'.length },
    }
  }

  return togglePrefix(value, safe, PREFIXES[mark])
}
