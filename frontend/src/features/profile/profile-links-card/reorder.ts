export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items]
  if (from < 0 || from >= next.length || to < 0 || to >= next.length || from === to) {
    return next
  }
  const moved = next[from] as T
  next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}
