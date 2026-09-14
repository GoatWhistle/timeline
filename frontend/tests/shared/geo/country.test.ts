import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { countryName, placeLine } from '@/shared/geo/country'
import { i18n } from '@/shared/i18n/config'

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

afterAll(async () => {
  await i18n.changeLanguage('ru')
})

describe('country name', () => {
  it('spells a code as a name rather than leaving the two letters on screen', () => {
    expect(countryName('NL')).toBe('Netherlands')
    expect(countryName('US')).toBe('United States')
  })

  it('accepts a lowercase code the same way', () => {
    expect(countryName('nl')).toBe('Netherlands')
  })

  it('names a country in the language the reader is reading', async () => {
    const inRussian = new Intl.DisplayNames(['ru'], { type: 'region' }).of('NL')

    await i18n.changeLanguage('ru')
    expect(
      countryName('NL'),
      'the row sits beside dates that already follow the reader language',
    ).toBe(inRussian)
    expect(countryName('NL')).not.toBe('Netherlands')

    await i18n.changeLanguage('en')
    expect(countryName('NL')).toBe('Netherlands')
  })

  it('keeps the code when it names no country anyone knows', () => {
    expect(countryName('QQ')).toBe('QQ')
    expect(countryName('AA')).toBe('AA')
  })

  it('answers nothing for what is not a code at all', () => {
    for (const value of [null, undefined, '', 'N', 'NLD', 'N1', '12']) {
      expect(countryName(value), `${String(value)} is not a country code`).toBeNull()
    }
  })
})

describe('place line', () => {
  it('joins a city and a country in that order', () => {
    expect(placeLine('Amsterdam', 'NL')).toBe('Amsterdam, Netherlands')
  })

  it('keeps whichever half it has', () => {
    expect(placeLine('Amsterdam', null)).toBe('Amsterdam')
    expect(placeLine(null, 'NL')).toBe('Netherlands')
  })

  it('answers nothing when there is no place, so no row is drawn', () => {
    expect(placeLine(null, null)).toBeNull()
    expect(placeLine(undefined, undefined)).toBeNull()
    expect(placeLine('', '')).toBeNull()
    expect(placeLine('   ', null)).toBeNull()
  })
})
