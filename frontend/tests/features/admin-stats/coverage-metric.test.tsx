import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { registrationCoverageQuery } from '@/features/admin-stats/admin-stats.queries'
import { CoverageMetric, formatShare } from '@/features/admin-stats/coverage-metric/coverage-metric'
import type { RegistrationCoverage } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'

const NOT_APPLICABLE = i18n.t('event:stats.coverageNotApplicable')
const COVERAGE_LABEL = i18n.t('event:stats.coverage')
const COVERAGE_KEYS = [
  'coverage',
  'coverageNotApplicable',
  'coverageAria',
  'coverageHint',
  'coverageEmptyHint',
]

function seeded(coverage: RegistrationCoverage) {
  const view = renderWithProviders(<CoverageMetric />)
  view.queryClient.setQueryData(registrationCoverageQuery().queryKey, coverage)
  return view
}

const covered: RegistrationCoverage = {
  applicable: true,
  events_covered: 2,
  total: 4,
  self_reported_done: 2,
  not_required: 1,
  outstanding: 1,
  share: 0.75,
}

describe('formatShare', () => {
  it('renders a whole percentage', () => {
    expect(formatShare(0.75)).toBe('75%')
    expect(formatShare(0)).toBe('0%')
    expect(formatShare(1)).toBe('100%')
  })

  it('never rounds a partial share up to a full hundred', () => {
    expect(formatShare(0.999)).toBe('>99%')
    expect(formatShare(999 / 1000)).not.toBe('100%')
  })

  it('never rounds a non-zero share down to nothing', () => {
    expect(formatShare(0.001)).toBe('<1%')
    expect(formatShare(1 / 1000)).not.toBe('0%')
  })
})

describe('CoverageMetric', () => {
  it('shows the share when at least one event requires registration', async () => {
    seeded(covered)
    expect(await screen.findByText('75%')).toBeInTheDocument()
  })

  it('separates "not applicable" from "nobody registered"', async () => {
    seeded({
      applicable: false,
      events_covered: 0,
      total: 0,
      self_reported_done: 0,
      not_required: 0,
      outstanding: 0,
    })
    expect(await screen.findByText(NOT_APPLICABLE)).toBeInTheDocument()
    expect(screen.queryByText('0%')).not.toBeInTheDocument()
  })

  it('still says "not applicable" when the share is missing despite a flag', async () => {
    seeded({
      applicable: true,
      events_covered: 0,
      total: 0,
      self_reported_done: 0,
      not_required: 0,
      outstanding: 0,
    })
    expect(await screen.findByText(NOT_APPLICABLE)).toBeInTheDocument()
  })

  it('shows a genuine zero share when registration is required and nobody marked it', async () => {
    seeded({
      applicable: true,
      events_covered: 1,
      total: 3,
      self_reported_done: 0,
      not_required: 0,
      outstanding: 3,
      share: 0,
    })
    expect(await screen.findByText('0%')).toBeInTheDocument()
    expect(screen.queryByText(NOT_APPLICABLE)).not.toBeInTheDocument()
  })

  it('labels the share as self-reported and never as verified', async () => {
    seeded(covered)
    await screen.findByText('75%')
    expect(screen.getByText(COVERAGE_LABEL)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/подтвержд|проверен|verified|confirmed/i)
  })

  it('keeps both dictionaries free of any claim that the system checked', () => {
    for (const lng of ['ru', 'en']) {
      const wording = COVERAGE_KEYS.map((key) =>
        i18n.t(`event:stats.${key}`, {
          lng,
          count: 4,
          done: 2,
          waived: 1,
          outstanding: 1,
        }),
      ).join(' ')
      expect(wording).not.toMatch(/подтвержд|проверил|verified|confirmed/i)
      expect(wording.length).toBeGreaterThan(0)
    }
  })

  it('says the participants marked it themselves in both dictionaries', () => {
    expect(i18n.t('event:stats.coverage', { lng: 'ru' })).toMatch(/отметил/i)
    expect(i18n.t('event:stats.coverage', { lng: 'en' })).toMatch(/marked/i)
  })

  it('carries the breakdown in a hint rather than colour alone', async () => {
    const view = seeded(covered)
    await screen.findByText('75%')
    const hinted = view.container.querySelector('[title]')
    const title = hinted?.getAttribute('title') ?? ''
    expect(title).toContain('2')
    expect(title).toContain('4')
    expect(title).toBe(
      i18n.t('event:stats.coverageHint', {
        count: covered.total,
        done: covered.self_reported_done,
        waived: covered.not_required,
        outstanding: covered.outstanding,
      }),
    )
  })

  it('names the not-applicable state in words, not only in grey', async () => {
    const view = seeded({
      applicable: false,
      events_covered: 0,
      total: 0,
      self_reported_done: 0,
      not_required: 0,
      outstanding: 0,
    })
    await screen.findByText(NOT_APPLICABLE)
    expect(view.container.querySelector('svg')).toBeInTheDocument()
  })
})
