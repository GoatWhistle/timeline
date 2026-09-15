import { Plus, SlidersHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  USER_FILTER_CHOICES,
  USER_FILTER_FIELD_KEY,
  USER_FILTER_FIELDS,
  type UserFilterField,
} from '@/entities/user/user.views'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/forms/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/overlays/popover'
import { Badge } from '@/shared/ui/primitives/badge'
import { Button } from '@/shared/ui/primitives/button'
import { CloseButton } from '@/shared/ui/primitives/close-button'

export type UserFilterValues = Partial<Record<UserFilterField, string>>

function used(values: UserFilterValues): UserFilterField[] {
  return USER_FILTER_FIELDS.filter((field) => (values[field] ?? '') !== '')
}

export function UserFiltersPopover({
  values,
  onChange,
  onReset,
}: {
  values: UserFilterValues
  onChange: (patch: UserFilterValues) => void
  onReset: () => void
}) {
  const { t } = useTranslation()
  const rows = used(values)
  const next = USER_FILTER_FIELDS.find((field) => (values[field] ?? '') === '') ?? null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          {t('users.filters.action')}
          {rows.length > 0 && (
            <Badge tone="primary" className="ml-0.5">
              {rows.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[26rem] max-w-[calc(100vw-2rem)]">
        <div className="flex flex-col gap-2">
          {rows.length === 0 ? (
            <p className="py-1 text-meta text-muted-foreground">{t('users.filters.empty')}</p>
          ) : (
            rows.map((field, index) => {
              const available = USER_FILTER_FIELDS.filter(
                (item) => item === field || !rows.includes(item),
              )
              return (
                <div key={field} className="flex items-center gap-1.5">
                  <span className="w-12 shrink-0 text-meta text-muted-foreground">
                    {t(index === 0 ? 'users.filters.where' : 'users.filters.and')}
                  </span>

                  <Select
                    value={field}
                    onValueChange={(to) => {
                      if (to === field) return
                      onChange({
                        [field]: '',
                        [to]: USER_FILTER_CHOICES[to as UserFilterField][0]?.value ?? '',
                      })
                    }}
                  >
                    <SelectTrigger aria-label={t('users.filters.fieldAria')} className="h-8 w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {available.map((item) => (
                        <SelectItem key={item} value={item}>
                          {t(USER_FILTER_FIELD_KEY[item])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <span className="shrink-0 text-meta text-muted-foreground">
                    {t('users.filters.is')}
                  </span>

                  <Select
                    value={values[field] ?? ''}
                    onValueChange={(value) => onChange({ [field]: value })}
                  >
                    <SelectTrigger aria-label={t('users.filters.valueAria')} className="h-8 w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {USER_FILTER_CHOICES[field].map((choice) => (
                        <SelectItem key={choice.value} value={choice.value}>
                          {t(choice.labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <CloseButton
                    label={t('users.filters.remove')}
                    onClick={() => onChange({ [field]: '' })}
                  />
                </div>
              )
            })
          )}

          <div className="flex items-center gap-2 border-border border-t pt-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={next === null}
              onClick={() => {
                if (next === null) return
                onChange({ [next]: USER_FILTER_CHOICES[next][0]?.value ?? '' })
              }}
            >
              <Plus className="size-3.5" aria-hidden="true" />
              {t('users.filters.add')}
            </Button>
            {rows.length > 0 && (
              <Button variant="ghost" size="sm" className="ml-auto" onClick={onReset}>
                {t('users.filters.reset')}
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
