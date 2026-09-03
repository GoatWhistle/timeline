import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { InviteModeTabs } from '@/features/teams/invite-mode-tabs'
import { Segmented } from '@/shared/ui/navigation/segmented'

const SRC = join(process.cwd(), 'src')

const OWN_TABLIST = /role=["']tablist["']/

const EXEMPT: string[] = []

function tsxFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...tsxFiles(full))
    else if (entry.name.endsWith('.tsx')) found.push(full)
  }
  return found
}

const named = (file: string) => relative(SRC, file).replaceAll('\\', '/')

describe('one segmented control, not a family of look-alikes', () => {
  const offenders = tsxFiles(SRC)
    .filter((file) => OWN_TABLIST.test(readFileSync(file, 'utf8')))
    .map(named)
    .filter((file) => !EXEMPT.includes(file))

  it('no feature hand-rolls its own tablist beside the shared one', () => {
    expect(offenders).toEqual([])
  })

  it('the exemption still names a file that exists and still opts out', () => {
    for (const file of EXEMPT) {
      expect(OWN_TABLIST.test(readFileSync(join(SRC, file), 'utf8'))).toBe(true)
    }
  })
})

const OPTIONS = [
  { value: 'one', label: 'One' },
  { value: 'two', label: 'Two' },
] as const

describe('the shared segmented control marks its selection', () => {
  it('exactly one tab is selected and it is the value given', () => {
    render(<Segmented value="two" options={OPTIONS} onChange={vi.fn()} label="pick" />)
    const selected = screen.getAllByRole('tab', { selected: true })
    expect(selected).toHaveLength(1)
    expect(selected[0]).toHaveTextContent('Two')
  })

  it('the strip carries the accessible name it was given', () => {
    render(<Segmented value="one" options={OPTIONS} onChange={vi.fn()} label="pick" />)
    expect(screen.getByRole('tablist', { name: 'pick' })).toBeInTheDocument()
  })
})

describe('an icon-bearing strip is the same control, not a second one', () => {
  it('invite modes render as tabs of the shared strip', () => {
    render(<InviteModeTabs value="email" onChange={vi.fn()} />)
    expect(screen.getAllByRole('tab')).toHaveLength(3)
    expect(screen.getAllByRole('tab', { selected: true })).toHaveLength(1)
  })

  it('its icons are decorative, so the label carries the meaning', () => {
    const { container } = render(<InviteModeTabs value="email" onChange={vi.fn()} />)
    for (const icon of container.querySelectorAll('svg')) {
      expect(icon.getAttribute('aria-hidden')).toBe('true')
    }
  })
})
