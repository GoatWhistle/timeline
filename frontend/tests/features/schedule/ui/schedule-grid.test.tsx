import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { ScheduleGrid } from '@/features/schedule/ui/schedule-grid'
import { ScheduleLegend } from '@/features/schedule/ui/schedule-legend'
import type { TimelineResponse } from '@/shared/api/types.gen'

const data: TimelineResponse = {
  range: { from: '2026-01-01T00:00:00Z', to: '2026-04-01T00:00:00Z' },
  rows: [
    {
      event_id: 'e1',
      title: 'Зимний хакатон',
      state: 'ACTIVE',
      start_at: '2026-01-10T00:00:00Z',
      end_at: '2026-02-10T00:00:00Z',
      registration_deadline: '2026-01-20T00:00:00Z',
      team_role: 'Капитан',
      stages: [
        {
          id: 's1',
          name: 'Регистрация участников',
          type: 'REGISTRATION',
          start_at: '2026-01-10T00:00:00Z',
          end_at: '2026-01-20T00:00:00Z',
        },
        {
          id: 's2',
          name: 'Отбор заявок',
          type: 'SELECTION',
          start_at: '2026-01-18T00:00:00Z',
          end_at: '2026-02-01T00:00:00Z',
        },
      ],
    },
    {
      event_id: 'e2',
      title: 'Весенний митап',
      state: 'UPCOMING',
      start_at: '2026-03-01T00:00:00Z',
      end_at: '2026-03-02T00:00:00Z',
      stages: [],
    },
  ],
}

describe('ScheduleGrid', () => {
  it('показывает строку на каждое событие', () => {
    renderWithProviders(<ScheduleGrid data={data} scale="month" />)
    expect(screen.getByRole('link', { name: 'Зимний хакатон' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Весенний митап' })).toBeInTheDocument()
  })

  it('ведёт на карточку события по умолчанию', () => {
    renderWithProviders(<ScheduleGrid data={data} scale="month" />)
    expect(screen.getByRole('link', { name: 'Зимний хакатон' })).toHaveAttribute(
      'href',
      '/events/e1',
    )
  })

  it('уважает переданный построитель ссылки', () => {
    renderWithProviders(
      <ScheduleGrid
        data={data}
        scale="month"
        hrefBuilder={(row) => `/admin/events/${row.event_id}`}
      />,
    )
    expect(screen.getByRole('link', { name: 'Весенний митап' })).toHaveAttribute(
      'href',
      '/admin/events/e2',
    )
  })

  it('подписывает состояние и роль в команде', () => {
    renderWithProviders(<ScheduleGrid data={data} scale="month" />)
    expect(screen.getByText('Идёт · Капитан')).toBeInTheDocument()
    expect(screen.getByText('Предстоит')).toBeInTheDocument()
  })

  it('рисует полосу на каждый этап с доступной подписью', () => {
    renderWithProviders(<ScheduleGrid data={data} scale="month" />)
    expect(
      screen.getByRole('link', { name: /Регистрация участников\. Регистрация\./ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Отбор заявок\. Отбор\./ })).toBeInTheDocument()
  })

  it('рисует засечку дедлайна только там, где он задан', () => {
    renderWithProviders(<ScheduleGrid data={data} scale="month" />)
    expect(screen.getAllByRole('button', { name: /Дедлайн регистрации/ })).toHaveLength(1)
  })

  it('раскладывает пересекающиеся этапы на разные дорожки', () => {
    const { container } = renderWithProviders(<ScheduleGrid data={data} scale="month" />)
    const track = container.querySelector('[data-timeline-track]') as HTMLElement
    const bars = within(track).getAllByRole('link')
    const tops = bars.map((bar) => bar.style.top)
    expect(new Set(tops).size).toBe(2)
  })

  it('строит месячную и недельную сетку разной ширины', () => {
    const month = renderWithProviders(<ScheduleGrid data={data} scale="month" />)
    const monthTicks = month.container.querySelectorAll('.leading-9').length
    month.unmount()

    const week = renderWithProviders(<ScheduleGrid data={data} scale="week" />)
    const weekTicks = week.container.querySelectorAll('.leading-9').length

    expect(weekTicks).toBeGreaterThan(monthTicks)
  })

  it('закрепляет колонку названий', () => {
    const { container } = renderWithProviders(<ScheduleGrid data={data} scale="month" />)
    const label = container.querySelector('[data-timeline-label]')
    expect(label?.className).toContain('sticky')
  })

  it('переживает событие без этапов', () => {
    const empty: TimelineResponse = { range: data.range, rows: [] }
    const { container } = renderWithProviders(<ScheduleGrid data={empty} scale="month" />)
    expect(container.querySelectorAll('[data-timeline-track]')).toHaveLength(0)
  })
})

describe('ScheduleLegend', () => {
  it('перечисляет все типы этапов и дедлайн', () => {
    renderWithProviders(<ScheduleLegend />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(9)
    expect(screen.getByText('Регистрация')).toBeInTheDocument()
    expect(screen.getByText('Результаты')).toBeInTheDocument()
    expect(screen.getByText('Дедлайн регистрации')).toBeInTheDocument()
  })
})
