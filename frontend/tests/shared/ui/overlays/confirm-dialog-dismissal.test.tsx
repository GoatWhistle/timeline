import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { i18n } from '@/shared/i18n/config'
import { ConfirmDialog } from '@/shared/ui/overlays/confirm-dialog'

function Harness({ onConfirm = () => {} }: { onConfirm?: () => void }) {
  return (
    <ConfirmDialog
      open
      onOpenChange={() => {}}
      title="Deactivate the account?"
      description="This can be undone by an administrator."
      confirmLabel="Deactivate"
      destructive
      onConfirm={onConfirm}
    />
  )
}

beforeAll(async () => {
  await i18n.changeLanguage('ru')
})

describe('a confirmation closes the same way every other panel does', () => {
  it('is dismissable from outside, not a modal the pointer cannot leave', () => {
    render(<Harness />)

    const panel = screen.getByRole('alertdialog')
    expect(
      panel.getAttribute('data-slot'),
      'a confirmation built on the alert primitive refuses every outside click, unlike the rest of the app',
    ).toBe('dialog-content')
  })

  it('still announces itself as an alert, so it is not just another dialog', () => {
    render(<Harness />)

    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('shows no close cross beside the cancel it already offers', () => {
    render(<Harness />)

    const panel = screen.getByRole('alertdialog')
    const buttons = [...panel.querySelectorAll('button')].map(
      (button) => button.textContent?.trim() ?? '',
    )

    expect(buttons.filter((label) => label === '')).toHaveLength(0)
    expect(buttons).toContain('Deactivate')
  })

  it('runs the action when the confirming button is pressed', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<Harness onConfirm={onConfirm} />)

    await user.click(screen.getByRole('button', { name: 'Deactivate' }))

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1))
  })

  it('does not run the action when it is only dismissed', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<Harness onConfirm={onConfirm} />)

    await user.click(screen.getByRole('button', { name: i18n.t('common:action.cancel') }))

    expect(onConfirm).not.toHaveBeenCalled()
  })
})
