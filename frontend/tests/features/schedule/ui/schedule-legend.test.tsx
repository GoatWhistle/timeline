import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { STAGE_TYPES } from '@/entities/stage/stage.labels'
import { ScheduleLegend } from '@/features/schedule/ui/schedule-legend'
import { stageTypeText } from './schedule-fixtures'

describe('ScheduleLegend', () => {
  it('lists every stage type and the deadline', () => {
    const { container } = renderWithProviders(<ScheduleLegend />)
    const items = screen.getAllByRole('listitem')

    expect(items).toHaveLength(STAGE_TYPES.length + 1)
    for (const type of STAGE_TYPES) {
      expect(container).toHaveTextContent(stageTypeText(type))
    }
  })

  it('pairs every stage type with an icon, not colour alone', () => {
    const { container } = renderWithProviders(<ScheduleLegend />)
    const swatches = container.querySelectorAll('li span[aria-hidden="true"]')
    const withIcon = [...swatches].filter((swatch) => swatch.querySelector('svg'))
    expect(withIcon).toHaveLength(STAGE_TYPES.length)
  })

  it('gives the deadline swatch a shape distinct from the stage swatches', () => {
    const { container } = renderWithProviders(<ScheduleLegend />)
    const items = screen.getAllByRole('listitem')
    const deadline = items[items.length - 1]

    expect(deadline?.querySelector('svg')).toBeNull()
    expect(container.querySelector('li:last-child span')?.className).toContain('w-0.5')
  })
})
