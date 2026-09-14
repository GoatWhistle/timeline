import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it } from 'vitest'
import { EmailChangeCard } from '@/features/profile/email-change-card/email-change-card'
import { i18n } from '@/shared/i18n/config'

const telegram = readFileSync(
  join(process.cwd(), 'src/features/profile/telegram-link-card/telegram-link-card.tsx'),
  'utf8',
)
const channel = readFileSync(
  join(process.cwd(), 'src/features/profile/channel-card/channel-card.tsx'),
  'utf8',
)

function renderEmail(pendingEmail?: string, emailVerified = false) {
  return renderWithProviders(
    <EmailChangeCard
      email="member@example.com"
      emailVerified={emailVerified}
      pendingEmail={pendingEmail}
    />,
  )
}

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

describe('the account channels read as one system', () => {
  it('names each channel plainly, with no action folded into the title', () => {
    for (const key of ['common:profile.emailTitle', 'common:account.telegramTitle']) {
      const title = i18n.t(key)
      expect(title.split(/\s+/), `${key} carries more than the channel name`).toHaveLength(1)
    }
  })

  it('shows the address itself under the Email title', () => {
    renderEmail()

    expect(
      screen.getByText('member@example.com'),
      'a channel card that never names the address leaves the reader guessing',
    ).toBeInTheDocument()
  })

  it('names the address a confirmation is waiting on', () => {
    renderEmail('next@example.com')

    const note = screen.getByText(/next@example.com/)
    expect(
      note.textContent,
      'saying only that something is awaited never says which address to check',
    ).toContain(i18n.t('common:profile.emailPending'))
  })

  it('marks a confirmed address with a tick instead of a sentence', () => {
    renderEmail(undefined, true)

    expect(
      screen.getByLabelText(i18n.t('common:account.emailVerifiedMark')),
      'a confirmed address deserves a glance, not a line of prose',
    ).toBeInTheDocument()
  })

  it('offers to send the confirmation while the address is unverified', () => {
    renderEmail()

    expect(
      screen.getByRole('button', { name: i18n.t('common:account.emailVerify') }),
      'telling the reader the address is unverified without offering to fix it is a dead end',
    ).toBeInTheDocument()
  })

  it('stops offering to verify once the address is confirmed', () => {
    renderEmail(undefined, true)

    expect(screen.queryByRole('button', { name: i18n.t('common:account.emailVerify') })).toBeNull()
  })

  it('says nothing about a pending address once the mail is confirmed', () => {
    renderEmail(undefined, true)

    expect(screen.queryByText(new RegExp(i18n.t('common:profile.emailPending')))).toBeNull()
  })

  it('draws the Telegram glyph in the muted tone, not its brand colour', () => {
    expect(telegram, 'a single brand-coloured glyph among grey ones reads as an accident').toMatch(
      /TelegramMark className="size-4 text-muted-foreground"/,
    )
  })

  it('lands every channel action beside the value it acts on, right aligned', () => {
    expect(channel).toMatch(/justify-end gap-2/)
    expect(channel, 'the value and its action belong on one line, not stacked apart').toMatch(
      /items-center justify-between/,
    )
  })

  it('offers the channel actions as outline buttons, keeping red for destruction', () => {
    expect(telegram, 'a filled button here competes with the destructive ones below').toMatch(
      /variant="outline"/,
    )
  })

  it('opens the email change in a dialog rather than unfolding the card', async () => {
    const user = userEvent.setup()
    renderEmail()

    expect(
      screen.queryByLabelText(i18n.t('common:profile.newEmail')),
      'the form must stay closed until asked for',
    ).toBeNull()

    await user.click(screen.getByRole('button', { name: i18n.t('common:account.emailChange') }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText(i18n.t('common:profile.newEmail'))).toBeInTheDocument()
  })

  it('titles that dialog with the change it makes, not the bare verb', async () => {
    const user = userEvent.setup()
    renderEmail()

    await user.click(screen.getByRole('button', { name: i18n.t('common:account.emailChange') }))
    const dialog = await screen.findByRole('dialog')

    const heading = within(dialog).getByRole('heading')
    expect(heading.textContent?.trim()).toBe(i18n.t('common:profile.emailDialogTitle'))
    expect(heading.textContent?.trim().split(/\s+/).length).toBeGreaterThan(1)
  })

  it('closes the dialog again when the form is dismissed', async () => {
    const user = userEvent.setup()
    renderEmail()

    await user.click(screen.getByRole('button', { name: i18n.t('common:account.emailChange') }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: i18n.t('common:action.cancel') }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})
