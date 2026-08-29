import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import { Profiler, useCallback, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { buildBurning } from '@/features/burning/model/burning'
import { BurningRow } from '@/features/burning/ui/burning-row/burning-row'
import { TooltipProvider } from '@/shared/ui/overlays/tooltip'
import { event, NOW } from './burning-fixtures'

const MINUTE_MS = 60_000

describe('burning row memoisation', () => {
  it('does not re-render rows when a minute tick leaves the countdown label unchanged', () => {
    const items = buildBurning(
      [event({ id: 'a' }), event({ id: 'b' }), event({ id: 'c' })],
      { sort: 'urgency', activeOnly: false, needsAction: false },
      NOW,
    )

    const updates: number[] = []

    function Harness() {
      const [now, setNow] = useState(NOW)
      const onSelect = useCallback(() => {}, [])
      return (
        <div>
          <button type="button" onClick={() => setNow(new Date(NOW.getTime() + MINUTE_MS))}>
            tick
          </button>
          <Profiler
            id="rows"
            onRender={(_id, phase, actualDuration) => {
              if (phase === 'update') updates.push(actualDuration)
            }}
          >
            {items.map((item) => (
              <BurningRow
                key={item.event.id}
                item={item}
                selected={false}
                now={now}
                onSelect={onSelect}
              />
            ))}
          </Profiler>
        </div>
      )
    }

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <TooltipProvider>
          <Harness />
        </TooltipProvider>
      </QueryClientProvider>,
    )

    act(() => {
      screen.getByRole('button', { name: 'tick' }).click()
    })

    const rendered = screen.getAllByRole('option')
    expect(rendered).toHaveLength(3)

    const work = updates.reduce((sum, duration) => sum + duration, 0)
    expect(work).toBeLessThan(1)
  })
})
