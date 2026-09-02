import type { EventColor, EventOrigin } from '@/shared/api/types.gen'

export const EVENT_COLOR_SLOTS = 12

export const EVENT_COLOR_FAMILIES = ['RU', 'WORLD'] as const

export type EventColorFamily = (typeof EVENT_COLOR_FAMILIES)[number]

export type EventColorAttrs = {
  'data-event-color': string
  'data-event-family': EventColorFamily | 'NONE'
  'data-event-slot': string
}

export function isEventColorFamily(value: string): value is EventColorFamily {
  return (EVENT_COLOR_FAMILIES as readonly string[]).includes(value)
}

export function validEventColor(color: EventColor | null | undefined): boolean {
  if (!color) return false
  if (!isEventColorFamily(color.family)) return false
  return Number.isInteger(color.slot) && color.slot >= 0 && color.slot < EVENT_COLOR_SLOTS
}

export function eventColorAttrs(color: EventColor | null | undefined): EventColorAttrs {
  if (!color || !validEventColor(color) || !isEventColorFamily(color.family)) {
    return { 'data-event-color': '', 'data-event-family': 'NONE', 'data-event-slot': '' }
  }
  return {
    'data-event-color': '',
    'data-event-family': color.family,
    'data-event-slot': String(color.slot),
  }
}

export const EVENT_ORIGIN_KEY: Record<EventOrigin, string> = {
  RU: 'event:form.originValue.RU',
  WORLD: 'event:form.originValue.WORLD',
}

export const EVENT_ORIGIN_SHAPE: Record<EventOrigin, string> = {
  RU: 'rounded-[2px]',
  WORLD: 'rounded-pill',
}

export function eventColorLabelKey(color: EventColor | null | undefined): string {
  if (!color || !validEventColor(color)) return 'event:color.unassigned'
  return EVENT_ORIGIN_KEY[color.family]
}
