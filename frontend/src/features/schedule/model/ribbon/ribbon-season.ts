export type Season = 'winter' | 'spring' | 'summer' | 'autumn'

export const SEASONS: Season[] = ['winter', 'spring', 'summer', 'autumn']

export const SEASON_KEY: Record<Season, string> = {
  winter: 'schedule.seasonWinter',
  spring: 'schedule.seasonSpring',
  summer: 'schedule.seasonSummer',
  autumn: 'schedule.seasonAutumn',
}

export const SEASON_MARK: Record<Season, string> = {
  winter: '❄',
  spring: '✿',
  summer: '☀',
  autumn: '☂',
}

const BY_MONTH: Season[] = [
  'winter',
  'winter',
  'spring',
  'spring',
  'spring',
  'summer',
  'summer',
  'summer',
  'autumn',
  'autumn',
  'autumn',
  'winter',
]

export function seasonOf(date: Date): Season {
  return BY_MONTH[date.getMonth()] ?? 'winter'
}

export function isSeason(value: unknown): value is Season {
  return SEASONS.includes(value as Season)
}

export type SeasonBand = {
  key: string
  season: Season
  startDay: number
  dayCount: number
  year: number
}

export function seasonBands(start: Date, dayCount: number): SeasonBand[] {
  const bands: SeasonBand[] = []

  for (let index = 0; index < dayCount; index += 1) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
    const season = seasonOf(date)
    const year = seasonYear(date, season)
    const last = bands[bands.length - 1]

    if (last && last.season === season && last.year === year) {
      last.dayCount += 1
      continue
    }

    bands.push({
      key: `${season}-${year}-${index}`,
      season,
      startDay: index,
      dayCount: 1,
      year,
    })
  }

  return bands
}

export function bandAtDay(bands: readonly SeasonBand[], day: number): SeasonBand | undefined {
  for (const band of bands) {
    if (day >= band.startDay && day < band.startDay + band.dayCount) return band
  }
  return undefined
}

export function seasonYear(date: Date, season: Season = seasonOf(date)): number {
  if (season !== 'winter') return date.getFullYear()
  return date.getMonth() === 11 ? date.getFullYear() + 1 : date.getFullYear()
}
