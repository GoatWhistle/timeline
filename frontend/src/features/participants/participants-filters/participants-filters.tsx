import { useTranslation } from 'react-i18next'
import {
  REGISTRATION_STATUS_KEY,
  REGISTRATION_STATUSES,
} from '@/entities/registration/registration.labels'
import { Input } from '@/shared/ui/forms/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/forms/select'
import { Button } from '@/shared/ui/primitives/button'

export const ALL = 'ALL'

export function ParticipantsFilters({
  roleInput,
  status,
  removed,
  onRoleInputChange,
  onStatusChange,
  onRemovedToggle,
}: {
  roleInput: string
  status: string
  removed: string
  onRoleInputChange: (value: string) => void
  onStatusChange: (value: string) => void
  onRemovedToggle: () => void
}) {
  const { t } = useTranslation('registration')
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex min-w-0 flex-wrap items-end gap-3">
        <div className="min-w-24 flex-1 sm:w-52 sm:flex-none">
          <Input
            aria-label={t('participants.filterRole')}
            placeholder={t('participants.rolePlaceholder')}
            value={roleInput}
            onChange={(event) => onRoleInputChange(event.target.value)}
          />
        </div>
        <div className="min-w-24 flex-1 sm:w-56 sm:flex-none">
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger aria-label={t('participants.filterStatus')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('participants.anyStatus')}</SelectItem>
              {REGISTRATION_STATUSES.map((item) => (
                <SelectItem key={item} value={item}>
                  {t(REGISTRATION_STATUS_KEY[item])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant={removed === '1' ? 'default' : 'outline'} onClick={onRemovedToggle}>
          {t('participants.showRemoved')}
        </Button>
      </div>
    </div>
  )
}
