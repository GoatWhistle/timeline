const MARKUP_PATTERNS: [RegExp, string][] = [
  [/```[\s\S]*?```/g, ' '],
  [/`([^`]+)`/g, '$1'],
  [/!\[[^\]]*\]\([^)]*\)/g, ' '],
  [/\[([^\]]*)\]\([^)]*\)/g, '$1'],
  [/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1'],
  [/^#{1,6}\s+/gm, ''],
  [/^>\s?/gm, ''],
  [/^[-*+]\s+/gm, ''],
  [/^\d+[.)]\s+/gm, ''],
]

export function markdownToPlainText(source: string): string {
  let text = source
  for (const [pattern, replacement] of MARKUP_PATTERNS) {
    text = text.replace(pattern, replacement)
  }
  return text.replaceAll(/\s+/g, ' ').trim()
}

export function markdownPreview(source: string, maxLength = 140): string {
  const plain = markdownToPlainText(source)
  if (plain.length <= maxLength) return plain
  return `${plain.slice(0, maxLength).trimEnd()}…`
}
