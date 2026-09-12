import { isCivilDate } from '@/shared/datetime/civil'

export const DATE_TEXT_PATTERN = 'dd.mm.yyyy'

const SEPARATORS = /[.,\-/\\\s]+/g

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0')
}

function assemble(day: number, month: number, year: number): string | null {
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null
  const candidate = `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`
  return isCivilDate(candidate) ? candidate : null
}

function fromDigits(digits: string): string | null {
  if (digits.length === 8) {
    return assemble(Number(digits.slice(0, 2)), Number(digits.slice(2, 4)), Number(digits.slice(4)))
  }
  if (digits.length === 6) {
    return assemble(
      Number(digits.slice(0, 2)),
      Number(digits.slice(2, 4)),
      2000 + Number(digits.slice(4)),
    )
  }
  return null
}

function expandYear(raw: string): number {
  const value = Number(raw)
  if (raw.length <= 2) return 2000 + value
  return value
}

export function parseDateText(raw: string): string | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null

  const iso = trimmed.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/)
  if (iso) {
    return assemble(Number(iso[3]), Number(iso[2]), Number(iso[1]))
  }

  const parts = trimmed.split(SEPARATORS).filter((part) => part !== '')
  if (parts.length === 3 && parts.every((part) => /^\d+$/.test(part))) {
    const [day, month, year] = parts as [string, string, string]
    if (day.length > 2 || month.length > 2 || year.length > 4) return null
    return assemble(Number(day), Number(month), expandYear(year))
  }

  if (parts.length === 1 && /^\d+$/.test(parts[0] ?? '')) {
    return fromDigits(parts[0] ?? '')
  }

  return null
}

export function formatDateText(date: string): string {
  if (!isCivilDate(date)) return ''
  return `${date.slice(8, 10)}.${date.slice(5, 7)}.${date.slice(0, 4)}`
}

export function acceptDateText(raw: string): string {
  return raw.replace(/[^\d.,\-/\\ ]/g, '').slice(0, 10)
}

export function groomDateText(raw: string, previous: string): string {
  const accepted = acceptDateText(raw)
  if (accepted.length < previous.length) return accepted
  if (/[^0-9]$/.test(accepted)) return accepted
  if (/[^0-9.]/.test(accepted)) return accepted

  const digits = accepted.replace(/[^0-9]/g, '').slice(0, 8)
  if (digits.length === 0) return accepted

  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(
    (part) => part !== '',
  )
  const grouped = parts.join('.')
  return digits.length === 2 || digits.length === 4 ? `${grouped}.` : grouped
}
