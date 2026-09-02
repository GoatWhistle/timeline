import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ParticipantArtifact, ParticipantTask } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

let tasks: ParticipantTask[] = []
let artifacts: ParticipantArtifact[] = []
let note = ''

vi.mock('@/entities/personal/task.queries', async () => {
  const { queryOptions } = await import('@tanstack/react-query')
  return {
    tasksQuery: (id: string) =>
      queryOptions({ queryKey: ['personal-tasks', id], queryFn: () => tasks, retry: false }),
  }
})

vi.mock('@/entities/personal/note.queries', async () => {
  const { queryOptions } = await import('@tanstack/react-query')
  return {
    noteQuery: (id: string) =>
      queryOptions({ queryKey: ['personal-note', id], queryFn: () => note, retry: false }),
  }
})

vi.mock('@/entities/personal/artifact.queries', async () => {
  const { queryOptions } = await import('@tanstack/react-query')
  return {
    artifactsQuery: (id: string) =>
      queryOptions({
        queryKey: ['personal-artifacts', id],
        queryFn: () => artifacts,
        retry: false,
      }),
  }
})

const { PersonalSummary } = await import('@/features/personal-layer/shell/personal-summary')

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

beforeEach(() => {
  tasks = []
  artifacts = []
  note = ''
})

describe('the summary on the event card', () => {
  it('stays away entirely for an event the viewer has not joined', () => {
    const { container } = renderWithProviders(
      <PersonalSummary eventId="ev_gma9hq8a96q5" enabled={false} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('says nothing is kept yet once the queries have settled', async () => {
    renderWithProviders(<PersonalSummary eventId="ev_gma9hq8a96q5" enabled={true} />)

    expect(await screen.findByText(i18n.t('event:personal.summary.nothing'))).toBeInTheDocument()
  })

  it('counts what the viewer keeps and links into the full section', async () => {
    tasks = [
      { id: 'tk_1', title: 'a' } as ParticipantTask,
      { id: 'tk_2', title: 'b', done_at: '2026-01-02T00:00:00Z' } as ParticipantTask,
    ]
    note = 'kept'
    artifacts = [{ id: 'ar_1', kind: 'REPOSITORY', url: 'https://e.org' } as ParticipantArtifact]

    renderWithProviders(<PersonalSummary eventId="ev_gma9hq8a96q5" enabled={true} />)

    expect(
      await screen.findByText(i18n.t('event:personal.summary.tasks', { done: 1, total: 2 })),
    ).toBeInTheDocument()
    expect(screen.getByText(i18n.t('event:personal.summary.noteKept'))).toBeInTheDocument()
    expect(
      screen.getByText(i18n.t('event:personal.summary.artifacts', { count: 1 })),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: i18n.t('event:personal.summary.open') }),
    ).toHaveAttribute('href', '/events/ev_gma9hq8a96q5#personal-layer')
  })

  it('never shows a foreign identifier, only counts', async () => {
    tasks = [{ id: 'tk_secret_of_someone', title: 'private' } as ParticipantTask]

    const { container } = renderWithProviders(
      <PersonalSummary eventId="ev_gma9hq8a96q5" enabled={true} />,
    )

    await screen.findByText(i18n.t('event:personal.summary.tasks', { done: 0, total: 1 }))
    expect(container.textContent).not.toContain('tk_secret_of_someone')
    expect(container.textContent).not.toContain('private')
  })
})
