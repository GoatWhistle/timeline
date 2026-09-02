import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { allowsPlace, OUTCOMES, PLACING_OUTCOMES } from '@/entities/personal/outcome.queries'
import { outcomeInitial, toRequest } from '@/features/personal-layer/outcome/outcome-form'
import type { ParticipantOutcome } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

const save = vi.fn()
const remove = vi.fn()
let outcome: ParticipantOutcome | null = null

vi.mock('@/entities/personal/outcome.queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/personal/outcome.queries')>()
  const { queryOptions } = await import('@tanstack/react-query')
  return {
    ...actual,
    outcomeQuery: (eventId: string) =>
      queryOptions({
        queryKey: ['personal-outcome', eventId],
        queryFn: () => outcome,
        retry: false,
      }),
    useSaveOutcome: () => ({ mutateAsync: save, isPending: false }),
    useDeleteOutcome: () => ({ mutateAsync: remove, isPending: false }),
  }
})

const { OutcomePanel } = await import('@/features/personal-layer/outcome/outcome-panel')

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

beforeEach(() => {
  for (const fn of [save, remove]) {
    fn.mockReset()
    fn.mockResolvedValue({})
  }
  outcome = null
})

describe('a place belongs only to a placing outcome', () => {
  it('allows a place for a shortlisting, a win and a prize, and for nothing else', () => {
    expect(PLACING_OUTCOMES).toEqual(['SHORTLISTED', 'WINNER', 'PRIZE'])
    expect(allowsPlace('PARTICIPATED')).toBe(false)
    for (const value of PLACING_OUTCOMES) expect(allowsPlace(value)).toBe(true)
  })

  it('drops a place typed before the outcome was changed back to taking part', () => {
    const request = toRequest({
      outcome: 'PARTICIPATED',
      place: '1',
      prize: '',
      track: '',
      note: '',
    })

    expect(request).not.toHaveProperty('place')
    expect(request.outcome).toBe('PARTICIPATED')
  })

  it('keeps the place when the outcome does allow one', () => {
    const request = toRequest({ outcome: 'WINNER', place: '2', prize: '', track: '', note: '' })

    expect(request.place).toBe(2)
  })
})

describe('the outcome screen', () => {
  it('treats taking part as a full outcome, not as an empty one', () => {
    expect(outcomeInitial(null).outcome).toBe('PARTICIPATED')
    expect(OUTCOMES[0]).toBe('PARTICIPATED')
  })

  it('offers to record an outcome when none is stored', async () => {
    renderWithProviders(<OutcomePanel eventId="ev_gma9hq8a96q5" />)

    expect(await screen.findByText(i18n.t('event:personal.outcome.empty'))).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: i18n.t('event:personal.outcome.record') }),
    ).toBeInTheDocument()
  })

  it('hides the place field until the outcome is one that can carry a place', async () => {
    const { user } = renderWithProviders(<OutcomePanel eventId="ev_gma9hq8a96q5" />)

    await user.click(
      await screen.findByRole('button', { name: i18n.t('event:personal.outcome.record') }),
    )
    expect(
      screen.queryByLabelText(new RegExp(i18n.t('event:personal.outcome.placeLabel'))),
    ).not.toBeInTheDocument()
  })

  it('calls the result a self-report rather than a standing', async () => {
    renderWithProviders(<OutcomePanel eventId="ev_gma9hq8a96q5" />)

    expect(await screen.findByText(i18n.t('event:personal.outcome.selfReport'))).toBeInTheDocument()
  })

  it('opens on the recorded outcome and offers to delete it', async () => {
    outcome = {
      event_id: 'ev_gma9hq8a96q5',
      outcome: 'WINNER',
      place: 1,
      prize: 'Jury award',
      track: 'Smart city',
      note: '',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }
    renderWithProviders(<OutcomePanel eventId="ev_gma9hq8a96q5" />)

    expect(
      await screen.findByRole('button', { name: i18n.t('event:personal.outcome.remove') }),
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText(new RegExp(i18n.t('event:personal.outcome.placeLabel'))),
    ).toHaveValue(1)
  })
})
