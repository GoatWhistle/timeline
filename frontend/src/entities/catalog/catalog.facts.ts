const DAY_MS = 24 * 60 * 60 * 1000

export function durationDays(startIso: string, endIso: string): number {
  const span = Date.parse(endIso) - Date.parse(startIso)
  if (!Number.isFinite(span) || span <= 0) return 1
  return Math.max(1, Math.ceil(span / DAY_MS))
}
