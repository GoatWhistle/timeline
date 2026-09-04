import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DeleteAction, EditAction } from '@/shared/ui/primitives/row-actions'

const TOUCH_REACH = 'after:-inset-1.5'

describe('a row action stays reachable under a thumb', () => {
  it('gives the edit pencil a touch area beyond its drawn square', () => {
    render(<EditAction label="Edit the track" />)
    expect(screen.getByRole('button').className).toContain(TOUCH_REACH)
  })

  it('gives the delete bin a touch area beyond its drawn square', () => {
    render(<DeleteAction label="Delete the track" />)
    expect(screen.getByRole('button').className).toContain(TOUCH_REACH)
  })

  it('keeps the drawn square the size the row-action convention fixes', () => {
    const { unmount } = render(<EditAction label="Edit" />)
    expect(screen.getByRole('button').className).toContain('size-8')
    unmount()

    render(<DeleteAction label="Delete" />)
    expect(screen.getByRole('button').className).toContain('size-8')
  })

  it('spends the touch area only where the pointer is coarse', () => {
    render(<EditAction label="Edit" />)
    const drawn = screen.getByRole('button').className
    const reach = drawn.split(/\s+/).filter((name) => name.includes(TOUCH_REACH))
    expect(reach.length).toBeGreaterThan(0)
    for (const name of reach) expect(name.startsWith('pointer-coarse:')).toBe(true)
  })

  it('lays the touch area over the row without shifting what is drawn', () => {
    render(<EditAction label="Edit" />)
    const drawn = screen.getByRole('button').className
    expect(drawn).toContain('after:absolute')
    expect(drawn).toContain('relative')
  })
})
