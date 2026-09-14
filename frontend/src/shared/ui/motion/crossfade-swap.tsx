import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/shared/styling/class-names/class-names'

const EXIT_MS = 140

type Slot<K> = { key: K; content: React.ReactNode; exiting: boolean; settled: boolean }

export function CrossfadeSwap<K extends string | number>({
  swapKey,
  children,
  className,
  direction,
  onEntered,
}: {
  swapKey: K
  children: React.ReactNode
  className?: string
  direction?: 'left' | 'right'
  onEntered?: (node: HTMLElement | null) => void
}) {
  const [slots, setSlots] = useState<Slot<K>[]>(() => [
    { key: swapKey, content: children, exiting: false, settled: true },
  ])
  const timers = useRef(new Map<K, ReturnType<typeof setTimeout>>())
  const previousKey = useRef(swapKey)
  const nodes = useRef(new Map<K, HTMLElement>())
  const pendingEnter = useRef<K | null>(null)
  const hasTransitioned = useRef(false)
  const [lockedHeight, setLockedHeight] = useState<number | null>(null)

  useEffect(() => {
    const changedKey = previousKey.current !== swapKey
    if (changedKey) {
      const leaving = nodes.current.get(previousKey.current)
      const from = leaving?.getBoundingClientRect().height ?? 0
      if (from > 0) setLockedHeight(from)
      pendingEnter.current = swapKey
      hasTransitioned.current = true
    }
    previousKey.current = swapKey
    setSlots((current) => {
      const withoutStale = current.filter((slot) => slot.key === swapKey || !slot.exiting)
      if (withoutStale.some((slot) => slot.key === swapKey)) {
        return withoutStale.map((slot) =>
          slot.key === swapKey ? { ...slot, content: children } : slot,
        )
      }
      return [
        ...withoutStale.map((slot) => ({ ...slot, exiting: true })),
        { key: swapKey, content: children, exiting: false, settled: false },
      ]
    })
  }, [swapKey, children])

  useLayoutEffect(() => {
    if (pendingEnter.current !== null) {
      const key = pendingEnter.current
      pendingEnter.current = null
      onEntered?.(nodes.current.get(key) ?? null)
    }
    if (slots.some((slot) => !slot.settled)) {
      const frame = requestAnimationFrame(() => {
        setSlots((current) => current.map((slot) => ({ ...slot, settled: true })))
      })
      return () => cancelAnimationFrame(frame)
    }
    return undefined
  }, [slots, onEntered])

  const mountedKeys = slots.map((slot) => slot.key).join('|')

  useLayoutEffect(() => {
    const read = () => {
      const node = nodes.current.get(swapKey)
      if (!node || mountedKeys === '') return
      const height = node.getBoundingClientRect().height
      if (height > 0) setLockedHeight(height)
    }
    read()
    if (typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(read)
    const node = nodes.current.get(swapKey)
    if (node) observer.observe(node)
    return () => observer.disconnect()
  }, [mountedKeys, swapKey])

  useEffect(() => {
    const active = timers.current
    for (const slot of slots) {
      if (!slot.exiting || active.has(slot.key)) continue
      const timer = setTimeout(() => {
        active.delete(slot.key)
        setSlots((current) => current.filter((item) => item.key !== slot.key))
      }, EXIT_MS)
      active.set(slot.key, timer)
    }
    return () => {
      for (const timer of active.values()) clearTimeout(timer)
      active.clear()
    }
  }, [slots])

  if (slots.length === 1 && slots[0] && !hasTransitioned.current) return <>{slots[0].content}</>

  const exitTranslate =
    direction === 'left'
      ? 'motion-safe:-translate-x-3'
      : direction === 'right'
        ? 'motion-safe:translate-x-3'
        : ''
  const enterFromTranslate =
    direction === 'left'
      ? 'motion-safe:translate-x-3'
      : direction === 'right'
        ? 'motion-safe:-translate-x-3'
        : ''

  return (
    <div
      style={lockedHeight === null ? undefined : { height: lockedHeight }}
      className={cn(
        'relative inline-grid',
        direction && 'overflow-hidden',
        'motion-safe:transition-[height] motion-safe:duration-base motion-safe:ease-out',
        className,
      )}
    >
      {slots.map((slot) => (
        <div
          key={slot.key}
          ref={(node) => {
            if (node) nodes.current.set(slot.key, node)
            else nodes.current.delete(slot.key)
          }}
          aria-hidden={slot.exiting || undefined}
          className={cn(
            '[grid-area:1/1] self-start motion-safe:transition-[opacity,filter,translate] motion-safe:duration-base motion-safe:ease-out',
            slot.exiting &&
              cn(
                'pointer-events-none absolute inset-x-0 top-0 motion-safe:opacity-0 motion-safe:blur-[2px]',
                exitTranslate,
              ),
            !slot.exiting && !slot.settled && cn('opacity-0', enterFromTranslate),
            !slot.exiting && slot.settled && 'opacity-100 blur-none motion-safe:translate-x-0',
          )}
        >
          {slot.content}
        </div>
      ))}
    </div>
  )
}
