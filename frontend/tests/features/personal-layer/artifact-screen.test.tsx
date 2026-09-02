import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ParticipantArtifact } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

const create = vi.fn()
const update = vi.fn()
const remove = vi.fn()
let artifacts: ParticipantArtifact[] = []

vi.mock('@/entities/personal/artifact.queries', async () => {
  const { queryOptions } = await import('@tanstack/react-query')
  return {
    artifactsQuery: (eventId: string) =>
      queryOptions({
        queryKey: ['personal-artifacts', eventId],
        queryFn: () => artifacts,
        retry: false,
      }),
    useCreateArtifact: () => ({ mutateAsync: create, isPending: false }),
    useUpdateArtifact: () => ({ mutateAsync: update, isPending: false }),
    useDeleteArtifact: () => ({ mutateAsync: remove, isPending: false }),
  }
})

const { ArtifactPanel } = await import('@/features/personal-layer/artifacts/artifact-panel')

function artifact(over: Partial<ParticipantArtifact> = {}): ParticipantArtifact {
  return {
    id: 'ar_42ej2s5gh7e8',
    event_id: 'ev_gma9hq8a96q5',
    kind: 'REPOSITORY',
    url: 'https://github.com/example/project',
    title: 'Project repository',
    sort_order: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...over,
  } as ParticipantArtifact
}

function submitButton(): HTMLElement {
  const buttons = screen.getAllByRole('button', { name: i18n.t('event:personal.artifacts.add') })
  const last = buttons.at(-1)
  if (last === undefined) throw new Error('no submit button on screen')
  return last
}

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

beforeEach(() => {
  for (const fn of [create, update, remove]) {
    fn.mockReset()
    fn.mockResolvedValue({})
  }
  artifacts = []
})

describe('the submissions screen', () => {
  it('invites the first submission when nothing is recorded', async () => {
    renderWithProviders(<ArtifactPanel eventId="ev_gma9hq8a96q5" />)

    expect(await screen.findByText(i18n.t('event:personal.artifacts.empty'))).toBeInTheDocument()
  })

  it('adds a submission with its address', async () => {
    const { user } = renderWithProviders(<ArtifactPanel eventId="ev_gma9hq8a96q5" />)

    await user.click(
      await screen.findByRole('button', { name: i18n.t('event:personal.artifacts.add') }),
    )
    await user.type(
      screen.getByLabelText(new RegExp(i18n.t('event:personal.artifacts.urlLabel'))),
      'https://github.com/me/thing',
    )
    await user.click(submitButton())

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://github.com/me/thing', kind: 'REPOSITORY' }),
    )
  })

  it('will not add a submission with no address', async () => {
    const { user } = renderWithProviders(<ArtifactPanel eventId="ev_gma9hq8a96q5" />)

    await user.click(
      await screen.findByRole('button', { name: i18n.t('event:personal.artifacts.add') }),
    )
    await user.click(submitButton())

    expect(create).not.toHaveBeenCalled()
    expect(screen.getByText(i18n.t('event:personal.artifacts.urlRequired'))).toBeInTheDocument()
  })

  it('lets the submitted mark be set and taken off, and calls it a self-report', async () => {
    artifacts = [artifact()]
    const { user } = renderWithProviders(<ArtifactPanel eventId="ev_gma9hq8a96q5" />)

    await screen.findByRole('link', { name: /Project repository/ })
    expect(screen.getByText(i18n.t('event:personal.artifacts.selfReport'))).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox'))
    expect(update).toHaveBeenCalledWith({ id: 'ar_42ej2s5gh7e8', body: { submitted: true } })
  })

  it('never calls the submitted mark confirmed or verified', async () => {
    artifacts = [artifact({ submitted_at: '2026-01-02T00:00:00Z' })]
    const { container } = renderWithProviders(<ArtifactPanel eventId="ev_gma9hq8a96q5" />)

    await screen.findByRole('link', { name: /Project repository/ })
    const shown = (container.textContent ?? '').toLowerCase()
    for (const word of ['confirmed', 'verified', 'validated', 'checked']) {
      expect(shown, `claims "${word}"`).not.toContain(word)
    }
  })

  it('reads a submission the server sent without a submitted_at as not submitted', async () => {
    artifacts = [artifact()]
    renderWithProviders(<ArtifactPanel eventId="ev_gma9hq8a96q5" />)

    expect(await screen.findByRole('checkbox')).not.toBeChecked()
  })

  it('falls back to the kind when a submission carries no title', async () => {
    artifacts = [artifact({ title: undefined, kind: 'VIDEO' })]
    renderWithProviders(<ArtifactPanel eventId="ev_gma9hq8a96q5" />)

    expect(
      await screen.findByRole('link', { name: i18n.t('event:personal.artifactKind.VIDEO') }),
    ).toBeInTheDocument()
  })
})
