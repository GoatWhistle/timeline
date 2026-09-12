import { useCallback, useLayoutEffect, useRef, useState } from 'react'

export type IndicatorBox = {
  offset: number
  size: number
  ready: boolean
}

const HIDDEN: IndicatorBox = { offset: 0, size: 0, ready: false }

export function measureIndicator(
  container: HTMLElement | null,
  active: HTMLElement | null,
  axis: 'x' | 'y',
): IndicatorBox {
  if (container === null || active === null) return HIDDEN

  const outer = container.getBoundingClientRect()
  const inner = active.getBoundingClientRect()
  if (inner.width === 0 && inner.height === 0) return HIDDEN

  return axis === 'x'
    ? { offset: inner.left - outer.left + container.scrollLeft, size: inner.width, ready: true }
    : { offset: inner.top - outer.top + container.scrollTop, size: inner.height, ready: true }
}

export function useSlidingIndicator<T extends HTMLElement>(
  activeKey: string | null,
  axis: 'x' | 'y' = 'y',
  enabled = true,
): { containerRef: (node: T | null) => void; box: IndicatorBox } {
  const containerElement = useRef<T | null>(null)
  const [container, setContainer] = useState<T | null>(null)
  const [box, setBox] = useState<IndicatorBox>(HIDDEN)

  const containerRef = useCallback((node: T | null) => {
    containerElement.current = node
    setContainer(node)
  }, [])

  const sync = useCallback(() => {
    const marked =
      containerElement.current?.querySelector<HTMLElement>(
        '[data-indicator-active="true"], [data-indicator-item][data-state="active"], [data-indicator-item][aria-selected="true"]',
      ) ?? null
    const active = marked?.closest<HTMLElement>('[data-indicator-item]') ?? marked
    setBox((previous) => {
      const next = measureIndicator(containerElement.current, active, axis)
      if (
        previous.offset === next.offset &&
        previous.size === next.size &&
        previous.ready === next.ready
      ) {
        return previous
      }
      return next
    })
  }, [axis])

  useLayoutEffect(() => {
    if (enabled && activeKey !== undefined) sync()
  }, [sync, activeKey, enabled])

  useLayoutEffect(() => {
    if (container === null) return

    sync()

    const observers: { disconnect: () => void }[] = []

    if (typeof ResizeObserver !== 'undefined') {
      const resize = new ResizeObserver(sync)
      resize.observe(container)
      for (const child of container.children) resize.observe(child)
      observers.push(resize)
    }

    if (typeof IntersectionObserver !== 'undefined') {
      const intersection = new IntersectionObserver(sync)
      intersection.observe(container)
      observers.push(intersection)
    }

    if (typeof MutationObserver !== 'undefined') {
      const mutation = new MutationObserver(sync)
      mutation.observe(container, {
        subtree: true,
        attributes: true,
        attributeFilter: ['data-state', 'data-indicator-active', 'aria-selected'],
      })
      observers.push(mutation)
    }

    return () => {
      for (const observer of observers) observer.disconnect()
    }
  }, [sync, container])

  return { containerRef, box }
}
