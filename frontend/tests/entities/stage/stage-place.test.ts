import { describe, expect, it } from 'vitest'
import { isOffline, placeCity, placeLabel } from '@/entities/stage/stage.place'
import type { Place } from '@/shared/api/types.gen'

const online: Place = { format: 'ONLINE', inherited: true }
const kazan: Place = {
  format: 'OFFLINE',
  country_code: 'RU',
  city: 'Kazan',
  venue: 'IT Park',
  inherited: false,
}

describe('stage place', () => {
  it('treats an offline and a hybrid stage as in person', () => {
    expect(isOffline(kazan)).toBe(true)
    expect(isOffline({ format: 'HYBRID', inherited: false })).toBe(true)
    expect(isOffline(online)).toBe(false)
  })

  it('hides the city of an online stage', () => {
    expect(placeCity(online)).toBeUndefined()
    expect(placeCity({ ...online, city: 'Moscow' })).toBeUndefined()
  })

  it('shows the city of an in-person stage', () => {
    expect(placeCity(kazan)).toBe('Kazan')
  })

  it('joins the city and the venue into one label', () => {
    expect(placeLabel(kazan, 'Online')).toBe('Kazan, IT Park')
  })

  it('falls back to the online label when there is no place', () => {
    expect(placeLabel(online, 'Online')).toBe('Online')
    expect(placeLabel({ format: 'OFFLINE', inherited: false }, 'Online')).toBe('Online')
  })
})
