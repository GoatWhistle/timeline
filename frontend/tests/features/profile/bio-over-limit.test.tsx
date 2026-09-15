import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { BioCard } from '@/features/profile/bio-card/bio-card'
import { i18n, i18nReady } from '@/shared/i18n/config'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

vi.mock('@/entities/user/profile.queries', () => ({
  useUpdateProfile: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

const LIMIT = 2000

beforeAll(async () => {
  await i18nReady
  await i18n.changeLanguage('en')
})

function counter() {
  const node = document.querySelector('[data-over-limit], .text-caption span:last-child')
  return node?.textContent ?? ''
}

function saveButton() {
  return screen.getByRole('button', { name: i18n.t('action.save') })
}

describe('the bio counter keeps counting past the limit', () => {
  it('lets the reader type past the cap rather than swallowing the keystrokes', async () => {
    const over = 'a'.repeat(LIMIT + 37)
    renderWithProviders(<BioCard bio={over} />)

    const field = (await screen.findByLabelText(i18n.t('profile.bio'))) as HTMLTextAreaElement
    expect(field.value.length, 'the text must survive in full, not be truncated').toBe(LIMIT + 37)
    expect(
      field.hasAttribute('maxlength'),
      'a hard maxlength stops the counter from ever showing the excess',
    ).toBe(false)
  })

  it('shows how far past the limit the text has gone', () => {
    renderWithProviders(<BioCard bio={'a'.repeat(LIMIT + 37)} />)
    expect(counter(), 'the reader needs to see how much to delete').toContain(String(LIMIT + 37))
  })

  it('refuses to save while the text is too long', () => {
    renderWithProviders(<BioCard bio={'a'.repeat(LIMIT + 1)} />)
    expect(saveButton()).toBeDisabled()
  })

  it('allows saving again once the text fits', () => {
    renderWithProviders(<BioCard bio={'a'.repeat(LIMIT)} />)
    expect(saveButton(), 'exactly at the limit is still allowed').not.toBeDisabled()
  })
})
