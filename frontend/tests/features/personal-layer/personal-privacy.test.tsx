import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it } from 'vitest'
import { personalError } from '@/entities/personal/personal-absence'
import { PersonalBoundary } from '@/features/personal-layer/shell/personal-boundary'
import { ApiError } from '@/shared/api/errors'
import { i18n } from '@/shared/i18n/config'
import { TaskFigure } from '@/shared/ui/data-display/empty-figures/personal-figures'

const FOREIGN = new ApiError(404, { code: 'not_found', message: 'The record was not found.' })

function render(error: unknown) {
  return renderWithProviders(
    <PersonalBoundary isPending={false} isError={true} error={error} figure={TaskFigure}>
      <p>secret</p>
    </PersonalBoundary>,
  )
}

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

describe('a foreign personal record reads as absent, never as refused', () => {
  it('presents the 404 of a foreign record as nothing being there', () => {
    render(FOREIGN)

    expect(screen.getByText(i18n.t('event:personal.absent'))).toBeInTheDocument()
    expect(screen.getByText(i18n.t('event:personal.absentHint'))).toBeInTheDocument()
  })

  it('never says forbidden, and never hints that the record belongs to somebody', () => {
    const { container } = render(FOREIGN)
    const shown = (container.textContent ?? '').toLowerCase()

    for (const forbidden of ['forbidden', 'permission', 'access', 'denied', 'another user']) {
      expect(shown, `leaks "${forbidden}"`).not.toContain(forbidden)
    }
    expect(shown).not.toContain(i18n.t('errors:forbidden').toLowerCase())
  })

  it('shows no alert for an absence: nothing there is not a failure', () => {
    render(FOREIGN)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText('secret')).not.toBeInTheDocument()
  })

  it('still reports a genuine server failure as a failure', () => {
    render(new ApiError(503, { code: 'internal_error', message: 'Internal server error' }))

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.queryByText(i18n.t('event:personal.absent'))).not.toBeInTheDocument()
  })

  it('renders the records themselves once the request succeeds', () => {
    renderWithProviders(
      <PersonalBoundary isPending={false} isError={false} figure={TaskFigure}>
        <p>secret</p>
      </PersonalBoundary>,
    )

    expect(screen.getByText('secret')).toBeInTheDocument()
  })
})

describe('a 403 can never reach the personal screens', () => {
  it('arrives at the boundary already rewritten, and reads as an absence', () => {
    const raw = new ApiError(403, {
      code: 'forbidden',
      message: 'You do not have enough permissions.',
    })

    const { container } = render(personalError(raw))

    expect(screen.getByText(i18n.t('event:personal.absent'))).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect((container.textContent ?? '').toLowerCase()).not.toContain('permission')
  })
})
