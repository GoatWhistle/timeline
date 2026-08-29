import type { Locale } from '@/shared/i18n/locale'

export type PersonName = {
  first_name: string
  middle_name?: string | null
  last_name: string
}

function part(value: string | null | undefined): string {
  return (value ?? '').trim()
}

function join(...parts: Array<string | null | undefined>): string {
  return parts.map(part).filter(Boolean).join(' ')
}

export function fullName(person: PersonName, locale: Locale): string {
  if (locale === 'ru') {
    return join(person.last_name, person.first_name, person.middle_name)
  }
  return join(person.first_name, person.middle_name, person.last_name)
}

export function listName(person: PersonName, locale: Locale): string {
  if (locale === 'ru') {
    return join(person.last_name, person.first_name)
  }
  return join(person.first_name, person.last_name)
}

export function addressName(person: PersonName, locale: Locale): string {
  if (locale === 'ru') {
    return join(person.first_name, person.middle_name)
  }
  return part(person.first_name)
}

export function nameInitials(person: PersonName): string {
  const first = [...part(person.first_name)][0] ?? ''
  const last = [...part(person.last_name)][0] ?? ''
  return `${first}${last}`.toLocaleUpperCase()
}

export function compareByLastName(a: PersonName, b: PersonName, locale: Locale): number {
  const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true })
  const bySurname = collator.compare(part(a.last_name), part(b.last_name))
  if (bySurname !== 0) return bySurname
  return collator.compare(part(a.first_name), part(b.first_name))
}

export function sortByLastName<T extends PersonName>(people: readonly T[], locale: Locale): T[] {
  return [...people].sort((a, b) => compareByLastName(a, b, locale))
}
