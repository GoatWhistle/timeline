import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')

const PICKER = readFileSync(join(SRC, 'shared/ui/forms/calendar/date-picker.tsx'), 'utf8')
const DIALOG = readFileSync(join(SRC, 'shared/ui/overlays/dialog.tsx'), 'utf8')

describe('the calendar is not laid out inside the box that scrolls', () => {
  it('is portalled out of the field, so no ancestor can clip it', () => {
    expect(PICKER).toContain('createPortal')
  })

  it('is taken out of the flow with fixed, not parked under its field with absolute', () => {
    expect(PICKER).toContain("'pointer-events-auto fixed")
    expect(PICKER).not.toContain('absolute top-full')
  })

  it('is placed by measurement rather than pinned to one corner of the field', () => {
    expect(PICKER).toContain('useAnchoredPanel')
  })

  it('stays reachable by the pointer inside a dialog that disables the page', () => {
    expect(PICKER).toContain('pointer-events-auto')
  })
})

describe('the dialog around it keeps its own dismissal', () => {
  it('lands in the dialog rather than the body, so focus is not trapped away', () => {
    expect(PICKER).toContain('panelHost(anchorRef.current)')
    expect(DIALOG).toContain('data-slot="dialog-content"')
  })

  it('lets the calendar answer Escape first instead of closing the whole form', () => {
    expect(PICKER).toContain('data-escape-owner')
    expect(DIALOG).toContain('onEscapeKeyDown')
    expect(DIALOG).toContain('data-escape-owner')
  })
})

describe('a date can be typed, not only pointed at', () => {
  it('offers a real text field rather than a button that only opens a calendar', () => {
    expect(PICKER).toContain('type="text"')
  })

  it('shows the expected shape in the field itself', () => {
    expect(PICKER).toContain('placeholder={DATE_TEXT_PATTERN}')
  })

  it('keeps the calendar available as a button beside the field', () => {
    expect(PICKER).toContain("aria-label={t('calendar.openCalendar')}")
    expect(PICKER).toContain('aria-haspopup="dialog"')
  })

  it('settles what was typed when the field is left, not only while typing', () => {
    expect(PICKER).toContain('onBlur')
    expect(PICKER).toContain('commit(')
  })
})
