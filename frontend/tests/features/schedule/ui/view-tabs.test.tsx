import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { SCHEDULE_SCALES } from '@/features/schedule/model/schedule-scale'
import { ViewTabs } from '@/features/schedule/ui/view-tabs/view-tabs'
import { i18n } from '@/shared/i18n/config'

function renderTabs(props: Record<string, unknown> = {}) {
  return renderWithProviders(<ViewTabs value="month" onChange={vi.fn()} {...props} />)
}

describe('ViewTabs', () => {
  it('offers one tab per scale', () => {
    renderTabs()
    expect(screen.getAllByRole('tab')).toHaveLength(SCHEDULE_SCALES.length)
  })

  it('groups the tabs into one tablist', () => {
    renderTabs()
    expect(screen.getByRole('tablist')).toBeInTheDocument()
  })

  it('marks only the current scale as selected', () => {
    renderTabs()
    const selected = screen.getAllByRole('tab', { selected: true })
    expect(selected).toHaveLength(1)
    expect(selected[0]).toHaveTextContent(i18n.t('schedule.month'))
  })

  it('reports the chosen scale', async () => {
    const onChange = vi.fn()
    const { user } = renderTabs({ onChange })

    await user.click(screen.getByRole('tab', { selected: false, name: /week/i }))
    expect(onChange).toHaveBeenCalledWith('week')
  })

  it('offers no today control of its own beside the scales', () => {
    const { container } = renderTabs()
    expect(container.querySelector('[data-schedule-today]')).toBeNull()
    const names = screen.getAllByRole('tab').map((tab) => tab.textContent?.trim())
    expect(names).not.toContain(i18n.t('schedule.todayView'))
  })

  it('marks every scale distinctly so the tabs are not colour alone', () => {
    renderTabs()
    const names = screen.getAllByRole('tab').map((tab) => tab.textContent?.trim())
    expect(new Set(names).size).toBe(SCHEDULE_SCALES.length)
    for (const name of names) expect(name?.length ?? 0).toBeGreaterThan(0)
  })
})
