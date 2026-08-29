import { useTranslation } from 'react-i18next'
import { ExternalLink } from '@/shared/ui/navigation/external-link/external-link'
import { linkHost } from '@/shared/ui/navigation/external-link/external-url'
import { isAcceptedProfileLink } from './links-schema'

export function ProfileLinkPreview({ href }: { href: string | undefined }) {
  const { t } = useTranslation()
  const value = (href ?? '').trim()
  if (value === '' || !isAcceptedProfileLink(value)) return null

  const host = linkHost(value)
  if (host === null) return null

  return (
    <p className="mt-1 text-meta text-muted-foreground">
      <span>{t('profile.linkOpens')} </span>
      <ExternalLink className="text-primary hover:underline" href={value}>
        {host}
      </ExternalLink>
    </p>
  )
}
