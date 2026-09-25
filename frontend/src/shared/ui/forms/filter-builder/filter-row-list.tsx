import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'
import { cn } from '@/shared/styling/class-names/class-names'

export const ROW_ENTER_MS = 200
export const ROW_EXIT_MS = 140

type Phase = 'enter' | 'grow' | 'idle' | 'leave'

type Track = {
  keys: string[]
  leaving: { key: string; index: number }[]
  phases: Record<string, Phase>
}

function keyOf(element: ReactElement): string {
  return String(element.key)
}

function withPhase(phases: Record<string, Phase>, keys: string[], phase: Phase | null) {
  const next = { ...phases }
  for (const key of keys) {
    if (phase === null) delete next[key]
    else next[key] = phase
  }
  return next
}

export function FilterRowList({ children }: { children: ReactNode }) {
  const items = Children.toArray(children).filter(isValidElement)
  const keys = items.map(keyOf)
  const nodes = useRef(new Map<string, ReactNode>())
  const [track, setTrack] = useState<Track>({ keys, leaving: [], phases: {} })

  if (track.keys.join('|') !== keys.join('|')) {
    const gone = track.keys.filter((key) => !keys.includes(key))
    const added = keys.filter((key) => !track.keys.includes(key))
    setTrack({
      keys,
      leaving: [
        ...track.leaving.filter((entry) => !keys.includes(entry.key)),
        ...gone.map((key) => ({ key, index: track.keys.indexOf(key) })),
      ],
      phases: withPhase(withPhase(track.phases, gone, 'leave'), added, 'enter'),
    })
  }

  useEffect(() => {
    for (const element of items) nodes.current.set(keyOf(element), element)
  })

  const entering = Object.keys(track.phases).filter((key) => track.phases[key] === 'enter')
  const growing = Object.keys(track.phases).filter((key) => track.phases[key] === 'grow')
  const growingSignature = growing.join('|')
  const leavingKeys = track.leaving.map((entry) => entry.key)
  const enteringSignature = entering.join('|')
  const leavingSignature = leavingKeys.join('|')

  useEffect(() => {
    if (enteringSignature === '') return
    const started = enteringSignature.split('|')
    let second = 0
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() =>
        setTrack((current) => ({ ...current, phases: withPhase(current.phases, started, 'grow') })),
      )
    })
    return () => {
      cancelAnimationFrame(first)
      cancelAnimationFrame(second)
    }
  }, [enteringSignature])

  useEffect(() => {
    if (growingSignature === '') return
    const grown = growingSignature.split('|')
    const timer = setTimeout(
      () => setTrack((current) => ({ ...current, phases: withPhase(current.phases, grown, null) })),
      ROW_ENTER_MS,
    )
    return () => clearTimeout(timer)
  }, [growingSignature])

  useEffect(() => {
    if (leavingSignature === '') return
    const gone = leavingSignature.split('|')
    const timer = setTimeout(
      () =>
        setTrack((current) => ({
          ...current,
          leaving: current.leaving.filter((entry) => !gone.includes(entry.key)),
          phases: withPhase(current.phases, gone, null),
        })),
      ROW_EXIT_MS,
    )
    return () => clearTimeout(timer)
  }, [leavingSignature])

  const shown: { key: string; node: ReactNode; phase: Phase }[] = items.map((element) => ({
    key: keyOf(element),
    node: element,
    phase: track.phases[keyOf(element)] ?? 'idle',
  }))
  for (const entry of [...track.leaving].sort((a, b) => a.index - b.index)) {
    if (keys.includes(entry.key)) continue
    shown.splice(Math.min(entry.index, shown.length), 0, {
      key: entry.key,
      node: nodes.current.get(entry.key),
      phase: 'leave',
    })
  }

  return (
    <ul className="flex flex-col">
      {shown.map(({ key, node, phase }) => {
        const open = phase === 'grow' || phase === 'idle'
        return (
          <li
            key={key}
            data-row-phase={phase}
            aria-hidden={phase === 'leave' ? true : undefined}
            inert={phase === 'leave' ? true : undefined}
            className={cn(
              'grid',
              'motion-safe:transition-[grid-template-rows,opacity,translate] motion-safe:ease-out',
              phase === 'leave' ? 'motion-safe:duration-base-exit' : 'motion-safe:duration-base',
              open ? 'grid-rows-[1fr] opacity-100' : '-translate-y-1 grid-rows-[0fr] opacity-0',
            )}
          >
            <div className={cn('min-h-0', phase !== 'idle' && 'overflow-hidden')}>
              <div className="pb-2">{node}</div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
