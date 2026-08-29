import { describe, expect, it } from 'vitest'
import { cn } from '@/shared/styling/class-names/class-names'

const SIZES = ['text-screen', 'text-heading', 'text-copy', 'text-meta', 'text-caption']

const COLORS = [
  'text-foreground',
  'text-muted-foreground',
  'text-faint-foreground',
  'text-destructive',
  'text-primary',
  'text-accent-foreground',
  'text-stage-foreground',
  'text-status-todo',
  'text-state-active',
  'text-urgency-overdue',
  'text-urgency-today',
  'text-urgency-done',
]

describe('cn keeps the type scale separate from text colour', () => {
  it.each(SIZES.flatMap((size) => COLORS.map((color) => [size, color] as const)))(
    'keeps %s when %s follows it',
    (size, color) => {
      const merged = cn(size, color).split(' ')
      expect(merged).toContain(size)
      expect(merged).toContain(color)
    },
  )

  it.each(SIZES.flatMap((size) => COLORS.map((color) => [color, size] as const)))(
    'keeps %s when %s follows it',
    (color, size) => {
      const merged = cn(color, size).split(' ')
      expect(merged).toContain(size)
      expect(merged).toContain(color)
    },
  )
})

describe('cn still collapses genuine conflicts', () => {
  it.each([
    ['text-meta text-caption', 'text-caption'],
    ['text-copy text-screen', 'text-screen'],
    ['text-foreground text-muted-foreground', 'text-muted-foreground'],
    ['text-urgency-done text-urgency-overdue', 'text-urgency-overdue'],
  ])('%s collapses to %s', (input, expected) => {
    expect(cn(input)).toBe(expected)
  })

  it('a size and a colour survive together in one string', () => {
    expect(cn('text-caption text-muted-foreground').split(' ').sort()).toEqual([
      'text-caption',
      'text-muted-foreground',
    ])
  })

  it('keeps unrelated utilities untouched', () => {
    expect(cn('truncate text-meta text-muted-foreground')).toBe(
      'truncate text-meta text-muted-foreground',
    )
  })
})
