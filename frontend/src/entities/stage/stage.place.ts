import { Globe, MapPin, Users } from 'lucide-react'
import type * as React from 'react'
import type { EventFormat, Place } from '@/shared/api/types.gen'

export const EVENT_FORMAT_KEY: Record<EventFormat, string> = {
  ONLINE: 'event:place.format.ONLINE',
  OFFLINE: 'event:place.format.OFFLINE',
  HYBRID: 'event:place.format.HYBRID',
}

export const EVENT_FORMAT_ICON: Record<EventFormat, React.ComponentType<{ className?: string }>> = {
  ONLINE: Globe,
  OFFLINE: MapPin,
  HYBRID: Users,
}

export function isOffline(place: Place): boolean {
  return place.format !== 'ONLINE'
}

export function placeCity(place: Place): string | undefined {
  return isOffline(place) ? place.city : undefined
}

export function placeLabel(place: Place, onlineLabel: string): string {
  if (!isOffline(place)) return onlineLabel
  return [place.city, place.venue].filter(Boolean).join(', ') || onlineLabel
}
