import { Download, RefreshCw, Upload, X } from 'lucide-react'
import { useId, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { cn } from '@/shared/styling/class-names/class-names'
import { Badge } from '@/shared/ui/primitives/badge'
import { Button } from '@/shared/ui/primitives/button'
import { useRefreshCover, useRemoveCover, useUploadCover } from './cover.queries'
import { COVER_ACCEPT, coverRejectionFor } from './cover-file'
import { EventCover } from './event-cover'

export function CoverField({
  eventId,
  title,
  coverUrl,
  coverSource,
  hasWebsite,
}: {
  eventId: string
  title: string
  coverUrl?: string | null
  coverSource?: 'MANUAL' | 'AUTO' | null
  hasWebsite: boolean
}) {
  const { t } = useTranslation('event')
  const headingId = useId()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const upload = useUploadCover(eventId)
  const remove = useRemoveCover(eventId)
  const refresh = useRefreshCover(eventId)
  const busy = upload.isPending || remove.isPending || refresh.isPending

  async function choose(file: File | undefined) {
    if (!file) return
    const rejection = coverRejectionFor(file)
    if (rejection === 'type') {
      toast.error(t('cover.wrongType'))
      return
    }
    if (rejection === 'size') {
      toast.error(t('cover.tooLarge'))
      return
    }
    try {
      await upload.mutateAsync(file)
      toast.success(t('cover.saved'))
    } catch {
      toast.error(t('cover.uploadFailed'))
    }
  }

  async function clear() {
    try {
      await remove.mutateAsync()
      toast.success(t('cover.removed'))
    } catch {
      toast.error(t('cover.removeFailed'))
    }
  }

  async function fetchFromWebsite() {
    try {
      await refresh.mutateAsync()
      toast.success(t('cover.fetched'))
    } catch {
      toast.error(t('cover.fetchFailed'))
    }
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h3 id={headingId} className="font-medium text-copy">
        {t('cover.title')}
      </h3>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="relative w-full max-w-64 shrink-0">
          <EventCover coverUrl={coverUrl} title={title} className="aspect-video" />
          {coverSource === 'MANUAL' ? (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label={t('cover.remove')}
              title={t('cover.remove')}
              disabled={busy}
              onClick={clear}
              className="-right-1 -top-1 absolute size-6 rounded-full border shadow-sm"
            >
              <X className="size-3" />
            </Button>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <label
              className={cn(
                'inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md',
                'border bg-background px-3 font-medium text-caption transition-colors',
                'duration-instant ease-out hover:bg-accent-surface hover:text-accent-surface-foreground',
                'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring',
                busy && 'pointer-events-none opacity-50',
              )}
            >
              <Upload className="size-4" aria-hidden="true" />
              {coverSource === 'MANUAL' ? t('cover.replace') : t('cover.upload')}
              <input
                ref={inputRef}
                type="file"
                accept={COVER_ACCEPT}
                disabled={busy}
                className="sr-only"
                onChange={(event) => {
                  choose(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
            </label>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy || !hasWebsite}
              onClick={fetchFromWebsite}
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              {t('cover.fetch')}
            </Button>

            {coverUrl ? (
              <Button asChild variant="ghost" size="sm">
                <a href={coverUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="size-4" aria-hidden="true" />
                  {t('cover.open')}
                </a>
              </Button>
            ) : null}
          </div>

          {coverSource ? (
            <Badge tone="neutral">
              {coverSource === 'MANUAL' ? t('cover.sourceManual') : t('cover.sourceAuto')}
            </Badge>
          ) : null}

          <p className="text-caption text-muted-foreground">
            {hasWebsite ? t('cover.hint') : t('cover.hintNoWebsite')}
          </p>
        </div>
      </div>
    </section>
  )
}
