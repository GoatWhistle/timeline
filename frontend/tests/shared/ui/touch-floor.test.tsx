import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CatalogViewSwitch } from '@/features/catalog/catalog-view-switch'
import { Select, SelectTrigger, SelectValue } from '@/shared/ui/forms/select'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/navigation/tabs'
import { Button } from '@/shared/ui/primitives/button'
import { DeleteAction, EditAction } from '@/shared/ui/primitives/row-actions'

const FLOOR = ['pointer-coarse:after:min-h-11', 'pointer-coarse:after:min-w-11']

const CENTRED = [
  'pointer-coarse:after:left-1/2',
  'pointer-coarse:after:top-1/2',
  'pointer-coarse:after:-translate-x-1/2',
  'pointer-coarse:after:-translate-y-1/2',
]

const SIZES = ['default', 'sm', 'lg', 'icon'] as const

const DRAWN: Record<(typeof SIZES)[number], string> = {
  default: 'h-9',
  sm: 'h-8',
  lg: 'h-10',
  icon: 'size-9',
}

function classesOf(name: string): string[] {
  return screen.getByRole('button', { name }).className.split(/\s+/)
}

describe('every button carries a thumb-sized floor', () => {
  it.each(SIZES)('gives the %s size a 44px reach on a coarse pointer', (size) => {
    render(
      <Button size={size} aria-label={size}>
        x
      </Button>,
    )
    const classes = classesOf(size)
    for (const name of FLOOR) expect(classes).toContain(name)
  })

  it.each(SIZES)('centres the reach of the %s size on what is drawn', (size) => {
    render(
      <Button size={size} aria-label={size}>
        x
      </Button>,
    )
    const classes = classesOf(size)
    for (const name of CENTRED) expect(classes).toContain(name)
    expect(classes).toContain('pointer-coarse:after:size-full')
    expect(classes).toContain('relative')
    expect(classes).toContain('pointer-coarse:after:absolute')
  })

  it.each(SIZES)('leaves the drawn %s size exactly as the desktop density fixes it', (size) => {
    render(
      <Button size={size} aria-label={size}>
        x
      </Button>,
    )
    expect(classesOf(size)).toContain(DRAWN[size])
  })

  it('spends the reach only where the pointer is coarse', () => {
    render(<Button aria-label="plain">x</Button>)
    const reach = classesOf('plain').filter((name) => name.startsWith('after:'))
    expect(reach).toEqual([])
    const guarded = classesOf('plain').filter((name) => name.includes('after:'))
    expect(guarded.length).toBeGreaterThan(0)
    for (const name of guarded) expect(name.startsWith('pointer-coarse:')).toBe(true)
  })
})

describe('a row action inherits the floor rather than repeating it', () => {
  it.each([
    ['edit pencil', EditAction],
    ['delete bin', DeleteAction],
  ])('gives the %s a reach without a mechanism of its own', (_name, Action) => {
    render(<Action label="act" />)
    const classes = screen.getByRole('button', { name: 'act' }).className.split(/\s+/)
    for (const name of FLOOR) expect(classes).toContain(name)
    expect(classes).not.toContain('pointer-coarse:after:-inset-1.5')
  })

  it.each([
    ['edit pencil', EditAction],
    ['delete bin', DeleteAction],
  ])('keeps the drawn square of the %s at the row-action convention', (_name, Action) => {
    render(<Action label="act" />)
    const classes = screen.getByRole('button', { name: 'act' }).className.split(/\s+/)
    expect(classes).toContain('size-8')
    expect(classes).not.toContain('size-9')
  })
})

describe('the controls a button does not own carry the same floor', () => {
  it('gives a tab trigger the 44px reach and a strip roomy enough to hold it', () => {
    const { container } = render(
      <Tabs defaultValue="one">
        <TabsList>
          <TabsTrigger value="one">One</TabsTrigger>
          <TabsTrigger value="two">Two</TabsTrigger>
        </TabsList>
      </Tabs>,
    )
    const trigger = screen.getByRole('tab', { name: 'One' }).className.split(/\s+/)
    for (const name of FLOOR) expect(trigger).toContain(name)
    const list = container.querySelector('[role="tablist"]')
    expect(list?.className.split(/\s+/)).toContain('pointer-coarse:h-12')
    expect(trigger).toContain('pointer-coarse:self-stretch')
  })

  it('leaves the drawn tab strip at the desktop height it had', () => {
    const { container } = render(
      <Tabs defaultValue="one">
        <TabsList>
          <TabsTrigger value="one">One</TabsTrigger>
        </TabsList>
      </Tabs>,
    )
    expect(container.querySelector('[role="tablist"]')?.className.split(/\s+/)).toContain('h-9')
  })

  it('grows the paired view switch instead of overlapping its two halves', () => {
    const { container } = render(<CatalogViewSwitch layout="table" onLayout={() => {}} />)
    const buttons = [...container.querySelectorAll('button')]
    expect(buttons.length).toBeGreaterThan(1)
    for (const button of buttons) {
      const classes = button.className.split(/\s+/)
      expect(classes).toContain('size-7')
      expect(classes).toContain('pointer-coarse:size-11')
      for (const name of FLOOR) expect(classes).not.toContain(name)
    }
    expect(container.querySelector('fieldset')?.className.split(/\s+/)).toContain(
      'pointer-coarse:h-12',
    )
  })

  it('gives a select trigger the 44px reach without changing its drawn height', () => {
    render(
      <Select>
        <SelectTrigger aria-label="pick">
          <SelectValue />
        </SelectTrigger>
      </Select>,
    )
    const classes = screen.getByRole('combobox', { name: 'pick' }).className.split(/\s+/)
    for (const name of FLOOR) expect(classes).toContain(name)
    expect(classes).toContain('h-9')
  })
})
