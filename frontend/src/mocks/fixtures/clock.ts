export const HOUR = 60 * 60 * 1000
export const DAY = 24 * HOUR

const now = Date.now()
export const at = (offsetDays: number, hours = 0): string =>
  new Date(now + offsetDays * DAY + hours * HOUR).toISOString()
