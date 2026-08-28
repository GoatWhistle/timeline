import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { buildBurning, DEFAULT_FILTERS } from '@/features/burning/model/burning'
import { BurningRow } from '@/features/burning/ui/burning-row/burning-row'
import { BurningSkeleton } from '@/features/burning/ui/burning-skeleton/burning-skeleton'
import { TooltipProvider } from '@/shared/ui/overlays/tooltip'
import { events, NOW } from './burning-fixtures'

const ROWS = 6

function skeletonRow(): HTMLElement {
  const { container } = renderWithProviders(<BurningSkeleton rows={ROWS} />)
  const row = container.querySelector<HTMLElement>('[data-burning-skeleton-row]')
  if (!row) throw new Error('the skeleton rendered no rows')
  return row
}

function realRow(): HTMLElement {
  const items = buildBurning(events(), DEFAULT_FILTERS, NOW)
  const first = items[0]
  if (!first) throw new Error('the fixture produced no rows')
  const { container } = renderWithProviders(
    <TooltipProvider>
      <BurningRow item={first} now={NOW} selected={false} onSelect={() => undefined} />
    </TooltipProvider>,
  )
  const row = container.querySelector<HTMLElement>('[data-burning-row]')
  if (!row) throw new Error('the row did not render')
  return row
}

function heightClasses(element: HTMLElement): string[] {
  return [...element.classList].filter((name) => name.startsWith('h-'))
}

describe('the burning skeleton matches the rows it stands in for', () => {
  it('renders exactly the number of rows it was asked for', () => {
    const { container } = renderWithProviders(<BurningSkeleton rows={ROWS} />)
    expect(container.querySelectorAll('[data-burning-skeleton-row]')).toHaveLength(ROWS)
  })

  it('uses the same row height class as a real row', () => {
    expect(heightClasses(skeletonRow())).toEqual(heightClasses(realRow()))
    expect(heightClasses(skeletonRow())).toContain('h-row-roomy')
  })

  it('repeats the same padding and border as a real row', () => {
    const skeleton = skeletonRow().className
    const real = realRow().className
    for (const shared of ['border-b', 'border-border/60', 'pr-2', 'pl-0', 'gap-3']) {
      expect(skeleton, `skeleton lacks ${shared}`).toContain(shared)
      expect(real, `row lacks ${shared}`).toContain(shared)
    }
  })

  it('reserves the same urgency rail width, so nothing shifts when data lands', () => {
    expect(skeletonRow().querySelector('.w-\\[3px\\]')).not.toBeNull()
    expect(realRow().querySelector('.w-\\[3px\\]')).not.toBeNull()
  })

  it('announces itself as busy for a screen reader', () => {
    const { container } = renderWithProviders(<BurningSkeleton rows={ROWS} />)
    const status = container.querySelector('[role="status"]')
    expect(status).not.toBeNull()
    expect(status?.getAttribute('aria-busy')).toBe('true')
  })
})
