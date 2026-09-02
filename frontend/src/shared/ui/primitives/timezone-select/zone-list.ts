import { browserTimeZone, isTimeZone, SYSTEM_TIME_ZONE } from '@/shared/datetime/datetime'

export const COMMON_ZONES = [
  'Europe/Moscow',
  'Europe/Kaliningrad',
  'Europe/Samara',
  'Asia/Yekaterinburg',
  'Asia/Omsk',
  'Asia/Krasnoyarsk',
  'Asia/Irkutsk',
  'Asia/Yakutsk',
  'Asia/Vladivostok',
  'Asia/Magadan',
  'Asia/Kamchatka',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Lisbon',
  'Europe/Belgrade',
  'Asia/Yerevan',
  'Asia/Tbilisi',
  'Asia/Almaty',
  'Asia/Dubai',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Australia/Sydney',
  'UTC',
]

export function offsetOf(zone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: zone,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date())
    return parts.find((part) => part.type === 'timeZoneName')?.value ?? ''
  } catch {
    return ''
  }
}

export function clockIn(zone: string, at: Date): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: zone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(at)
  } catch {
    return ''
  }
}

export function cityOf(zone: string): string {
  const tail = zone.split('/').pop() ?? zone
  return tail.replace(/_/g, ' ')
}

export function regionOf(zone: string): string {
  const [region] = zone.split('/')
  return zone.includes('/') && region ? region.replace(/_/g, ' ') : ''
}

export function zoneOptions(current: string | null | undefined): string[] {
  const zones = new Set(COMMON_ZONES)
  const detected = browserTimeZone()
  if (isTimeZone(detected)) zones.add(detected)
  if (isTimeZone(current)) zones.add(current)
  zones.add(SYSTEM_TIME_ZONE)
  return [...zones].sort((a, b) => a.localeCompare(b))
}

export function matchesQuery(zone: string, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (needle === '') return true
  return `${cityOf(zone)} ${regionOf(zone)} ${zone} ${offsetOf(zone)}`
    .toLowerCase()
    .includes(needle)
}
