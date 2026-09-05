import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/overlays/popover'

function renderPopover() {
  return renderWithProviders(
    <Popover>
      <PopoverTrigger>Open</PopoverTrigger>
      <PopoverContent>
        <p>Nothing selected yet.</p>
        <button type="button">First action</button>
        <button type="button">Second action</button>
      </PopoverContent>
    </Popover>,
  )
}

describe('a popover hosting ordinary controls stays reachable by Tab', () => {
  it('opens as a dialog, not a menu, so Tab is not repurposed for arrow-key roving', async () => {
    const { user } = renderPopover()
    await user.click(screen.getByText('Open'))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('lands focus on the first control as soon as it opens, even past a non-interactive line of text', async () => {
    const { user } = renderPopover()
    await user.click(screen.getByText('Open'))
    await screen.findByRole('dialog')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'First action' }))
  })

  it('keeps tabbing forward across every control rather than parking on one wrapper', async () => {
    const { user } = renderPopover()
    await user.click(screen.getByText('Open'))
    await screen.findByRole('dialog')
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Second action' }))
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    const { user } = renderPopover()
    const trigger = screen.getByText('Open')
    await user.click(trigger)
    await screen.findByRole('dialog')

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(trigger)
  })
})
