import { browserTimeZone, isTimeZone, SYSTEM_TIME_ZONE } from '@/shared/datetime/datetime'

export const COMMON_ZONES = [
  'Europe/Kaliningrad',
  'Europe/Moscow',
  'Europe/Samara',
  'Europe/Minsk',
  'Europe/Kyiv',
  'Europe/London',
  'Europe/Lisbon',
  'Europe/Berlin',
  'Europe/Paris',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Warsaw',
  'Europe/Prague',
  'Europe/Belgrade',
  'Europe/Athens',
  'Europe/Bucharest',
  'Europe/Helsinki',
  'Europe/Istanbul',
  'Asia/Yekaterinburg',
  'Asia/Omsk',
  'Asia/Novosibirsk',
  'Asia/Krasnoyarsk',
  'Asia/Irkutsk',
  'Asia/Yakutsk',
  'Asia/Vladivostok',
  'Asia/Magadan',
  'Asia/Kamchatka',
  'Asia/Yerevan',
  'Asia/Baku',
  'Asia/Tbilisi',
  'Asia/Almaty',
  'Asia/Tashkent',
  'Asia/Bishkek',
  'Asia/Dubai',
  'Asia/Tehran',
  'Asia/Jerusalem',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Jakarta',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Seoul',
  'Asia/Tokyo',
  'America/New_York',
  'America/Toronto',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Vancouver',
  'America/Mexico_City',
  'America/Bogota',
  'America/Lima',
  'America/Santiago',
  'America/Sao_Paulo',
  'America/Buenos_Aires',
  'Africa/Cairo',
  'Africa/Lagos',
  'Africa/Nairobi',
  'Africa/Johannesburg',
  'Australia/Perth',
  'Australia/Brisbane',
  'Australia/Sydney',
  'Pacific/Auckland',
  'UTC',
]

export function offsetOf(zone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: zone,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date())
    const raw = parts.find((part) => part.type === 'timeZoneName')?.value ?? ''
    return raw.replace('GMT', 'UTC') || 'UTC'
  } catch {
    return ''
  }
}

export function offsetMinutes(zone: string): number {
  const label = offsetOf(zone).replace('UTC', '')
  if (label === '') return 0
  const [hours = '0', minutes = '0'] = label.replace(/[+-]/, '').split(':')
  const magnitude = Number(hours) * 60 + Number(minutes)
  return label.startsWith('-') ? -magnitude : magnitude
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

export function groupByRegion(zones: string[]): { region: string; zones: string[] }[] {
  const groups = new Map<string, string[]>()
  for (const zone of zones) {
    const region = regionOf(zone) || 'UTC'
    const bucket = groups.get(region)
    if (bucket) bucket.push(zone)
    else groups.set(region, [zone])
  }
  return [...groups.entries()]
    .map(([region, list]) => ({
      region,
      zones: list.sort((a, b) => offsetMinutes(a) - offsetMinutes(b) || a.localeCompare(b)),
    }))
    .sort((a, b) => a.region.localeCompare(b.region))
}

export function matchesQuery(zone: string, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (needle === '') return true
  return `${cityOf(zone)} ${regionOf(zone)} ${zone} ${offsetOf(zone)}`
    .toLowerCase()
    .includes(needle)
}
