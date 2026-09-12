import { describe, expect, it } from 'vitest'
import { activityLevel, maxMonthlyCount } from '@/features/public-profile/activity-level'

describe('activityLevel', () => {
  it('is zero for a month with no events', () => {
    expect(activityLevel(0, 10)).toBe(0)
  })

  it('is zero when every month is empty', () => {
    expect(activityLevel(0, 0)).toBe(0)
  })

  it('buckets low counts into the first tier', () => {
    expect(activityLevel(1, 9)).toBe(1)
  })

  it('buckets mid counts into the second tier', () => {
    expect(activityLevel(5, 9)).toBe(2)
  })

  it('buckets the maximum into the top tier', () => {
    expect(activityLevel(9, 9)).toBe(3)
  })
})

describe('maxMonthlyCount', () => {
  it('returns zero for an empty list', () => {
    expect(maxMonthlyCount([])).toBe(0)
  })

  it('returns the largest count', () => {
    expect(maxMonthlyCount([2, 7, 0, 4])).toBe(7)
  })
})
