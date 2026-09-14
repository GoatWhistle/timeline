import { Check } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useRenameSession } from '@/entities/session/device-sessions.queries'
import type { SessionResponse } from '@/shared/api/types.gen'
import { Input } from '@/shared/ui/forms/input'
import { Button } from '@/shared/ui/primitives/button'
import { CloseButton } from '@/shared/ui/primitives/close-button'

export function DeviceName({
  session,
  title,
  onDone,
}: {
  session: SessionResponse
  title: string
  onDone: () => void
}) {
  const { t } = useTranslation()
  const rename = useRenameSession()
  const saved = session.label ?? ''
  const [draft, setDraft] = useState(saved)

  async function save() {
    const next = draft.trim()
    if (next === saved) {
      onDone()
      return
    }
    try {
      await rename.mutateAsync({
        id: session.id,
        body: next === '' ? { clear_label: true } : { label: next },
      })
      toast.success(t('devices.renamed'))
      onDone()
    } catch {
      toast.error(t('devices.renameFailed'))
    }
  }

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <Input
        autoFocus
        value={draft}
        maxLength={64}
        disabled={rename.isPending}
        aria-label={t('devices.nameLabel')}
        placeholder={t('devices.namePlaceholder')}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            void save()
          }
          if (event.key === 'Escape') onDone()
        }}
        className="h-8"
      />
      <Button
        variant="ghost"
        size="icon"
        className="size-8 shrink-0"
        disabled={rename.isPending}
        aria-label={t('devices.saveNameAria', { device: title })}
        title={t('devices.saveNameAria', { device: title })}
        onClick={() => void save()}
      >
        <Check className="size-4" aria-hidden="true" />
      </Button>
      <CloseButton
        label={t('devices.cancelNameAria', { device: title })}
        disabled={rename.isPending}
        onClick={onDone}
      />
    </div>
  )
}
