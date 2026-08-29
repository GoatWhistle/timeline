import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { EVENT_STATE_COLOR, EVENT_STATE_SHAPE, EVENT_STATES } from '@/entities/event/event.labels'
import { EventStateBadge, RegistrationStatusBadge } from '@/entities/event/event-state-badge'
import {
  REGISTRATION_STATUS_COLOR,
  REGISTRATION_STATUS_SHAPE,
  REGISTRATION_STATUSES,
} from '@/entities/registration/registration.labels'
import { STAGE_TYPE_ICON } from '@/entities/stage/stage.labels'
import { StageTypeMark } from '@/entities/stage/stage-type-mark/stage-type-mark'
import type { StageType } from '@/shared/api/types.gen'
import { DOT_SHAPE } from '@/shared/ui/primitives/dot'

const STAGE_TYPES = Object.keys(STAGE_TYPE_ICON) as StageType[]

function grayscale<T extends { container: HTMLElement }>(view: T): T {
  view.container.style.filter = 'grayscale(1)'
  return view
}

function shapesOf(container: HTMLElement): string[] {
  return [...container.querySelectorAll<HTMLElement>('[data-dot-shape]')].map(
    (node) => node.dataset.dotShape ?? '',
  )
}

function geometryOf(container: HTMLElement): string[] {
  return [...container.querySelectorAll<HTMLElement>('[data-dot-shape]')].map((node) =>
    node.className
      .split(/\s+/)
      .filter((token) => !token.startsWith('bg-') && !token.startsWith('text-'))
      .sort()
      .join(' '),
  )
}

describe('event state dots under grayscale', () => {
  function renderAll() {
    return grayscale(
      renderWithProviders(
        <div>
          {EVENT_STATES.map((state) => (
            <EventStateBadge key={state} state={state} />
          ))}
        </div>,
      ),
    )
  }

  it('applies the grayscale filter the check uses', () => {
    expect(renderAll().container.style.filter).toBe('grayscale(1)')
  })

  it('renders one dot per state', () => {
    expect(shapesOf(renderAll().container)).toHaveLength(EVENT_STATES.length)
  })

  it('gives every state a shape no other state shares', () => {
    const shapes = shapesOf(renderAll().container)
    expect(new Set(shapes).size).toBe(EVENT_STATES.length)
  })

  it('renders that shape as distinct geometry, not only as a data attribute', () => {
    const geometry = geometryOf(renderAll().container)
    expect(new Set(geometry).size).toBe(EVENT_STATES.length)
  })

  it('names the state in words beside every dot', () => {
    const { container } = renderAll()
    for (const badge of container.querySelectorAll('span:has(> [data-dot-shape])')) {
      expect(badge.textContent?.trim().length ?? 0).toBeGreaterThan(0)
    }
  })
})

describe('registration status dots under grayscale', () => {
  function renderAll() {
    return grayscale(
      renderWithProviders(
        <div>
          {REGISTRATION_STATUSES.map((status) => (
            <RegistrationStatusBadge key={status} status={status} />
          ))}
        </div>,
      ),
    )
  }

  it('gives every status a shape no other status shares', () => {
    const shapes = shapesOf(renderAll().container)
    expect(shapes).toHaveLength(REGISTRATION_STATUSES.length)
    expect(new Set(shapes).size).toBe(REGISTRATION_STATUSES.length)
  })

  it('renders that shape as distinct geometry, not only as a data attribute', () => {
    const geometry = geometryOf(renderAll().container)
    expect(new Set(geometry).size).toBe(REGISTRATION_STATUSES.length)
  })

  it('names the status in words beside every dot', () => {
    const { container } = renderAll()
    for (const badge of container.querySelectorAll('span:has(> [data-dot-shape])')) {
      expect(badge.textContent?.trim().length ?? 0).toBeGreaterThan(0)
    }
  })
})

describe('stage type marks under grayscale', () => {
  function renderAll() {
    return grayscale(
      renderWithProviders(
        <div>
          {STAGE_TYPES.map((type) => (
            <StageTypeMark key={type} type={type} />
          ))}
        </div>,
      ),
    )
  }

  it('renders one mark per stage type', () => {
    const { container } = renderAll()
    expect(container.querySelectorAll('[data-stage-type]')).toHaveLength(STAGE_TYPES.length)
  })

  it('gives every type an icon no other type shares, so colour is never the only signal', () => {
    const { container } = renderAll()
    const icons = [...container.querySelectorAll('[data-stage-type]')].map(
      (node) => node.querySelector('svg')?.getAttribute('class') ?? '',
    )
    expect(icons.every((icon) => icon.length > 0)).toBe(true)
    const shapes = [...container.querySelectorAll('[data-stage-type]')].map(
      (node) => node.querySelector('svg')?.innerHTML ?? '',
    )
    expect(new Set(shapes).size).toBe(STAGE_TYPES.length)
  })

  it('spells the type out for a screen reader on every mark', () => {
    const { container } = renderAll()
    for (const node of container.querySelectorAll('[data-stage-type]')) {
      expect(node.textContent?.trim().length ?? 0).toBeGreaterThan(0)
    }
  })
})

describe('the dot primitive itself', () => {
  it('offers a geometry for every declared shape', () => {
    const geometries = Object.values(DOT_SHAPE)
    expect(new Set(geometries).size).toBe(geometries.length)
  })

  it('never lets a colour map outnumber the shapes that separate it', () => {
    expect(new Set(Object.values(EVENT_STATE_SHAPE)).size).toBe(
      Object.keys(EVENT_STATE_COLOR).length,
    )
    expect(new Set(Object.values(REGISTRATION_STATUS_SHAPE)).size).toBe(
      Object.keys(REGISTRATION_STATUS_COLOR).length,
    )
  })
})
