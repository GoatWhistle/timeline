import { ExternalLink as ExternalLinkIcon, ShieldAlert } from 'lucide-react'
import type * as React from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/ui/overlays/tooltip'
import { isInsecureLink, safeLinkHref } from './external-url'

function InsecureLinkMark({ className }: { className?: string }) {
  const { t } = useTranslation('common')
  const label = t('link.insecure')
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('inline-flex items-center text-status-todo', className)}>
            <ShieldAlert className="size-3.5" aria-hidden="true" />
            <span className="sr-only">{label}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent>{t('link.insecureHint')}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export type ExternalLinkProps = Omit<React.ComponentProps<'a'>, 'rel' | 'target'> & {
  href: string
  showIcon?: boolean
}

export function ExternalLink({
  href,
  children,
  className,
  showIcon = true,
  ...props
}: ExternalLinkProps) {
  return (
    <a
      className={cn('inline-flex min-w-0 items-center gap-1', className)}
      href={safeLinkHref(href)}
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
      {showIcon && <ExternalLinkIcon className="size-3.5" aria-hidden="true" />}
      {isInsecureLink(href) && <InsecureLinkMark />}
    </a>
  )
}
