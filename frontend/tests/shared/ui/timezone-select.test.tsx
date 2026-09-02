import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { i18n } from '@/shared/i18n/config'
import { TimezoneSelect } from '@/shared/ui/primitives/timezone-select/timezone-select'
import { clockIn } from '@/shared/ui/primitives/timezone-select/zone-list'

function renderSelect(value = 'Europe/Moscow') {
  const onChange = vi.fn()
  const view = renderWithProviders(<TimezoneSelect value={value} onChange={onChange} />)
  return { ...view, onChange }
}

function zoneList(): HTMLElement {
  return screen.getByRole('list', { name: i18n.t('timezone.legend') })
}

function searchBox(): HTMLInputElement {
  return screen.getByLabelText(i18n.t('timezone.search')) as HTMLInputElement
}

describe('the time zone is chosen by looking at the clock, not by reading names', () => {
  it('shows the current time in the chosen zone, which is what answers "did I pick the right one"', () => {
    renderSelect('Asia/Tokyo')
    const expected = clockIn('Asia/Tokyo', new Date())
    expect(screen.getAllByText(expected).length).toBeGreaterThan(0)
  })

  it('gives every zone in the list its own clock', () => {
    renderSelect()
    const rows = within(zoneList()).getAllByRole('button')
    const times = rows.map((row) => row.textContent ?? '')
    expect(times.every((text) => /\d{2}:\d{2}/.test(text))).toBe(true)
  })

  it('puts the zone the browser reports first, so the likely answer is at the top', () => {
    renderSelect()
    const rows = within(zoneList()).getAllByRole('button')
    const first = rows[0]?.textContent ?? ''
    expect(first).toContain(i18n.t('timezone.detected'))
  })

  it('narrows the list by city, because hundreds of zones cannot be scanned', async () => {
    const { user } = renderSelect()
    await user.type(searchBox(), 'tokyo')

    const rows = within(zoneList()).getAllByRole('button')
    expect(rows).toHaveLength(1)
    expect(rows[0]?.textContent).toContain('Tokyo')
  })

  it('says so plainly when nothing matches', async () => {
    const { user } = renderSelect()
    await user.type(searchBox(), 'zzzzz')

    expect(within(zoneList()).queryAllByRole('button')).toHaveLength(0)
    expect(screen.getByText(i18n.t('timezone.nothingFound'))).toBeInTheDocument()
  })

  it('reports the chosen zone when a row is pressed', async () => {
    const { user, onChange } = renderSelect()
    await user.type(searchBox(), 'tokyo')
    await user.click(within(zoneList()).getAllByRole('button')[0] as HTMLElement)

    expect(onChange).toHaveBeenCalledWith('Asia/Tokyo')
  })

  it('marks the current choice with a tick, not with colour alone', () => {
    renderSelect('Asia/Tokyo')
    const current = within(zoneList())
      .getAllByRole('button')
      .find((row) => row.getAttribute('aria-current') === 'true')

    expect(current?.textContent).toContain('Tokyo')
    expect(current?.querySelector('svg')?.classList.contains('invisible')).toBe(false)
  })
})
