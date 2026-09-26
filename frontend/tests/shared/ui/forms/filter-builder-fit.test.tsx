import { render, screen, within } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { i18n, i18nReady } from '@/shared/i18n/config'
import { FilterCondition, FilterPopover } from '@/shared/ui/forms/filter-builder/filter-builder'
import { FilterDateRange } from '@/shared/ui/forms/filter-builder/filter-date-range'

function pretendPhone(phone: boolean) {
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        matches: phone && query.includes('max-width'),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  )
}

function openFilters() {
  return renderWithProviders(
    <FilterPopover
      count={1}
      available={[{ value: 'kind', label: 'Kind' }]}
      onAdd={() => {}}
      onReset={() => {}}
    >
      {null}
    </FilterPopover>,
  )
}

const tokens = (element: Element | null | undefined) => element?.className.split(/\s+/) ?? []

beforeAll(async () => {
  await i18nReady
  await i18n.changeLanguage('en')
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the filters open in a way that fits the screen they are on', () => {
  it('slides up from the bottom on a phone, titled, with reset and close in its header', async () => {
    pretendPhone(true)
    const { user } = openFilters()
    await user.click(screen.getByRole('button', { name: 'Filters: 1 active' }))
    const sheet = await screen.findByRole('dialog', { name: 'Filters' })
    expect(sheet.hasAttribute('data-sheet'), 'a phone got the floating panel').toBe(true)
    const header = sheet.querySelector('header') as HTMLElement
    expect(within(header).getByRole('button', { name: 'Reset' })).toBeTruthy()
    expect(within(header).getByRole('button', { name: /close/i })).toBeTruthy()
  })

  it('hangs from the left of its button on a desk, clear of the window edge', async () => {
    pretendPhone(false)
    const { user } = openFilters()
    await user.click(screen.getByRole('button', { name: 'Filters: 1 active' }))
    const panel = await screen.findByRole('dialog', { name: 'Filters' })
    expect(panel.hasAttribute('data-sheet')).toBe(false)
    expect(panel.getAttribute('data-align'), 'the panel swings left over the sidebar').toBe('start')
    expect(tokens(panel)).toContain('max-w-[calc(100vw-1.5rem)]')
    expect(tokens(panel), 'a long list can run off the bottom').toContain(
      'max-h-(--radix-popover-content-available-height)',
    )
  })
})

describe('a condition reflows instead of overflowing a narrow panel', () => {
  it('stacks the operator and value under the field when the panel is narrow', () => {
    render(
      <FilterCondition
        field="kind"
        fields={[{ value: 'kind', label: 'Kind' }]}
        operator="is"
        onField={() => {}}
        onRemove={() => {}}
      >
        <span>value</span>
      </FilterCondition>,
    )
    const row = document.querySelector('[data-filter-condition]')
    expect(tokens(row)).toContain('grid-cols-[3.5rem_minmax(0,1fr)_2rem]')
    expect(tokens(row)).toContain('@xl:grid-cols-[8.5rem_3.5rem_minmax(0,1fr)_2rem]')
    const value = screen.getByText('value').parentElement
    expect(tokens(value), 'the value no longer drops to its own line').toContain('row-start-2')
    expect(tokens(value)).toContain('@xl:row-start-1')
  })

  it('puts the two dates one above the other when they would not fit side by side', () => {
    const { container } = render(
      <FilterDateRange id="r" from="2026-09-01" to="2026-09-30" onChange={() => {}} />,
    )
    const grid = container.querySelector('#r-from')?.closest('.grid')
    expect(tokens(grid)).toContain('grid-cols-1')
    expect(tokens(grid)).toContain('@[20rem]/range:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]')
  })
})
