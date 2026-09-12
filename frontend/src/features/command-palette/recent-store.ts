export type RecentEntry = {
  id: string
  title: string
  path: string
}

const STORAGE_KEY = 'timeline-palette-recent'
const LIMIT = 5

function read(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (entry): entry is RecentEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as RecentEntry).id === 'string' &&
        typeof (entry as RecentEntry).title === 'string' &&
        typeof (entry as RecentEntry).path === 'string',
    )
  } catch {
    return []
  }
}

function write(entries: RecentEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    return
  }
}

export function readRecent(): RecentEntry[] {
  return read()
}

export function pushRecent(entry: RecentEntry): RecentEntry[] {
  const withoutDuplicate = read().filter((existing) => existing.id !== entry.id)
  const next = [entry, ...withoutDuplicate].slice(0, LIMIT)
  write(next)
  return next
}

export function clearRecent(): void {
  write([])
}
