import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@tests/support/render'
import { useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { effectiveLayout } from '@/entities/catalog/catalog.views'
import type { CatalogFilterValues } from '@/features/catalog/catalog-filter-conditions'
import {
  CatalogFilterSheet,
  CatalogFilterSheetTrigger,
} from '@/features/catalog/catalog-filter-sheet'
import { i18n } from '@/shared/i18n/config'

const NO_FILTERS: CatalogFilterValues = {
  state: '',
  format: '',
  kind: '',
  origin: '',
  joined: '',
  from: '',
  to: '',
}

describe('the phone catalog never falls back to the twelve-column table', () => {
  it('a phone gets cards even when the url asks for the table', () => {
    expect(effectiveLayout('table', true)).toBe('grid')
  })

  it('a phone asking for the grid still gets the grid', () => {
    expect(effectiveLayout('grid', true)).toBe('grid')
  })

  it('every wider screen keeps the layout the url chose', () => {
    expect(effectiveLayout('table', false)).toBe('table')
    expect(effectiveLayout('grid', false)).toBe('grid')
  })
})

describe('the phone filter sheet', () => {
  function renderSheet(overrides: Partial<CatalogFilterValues> = {}) {
    const onChange = vi.fn()
    const onReset = vi.fn()
    renderWithProviders(
      <CatalogFilterSheet
        values={{ ...NO_FILTERS, ...overrides }}
        onChange={onChange}
        onReset={onReset}
        open
        onOpenChange={vi.fn()}
      />,
    )
    return { onChange, onReset }
  }

  it('names every filter field as its own labelled group', () => {
    renderSheet()
    for (const key of ['state', 'format', 'kind', 'origin', 'joined']) {
      expect(
        screen.getByRole('group', { name: i18n.t(`event:catalog.field.${key}`) }),
      ).toBeInTheDocument()
    }
  })

  it('reports each choice as pressed or not, so a reader can hear the selection', () => {
    renderSheet({ format: 'ONLINE' })
    const online = screen.getByRole('button', { name: i18n.t('event:catalog.format.online') })
    const offline = screen.getByRole('button', { name: i18n.t('event:catalog.format.offline') })
    expect(online).toHaveAttribute('aria-pressed', 'true')
    expect(offline).toHaveAttribute('aria-pressed', 'false')
  })

  it('picking a choice sends exactly that field and value up', async () => {
    const { onChange } = renderSheet()
    await userEvent.click(
      screen.getByRole('button', { name: i18n.t('event:catalog.format.online') }),
    )
    expect(onChange).toHaveBeenCalledWith({ format: 'ONLINE' })
  })

  it('pressing the chosen value again clears that field rather than re-setting it', async () => {
    const { onChange } = renderSheet({ format: 'ONLINE' })
    await userEvent.click(
      screen.getByRole('button', { name: i18n.t('event:catalog.format.online') }),
    )
    expect(onChange).toHaveBeenCalledWith({ format: '' })
  })
})

const SHEET = join(process.cwd(), 'src/features/catalog/catalog-filter-sheet.tsx')
const TOOLBAR = join(process.cwd(), 'src/features/catalog/catalog-toolbar-phone.tsx')

describe('the phone surfaces keep the rules the screen cannot show a test', () => {
  it('every tappable thing in the sheet and phone toolbar carries the shared tap size', () => {
    const sheet = readFileSync(SHEET, 'utf8')
    const toolbar = readFileSync(TOOLBAR, 'utf8')
    expect(sheet).toContain('TAP_TARGET')
    expect(toolbar).toContain('TAP_TARGET')
    expect(sheet.match(/TAP_TARGET/g)?.length ?? 0).toBeGreaterThanOrEqual(5)
  })

  it('closing the sheet lands focus on the trigger, never on the body', async () => {
    function Harness() {
      const trigger = useRef<HTMLButtonElement>(null)
      const [open, setOpen] = useState(false)
      return (
        <>
          <CatalogFilterSheetTrigger
            values={NO_FILTERS}
            onClick={() => setOpen(true)}
            ref={trigger}
          />
          <CatalogFilterSheet
            values={NO_FILTERS}
            onChange={vi.fn()}
            onReset={vi.fn()}
            open={open}
            onOpenChange={setOpen}
            returnFocusTo={trigger}
          />
        </>
      )
    }

    renderWithProviders(<Harness />)
    const trigger = screen.getByRole('button', { name: /Filters/ })
    await userEvent.click(trigger)
    await screen.findByRole('dialog')

    await userEvent.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(document.activeElement).toBe(trigger)
    expect(document.activeElement).not.toBe(document.body)
  })

  it('the sheet borrows the one dialog rather than spelling its own scrim', () => {
    const sheet = readFileSync(SHEET, 'utf8')
    expect(sheet).toContain("from '@/shared/ui/overlays/dialog'")
    expect(sheet).not.toContain('bg-scrim')
  })
})
