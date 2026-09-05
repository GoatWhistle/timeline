import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/navigation/tabs'

const SRC = join(process.cwd(), 'src')
const TABS = join(SRC, 'shared/ui/navigation/tabs.tsx')

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

function renderStrip() {
  return render(
    <Tabs value="general">
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="stages">Stages</TabsTrigger>
        <TabsTrigger value="statuses">Statuses</TabsTrigger>
      </TabsList>
    </Tabs>,
  )
}

describe('a tab strip scrolls inside itself, never widening the page', () => {
  it('wraps the strip in a scroller, which is what stopped the admin event page overflowing', () => {
    const { container } = renderStrip()
    const list = container.querySelector('[role="tablist"]')
    const wrapper = list?.parentElement
    expect(wrapper?.className).toContain('overflow-x-auto')
  })

  it('holds the scroller to the width it is given, so it cannot push the page wider', () => {
    const { container } = renderStrip()
    const wrapper = container.querySelector('[role="tablist"]')?.parentElement
    expect(wrapper?.className).toContain('max-w-full')
  })

  it('keeps the strip itself inline, so the scroller is what yields and not the tabs', () => {
    const { container } = renderStrip()
    const list = container.querySelector('[role="tablist"]')
    expect(list?.className).toContain('inline-flex')
  })

  it('scrolls every tab strip from one place, so no screen wraps its own', () => {
    const offenders: string[] = []
    for (const file of tsxFiles(SRC)) {
      if (file === TABS) continue
      const source = readFileSync(file, 'utf8')
      if (!source.includes('<TabsList')) continue
      if (/overflow-x-auto.{0,200}?<TabsList/s.test(source)) offenders.push(named(file))
    }
    expect(offenders).toEqual([])
  })
})
