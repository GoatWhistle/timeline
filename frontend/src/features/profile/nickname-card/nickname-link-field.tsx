import { ArrowUpRight } from 'lucide-react'
import type * as React from 'react'
import { useTranslation } from 'react-i18next'
import { PUBLIC_PROFILE_PREFIX } from '@/shared/routing/public-profile-path'
import { cn } from '@/shared/styling/class-names/class-names'

export function publicProfileOrigin(): string {
  if (typeof window === 'undefined') return ''
  return window.location.host
}

type NicknameLinkFieldProps = React.ComponentProps<'input'> & {
  invalid: boolean
  openHref?: string | undefined
}

export function NicknameLinkField({
  className,
  invalid,
  openHref,
  ref,
  ...props
}: NicknameLinkFieldProps) {
  const { t } = useTranslation()
  const origin = publicProfileOrigin()

  return (
    <div
      data-invalid={invalid ? '' : undefined}
      className={cn(
        'group flex h-9 w-full min-w-0 flex-1 items-stretch overflow-hidden rounded-control',
        'border border-input bg-transparent shadow-flat',
        'transition-colors duration-fast ease-out',
        'focus-within:outline-2 focus-within:-outline-offset-1 focus-within:outline-ring',
        'data-invalid:border-destructive data-invalid:focus-within:outline-destructive',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex select-none items-center whitespace-nowrap py-1 pl-3 font-mono',
          'text-meta text-muted-foreground',
        )}
      >
        {origin}
        <span className="text-faint-foreground">{PUBLIC_PROFILE_PREFIX}</span>
      </span>
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'min-w-0 flex-1 bg-transparent py-1 pr-2 font-mono text-copy outline-none',
          'placeholder:text-faint-foreground',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
        {...props}
      />
      {openHref === undefined ? null : (
        <a
          href={openHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('profile.publicProfileLink')}
          className={cn(
            'flex w-9 shrink-0 items-center justify-center border-border border-l',
            'text-muted-foreground transition-colors duration-fast ease-out',
            'hover:bg-accent-surface hover:text-accent-surface-foreground',
            'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
          )}
        >
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </a>
      )}
    </div>
  )
}
