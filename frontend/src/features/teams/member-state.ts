import type { BadgeProps } from '@/shared/ui/primitives/badge'

export function memberStateTone(state: string): NonNullable<BadgeProps['tone']> {
  if (state === 'ACTIVE') return 'primary'
  if (state === 'LEFT') return 'danger'
  return 'neutral'
}

export function statusLabelKey(status: string | undefined): string {
  if (status === 'DONE') return 'statusDone'
  if (status === 'NOT_REQUIRED') return 'statusNotRequired'
  return 'statusTodo'
}

export function statusTone(status: string | undefined): NonNullable<BadgeProps['tone']> {
  if (status === 'DONE') return 'primary'
  if (status === 'NOT_REQUIRED') return 'outline'
  return 'neutral'
}
