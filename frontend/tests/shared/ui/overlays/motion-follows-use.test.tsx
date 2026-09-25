import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/overlays/dialog'
import { FLOATING_MOTION, FLOATING_ORIGIN } from '@/shared/ui/overlays/overlay-chrome'
import { Button } from '@/shared/ui/primitives/button'

const SRC = join(process.cwd(), 'src')
const read = (path: string) => readFileSync(join(SRC, path), 'utf8')

function openDialog(props: { sheet?: boolean; still?: boolean }) {
  render(
    <Dialog open>
      <DialogContent {...props} aria-describedby={undefined}>
        <DialogTitle>Panel</DialogTitle>
      </DialogContent>
    </Dialog>,
  )
  return screen.getByRole('dialog')
}

const classes = (element: Element | null) => element?.className.split(/\s+/) ?? []

describe('a floating surface grows out of whatever opened it', () => {
  it('anchors every popover and menu at its trigger rather than its own centre', () => {
    expect(FLOATING_MOTION.split(' ')).toContain(FLOATING_ORIGIN)
    expect(FLOATING_ORIGIN).toBe('origin-(--radix-popper-transform-origin)')
  })

  it('lets a select list grow from its field the same way', () => {
    const select = read('shared/ui/forms/select.tsx')
    expect(select).toContain('FLOATING_ORIGIN')
    expect(select, 'the list only fades, with no sense of where it came from').toMatch(
      /data-\[state=open\]:motion-safe:zoom-in-95/,
    )
  })
})

describe('motion is spent where it explains something and withheld where it would slow', () => {
  it('opens the command palette at once, since it is summoned from the keyboard all day', () => {
    const panel = openDialog({ still: true })
    expect(
      classes(panel).some((c) => c.includes('animate-in')),
      'the palette animates',
    ).toBe(false)
    const scrim = document.querySelector('[data-state="open"].fixed.inset-0')
    expect(
      classes(scrim).some((c) => c.includes('animate-in')),
      'its scrim fades in',
    ).toBe(false)
    expect(read('features/command-palette/command-palette.tsx')).toMatch(/<DialogContent\s+still\b/)
  })

  it('slides a phone sheet up from the edge it rests on, not out of the middle', () => {
    const sheet = openDialog({ sheet: true })
    const list = classes(sheet)
    expect(list).toContain('data-[state=open]:motion-safe:slide-in-from-bottom')
    expect(
      list.some((c) => c.includes('zoom-in')),
      'the sheet still zooms from the centre',
    ).toBe(false)
    expect(list).toContain('bottom-0')
    for (const file of [
      'app/sidebar/phone-more-sheet.tsx',
      'features/catalog/catalog-filter-sheet.tsx',
    ]) {
      expect(read(file), `${file} is a bottom sheet that forgot to say so`).toMatch(
        /<DialogContent\b(?:(?!<[A-Za-z/])[\s\S])*?\ssheet\s/,
      )
    }
  })

  it('keeps an ordinary dialog centred and zooming, as a modal should', () => {
    const list = classes(openDialog({}))
    expect(list).toContain('data-[state=open]:motion-safe:zoom-in-95')
    expect(list.some((c) => c.includes('slide-in-from-bottom'))).toBe(false)
  })

  it('answers a press with a slight give, and only for readers who welcome motion', () => {
    render(<Button>Save</Button>)
    const list = classes(screen.getByRole('button', { name: 'Save' }))
    expect(list).toContain('motion-safe:active:scale-[0.97]')
    expect(list, 'the press scales even under reduced motion').not.toContain('active:scale-[0.97]')
  })
})
