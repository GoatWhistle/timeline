import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { JoinLinkPanel } from '@/features/teams/join-link-panel'
import { i18n } from '@/shared/i18n/config'

let joinLinkFails = true

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}))

vi.mock('@/entities/team/team.queries', () => ({
  teamJoinLinkQuery: (teamId: string) => ({
    queryKey: ['join-link-test', teamId, joinLinkFails],
    queryFn: () =>
      joinLinkFails ? Promise.reject(new Error('boom')) : Promise.resolve({ active: false }),
    retry: false,
  }),
  useRotateJoinLink: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRevokeJoinLink: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

beforeEach(() => {
  joinLinkFails = true
})

describe('the invite link panel never reports a failure as "no link"', () => {
  it('says the link could not be checked when the request fails', async () => {
    renderWithProviders(<JoinLinkPanel teamId="tm_gma9hq8a96q5" open />)

    await waitFor(() => expect(screen.getByText(i18n.t('team:linkLoadFailed'))).toBeInTheDocument())
    expect(screen.queryByText(i18n.t('team:linkNone'))).toBeNull()
  })

  it('still says there is no link when the team genuinely has none', async () => {
    joinLinkFails = false
    renderWithProviders(<JoinLinkPanel teamId="tm_gma9hq8a96q5" open />)

    await waitFor(() => expect(screen.getByText(i18n.t('team:linkNone'))).toBeInTheDocument())
    expect(screen.queryByText(i18n.t('team:linkLoadFailed'))).toBeNull()
  })
})
