export type CountdownGranularity = 'days' | 'hours' | 'minutes' | 'seconds' | 'past'

export type Countdown = {
  granularity: CountdownGranularity
  days: number
  hours: number
  minutes: number
  seconds: number
  totalMs: number
}

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export function countdownTo(
  iso: string | null | undefined,
  now: Date = new Date(),
): Countdown | null {
  if (!iso) return null
  const target = Date.parse(iso)
  if (Number.isNaN(target)) return null

  const totalMs = target - now.getTime()
  const absolute = Math.abs(totalMs)

  return {
    granularity: granularityFor(totalMs, absolute),
    days: Math.floor(absolute / DAY),
    hours: Math.floor((absolute % DAY) / HOUR),
    minutes: Math.floor((absolute % HOUR) / MINUTE),
    seconds: Math.floor((absolute % MINUTE) / SECOND),
    totalMs,
  }
}

function granularityFor(totalMs: number, absolute: number): CountdownGranularity {
  if (totalMs <= 0) return 'past'
  if (absolute >= DAY) return 'days'
  if (absolute >= HOUR) return 'hours'
  if (absolute >= MINUTE) return 'minutes'
  return 'seconds'
}

export function countdownTickMs(granularity: CountdownGranularity): number {
  switch (granularity) {
    case 'seconds':
      return SECOND
    case 'minutes':
      return SECOND
    case 'hours':
      return MINUTE
    default:
      return MINUTE
  }
}
