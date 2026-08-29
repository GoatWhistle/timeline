import type * as React from 'react'
import { useState } from 'react'
import { cn } from '@/shared/styling/class-names/class-names'
import { avatarHue, initials } from './avatar-identity'
import { isDisplayableAvatar } from './avatar-source'

export function UserAvatar({
  seed,
  displayName,
  avatarUrl,
  className,
}: {
  seed: string
  displayName?: string | null
  avatarUrl?: string | null
  className?: string
}) {
  const hue = avatarHue(seed)
  const source = isDisplayableAvatar(avatarUrl) ? (avatarUrl as string) : null
  const [loaded, setLoaded] = useState(false)

  return (
    <span
      aria-hidden="true"
      data-avatar=""
      className={cn(
        'relative flex size-7 shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-medium text-caption',
        className,
      )}
      style={{ '--avatar-hue': hue } as React.CSSProperties}
    >
      {initials(displayName)}
      {source !== null && (
        <img
          src={source}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(false)}
          className={cn(
            'absolute inset-0 size-full object-cover',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}
    </span>
  )
}
