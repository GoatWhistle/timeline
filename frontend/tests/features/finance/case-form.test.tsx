import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { CaseForm, type CaseFormPayload } from '@/features/finance/case-form'
import type { EventCaseResponse } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

const tracks = [{ id: 'tr_1', track_no: 1, name: 'Voice agents', prize_total: '7000', prizes: [] }]

const existing = {
  id: 'cs_1',
  event_id: 'ev_1',
  case_no: 1,
  name: 'Barge-in handling',
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
} as EventCaseResponse

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

async function submitWith(node: React.ReactElement) {
  const { user } = renderWithProviders(node)
  await user.type(screen.getByLabelText('Name'), 'Latency budget')
  await user.click(screen.getByRole('button', { name: /Create|Save/ }))
}

function prizeInput(): HTMLInputElement {
  const node = document.getElementById('case-new-prize')
  if (!(node instanceof HTMLInputElement)) throw new Error('no case prize input')
  return node
}

describe('the case prize amount groups digits and refuses a fraction', () => {
  it('groups the amount as it is typed and keeps the raw digits underneath', async () => {
    const { user } = renderWithProviders(
      <CaseForm tracks={tracks} submitLabel="Create" onSubmit={vi.fn()} />,
    )
    await user.click(prizeInput())
    await user.keyboard('150000')
    expect(prizeInput().value).toBe('150,000')
    expect(prizeInput()).toHaveAttribute('data-value', '150000')
  })

  it('never lets a typed dot reach the stored amount', async () => {
    const { user } = renderWithProviders(
      <CaseForm tracks={tracks} submitLabel="Create" onSubmit={vi.fn()} />,
    )
    await user.click(prizeInput())
    await user.keyboard('1500.50')
    expect(prizeInput()).toHaveAttribute('data-value', '150050')
  })

  it('sends the raw digits, not the grouped text, when the case is submitted', async () => {
    const onSubmit = vi.fn<(payload: CaseFormPayload) => Promise<void>>().mockResolvedValue()
    const { user } = renderWithProviders(
      <CaseForm tracks={tracks} submitLabel="Create" onSubmit={onSubmit} />,
    )
    await user.type(screen.getByLabelText('Name'), 'Latency budget')
    await user.click(prizeInput())
    await user.keyboard('150000')
    await user.click(screen.getByRole('button', { name: /Create|Save/ }))

    const payload = onSubmit.mock.calls[0]?.[0] as CaseFormPayload
    expect(payload.prize_amount).toBe('150000')
  })
})

describe('the case form sends only the fields the endpoint declares', () => {
  it('never sends the clear flags when creating, since create has no such fields', async () => {
    const onSubmit = vi.fn<(payload: CaseFormPayload) => Promise<void>>().mockResolvedValue()
    await submitWith(<CaseForm tracks={tracks} submitLabel="Create" onSubmit={onSubmit} />)

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const payload = onSubmit.mock.calls[0]?.[0] as CaseFormPayload
    expect(Object.hasOwn(payload, 'clear_track')).toBe(false)
    expect(Object.hasOwn(payload, 'clear_prize')).toBe(false)
  })

  it('sends the clear flags when editing, so a track or prize can be dropped', async () => {
    const onSubmit = vi.fn<(payload: CaseFormPayload) => Promise<void>>().mockResolvedValue()
    await submitWith(
      <CaseForm item={existing} tracks={tracks} submitLabel="Save" onSubmit={onSubmit} />,
    )

    const payload = onSubmit.mock.calls[0]?.[0] as CaseFormPayload
    expect(payload.clear_track).toBe(true)
    expect(payload.clear_prize).toBe(true)
  })

  it('omits an empty partner and an empty prize instead of sending a blank string', async () => {
    const onSubmit = vi.fn<(payload: CaseFormPayload) => Promise<void>>().mockResolvedValue()
    await submitWith(<CaseForm tracks={tracks} submitLabel="Create" onSubmit={onSubmit} />)

    const payload = onSubmit.mock.calls[0]?.[0] as CaseFormPayload
    expect(Object.hasOwn(payload, 'partner')).toBe(false)
    expect(Object.hasOwn(payload, 'prize_amount')).toBe(false)
    expect(payload.name).toBe('Latency budget')
  })
})
