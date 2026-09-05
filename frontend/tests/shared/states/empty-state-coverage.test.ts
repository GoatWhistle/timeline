import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const SOURCE_ROOT = resolve(process.cwd(), 'src')
const SHELL = join(SOURCE_ROOT, 'shared', 'ui', 'data-display', 'empty-state.tsx')

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...sourceFiles(full))
    else if (/\.tsx$/.test(entry.name)) out.push(full)
  }
  return out
}

function callSites(): { file: string; source: string }[] {
  return sourceFiles(SOURCE_ROOT)
    .filter((file) => file !== SHELL)
    .map((file) => ({ file, source: readFileSync(file, 'utf8') }))
    .filter((entry) => entry.source.includes('<EmptyState'))
}

describe('every place that can be empty says what kind of empty it is', () => {
  it('finds the shared empty state used in many places at once', () => {
    expect(callSites().length).toBeGreaterThanOrEqual(19)
  })

  it('leaves nobody on the bare shell without a figure', () => {
    const bare = callSites()
      .filter((entry) => !entry.source.includes('figure={'))
      .map((entry) => relative(SOURCE_ROOT, entry.file))

    expect(bare).toEqual([])
  })

  it('draws each subject with a figure from the split kit, not one glyph for all', () => {
    const used = new Set<string>()
    for (const { source } of callSites()) {
      for (const match of source.matchAll(/figure=\{(\w+)\}/g)) {
        const name = match[1]
        if (name !== undefined) used.add(name)
      }
    }

    expect(used.size).toBeGreaterThanOrEqual(10)
  })

  it('keeps the shell a shell, never a switch over every screen', () => {
    const shell = readFileSync(SHELL, 'utf8')
    expect(shell).not.toMatch(/\bswitch\s*\(/)
    expect(shell.split('\n').length).toBeLessThanOrEqual(250)
  })

  it('pairs every reset handler with the filtered flag that reveals the button', () => {
    const mismatched: string[] = []
    for (const { file, source } of callSites()) {
      for (const element of source.match(/<EmptyState[\s\S]*?\/>/g) ?? []) {
        const resets = element.includes('onReset={')
        const flag = element.includes('filtered={') || /\bfiltered\b(?![=\w])/.test(element)
        if (resets !== flag) mismatched.push(relative(SOURCE_ROOT, file))
      }
    }

    expect(mismatched).toEqual([])
  })
})

describe('an empty state is part of the page, never a floating dialog', () => {
  const OVERLAY_CHROME = join(SOURCE_ROOT, 'shared', 'ui', 'overlays', 'overlay-chrome.ts')

  it('keeps the dialog surface out of every screen that draws an empty state', () => {
    const borrowed = callSites()
      .filter((entry) => entry.source.includes('PANEL_SURFACE'))
      .map((entry) => relative(SOURCE_ROOT, entry.file))

    expect(borrowed).toEqual([])
  })

  it('keeps the floating shadow of an overlay off the shared empty state', () => {
    expect(readFileSync(SHELL, 'utf8')).not.toContain('shadow-floating')
  })

  it('still spells that dialog surface once, where overlays take it from', () => {
    expect(readFileSync(OVERLAY_CHROME, 'utf8')).toContain('shadow-floating')
  })
})
