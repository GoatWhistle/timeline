import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { I18nProvider } from '@/shared/i18n/i18n-context'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/overlays/dialog'
import { Button } from '@/shared/ui/primitives/button'

function Harness({ openerLabel = 'Create' }: { openerLabel?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <I18nProvider>
      <Button onClick={() => setOpen(true)}>{openerLabel}</Button>
      <Button>Another control</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New event</DialogTitle>
          </DialogHeader>
          <input aria-label="Title" />
        </DialogContent>
      </Dialog>
    </I18nProvider>
  )
}

describe('closing a dialog gives the keyboard back where it was taken from', () => {
  it('returns focus to the control that opened it after Escape', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const opener = screen.getByRole('button', { name: 'Create' })

    opener.focus()
    await user.click(opener)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(opener).not.toHaveFocus()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  it('returns focus to the opener after the close button, not only after Escape', async () => {
    const user = userEvent.setup()
    render(<Harness openerLabel="Invite" />)
    const opener = screen.getByRole('button', { name: 'Invite' })

    opener.focus()
    await user.click(opener)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /close/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  it('lands on the opener itself, not merely somewhere focusable', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const opener = screen.getByRole('button', { name: 'Create' })
    const other = screen.getByRole('button', { name: 'Another control' })

    opener.focus()
    await user.click(opener)
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')

    expect(document.activeElement).toBe(opener)
    expect(other).not.toHaveFocus()
    expect(document.body).not.toHaveFocus()
  })
})
