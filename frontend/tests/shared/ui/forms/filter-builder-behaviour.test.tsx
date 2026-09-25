import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { i18n, i18nReady } from '@/shared/i18n/config'
import { FilterDateRange } from '@/shared/ui/forms/filter-builder/filter-date-range'
import { FilterRowList } from '@/shared/ui/forms/filter-builder/filter-row-list'
import { useFilterRows } from '@/shared/ui/forms/filter-builder/use-filter-rows'

beforeAll(async () => {
  await i18nReady
  await i18n.changeLanguage('en')
})

function Rows({ keys }: { keys: string[] }) {
  return (
    <FilterRowList>
      {keys.map((key) => (
        <span key={key}>{key}</span>
      ))}
    </FilterRowList>
  )
}

function rowOf(text: string) {
  return screen.getByText(text).closest('li') as HTMLElement
}

describe('a filter row eases in and out instead of popping', () => {
  it('leaves rows that were already there at rest when the list first appears', () => {
    render(<Rows keys={['state']} />)
    expect(rowOf('state').dataset.rowPhase).toBe('idle')
  })

  it('starts a new row collapsed, so it has somewhere to grow from', () => {
    const { rerender } = render(<Rows keys={['state']} />)
    rerender(<Rows keys={['state', 'kind']} />)
    expect(rowOf('kind').dataset.rowPhase).toBe('enter')
  })

  it('keeps the very same element for a removed row while it collapses, then lets it go', async () => {
    const { rerender } = render(<Rows keys={['state', 'kind']} />)
    const before = rowOf('kind')
    rerender(<Rows keys={['state']} />)
    const leaving = rowOf('kind')
    expect(leaving, 'the row was rebuilt, so there is nothing to animate').toBe(before)
    expect(leaving.dataset.rowPhase).toBe('leave')
    expect(leaving.hasAttribute('inert'), 'a collapsing row still takes clicks').toBe(true)
    await waitFor(() => expect(screen.queryByText('kind')).toBeNull())
  })
})

describe('a filter being set up does not filter yet', () => {
  it('shows an added field before it has a value, and forgets it when the panel closes', () => {
    const { result } = renderHook(() => useFilterRows(['state', 'kind', 'format'], () => false))
    act(() => result.current.add('kind'))
    expect(result.current.rows).toEqual(['kind'])
    expect(result.current.fresh).toBe('kind')
    expect(result.current.available).toEqual(['state', 'format'])
    act(() => result.current.settle())
    expect(result.current.rows).toEqual([])
  })

  it('keeps a row on screen while its value is being retyped', () => {
    const active = new Set(['state'])
    const { result, rerender } = renderHook(() =>
      useFilterRows(['state', 'kind'], (field) => active.has(field)),
    )
    act(() => result.current.begin())
    active.delete('state')
    rerender()
    expect(result.current.rows, 'the row vanished under the cursor').toEqual(['state'])
  })

  it('swaps a field in place rather than moving it to the end', () => {
    const active = new Set(['state', 'kind'])
    const { result, rerender } = renderHook(() =>
      useFilterRows(['state', 'kind', 'format'], (field) => active.has(field)),
    )
    act(() => result.current.swap('state', 'format'))
    active.delete('state')
    rerender()
    expect(result.current.rows).toEqual(['format', 'kind'])
  })
})

function RangeHarness({
  start,
  onChange,
}: {
  start: { from: string; to: string }
  onChange: (r: { from: string; to: string }) => void
}) {
  const [range, setRange] = useState(start)
  return (
    <FilterDateRange
      id="range"
      from={range.from}
      to={range.to}
      onChange={(next) => {
        onChange(next)
        setRange(next)
      }}
    />
  )
}

describe('a date range never runs backwards', () => {
  it('holds back an end typed before the start and says why, next to the field', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<RangeHarness start={{ from: '2026-09-10', to: '' }} onChange={onChange} />)
    await user.type(document.getElementById('range-to') as HTMLElement, '01092026')
    expect(onChange, 'a backwards range reached the list').not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toBe("The start can't be after the end.")
    expect(document.getElementById('range-to')?.getAttribute('aria-invalid')).toBe('true')
  })

  it('applies the held end on its own once the start is moved before it', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<RangeHarness start={{ from: '2026-09-10', to: '' }} onChange={onChange} />)
    const to = document.getElementById('range-to') as HTMLElement
    const from = document.getElementById('range-from') as HTMLElement
    await user.type(to, '01092026')
    await user.clear(from)
    await user.type(from, '01082026')
    expect(onChange).toHaveBeenLastCalledWith({ from: '2026-08-01', to: '2026-09-01' })
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
