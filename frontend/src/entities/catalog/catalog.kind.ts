import { Laptop, Martini } from 'lucide-react'
import type * as React from 'react'
import type { EventKind } from '@/shared/api/types.gen'

export const EVENT_KIND_ICON: Record<EventKind, React.ComponentType<{ className?: string }>> = {
  HACKATHON: Laptop,
  MEETUP: Martini,
}

export const EVENT_KIND_KEY: Record<EventKind, string> = {
  HACKATHON: 'event:catalog.kindLabel.HACKATHON',
  MEETUP: 'event:catalog.kindLabel.MEETUP',
}
