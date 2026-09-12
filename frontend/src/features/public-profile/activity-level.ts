export type ActivityLevel = 0 | 1 | 2 | 3

export function activityLevel(count: number, max: number): ActivityLevel {
  if (count <= 0 || max <= 0) return 0
  const ratio = count / max
  if (ratio <= 1 / 3) return 1
  if (ratio <= 2 / 3) return 2
  return 3
}

export function maxMonthlyCount(counts: readonly number[]): number {
  return counts.reduce((max, value) => (value > max ? value : max), 0)
}
