import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { EVENT_COLOR_SLOTS, validEventColor } from '@/entities/event/event-color'
import { api } from '@/shared/api/client'
import { seed } from '../support/seed'
import { signInAsAdmin } from '../support/session'

const inThe = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString()

async function createEvent(title: string, origin: 'RU' | 'WORLD') {
  const { data, response } = await api.POST('/admin/events', {
    body: { title, origin, start_at: inThe(1), end_at: inThe(2) },
  })
  expect(response.status).toBe(201)
  return data
}

describe('an event carries its colour on the wire', () => {
  beforeAll(async () => {
    await seed()
  })

  beforeEach(async () => {
    await signInAsAdmin()
  })

  it('paints a new event and names the family it belongs to', async () => {
    const event = await createEvent('Colour on creation', 'RU')
    expect(event?.color).toBeDefined()
    expect(event?.color?.family).toBe('RU')
    expect(validEventColor(event?.color)).toBe(true)
  })

  it('keeps the world family separate from the russian one', async () => {
    const world = await createEvent('Colour of a world event', 'WORLD')
    expect(world?.color?.family).toBe('WORLD')
  })

  it('never repeats a colour inside one family', async () => {
    const seen = new Set<number>()
    for (let i = 0; i < 4; i += 1) {
      const event = await createEvent(`Distinct colour ${i}`, 'RU')
      const slot = event?.color?.slot
      expect(slot).toBeTypeOf('number')
      expect(slot).toBeGreaterThanOrEqual(0)
      expect(slot).toBeLessThan(EVENT_COLOR_SLOTS)
      expect(seen.has(slot as number)).toBe(false)
      seen.add(slot as number)
    }
  })

  it('serves the same colour back when the event is read again', async () => {
    const created = await createEvent('Colour survives a read', 'WORLD')
    const { data } = await api.GET('/admin/events/{id}', {
      params: { path: { id: created?.id as string } },
    })
    expect(data?.color).toEqual(created?.color)
  })
})
