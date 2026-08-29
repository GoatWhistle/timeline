import { describe, expect, it } from 'vitest'
import { contrastRatio } from '@/styles/oklch'
import { loadTheme, resolve } from '@/styles/read-tokens'

const TEXT_AA = 4.5
const UI_AA = 3

const THEMES = ['light', 'dark'] as const

const SURFACES = ['background', 'surface-1', 'surface-2', 'surface-3', 'card', 'popover']

const BODY_TEXT = ['foreground', 'muted-foreground']

const STAGES = [
  'stage-registration',
  'stage-selection',
  'stage-participation',
  'stage-checkpoint',
  'stage-submission',
  'stage-demo',
  'stage-results',
  'stage-other',
]

const STATES = [
  'state-unpublished',
  'state-upcoming',
  'state-active',
  'state-finished',
  'state-archived',
]

const STATUSES = ['status-todo', 'status-done', 'status-not-required']

const URGENCY = [
  'urgency-calm',
  'urgency-soon',
  'urgency-today',
  'urgency-overdue',
  'urgency-done',
  'urgency-waived',
]

const FILLED = [
  ['primary', 'primary-foreground'],
  ['accent', 'accent-foreground'],
  ['destructive', 'destructive-foreground'],
  ['secondary', 'secondary-foreground'],
  ['highlight-fill', 'highlight-fill-foreground'],
]

const UI_BOUNDARIES = ['border-strong', 'input', 'ring']

const SCHEDULE_MARKS = ['border-strong', 'urgency-today']

describe.each(THEMES)('token contrast, %s theme', (theme) => {
  const tokens = loadTheme(theme)
  const ratio = (a: string, b: string) =>
    contrastRatio(resolve(tokens, `--${a}`), resolve(tokens, `--${b}`))

  it.each(BODY_TEXT.flatMap((fg) => SURFACES.map((bg) => [fg, bg] as const)))(
    'body text %s on %s meets 4.5:1',
    (fg, bg) => {
      expect(ratio(fg, bg)).toBeGreaterThanOrEqual(TEXT_AA)
    },
  )

  it.each(SURFACES)('faint-foreground on %s meets 3:1', (bg) => {
    expect(ratio('faint-foreground', bg)).toBeGreaterThanOrEqual(UI_AA)
  })

  it.each([...STAGES, ...STATES, ...STATUSES, ...URGENCY])(
    'stage-foreground label on %s fill meets 4.5:1',
    (fill) => {
      expect(ratio('stage-foreground', fill)).toBeGreaterThanOrEqual(TEXT_AA)
    },
  )

  it.each([...STAGES, ...STATES, ...STATUSES, ...URGENCY])(
    '%s fill separates from the canvas at 3:1',
    (fill) => {
      expect(ratio(fill, 'background')).toBeGreaterThanOrEqual(UI_AA)
    },
  )

  it.each(URGENCY)('urgency %s as text meets 4.5:1 on card and surface-3', (level) => {
    expect(ratio(level, 'card')).toBeGreaterThanOrEqual(TEXT_AA)
    expect(ratio(level, 'surface-3')).toBeGreaterThanOrEqual(TEXT_AA)
  })

  it.each(FILLED)('%s / %s label pair meets 4.5:1', (fill, label) => {
    expect(ratio(label, fill)).toBeGreaterThanOrEqual(TEXT_AA)
  })

  it.each(UI_BOUNDARIES.flatMap((edge) => SURFACES.map((bg) => [edge, bg] as const)))(
    'boundary %s on %s meets 3:1',
    (edge, bg) => {
      expect(ratio(edge, bg)).toBeGreaterThanOrEqual(UI_AA)
    },
  )

  it.each(BODY_TEXT)('%s stays readable on the selected row fill', (fg) => {
    expect(ratio(fg, 'accent-surface')).toBeGreaterThanOrEqual(TEXT_AA)
  })

  it.each(STAGES)('%s carries a stage label as text on surface-1 at 4.5:1', (stage) => {
    expect(ratio(stage, 'surface-1')).toBeGreaterThanOrEqual(TEXT_AA)
  })

  it.each(SCHEDULE_MARKS.flatMap((mark) => SURFACES.map((bg) => [mark, bg] as const)))(
    'schedule mark %s separates from %s at 3:1',
    (mark, bg) => {
      expect(ratio(mark, bg)).toBeGreaterThanOrEqual(UI_AA)
    },
  )
})

describe('domain state distinctness', () => {
  it('a waived registration is not painted as a completed one', () => {
    for (const theme of THEMES) {
      const tokens = loadTheme(theme)
      expect(resolve(tokens, '--urgency-waived')).not.toEqual(resolve(tokens, '--urgency-done'))
    }
  })

  it('NOT_REQUIRED differs from DONE in both themes', () => {
    for (const theme of THEMES) {
      const tokens = loadTheme(theme)
      expect(resolve(tokens, '--status-not-required')).not.toEqual(resolve(tokens, '--status-done'))
    }
  })

  it('accent differs between themes', () => {
    expect(resolve(loadTheme('light'), '--accent')).not.toEqual(
      resolve(loadTheme('dark'), '--accent'),
    )
  })
})
