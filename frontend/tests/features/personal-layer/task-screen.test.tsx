import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ParticipantTask } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

const create = vi.fn()
const update = vi.fn()
const remove = vi.fn()
const apply = vi.fn()
let tasks: ParticipantTask[] = []
let failure: unknown = null

vi.mock('@/entities/personal/task.queries', async () => {
  const { queryOptions } = await import('@tanstack/react-query')
  return {
    tasksQuery: (eventId: string) =>
      queryOptions({
        queryKey: ['personal-tasks', eventId],
        queryFn: () => {
          if (failure !== null) throw failure
          return tasks
        },
        retry: false,
      }),
    templatesQuery: () =>
      queryOptions({ queryKey: ['personal-templates'], queryFn: () => ({ items: [] }) }),
    useCreateTask: () => ({ mutateAsync: create, isPending: false }),
    useUpdateTask: () => ({ mutateAsync: update, isPending: false }),
    useDeleteTask: () => ({ mutateAsync: remove, isPending: false }),
    useApplyTemplate: () => ({ mutateAsync: apply, isPending: false }),
  }
})

const { TaskPanel } = await import('@/features/personal-layer/tasks/task-panel')

function task(over: Partial<ParticipantTask> = {}): ParticipantTask {
  return {
    id: 'tk_42ej2s5gh7e8',
    event_id: 'ev_gma9hq8a96q5',
    title: 'Record the demo video',
    sort_order: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...over,
  }
}

function submitButton(): HTMLElement {
  const buttons = screen.getAllByRole('button', { name: i18n.t('event:personal.tasks.add') })
  const last = buttons.at(-1)
  if (last === undefined) throw new Error('no submit button on screen')
  return last
}

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

beforeEach(() => {
  for (const fn of [create, update, remove, apply]) {
    fn.mockReset()
    fn.mockResolvedValue({})
  }
  tasks = []
  failure = null
})

describe('the task screen', () => {
  it('offers to add the first task when the list is empty', async () => {
    renderWithProviders(<TaskPanel eventId="ev_gma9hq8a96q5" stages={[]} />)

    expect(await screen.findByText(i18n.t('event:personal.tasks.empty'))).toBeInTheDocument()
    expect(screen.getByText(i18n.t('event:personal.tasks.emptyHint'))).toBeInTheDocument()
  })

  it('creates a task with the title typed in', async () => {
    const { user } = renderWithProviders(<TaskPanel eventId="ev_gma9hq8a96q5" stages={[]} />)

    await user.click(
      await screen.findByRole('button', { name: i18n.t('event:personal.tasks.add') }),
    )
    await user.type(
      screen.getByLabelText(new RegExp(i18n.t('event:personal.tasks.titleLabel'))),
      'Install the SDK',
    )
    await user.click(submitButton())

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ title: 'Install the SDK' }))
  })

  it('refuses to create a task with no title', async () => {
    const { user } = renderWithProviders(<TaskPanel eventId="ev_gma9hq8a96q5" stages={[]} />)

    await user.click(
      await screen.findByRole('button', { name: i18n.t('event:personal.tasks.add') }),
    )
    await user.click(submitButton())

    expect(create).not.toHaveBeenCalled()
    expect(screen.getByText(i18n.t('event:personal.tasks.titleRequired'))).toBeInTheDocument()
  })

  it('marks a task done and takes the mark off again, both ways round', async () => {
    tasks = [task()]
    const { user } = renderWithProviders(<TaskPanel eventId="ev_gma9hq8a96q5" stages={[]} />)

    await user.click(
      await screen.findByRole('checkbox', {
        name: i18n.t('event:personal.tasks.markDone', { title: 'Record the demo video' }),
      }),
    )
    expect(update).toHaveBeenCalledWith({ id: 'tk_42ej2s5gh7e8', body: { done: true } })

    tasks = [task({ done_at: '2026-01-02T00:00:00Z' })]
    update.mockClear()
    const second = renderWithProviders(<TaskPanel eventId="ev_gma9hq8a96q5" stages={[]} />)
    await second.user.click(
      await screen.findByRole('checkbox', {
        name: i18n.t('event:personal.tasks.markUndone', { title: 'Record the demo video' }),
      }),
    )
    expect(update).toHaveBeenCalledWith({ id: 'tk_42ej2s5gh7e8', body: { done: false } })
  })

  it('reads a task the server sent without a done_at as not done', async () => {
    tasks = [task()]
    renderWithProviders(<TaskPanel eventId="ev_gma9hq8a96q5" stages={[]} />)

    const box = await screen.findByRole('checkbox')
    expect(box).not.toBeChecked()
    expect(
      screen.getByText(i18n.t('event:personal.tasks.counter', { done: 0, total: 1 })),
    ).toBeInTheDocument()
  })

  it('shows no due date and no notes when the server omitted them', async () => {
    tasks = [task()]
    const { container } = renderWithProviders(<TaskPanel eventId="ev_gma9hq8a96q5" stages={[]} />)

    await screen.findByRole('checkbox')
    expect(container.textContent).not.toContain('Invalid')
    expect(screen.queryByText(i18n.t('event:personal.tasks.overdue'))).not.toBeInTheDocument()
  })

  it('counts what is done out of the whole list', async () => {
    tasks = [task(), task({ id: 'tk_2', done_at: '2026-01-02T00:00:00Z' })]
    renderWithProviders(<TaskPanel eventId="ev_gma9hq8a96q5" stages={[]} />)

    expect(
      await screen.findByText(i18n.t('event:personal.tasks.counter', { done: 1, total: 2 })),
    ).toBeInTheDocument()
  })

  it('shows a template-created task by its translated name, not by its key', async () => {
    tasks = [task({ title: 'task.read_rules' })]
    renderWithProviders(<TaskPanel eventId="ev_gma9hq8a96q5" stages={[]} />)

    expect(
      await screen.findByText(i18n.t('event:personal.template.item.task.read_rules')),
    ).toBeInTheDocument()
    expect(screen.queryByText('task.read_rules')).not.toBeInTheDocument()
  })
})
