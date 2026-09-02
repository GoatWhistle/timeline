import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  EMPTY_RETRO,
  isRetroEmpty,
  RETRO_FIELD_KEY,
  RETRO_FIELDS,
  toDraft,
} from '@/entities/personal/retrospective.queries'
import type { ParticipantRetrospective } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

const save = vi.fn()
const remove = vi.fn()
let retro: ParticipantRetrospective | null = null

vi.mock('@/entities/personal/retrospective.queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/personal/retrospective.queries')>()
  const { queryOptions } = await import('@tanstack/react-query')
  return {
    ...actual,
    retrospectiveQuery: (eventId: string) =>
      queryOptions({
        queryKey: ['personal-retrospective', eventId],
        queryFn: () => retro,
        retry: false,
      }),
    useSaveRetrospective: () => ({ mutateAsync: save, isPending: false }),
    useDeleteRetrospective: () => ({ mutateAsync: remove, isPending: false }),
  }
})

const { RetroPanel } = await import('@/features/personal-layer/retro/retro-panel')

function record(over: Partial<ParticipantRetrospective> = {}): ParticipantRetrospective {
  return {
    event_id: 'ev_gma9hq8a96q5',
    went_well: '',
    went_badly: '',
    next_time: '',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...over,
  }
}

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

beforeEach(() => {
  for (const fn of [save, remove]) {
    fn.mockReset()
    fn.mockResolvedValue({})
  }
  retro = null
})

describe('the retrospective is three free-text fields', () => {
  it('has exactly three, and names every one of them in both languages', () => {
    expect(RETRO_FIELDS).toEqual(['went_well', 'went_badly', 'next_time'])

    for (const locale of ['ru', 'en'] as const) {
      const t = i18n.getFixedT(locale)
      for (const field of RETRO_FIELDS) {
        const label = t(RETRO_FIELD_KEY[field])
        expect(label, `${locale}/${field}`).not.toBe(RETRO_FIELD_KEY[field])
        expect(label, `${locale}/${field}`).not.toHaveLength(0)
      }
    }
  })

  it('counts a retrospective of blank fields as no retrospective at all', () => {
    expect(isRetroEmpty(EMPTY_RETRO)).toBe(true)
    expect(isRetroEmpty({ went_well: '   ', went_badly: '', next_time: '\n' })).toBe(true)
    expect(isRetroEmpty({ ...EMPTY_RETRO, next_time: 'start earlier' })).toBe(false)
  })

  it('reads a stored record into the three fields', () => {
    expect(toDraft(record({ went_well: 'the demo' }))).toEqual({
      went_well: 'the demo',
      went_badly: '',
      next_time: '',
    })
    expect(toDraft(null)).toEqual(EMPTY_RETRO)
  })
})

describe('the retrospective screen', () => {
  it('offers to write one when the record is empty', async () => {
    retro = record()
    renderWithProviders(<RetroPanel eventId="ev_gma9hq8a96q5" />)

    expect(await screen.findByText(i18n.t('event:personal.retro.empty'))).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: i18n.t('event:personal.retro.write') }),
    ).toBeInTheDocument()
  })

  it('opens straight onto the three fields when something is written', async () => {
    retro = record({ went_well: 'the demo landed' })
    renderWithProviders(<RetroPanel eventId="ev_gma9hq8a96q5" />)

    for (const field of RETRO_FIELDS) {
      expect(await screen.findByLabelText(i18n.t(RETRO_FIELD_KEY[field]))).toBeInTheDocument()
    }
    expect(screen.getByLabelText(i18n.t('event:personal.retro.wentWell'))).toHaveValue(
      'the demo landed',
    )
  })

  it('sends all three fields on save', async () => {
    retro = record({ went_well: 'a' })
    const { user } = renderWithProviders(<RetroPanel eventId="ev_gma9hq8a96q5" />)

    await user.type(
      await screen.findByLabelText(i18n.t('event:personal.retro.nextTime')),
      'start earlier',
    )
    await user.click(screen.getByRole('button', { name: i18n.t('action.save') }))

    expect(save).toHaveBeenCalledWith({
      went_well: 'a',
      went_badly: '',
      next_time: 'start earlier',
    })
  })

  it('warns that emptying all three deletes the record', async () => {
    retro = record({ went_well: 'a' })
    renderWithProviders(<RetroPanel eventId="ev_gma9hq8a96q5" />)

    expect(await screen.findByText(i18n.t('event:personal.retro.clearHint'))).toBeInTheDocument()
  })
})
