import { describe, expect, it } from 'vitest'
import { formatAmount, formatMoney } from '@/shared/money/money'

describe('formatMoney rounding', () => {
  it('drops kopecks entirely and never renders a fractional part', () => {
    expect(formatMoney('15000.00', 'USD')).toBe('$15,000')
    expect(formatMoney('15000.00', 'USD')).not.toContain('.')
    expect(formatMoney('500000.00', 'RUB')).toBe('500,000 ₽')
    expect(formatMoney('500000.00', 'RUB')).not.toContain('.')
  })

  it('rounds .49 down and .50 up at the boundary', () => {
    expect(formatMoney('15000.49', 'USD')).toBe('$15,000')
    expect(formatMoney('15000.50', 'USD')).toBe('$15,001')
    expect(formatMoney('0.49', 'USD')).toBe('$0')
    expect(formatMoney('0.50', 'USD')).toBe('$1')
  })

  it('leaves a value that is already whole untouched', () => {
    expect(formatMoney('7', 'USD')).toBe('$7')
    expect(formatMoney('1000000', 'USD')).toBe('$1,000,000')
  })
})

describe('formatMoney thousands separators', () => {
  it('groups thousands so a large prize pool stays readable', () => {
    expect(formatMoney('500000', 'RUB')).toBe('500,000 ₽')
    expect(formatMoney('1234567', 'USD')).toBe('$1,234,567')
  })

  it('leaves values below a thousand ungrouped', () => {
    expect(formatMoney('999', 'USD')).toBe('$999')
    expect(formatMoney('1000', 'USD')).toBe('$1,000')
  })
})

describe('formatMoney symbol placement', () => {
  it('puts the symbol before the amount for leading currencies', () => {
    expect(formatMoney('15000', 'USD')).toBe('$15,000')
    expect(formatMoney('15000', 'GBP')).toBe('£15,000')
    expect(formatMoney('15000', 'CNY')).toBe('¥15,000')
    expect(formatMoney('15000', 'JPY')).toBe('¥15,000')
    expect(formatMoney('15000', 'INR')).toBe('₹15,000')
  })

  it('puts the symbol after the amount for trailing currencies', () => {
    expect(formatMoney('15000', 'RUB')).toBe('15,000 ₽')
    expect(formatMoney('15000', 'EUR')).toBe('15,000 €')
    expect(formatMoney('15000', 'KZT')).toBe('15,000 ₸')
    expect(formatMoney('15000', 'UAH')).toBe('15,000 ₴')
  })

  it('separates a trailing symbol from the amount and keeps a leading one tight', () => {
    expect(formatMoney('15000', 'RUB')).toMatch(/^15,000 ₽$/)
    expect(formatMoney('15000', 'USD')).toMatch(/^\$15,000$/)
  })

  it('accepts a lowercase currency code', () => {
    expect(formatMoney('15000', 'usd')).toBe('$15,000')
    expect(formatMoney('15000', 'rub')).toBe('15,000 ₽')
  })
})

describe('formatMoney unknown currency', () => {
  it('falls back to the amount followed by the uppercased code', () => {
    expect(formatMoney('15000', 'CHF')).toBe('15,000 CHF')
    expect(formatMoney('15000', 'chf')).toBe('15,000 CHF')
    expect(formatMoney('15000', 'XYZ')).toBe('15,000 XYZ')
  })
})

describe('formatMoney empty and invalid input', () => {
  it('returns null when the amount is missing', () => {
    expect(formatMoney(null, 'USD')).toBeNull()
    expect(formatMoney(undefined, 'USD')).toBeNull()
    expect(formatMoney('', 'USD')).toBeNull()
  })

  it('returns null when the currency is missing', () => {
    expect(formatMoney('15000', null)).toBeNull()
    expect(formatMoney('15000', undefined)).toBeNull()
    expect(formatMoney('15000', '')).toBeNull()
  })

  it('returns null when the amount is not a number', () => {
    expect(formatMoney('abc', 'USD')).toBeNull()
    expect(formatMoney('15 000', 'USD')).toBeNull()
    expect(formatMoney('1,500', 'USD')).toBeNull()
    expect(formatMoney('Infinity', 'USD')).toBeNull()
    expect(formatMoney('NaN', 'USD')).toBeNull()
  })

  it('returns null when both sides are missing', () => {
    expect(formatMoney(null, null)).toBeNull()
  })
})

describe('formatAmount', () => {
  it('rounds and groups without any currency', () => {
    expect(formatAmount('500000')).toBe('500,000')
    expect(formatAmount('15000.49')).toBe('15,000')
    expect(formatAmount('15000.50')).toBe('15,001')
  })

  it('returns null for a non-numeric string', () => {
    expect(formatAmount('abc')).toBeNull()
    expect(formatAmount('Infinity')).toBeNull()
  })

  it('treats an empty string as zero, so callers must guard it themselves', () => {
    expect(formatAmount('')).toBe('0')
  })
})

describe('formatMoney negative amounts', () => {
  it('puts the minus before a leading symbol instead of between them', () => {
    expect(formatMoney('-1500', 'USD')).toBe('-$1,500')
    expect(formatMoney('-1500', 'GBP')).toBe('-£1,500')
    expect(formatMoney('-1500', 'USD')).not.toContain('$-')
  })

  it('leaves the minus where it already reads correctly for a trailing symbol', () => {
    expect(formatMoney('-1500', 'RUB')).toBe('-1,500 ₽')
    expect(formatMoney('-1500', 'CHF')).toBe('-1,500 CHF')
  })

  it('keeps a positive amount exactly as it was', () => {
    expect(formatMoney('1500', 'USD')).toBe('$1,500')
    expect(formatMoney('1500', 'RUB')).toBe('1,500 ₽')
  })
})
