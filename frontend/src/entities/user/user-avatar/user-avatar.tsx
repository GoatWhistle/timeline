import type * as React from 'react'
import { cn } from '@/shared/styling/class-names/class-names'
import { avatarHue, initials } from './avatar-identity'

export function UserAvatar({
  seed,
  displayName,
  className,
}: {
  seed: string
  displayName?: string | null
  className?: string
}) {
  const hue = avatarHue(seed)

  return (
    <span
      aria-hidden="true"
      data-avatar=""
      className={cn(
        'flex size-7 shrink-0 select-none items-center justify-center rounded-full font-medium text-caption',
        className,
      )}
      style={{ '--avatar-hue': hue } as React.CSSProperties}
    >
      {initials(displayName)}
    </span>
  )
}
