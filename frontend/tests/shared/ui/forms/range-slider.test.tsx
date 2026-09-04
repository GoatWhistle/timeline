import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@tests/support/render'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { RangeSlider, type RangeValue } from '@/shared/ui/forms/range-slider/range-slider'
import { keyTarget, nearestHandle, withHandle } from '@/shared/ui/forms/range-slider/range-value'

const BOUNDS = { min: 1, max: 10 }

function Harness({ initial }: { initial: RangeValue }) {
  const [value, setValue] = useState(initial)
  return (
    <RangeSlider
      id="team"
      bounds={BOUNDS}
      value={value}
      lowLabel="Smallest"
      highLabel="Largest"
      summary={`${value.low}-${value.high} members`}
      valueText={(amount) => `${amount} members`}
      onChange={setValue}
    />
  )
}

function handles(): HTMLElement[] {
  return screen.getAllByRole('slider')
}

describe('both handles are reachable and announced', () => {
  it('gives each handle a slider role with its own bounds and value', () => {
    renderWithProviders(<Harness initial={{ low: 2, high: 6 }} />)
    const [low, high] = handles()
    expect(low).toHaveAttribute('aria-valuenow', '2')
    expect(low).toHaveAttribute('aria-valuetext', '2 members')
    expect(low).toHaveAttribute('aria-valuemin', '1')
    expect(low).toHaveAttribute('aria-valuemax', '10')
    expect(low).toHaveAccessibleName('Smallest')
    expect(high).toHaveAttribute('aria-valuenow', '6')
    expect(high).toHaveAccessibleName('Largest')
  })

  it('reaches both handles by tab, in order', async () => {
    const { user } = renderWithProviders(<Harness initial={{ low: 2, high: 6 }} />)
    const [low, high] = handles()
    await user.tab()
    expect(low).toHaveFocus()
    await user.tab()
    expect(high).toHaveFocus()
  })
})

describe('the arrows move the focused handle', () => {
  it('moves the smallest bound up and down by one', async () => {
    const { user } = renderWithProviders(<Harness initial={{ low: 2, high: 6 }} />)
    await user.tab()
    await user.keyboard('{ArrowRight}')
    expect(handles()[0]).toHaveAttribute('aria-valuenow', '3')
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(handles()[0]).toHaveAttribute('aria-valuenow', '1')
  })

  it('jumps to the ends with Home and End', async () => {
    const { user } = renderWithProviders(<Harness initial={{ low: 4, high: 6 }} />)
    await user.tab()
    await user.keyboard('{Home}')
    expect(handles()[0]).toHaveAttribute('aria-valuenow', '1')
    await user.tab()
    await user.keyboard('{End}')
    expect(handles()[1]).toHaveAttribute('aria-valuenow', '10')
  })

  it('updates the announced text as the handle moves', async () => {
    const { user } = renderWithProviders(<Harness initial={{ low: 2, high: 6 }} />)
    await user.tab()
    await user.keyboard('{ArrowRight}')
    expect(handles()[0]).toHaveAttribute('aria-valuetext', '3 members')
  })
})

describe('the minimum can never pass the maximum', () => {
  it('stops the smallest bound at the largest', async () => {
    const { user } = renderWithProviders(<Harness initial={{ low: 2, high: 4 }} />)
    await user.tab()
    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}')
    expect(handles()[0]).toHaveAttribute('aria-valuenow', '4')
    expect(handles()[1]).toHaveAttribute('aria-valuenow', '4')
  })

  it('stops the largest bound at the smallest', async () => {
    const { user } = renderWithProviders(<Harness initial={{ low: 4, high: 6 }} />)
    await user.tab()
    await user.tab()
    await user.keyboard('{Home}')
    expect(handles()[1]).toHaveAttribute('aria-valuenow', '4')
    expect(handles()[0]).toHaveAttribute('aria-valuenow', '4')
  })

  it('lets the mouse pull either handle back out when the two coincide', () => {
    expect(nearestHandle(2, { low: 5, high: 5 })).toBe('low')
    expect(nearestHandle(8, { low: 5, high: 5 })).toBe('high')
    expect(nearestHandle(1, { low: 10, high: 10 })).toBe('low')
    expect(nearestHandle(10, { low: 1, high: 1 })).toBe('high')
  })

  it('clamps every reachable value in the pure model', () => {
    expect(withHandle({ low: 2, high: 5 }, 'low', 9, BOUNDS)).toEqual({ low: 5, high: 5 })
    expect(withHandle({ low: 2, high: 5 }, 'high', 0, BOUNDS)).toEqual({ low: 2, high: 2 })
    expect(withHandle({ low: 2, high: 5 }, 'low', -3, BOUNDS)).toEqual({ low: 1, high: 5 })
    expect(withHandle({ low: 2, high: 5 }, 'high', 42, BOUNDS)).toEqual({ low: 2, high: 10 })
  })
})

describe('the handles carry no visible label of their own', () => {
  it('names each handle only for a screen reader', () => {
    renderWithProviders(<Harness initial={{ low: 2, high: 6 }} />)
    expect(screen.queryByText('Smallest')).toBeNull()
    expect(screen.queryByText('Largest')).toBeNull()
    for (const handle of handles()) expect(handle.textContent).toBe('')
  })

  it('states the chosen range once, away from the handles', () => {
    renderWithProviders(<Harness initial={{ low: 2, high: 6 }} />)
    const shown = screen.getByText('2-6 members')
    expect(shown).toHaveAttribute('aria-hidden', 'true')
    expect(shown.closest('[role="slider"]')).toBeNull()
  })
})

describe('paging jumps a tenth of the range and twice that with shift', () => {
  const wide = { min: 0, max: 100 }
  const value = { low: 40, high: 60 }

  it('pages the low handle by a tenth and by a fifth with shift held', () => {
    expect(keyTarget('PageUp', 'low', value, wide)).toBe(50)
    expect(keyTarget('PageUp', 'low', value, wide, true)).toBe(60)
    expect(keyTarget('PageDown', 'low', value, wide)).toBe(30)
    expect(keyTarget('PageDown', 'low', value, wide, true)).toBe(20)
  })

  it('pages the high handle by the same amounts', () => {
    expect(keyTarget('PageUp', 'high', value, wide)).toBe(70)
    expect(keyTarget('PageUp', 'high', value, wide, true)).toBe(80)
  })

  it('leaves the arrow keys at a single step whether or not shift is held', () => {
    expect(keyTarget('ArrowRight', 'low', value, wide)).toBe(41)
    expect(keyTarget('ArrowRight', 'low', value, wide, true)).toBe(41)
  })
})

describe('the thumb forwards the shift modifier it is pressed with', () => {
  function WideHarness() {
    const [value, setValue] = useState<RangeValue>({ low: 10, high: 100 })
    return (
      <RangeSlider
        id="wide"
        bounds={{ min: 0, max: 100 }}
        value={value}
        lowLabel="Smallest"
        highLabel="Largest"
        summary={`${value.low}-${value.high} members`}
        valueText={(amount) => `${amount} members`}
        onChange={setValue}
      />
    )
  }

  it('pages twice as far when shift is held down on the handle', async () => {
    const user = userEvent.setup()
    renderWithProviders(<WideHarness />)
    const low = screen.getByRole('slider', { name: 'Smallest' })

    low.focus()
    await user.keyboard('{PageUp}')
    expect(low).toHaveAttribute('aria-valuenow', '20')

    await user.keyboard('{Shift>}{PageUp}{/Shift}')
    expect(low).toHaveAttribute('aria-valuenow', '40')
  })
})
