import { useCallback, useState } from 'react'

export const CARD_FIELDS = ['dates', 'duration', 'format', 'team', 'prize', 'organizer'] as const
export type CardField = (typeof CARD_FIELDS)[number]

export const DEFAULT_CARD_FIELDS: CardField[] = ['dates', 'prize']

export const CARD_FIELD_KEY: Record<CardField, string> = {
  dates: 'catalog.cardField.dates',
  duration: 'catalog.column.duration',
  format: 'catalog.column.format',
  team: 'place.teamSize',
  prize: 'catalog.column.prize',
  organizer: 'catalog.column.organizer',
}

export const CATALOG_CARD_FIELDS_KEY = 'timeline-catalog-card-fields'
export const ADMIN_CARD_FIELDS_KEY = 'timeline-admin-card-fields'

export function resolveCardFields(value: unknown): CardField[] {
  if (!Array.isArray(value)) return DEFAULT_CARD_FIELDS
  return CARD_FIELDS.filter((field) => value.includes(field))
}

function readFields(storageKey: string): CardField[] {
  try {
    const raw = localStorage.getItem(storageKey)
    return raw === null ? DEFAULT_CARD_FIELDS : resolveCardFields(JSON.parse(raw))
  } catch {
    return DEFAULT_CARD_FIELDS
  }
}

function writeFields(storageKey: string, fields: CardField[] | null): void {
  try {
    if (fields === null) localStorage.removeItem(storageKey)
    else localStorage.setItem(storageKey, JSON.stringify(fields))
  } catch {
    return
  }
}

export function useCardFields(storageKey: string) {
  const [fields, setFields] = useState<CardField[]>(() => readFields(storageKey))

  const toggle = useCallback(
    (field: CardField) => {
      setFields((current) => {
        const next = resolveCardFields(
          current.includes(field) ? current.filter((item) => item !== field) : [...current, field],
        )
        writeFields(storageKey, next)
        return next
      })
    },
    [storageKey],
  )

  const reset = useCallback(() => {
    writeFields(storageKey, null)
    setFields(DEFAULT_CARD_FIELDS)
  }, [storageKey])

  return { fields, toggle, reset }
}
