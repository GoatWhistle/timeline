import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { RenameDevice } from '@/features/device-list/rename-device'
import type { SessionResponse } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

const rename = vi.fn()

vi.mock('@/entities/session/device-sessions.queries', () => ({
  useRenameSession: () => ({ mutateAsync: rename, isPending: false }),
}))

const NAMED: SessionResponse = {
  id: 'se_42ej2s5gh7e8',
  current: true,
  label: 'Work laptop',
  created_at: '2026-08-20T09:00:00Z',
  last_used_at: '2026-08-29T08:30:00Z',
  expires_at: '2026-09-19T09:00:00Z',
  ip: '203.0.113.7',
  user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0 Safari/537.36',
}

const { label: _named, ...WITHOUT_LABEL } = NAMED
const UNNAMED: SessionResponse = { ...WITHOUT_LABEL, id: 'se_7rb63rbncfky' } as SessionResponse

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

beforeEach(() => {
  rename.mockReset()
  rename.mockResolvedValue({})
})

describe('renaming a session', () => {
  it('opens with the name the session already carries', () => {
    renderWithProviders(<RenameDevice session={NAMED} onDone={() => {}} />)

    expect(screen.getByLabelText(i18n.t('common:devices.nameLabel'))).toHaveValue('Work laptop')
  })

  it('sends the name the user typed', async () => {
    const { user } = renderWithProviders(<RenameDevice session={UNNAMED} onDone={() => {}} />)

    const field = screen.getByLabelText(i18n.t('common:devices.nameLabel'))
    await user.type(field, 'Home desktop')
    await user.click(screen.getByRole('button', { name: i18n.t('action.save') }))

    expect(rename).toHaveBeenCalledWith({
      id: UNNAMED.id,
      body: { label: 'Home desktop' },
    })
  })

  it('asks the server to drop the name when it is emptied', async () => {
    const { user } = renderWithProviders(<RenameDevice session={NAMED} onDone={() => {}} />)

    await user.click(screen.getByRole('button', { name: i18n.t('common:devices.clearName') }))
    await user.click(screen.getByRole('button', { name: i18n.t('action.save') }))

    expect(rename).toHaveBeenCalledWith({
      id: NAMED.id,
      body: { clear_label: true },
    })
  })

  it('offers no clear control for a session that was never named', () => {
    renderWithProviders(<RenameDevice session={UNNAMED} onDone={() => {}} />)

    expect(screen.queryByRole('button', { name: i18n.t('common:devices.clearName') })).toBeNull()
  })

  it('never lets a name longer than the column holds reach the server', async () => {
    const { user } = renderWithProviders(<RenameDevice session={UNNAMED} onDone={() => {}} />)

    const field = screen.getByLabelText(i18n.t('common:devices.nameLabel'))
    await user.click(field)
    await user.paste('a'.repeat(65))
    await user.click(screen.getByRole('button', { name: i18n.t('action.save') }))

    const sent = rename.mock.calls[0]?.[0] as { body: { label?: string } } | undefined
    expect((sent?.body.label ?? '').length).toBeLessThanOrEqual(64)
  })

  it('does not call the server when an unnamed session is left unnamed', async () => {
    const done = vi.fn()
    const { user } = renderWithProviders(<RenameDevice session={UNNAMED} onDone={done} />)

    await user.click(screen.getByRole('button', { name: i18n.t('action.save') }))

    expect(rename).not.toHaveBeenCalled()
    expect(done).toHaveBeenCalled()
  })
})
