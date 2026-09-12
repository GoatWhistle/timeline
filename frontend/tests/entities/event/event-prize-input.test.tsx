import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { EventForm } from '@/entities/event/event-form'
import { EVENT, fixMoscowClock, goToStage } from './event-form.harness'

fixMoscowClock()

function prizeInput(): HTMLInputElement {
  const node = document.getElementById('event-prize-pool')
  if (!node) throw new Error('no prize pool input')
  return node as HTMLInputElement
}

async function openPrizeStage() {
  const rendered = renderWithProviders(
    <EventForm event={EVENT} mode="edit" submitLabel="Save" onSubmit={vi.fn()} />,
  )
  return rendered
}

describe('the prize pool takes whole numbers only', () => {
  it('refuses a dot as it is typed, not merely on display', async () => {
    const { user } = await openPrizeStage()
    const input = prizeInput()
    await user.click(input)
    await user.keyboard('1234.56')
    expect(input).toHaveAttribute('data-value', '123456')
  })

  it('refuses a comma the same way', async () => {
    const { user } = await openPrizeStage()
    const input = prizeInput()
    await user.click(input)
    await user.keyboard('9,000')
    expect(input).toHaveAttribute('data-value', '9000')
  })

  it('keeps the digits a person actually meant to enter, grouped for reading', async () => {
    const { user } = await openPrizeStage()
    const input = prizeInput()
    await user.click(input)
    await user.keyboard('50000')
    expect(input).toHaveAttribute('data-value', '50000')
    expect(input.value).toBe('50,000')
  })

  it('asks the keyboard for digits rather than a decimal pad', async () => {
    await openPrizeStage()
    expect(prizeInput()).toHaveAttribute('inputMode', 'numeric')
  })
})

describe('the staged form guards the prize pool the same way', () => {
  it('refuses a dot on the prize stage of a new hackathon', async () => {
    const { user } = renderWithProviders(<EventForm submitLabel="Create" onSubmit={vi.fn()} />)
    await goToStage(user, 'prize')
    const input = prizeInput()
    await user.click(input)
    await user.keyboard('7.5')
    expect(input).toHaveAttribute('data-value', '75')
  })
})
