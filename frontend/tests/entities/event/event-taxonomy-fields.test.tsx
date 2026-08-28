import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { EventTaxonomyFields } from '@/entities/event/event-taxonomy-fields'
import { i18n } from '@/shared/i18n/config'

describe('EventTaxonomyFields', () => {
  it('shows the current kind and scope of the event', () => {
    renderWithProviders(
      <EventTaxonomyFields kind="MEETUP" origin="WORLD" onKind={vi.fn()} onOrigin={vi.fn()} />,
    )
    expect(screen.getByText(i18n.t('event:catalog.kindLabel.MEETUP'))).toBeInTheDocument()
    expect(screen.getByText(i18n.t('event:form.originValue.WORLD'))).toBeInTheDocument()
  })

  it('labels both selectors and explains what the scope means', () => {
    renderWithProviders(
      <EventTaxonomyFields kind="HACKATHON" origin="RU" onKind={vi.fn()} onOrigin={vi.fn()} />,
    )
    expect(screen.getByText(i18n.t('event:form.kind'))).toBeInTheDocument()
    expect(screen.getByText(i18n.t('event:form.origin'))).toBeInTheDocument()
    expect(screen.getByText(i18n.t('event:form.originHint'))).toBeInTheDocument()
  })
})
