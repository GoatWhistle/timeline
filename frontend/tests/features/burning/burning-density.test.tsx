import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { buildBurning, DEFAULT_FILTERS } from '@/features/burning/model/burning'
import { BurningRow } from '@/features/burning/ui/burning-row/burning-row'
import { TooltipProvider } from '@/shared/ui/overlays/tooltip'
import { events, NOW } from './burning-fixtures'

function rows() {
  const items = buildBurning(events(), { ...DEFAULT_FILTERS, activeOnly: false }, NOW)
  const view = renderWithProviders(
    <TooltipProvider>
      <div className="@container">
        {items.map((item) => (
          <BurningRow
            key={item.event.id}
            item={item}
            now={NOW}
            selected={false}
            onSelect={() => undefined}
          />
        ))}
      </div>
    </TooltipProvider>,
  )
  return { ...view, items }
}

describe('row density', () => {
  it('keeps every row on the roomy list height, never a card', () => {
    const { container } = rows()
    for (const row of container.querySelectorAll('[data-burning-row]')) {
      expect(row.className).toContain('h-row-roomy')
      expect(row.className).not.toContain('rounded-lg')
      expect(row.className).not.toContain('shadow')
    }
  })

  it('lets the title take the slack and pins the side columns instead', () => {
    const { container } = rows()
    const row = container.querySelector('[data-burning-row]')
    const title = row?.querySelector('.truncate.font-medium')
    expect(title?.parentElement?.className).toContain('min-w-0')
    expect(title?.parentElement?.className).toContain('flex-1')
    expect(title?.className).toContain('truncate')
  })

  it('reserves a constant action column so the urgency mark never jitters', () => {
    const { container } = rows()
    const widths = [...container.querySelectorAll('[data-burning-row]')].map(
      (row) => (row.lastElementChild as HTMLElement).className,
    )
    for (const width of widths) expect(width).toContain('w-28')
    expect(new Set(widths).size).toBe(1)
  })
})

describe('narrow pane behaviour', () => {
  it('drops the organizer column before it drops the title', () => {
    const { container } = rows()
    const row = container.querySelector('[data-burning-row]')
    const organizer = [...(row?.querySelectorAll('span') ?? [])].find((node) =>
      node.className.includes('w-36'),
    )
    expect(organizer?.className).toContain('@3xl:block')
    expect(organizer?.className).toContain('hidden')
  })

  it('moves the urgency countdown onto the secondary line rather than hiding it', () => {
    const { container, items } = rows()
    for (const item of items) {
      const row = container.querySelector(`[data-burning-row="${item.event.id}"]`)
      const inline = row?.querySelector('.\\@lg\\:hidden')
      expect(inline, `row ${item.event.id} lost its narrow countdown`).not.toBeNull()
      expect(inline?.textContent?.trim().length ?? 0).toBeGreaterThan(0)
    }
  })

  it('keeps an icon beside the narrow countdown, so colour is never alone', () => {
    const { container } = rows()
    for (const row of container.querySelectorAll('[data-burning-row]')) {
      const inline = row.querySelector('.\\@lg\\:hidden')
      expect(inline?.querySelector('[data-urgency-icon]')).not.toBeNull()
    }
  })
})
