import type { Locale } from '@/shared/i18n/locale'

const MAX_DIGITS = 15

function stripLeadingZeros(digits: string): string {
  return digits.replace(/^0+(?=\d)/, '')
}

export function extractDigits(raw: string): string {
  return stripLeadingZeros(raw.replace(/\D/g, '').slice(0, MAX_DIGITS))
}

export function groupSeparator(locale: Locale): string {
  const parts = new Intl.NumberFormat(locale).formatToParts(1234)
  return parts.find((part) => part.type === 'group')?.value ?? ','
}

export function groupDigits(digits: string, locale: Locale): string {
  const whole = stripLeadingZeros(digits.split(/[.,]/)[0]?.replace(/\D/g, '') ?? '')
  if (whole === '') return ''
  return new Intl.NumberFormat(locale).format(BigInt(whole))
}

function countDigits(text: string, upTo: number): number {
  let count = 0
  for (let index = 0; index < upTo && index < text.length; index += 1) {
    if (/\d/.test(text[index] ?? '')) count += 1
  }
  return count
}

export function caretAfterDigitCount(formatted: string, digitCount: number): number {
  if (digitCount <= 0) return 0
  let seen = 0
  for (let index = 0; index < formatted.length; index += 1) {
    if (/\d/.test(formatted[index] ?? '')) {
      seen += 1
      if (seen === digitCount) return index + 1
    }
  }
  return formatted.length
}

export type ReformatResult = { digits: string; formatted: string; caret: number }

function collapsedSeparatorDelete(
  previousFormatted: string,
  nextRaw: string,
  caretPos: number,
): { raw: string; caretPos: number } | null {
  if (nextRaw.length !== previousFormatted.length - 1) return null
  if (
    countDigits(nextRaw, nextRaw.length) !==
    countDigits(previousFormatted, previousFormatted.length)
  ) {
    return null
  }
  const removedChar = previousFormatted[caretPos]
  if (removedChar === undefined || /\d/.test(removedChar)) return null
  if (caretPos === 0 || !/\d/.test(nextRaw[caretPos - 1] ?? '')) return null

  const before = nextRaw.slice(0, caretPos - 1)
  const after = nextRaw.slice(caretPos)
  return { raw: before + after, caretPos: caretPos - 1 }
}

export function reformat(
  previousFormatted: string,
  nextRaw: string,
  caretPos: number,
  locale: Locale,
): ReformatResult {
  const collapsed = collapsedSeparatorDelete(previousFormatted, nextRaw, caretPos)
  const raw = collapsed?.raw ?? nextRaw
  const position = collapsed?.caretPos ?? caretPos

  const digitsBeforeCaret = countDigits(raw, position)
  const allDigits = raw.replace(/\D/g, '').slice(0, MAX_DIGITS)
  const digits = stripLeadingZeros(allDigits)
  const strippedCount = allDigits.length - digits.length
  const digitIndex = Math.max(0, Math.min(digitsBeforeCaret, allDigits.length) - strippedCount)
  const formatted = groupDigits(digits, locale)
  const caret = caretAfterDigitCount(formatted, digitIndex)
  return { digits, formatted, caret: Math.min(caret, formatted.length) }
}
