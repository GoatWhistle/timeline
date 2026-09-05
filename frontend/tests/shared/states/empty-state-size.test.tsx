import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import type * as React from 'react'
import { describe, expect, it } from 'vitest'
import { EmptyState } from '@/shared/ui/data-display/empty-state'

function pane(ui: React.ReactElement): HTMLElement {
  renderWithProviders(ui)
  return screen.getByText('Nothing here').closest('div[class]')?.parentElement as HTMLElement
}

describe('the empty pane comes in two sizes', () => {
  it('keeps the tall page pane as the default, so no existing screen changes', () => {
    expect(pane(<EmptyState title="Nothing here" />).className).toContain('min-h-[24rem]')
  })

  it('gives a small card a shorter pane, so it cannot outgrow the card beside it', () => {
    const className = pane(<EmptyState title="Nothing here" size="card" />).className

    expect(className).toContain('min-h-[10rem]')
    expect(className).not.toContain('min-h-[24rem]')
  })

  it('still centres and stretches in the small size, like the tall one', () => {
    const className = pane(<EmptyState title="Nothing here" size="card" />).className

    expect(className).toContain('justify-center')
    expect(className).toContain('flex-1')
    expect(className).toContain('flex-col')
  })
})
