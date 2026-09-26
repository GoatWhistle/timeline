import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ResizableTable } from '@/shared/ui/data-display/column-resize/resizable-table'
import { TableBody, TableCell, TableRow } from '@/shared/ui/data-display/table'

const SRC = join(process.cwd(), 'src')
const SHARED_TABLE = join(SRC, 'shared/ui/data-display/column-resize/resizable-table.tsx')

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

const NOT_A_DATA_TABLE = ['shared/ui/forms/calendar/calendar-grid.tsx']

describe('a table scrolls inside itself, never widening the page', () => {
  it('wraps every shared table in a scroller, so a wide row cannot push the page open', () => {
    const { container } = render(
      <ResizableTable
        storageKey="test-widths"
        columns={[{ id: 'only', width: 120 }]}
        flexible="only"
      >
        <TableBody>
          <TableRow>
            <TableCell>cell</TableCell>
          </TableRow>
        </TableBody>
      </ResizableTable>,
    )
    const wrapper = container.querySelector('table')?.parentElement
    expect(wrapper?.className).toContain('overflow-x-auto')
  })

  it('holds that scroller to the width it is given, so it yields instead of the page', () => {
    const { container } = render(
      <ResizableTable
        storageKey="test-widths"
        columns={[{ id: 'only', width: 120 }]}
        flexible="only"
      >
        <TableBody>
          <TableRow>
            <TableCell>cell</TableCell>
          </TableRow>
        </TableBody>
      </ResizableTable>,
    )
    const wrapper = container.querySelector('table')?.parentElement
    expect(wrapper?.className).toContain('w-full')
  })

  it('gives every hand-rolled table its own scroller, so none relies on the page to absorb it', () => {
    const offenders: string[] = []
    for (const file of tsxFiles(SRC)) {
      if (file === SHARED_TABLE) continue
      if (NOT_A_DATA_TABLE.includes(named(file))) continue
      const source = readFileSync(file, 'utf8')
      if (!source.includes('<table')) continue
      if (!/overflow-(x-auto|hidden)[\s\S]{0,300}?<table/.test(source)) offenders.push(named(file))
    }
    expect(offenders).toEqual([])
  })

  it('the rule still watches a real hand-rolled table, so it cannot pass by watching none', () => {
    const handRolled = tsxFiles(SRC)
      .filter((file) => file !== SHARED_TABLE)
      .filter((file) => !NOT_A_DATA_TABLE.includes(named(file)))
      .filter((file) => readFileSync(file, 'utf8').includes('<table'))
      .map(named)
    expect(handRolled).toContain('shared/ui/states/skeleton-table/skeleton-table.tsx')
  })

  it('every exemption still names a file that really builds a table', () => {
    for (const file of NOT_A_DATA_TABLE) {
      expect(readFileSync(join(SRC, file), 'utf8'), file).toContain('<table')
    }
  })
})

const FILTERS = 'features/participants/participants-filters/participants-filters.tsx'

function clusterClasses(source: string): string[] {
  return [...source.matchAll(/className="([^"]*\bflex\b[^"]*)"/g)].map((match) => match[1] ?? '')
}

describe('a filter bar wraps its controls instead of pushing the page wider', () => {
  const source = readFileSync(join(SRC, FILTERS), 'utf8')

  it('lets the filter cluster shrink, so a long label cannot pin it open', () => {
    const cluster = clusterClasses(source).find(
      (cls) => /items-end/.test(cls) && /\bgap-3\b/.test(cls) && !/justify-between/.test(cls),
    )
    expect(cluster, 'the cluster holding the role and status fields').toBeDefined()
    expect(cluster).toContain('flex-wrap')
    expect(cluster).toContain('min-w-0')
  })

  it('holds no field at a fixed width down to the phone, matching the admin event list', () => {
    const fixed: string[] = []
    for (const match of source.matchAll(/className="([^"]*)"/g)) {
      const cls = match[1] ?? ''
      if (!/(^|\s)w-\d+(\s|$)/.test(cls)) continue
      if (/\bsm:w-\d+\b/.test(cls)) continue
      fixed.push(cls)
    }
    expect(fixed).toEqual([])
  })
})
