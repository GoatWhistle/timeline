import { describe, expect, it } from 'vitest'
import {
  caretAfterDigitCount,
  extractDigits,
  groupDigits,
  groupSeparator,
  reformat,
} from '@/shared/money/money-input-format'

describe('extractDigits: an amount is whole, dots and commas never survive typing', () => {
  it('strips a decimal point the way the prize pool field used to', () => {
    expect(extractDigits('150000.75')).toBe('15000075')
    expect(extractDigits('150000,75')).toBe('15000075')
  })

  it('strips spaces, signs and letters', () => {
    expect(extractDigits('150 000')).toBe('150000')
    expect(extractDigits('-150000')).toBe('150000')
    expect(extractDigits('150000 RUB')).toBe('150000')
  })

  it('leaves an already whole amount untouched', () => {
    expect(extractDigits('150000')).toBe('150000')
  })

  it('drops leading zeros, keeping a single zero for an all-zero input', () => {
    expect(extractDigits('0005000')).toBe('5000')
    expect(extractDigits('000')).toBe('0')
  })

  it('caps at a sane number of digits so the field cannot grow unbounded', () => {
    expect(extractDigits('1'.repeat(30)).length).toBeLessThanOrEqual(15)
  })
})

describe('groupSeparator', () => {
  it('gives the comma English uses for grouping', () => {
    expect(groupSeparator('en')).toBe(',')
  })

  it('gives the character Russian uses for grouping, whatever it is', () => {
    const separator = groupSeparator('ru')
    expect(separator).not.toBe(',')
    expect(separator.trim()).toBe('')
  })
})

describe('groupDigits', () => {
  it('groups thousands in English with commas', () => {
    expect(groupDigits('1234567', 'en')).toBe('1,234,567')
  })

  it('groups thousands in Russian with its own separator', () => {
    const separator = groupSeparator('ru')
    expect(groupDigits('1234567', 'ru')).toBe(`1${separator}234${separator}567`)
  })

  it('renders an empty digit string as empty, not zero', () => {
    expect(groupDigits('', 'en')).toBe('')
  })
})

describe('caretAfterDigitCount', () => {
  it('lands right after the requested number of digits', () => {
    expect(caretAfterDigitCount('1,234,567', 4)).toBe(5)
  })

  it('sits at the very start for a zero digit count', () => {
    expect(caretAfterDigitCount('1,234,567', 0)).toBe(0)
  })

  it('clamps to the end when asked for more digits than exist', () => {
    expect(caretAfterDigitCount('1,234', 99)).toBe(5)
  })
})

describe('reformat: the caret follows the digit it was next to, not a fixed offset', () => {
  it('keeps the caret after the same digit when a new digit is inserted before it', () => {
    const result = reformat('9,234,567', '19,234,567', 2, 'en')
    expect(result.digits).toBe('19234567')
    expect(result.formatted).toBe('19,234,567')
    expect(result.caret).toBe(2)
  })

  it('normalises a pasted value with its own separators into the field locale', () => {
    const result = reformat('', '1 234 567', 9, 'en')
    expect(result.digits).toBe('1234567')
    expect(result.formatted).toBe('1,234,567')
  })

  it('formats with the Russian separator when the locale is Russian', () => {
    const result = reformat('', '1234567', 7, 'ru')
    const separator = groupSeparator('ru')
    expect(result.formatted).toBe(`1${separator}234${separator}567`)
  })

  it('drops a leading zero and still places the caret on the digit that was typed', () => {
    const result = reformat('0', '05', 2, 'en')
    expect(result.digits).toBe('5')
    expect(result.formatted).toBe('5')
    expect(result.caret).toBe(1)
  })
})

describe('reformat: a backspace over a bare separator removes the digit beside it', () => {
  it('treats deleting the comma as deleting the digit before it, not as nothing happening', () => {
    const result = reformat('1,234', '1234', 1, 'en')
    expect(result.digits).toBe('234')
    expect(result.formatted).toBe('234')
  })

  it('leaves an ordinary digit backspace untouched by the collapse rule', () => {
    const result = reformat('1,234', '1,23', 4, 'en')
    expect(result.digits).toBe('123')
    expect(result.formatted).toBe('123')
  })

  it('does not fire when the digit count actually changed', () => {
    const result = reformat('1,234', '1,24', 3, 'en')
    expect(result.digits).toBe('124')
  })

  it('does nothing special when there is no digit before the removed separator', () => {
    const result = reformat('123', '13', 1, 'en')
    expect(result.digits).toBe('13')
  })
})
