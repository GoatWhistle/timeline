import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import {
  EventKindChoice,
  EventKindLocked,
  EventOriginField,
} from '@/entities/event/event-taxonomy-fields'
import { i18n } from '@/shared/i18n/config'

describe('EventOriginField', () => {
  it('shows the current scope and explains what it means', () => {
    renderWithProviders(<EventOriginField value="WORLD" onChange={vi.fn()} />)
    expect(screen.getByText(i18n.t('event:form.originValue.WORLD'))).toBeInTheDocument()
    expect(screen.getByText(i18n.t('event:form.origin'))).toBeInTheDocument()
    expect(screen.getByText(i18n.t('event:form.originHint'))).toBeInTheDocument()
  })
})

describe('EventKindChoice', () => {
  it('offers both kinds and marks the chosen one', () => {
    renderWithProviders(<EventKindChoice value="MEETUP" onChange={vi.fn()} />)
    expect(screen.getByText(i18n.t('event:catalog.kindLabel.MEETUP'))).toBeInTheDocument()
    expect(screen.getByText(i18n.t('event:catalog.kindLabel.HACKATHON'))).toBeInTheDocument()
    expect(document.querySelector('[data-kind-option="MEETUP"][data-selected]')).not.toBeNull()
    expect(document.querySelector('[data-kind-option="HACKATHON"][data-selected]')).toBeNull()
  })

  it('reports the kind the administrator picked', async () => {
    const onChange = vi.fn()
    const { user } = renderWithProviders(<EventKindChoice value="HACKATHON" onChange={onChange} />)
    await user.click(screen.getByText(i18n.t('event:catalog.kindLabel.MEETUP')))
    expect(onChange).toHaveBeenCalledWith('MEETUP')
  })
})

describe('EventKindLocked', () => {
  it('shows the kind the event has and says it is settled', () => {
    renderWithProviders(<EventKindLocked value="MEETUP" />)
    expect(screen.getByText(i18n.t('event:catalog.kindLabel.MEETUP'))).toBeInTheDocument()
    expect(screen.getByText(i18n.t('event:form.kindFixed'))).toBeInTheDocument()
  })

  it('offers no control that could change the kind', () => {
    renderWithProviders(<EventKindLocked value="HACKATHON" />)
    expect(screen.queryByRole('radio')).toBeNull()
    expect(document.querySelector('[data-kind-option]')).toBeNull()
    expect(screen.queryByText(i18n.t('event:catalog.kindLabel.MEETUP'))).toBeNull()
  })

  it('carries the same picture the choice does, so the two screens agree', () => {
    renderWithProviders(<EventKindLocked value="HACKATHON" />)
    expect(document.querySelector('[data-kind-preview="HACKATHON"]')).not.toBeNull()
  })
})
