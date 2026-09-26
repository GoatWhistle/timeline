import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useFollowSidebar } from '@/app/sidebar/use-follow-sidebar'

const SRC = join(process.cwd(), 'src')

let left = 0

function Main({ collapsed }: { collapsed: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useFollowSidebar(ref, collapsed)
  return <div ref={ref} data-testid="main" />
}

function stubMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('reduce'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
  const animate = vi.fn()
  Object.defineProperty(HTMLElement.prototype, 'animate', { value: animate, configurable: true })
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    () => ({ left }) as DOMRect,
  )
  return animate
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('the sidebar slides without dragging the page layout along every frame', () => {
  it('moves the sidebar by translate alone, never by animating its margin', () => {
    const source = readFileSync(join(SRC, 'app/sidebar/app-sidebar.tsx'), 'utf8')
    expect(source).toContain('motion-safe:transition-[translate]')
    expect(source, 'the margin is tweened again, relaying out the page every frame').not.toMatch(
      /transition-\[[^\]]*margin/,
    )
  })

  it('lets the content follow on the compositor from where it stood to where it lands', () => {
    const animate = stubMotion(false)
    left = 56
    const { rerender } = render(<Main collapsed />)
    left = 248
    rerender(<Main collapsed={false} />)
    expect(animate).toHaveBeenCalledOnce()
    const [frames] = animate.mock.calls[0] ?? []
    expect(frames).toEqual([{ transform: 'translateX(-192px)' }, { transform: 'translateX(0)' }])
  })

  it('leaves the content alone on a render that did not toggle the sidebar', () => {
    const animate = stubMotion(false)
    left = 248
    const { rerender } = render(<Main collapsed={false} />)
    left = 300
    rerender(<Main collapsed={false} />)
    expect(animate, 'a resize slid the content as if the sidebar had moved').not.toHaveBeenCalled()
  })

  it('jumps without motion for a reader who asked for less of it', () => {
    const animate = stubMotion(true)
    left = 56
    const { rerender } = render(<Main collapsed />)
    left = 248
    rerender(<Main collapsed={false} />)
    expect(animate).not.toHaveBeenCalled()
  })
})
