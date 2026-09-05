import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import type * as React from 'react'
import { describe, expect, it } from 'vitest'
import { ErrorState } from '@/shared/ui/data-display/error-state'
import { QueryBoundary } from '@/shared/ui/states/query-boundary/query-boundary'

const failure = { status: 500, code: 'internal_error', message: 'Internal server error.' }

function pane(ui: React.ReactElement): HTMLElement {
  renderWithProviders(ui)
  return screen.getByRole('alert')
}

describe('the error pane comes in the same two sizes as the empty pane', () => {
  it('keeps the tall page pane as the default, so no existing screen changes', () => {
    expect(pane(<ErrorState error={failure} />).className).toContain('min-h-[24rem]')
  })

  it('gives a small card a shorter pane, so a failed request cannot outgrow the card', () => {
    const className = pane(<ErrorState error={failure} size="card" />).className

    expect(className).toContain('min-h-[10rem]')
    expect(className).not.toContain('min-h-[24rem]')
  })

  it('still centres and stretches in the small size, like the tall one', () => {
    const className = pane(<ErrorState error={failure} size="card" />).className

    expect(className).toContain('justify-center')
    expect(className).toContain('flex-1')
    expect(className).toContain('flex-col')
  })

  it('carries the size through the boundary every screen actually uses', () => {
    const className = pane(
      <QueryBoundary isPending={false} isError error={failure} size="card">
        <p>loaded</p>
      </QueryBoundary>,
    ).className

    expect(className).toContain('min-h-[10rem]')
    expect(className).not.toContain('min-h-[24rem]')
  })

  it('leaves the boundary tall when no size is asked for', () => {
    const className = pane(
      <QueryBoundary isPending={false} isError error={failure}>
        <p>loaded</p>
      </QueryBoundary>,
    ).className

    expect(className).toContain('min-h-[24rem]')
  })
})
