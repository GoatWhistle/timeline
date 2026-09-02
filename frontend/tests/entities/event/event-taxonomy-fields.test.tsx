import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { EventKindChoice, EventOriginField } from '@/entities/event/event-taxonomy-fields'
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
