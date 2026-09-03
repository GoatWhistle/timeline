import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { SuggestInput } from '@/shared/ui/forms/suggest-input'

const NAMES = ['Alfa', 'Sber', 'Yandex']

function list(): HTMLElement {
  const node = document.querySelector<HTMLElement>('[role="listbox"]')
  if (!node) throw new Error('no listbox')
  return node
}

function options(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'))
}

describe('a suggestion list offers names without closing the field to new ones', () => {
  it('stays hidden until the field is entered', () => {
    renderWithProviders(
      <SuggestInput aria-label="Organizer" suggestions={NAMES} onPick={vi.fn()} />,
    )
    expect(list().hidden).toBe(true)
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens on focus and names every suggestion it was given', async () => {
    const { user } = renderWithProviders(
      <SuggestInput aria-label="Organizer" suggestions={NAMES} onPick={vi.fn()} />,
    )
    await user.click(screen.getByRole('combobox'))
    expect(list().hidden).toBe(false)
    expect(options().map((option) => option.textContent)).toEqual(NAMES)
  })

  it('keeps the field free text: typing a name nobody used still reaches the input', async () => {
    const { user } = renderWithProviders(
      <SuggestInput aria-label="Organizer" suggestions={NAMES} onPick={vi.fn()} />,
    )
    const input = screen.getByRole('combobox') as HTMLInputElement
    await user.type(input, 'A brand new organiser')
    expect(input.value).toBe('A brand new organiser')
  })

  it('walks the list with the arrow keys and picks with Enter, never with a mouse alone', async () => {
    const picked = vi.fn()
    const { user } = renderWithProviders(
      <SuggestInput aria-label="Organizer" suggestions={NAMES} onPick={picked} />,
    )
    const input = screen.getByRole('combobox')
    await user.click(input)
    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(input).toHaveAttribute('aria-activedescendant', options()[1]?.id)
    await user.keyboard('{Enter}')
    expect(picked).toHaveBeenCalledWith('Sber')
  })

  it('announces the active option to a screen reader rather than only colouring it', async () => {
    const { user } = renderWithProviders(
      <SuggestInput aria-label="Organizer" suggestions={NAMES} onPick={vi.fn()} />,
    )
    await user.click(screen.getByRole('combobox'))
    await user.keyboard('{ArrowDown}')
    const [first, second] = options()
    expect(first).toHaveAttribute('aria-selected', 'true')
    expect(second).toHaveAttribute('aria-selected', 'false')
  })

  it('closes on Escape without picking anything', async () => {
    const picked = vi.fn()
    const { user } = renderWithProviders(
      <SuggestInput aria-label="Organizer" suggestions={NAMES} onPick={picked} />,
    )
    await user.click(screen.getByRole('combobox'))
    await user.keyboard('{ArrowDown}{Escape}')
    expect(list().hidden).toBe(true)
    expect(picked).not.toHaveBeenCalled()
  })

  it('offers nothing at all when the platform knows no organiser yet', async () => {
    const { user } = renderWithProviders(
      <SuggestInput aria-label="Organizer" suggestions={[]} onPick={vi.fn()} />,
    )
    await user.click(screen.getByRole('combobox'))
    expect(list().hidden).toBe(true)
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false')
  })
})
