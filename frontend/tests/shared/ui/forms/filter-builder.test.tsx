import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it } from 'vitest'
import { i18n, i18nReady } from '@/shared/i18n/config'
import { FilterPopover } from '@/shared/ui/forms/filter-builder/filter-builder'

const SRC = join(process.cwd(), 'src')
const TRIGGER_FILE = 'shared/ui/forms/filter-builder/filter-trigger.tsx'

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

function panel(count: number) {
  return renderWithProviders(
    <FilterPopover
      count={count}
      available={[{ value: 'kind', label: 'Kind' }]}
      onAdd={() => {}}
      onReset={() => {}}
    >
      {null}
    </FilterPopover>,
  )
}

beforeAll(async () => {
  await i18nReady
  await i18n.changeLanguage('en')
})

describe('the filter control is an icon that names itself only once opened', () => {
  it('shows no word on the closed button, yet still tells a screen reader what it is', () => {
    panel(0)
    const trigger = screen.getByRole('button', { name: 'Filters' })
    expect(trigger.textContent?.trim(), 'the closed button printed a label again').toBe('')
    expect(trigger.className.split(/\s+/)).toContain('size-9')
  })

  it('marks active filters with a small circle, not a boxed badge', () => {
    panel(2)
    const trigger = screen.getByRole('button', { name: 'Filters: 2 active' })
    const count = trigger.querySelector('[data-filter-count]')
    expect(count?.textContent).toBe('2')
    const classes = count?.className.split(/\s+/) ?? []
    expect(classes, 'the count is no longer a fixed circle').toEqual(
      expect.arrayContaining(['size-4', 'rounded-pill']),
    )
    expect(trigger.querySelector('.rounded-control'), 'the boxed badge came back').toBeNull()
  })

  it('titles the opened panel, and offers reset only when something is filtered', async () => {
    const { user } = panel(0)
    await user.click(screen.getByRole('button', { name: 'Filters' }))
    const opened = await screen.findByRole('dialog', { name: 'Filters' })
    expect(within(opened).getByText('Filters')).toBeTruthy()
    expect(within(opened).queryByRole('button', { name: 'Reset' })).toBeNull()
  })

  it('resets from the header with the same turning-arrow icon the shortcuts use, no word', async () => {
    const { user } = panel(1)
    await user.click(screen.getByRole('button', { name: 'Filters: 1 active' }))
    const opened = await screen.findByRole('dialog', { name: 'Filters' })
    const header = opened.querySelector('header')
    const reset = header && within(header).getByRole('button', { name: 'Reset' })
    expect(reset?.textContent?.trim(), 'reset printed a word instead of the icon').toBe('')
    expect(
      reset?.querySelector('svg.lucide-rotate-ccw'),
      'reset lost the shortcuts icon',
    ).toBeTruthy()
  })

  it('adds a filter by choosing its field from a menu, never by guessing one', async () => {
    const { user } = panel(0)
    await user.click(screen.getByRole('button', { name: 'Filters' }))
    const opened = await screen.findByRole('dialog', { name: 'Filters' })
    await user.click(within(opened).getByRole('button', { name: 'Add filter' }))
    expect(await screen.findByRole('menuitem', { name: 'Kind' })).toBeTruthy()
  })
})

describe('there is one filter button across the product', () => {
  it('draws the filter icon in exactly one file', () => {
    const drawers = tsxFiles(SRC)
      .filter((file) => /\bSlidersHorizontal\b/.test(readFileSync(file, 'utf8')))
      .map(named)
    expect(drawers).toEqual([TRIGGER_FILE])
  })
})
