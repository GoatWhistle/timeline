import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { EventForm } from '@/entities/event/event-form'
import { EVENT, fixMoscowClock } from './event-form.harness'

fixMoscowClock()

const SRC = join(process.cwd(), 'src')
const FORM = readFileSync(join(SRC, 'entities/event/event-flat-form.tsx'), 'utf8')
const COVER = readFileSync(join(SRC, 'features/event-cover/cover-field.tsx'), 'utf8')

function render() {
  renderWithProviders(<EventForm event={EVENT} mode="edit" submitLabel="Save" onSubmit={vi.fn()} />)
}

describe('the event form splits into columns when it has the room, not when the window does', () => {
  it('puts every section into one of two columns instead of a single tall ribbon', () => {
    render()
    const columns = document.querySelectorAll('[data-form-column]')
    expect(columns.length).toBe(2)
    const sections = document.querySelectorAll('[data-stage-section]')
    expect(sections.length).toBeGreaterThan(2)
    for (const section of sections) {
      expect(section.closest('[data-form-column]')).not.toBeNull()
    }
  })

  it('splits the columns on its own width, so a side panel beside it cannot halve them again', () => {
    expect(FORM).toContain('@container')
    expect(FORM).toMatch(/@\w+:grid-cols-2/)
    expect(FORM).not.toMatch(/\bxl:grid-cols-2/)
  })

  it('leads with kind and basics, and never leaves a column empty', () => {
    render()
    const columns = [...document.querySelectorAll('[data-form-column]')]
    const ids = columns.map((column) =>
      [...column.querySelectorAll('[data-stage-section]')].map(
        (section) => (section as HTMLElement).dataset.stageSection,
      ),
    )
    expect(ids[0]).toEqual(['kind', 'basics'])
    expect(ids[1]?.length).toBeGreaterThan(0)
    expect(ids[1]).not.toContain('kind')
    expect(ids[1]).not.toContain('basics')
  })
})

describe('the cover panel fits the side column it now lives in', () => {
  it('turns its image and its actions side by side on its own width, not the window width', () => {
    expect(COVER).toContain('@container')
    expect(COVER).toMatch(/@\w+:flex-row/)
    expect(COVER).not.toMatch(/\bsm:flex-row/)
  })
})
