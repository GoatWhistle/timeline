import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { I18nProvider } from '@/shared/i18n/i18n-context'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/overlays/dialog'
import { Button } from '@/shared/ui/primitives/button'

function mount() {
  return render(
    <I18nProvider>
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite somebody</DialogTitle>
          </DialogHeader>
          <input aria-label="Email" />
          <DialogFooter>
            <Button>Cancel</Button>
            <Button>Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </I18nProvider>,
  )
}

function tabbable(): HTMLElement[] {
  const panel = screen.getByRole('dialog')
  return [...panel.querySelectorAll<HTMLElement>('button, input')].filter(
    (node) => !(node as HTMLButtonElement).disabled,
  )
}

describe('a dialog is reached in the order it is read', () => {
  it('puts the close control before the content it closes, not after it', () => {
    mount()
    const order = tabbable()
    const close = screen.getByRole('button', { name: /close/i })

    expect(order.indexOf(close), 'the close control is not in the dialog').toBeGreaterThanOrEqual(0)
    expect(
      order.indexOf(close),
      'the close control sits at the top of the dialog but is tabbed to last',
    ).toBe(0)
  })

  it('still leaves the content controls in their written order behind it', () => {
    mount()
    const labels = tabbable().map(
      (node) => node.getAttribute('aria-label') ?? node.textContent?.trim() ?? '',
    )
    expect(labels.slice(1)).toEqual(['Email', 'Cancel', 'Send'])
  })

  it('keeps the close control pinned to the corner it is drawn in', () => {
    mount()
    const close = screen.getByRole('button', { name: /close/i })
    expect(close.className).toContain('absolute')
  })
})
