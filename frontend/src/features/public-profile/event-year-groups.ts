import type { PublicProfileEvent } from '@/shared/api/types.gen'

export type YearGroup = {
  year: number
  events: PublicProfileEvent[]
}

export function groupEventsByYear(events: PublicProfileEvent[]): YearGroup[] {
  const byYear = new Map<number, PublicProfileEvent[]>()
  for (const event of events) {
    const year = new Date(event.start_at).getFullYear()
    const bucket = byYear.get(year)
    if (bucket) bucket.push(event)
    else byYear.set(year, [event])
  }

  return [...byYear.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, group]) => ({
      year,
      events: [...group].sort(
        (a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime(),
      ),
    }))
}

export function distinctTeamNames(events: PublicProfileEvent[]): string[] {
  const seen = new Set<string>()
  for (const event of events) {
    if (event.team_name) seen.add(event.team_name)
  }
  return [...seen]
}
