import { renderWithProviders } from '@tests/support/render'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { stagesOf } from '@/entities/event/event-form.stages'
import { EventStageNav } from '@/entities/event/event-stage-nav'
import { PHONE_QUERY } from '@/shared/ui/layout/mobile/mobile-state'

const original = window.matchMedia

function useViewport(phone: boolean): void {
  window.matchMedia = ((query: string) => ({
    matches: query === PHONE_QUERY && phone,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

function renderNav() {
  return renderWithProviders(
    <EventStageNav
      stages={stagesOf('HACKATHON')}
      current="period"
      reached={2}
      onSelect={vi.fn()}
    />,
  )
}

afterEach(() => {
  window.matchMedia = original
})

describe('the stage pipeline changes shape on a phone', () => {
  it('lays the stages out as one compact strip', () => {
    useViewport(true)
    const { container } = renderNav()

    expect(container.querySelector('nav')?.dataset.stageNav).toBe('compact')
    for (const button of container.querySelectorAll('[data-stage-step] button')) {
      expect(button.className).toContain('min-h-tap')
    }
  })

  it('names every stage for a screen reader even when the label is hidden', () => {
    useViewport(true)
    const { container } = renderNav()
    const buttons = [...container.querySelectorAll('[data-stage-step] button')]

    expect(buttons.length).toBeGreaterThan(0)
    for (const button of buttons) {
      const named = button.getAttribute('aria-label') || button.textContent?.trim()
      expect(named).toBeTruthy()
    }
  })

  it('keeps the full vertical list on a wider screen', () => {
    useViewport(false)
    const { container } = renderNav()

    expect(container.querySelector('nav')?.dataset.stageNav).toBe('full')
  })
})
