import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { CatalogEmpty } from '@/features/catalog/catalog-empty'
import { ApiError } from '@/shared/api/errors'
import { i18n } from '@/shared/i18n/config'
import { FilterFigure } from '@/shared/ui/data-display/empty-figures/filter-figure'
import {
  BrokenLinkFigure,
  InviteFigure,
  RosterFigure,
  TeamFigure,
} from '@/shared/ui/data-display/empty-figures/people-figures'
import {
  DeadlineFigure,
  EventListFigure,
  ScheduleFigure,
  StageFigure,
} from '@/shared/ui/data-display/empty-figures/schedule-figures'
import {
  AuditFigure,
  DeviceFigure,
  PreviewFigure,
  QueueFigure,
  RuleFigure,
  ShortcutFigure,
} from '@/shared/ui/data-display/empty-figures/system-figures'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { ErrorState } from '@/shared/ui/data-display/error-state'

const SPIN = '.motion-safe\\:animate-\\[spin_9s_linear_infinite\\]'

const FIGURES = {
  audit: AuditFigure,
  brokenLink: BrokenLinkFigure,
  deadline: DeadlineFigure,
  device: DeviceFigure,
  eventList: EventListFigure,
  filter: FilterFigure,
  invite: InviteFigure,
  preview: PreviewFigure,
  queue: QueueFigure,
  roster: RosterFigure,
  rule: RuleFigure,
  schedule: ScheduleFigure,
  shortcut: ShortcutFigure,
  stage: StageFigure,
  team: TeamFigure,
}

describe('the empty-state figure kit', () => {
  it('gives every subject its own drawing, so no two situations look alike', () => {
    const shapes = new Map<string, string>()

    for (const [name, Figure] of Object.entries(FIGURES)) {
      const { container, unmount } = renderWithProviders(<Figure label={name} />)
      const svg = container.querySelector('svg')
      expect(svg, name).not.toBeNull()

      const outline = [...(svg?.querySelectorAll('rect, circle, path') ?? [])]
        .map((node) => node.getAttribute('d') ?? node.outerHTML)
        .join('|')
      shapes.set(name, outline)
      unmount()
    }

    expect(new Set(shapes.values()).size, 'every figure is distinct').toBe(
      Object.keys(FIGURES).length,
    )
  })

  it('renders each figure as a labelled image carrying the brand mark', () => {
    for (const [name, Figure] of Object.entries(FIGURES)) {
      const { container, unmount } = renderWithProviders(<Figure label={name} />)
      expect(screen.getByRole('img', { name }), name).toBeInTheDocument()
      expect(container.querySelector(SPIN), name).not.toBeNull()
      unmount()
    }
  })

  it('gates the only animation behind motion-safe, so reduced motion silences it', () => {
    for (const [name, Figure] of Object.entries(FIGURES)) {
      const { container, unmount } = renderWithProviders(<Figure label={name} />)
      const animated = [...container.querySelectorAll('[class*="animate-"]')]
      expect(animated.length, name).toBeGreaterThan(0)
      for (const node of animated) {
        expect(node.getAttribute('class'), name).toContain('motion-safe:')
      }
      unmount()
    }
  })
})

describe('the empty-state shell', () => {
  it('shows the subject figure and no reset when nothing exists at all', () => {
    renderWithProviders(
      <EmptyState title="Nothing here" description="Make one" figure={TeamFigure} />,
    )

    expect(screen.getByRole('img', { name: 'Nothing here' })).toBeInTheDocument()
    expect(screen.getByText('Make one')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: i18n.t('state.resetFilters') }),
    ).not.toBeInTheDocument()
  })

  it('swaps in the filter figure and a working reset when a filter hid everything', async () => {
    const onReset = vi.fn()
    const { user } = renderWithProviders(
      <EmptyState title="Nothing matches" figure={TeamFigure} filtered onReset={onReset} />,
    )

    await user.click(screen.getByRole('button', { name: i18n.t('state.resetFilters') }))
    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it('offers the first action when one exists and no filter is to blame', () => {
    renderWithProviders(
      <EmptyState
        title="No team"
        figure={TeamFigure}
        action={<button type="button">Create</button>}
      />,
    )

    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
  })

  it('prefers the reset over the first action, because the filter is what to undo', () => {
    renderWithProviders(
      <EmptyState
        title="No team"
        figure={TeamFigure}
        filtered
        onReset={vi.fn()}
        action={<button type="button">Create</button>}
      />,
    )

    expect(screen.getByRole('button', { name: i18n.t('state.resetFilters') })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create' })).not.toBeInTheDocument()
  })

  it('still renders without a figure, so old call sites keep working', () => {
    renderWithProviders(<EmptyState title="Bare" />)

    expect(screen.getByText('Bare')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})

describe('an empty pane sits in the middle of the space it was given', () => {
  function pane(): HTMLElement {
    renderWithProviders(<EmptyState title="Nothing here" />)
    return screen.getByText('Nothing here').closest('div[class]')?.parentElement as HTMLElement
  }

  it('draws no frame around itself, the way the catalog does not', () => {
    expect(pane().className).not.toContain('border-dashed')
  })

  it('claims height so its content centres rather than clinging to the top', () => {
    const className = pane().className
    expect(className).toContain('min-h-')
    expect(className).toContain('justify-center')
  })

  it('stretches into the pane it was given rather than only centring within itself', () => {
    const className = pane().className
    expect(className).toContain('flex-1')
    expect(className).toMatch(/\bflex\b/)
    expect(className).toContain('flex-col')
  })

  it('is shaped like the catalog and the failure pane, so the three cannot drift apart', () => {
    const { container: catalogBox, unmount } = renderWithProviders(
      <CatalogEmpty filtered={false} onResetFilters={vi.fn()} />,
    )
    const catalogPane = catalogBox.firstElementChild as HTMLElement
    const catalogClasses = new Set(catalogPane.className.split(/\s+/))
    unmount()

    const { container: errorBox, unmount: closeError } = renderWithProviders(
      <ErrorState error={new ApiError(500, { code: 'internal_error' })} />,
    )
    const errorClasses = new Set(
      (errorBox.querySelector('[role="alert"]') as HTMLElement).className.split(/\s+/),
    )
    closeError()

    const sharedClasses = new Set(pane().className.split(/\s+/))

    for (const token of ['flex', 'flex-1', 'flex-col', 'min-h-[24rem]', 'justify-center']) {
      expect(sharedClasses, `shared empty state lacks ${token}`).toContain(token)
      expect(catalogClasses, `catalog empty state lacks ${token}`).toContain(token)
      expect(errorClasses, `failure pane lacks ${token}`).toContain(token)
    }
  })
})
