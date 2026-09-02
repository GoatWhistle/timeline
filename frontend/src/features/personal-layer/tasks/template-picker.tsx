import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { templateNameKey } from '@/entities/personal/personal.labels'
import { templatesQuery, useApplyTemplate } from '@/entities/personal/task.queries'
import { reportBatchResult } from '@/shared/api/batch-result/batch-result'
import { Field } from '@/shared/ui/forms/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/forms/select'
import { Button } from '@/shared/ui/primitives/button'

export function TemplatePicker({ eventId }: { eventId: string }) {
  const { t } = useTranslation('event')
  const templates = useQuery(templatesQuery())
  const apply = useApplyTemplate(eventId)
  const items = templates.data?.items ?? []
  const [chosen, setChosen] = useState('')

  const selected = items.find((item) => item.id === chosen) ?? null

  async function onApply() {
    if (selected === null) return
    const result = await apply.mutateAsync(selected.id)
    reportBatchResult(
      result,
      result.succeeded === 0
        ? t('personal.template.appliedNothing')
        : t('personal.template.applied'),
    )
  }

  if (items.length === 0) return null

  return (
    <section className="flex flex-col gap-3 rounded-control border border-border bg-surface-1 p-4">
      <div>
        <h4 className="font-medium text-copy">{t('personal.template.title')}</h4>
        <p className="mt-0.5 text-meta text-muted-foreground">{t('personal.template.hint')}</p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <Field
          label={t('personal.template.choose')}
          htmlFor="personal-template"
          className="min-w-56 flex-1"
        >
          <Select value={chosen} onValueChange={setChosen}>
            <SelectTrigger id="personal-template">
              <SelectValue placeholder={t('personal.template.choose')} />
            </SelectTrigger>
            <SelectContent>
              {items.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {t(templateNameKey(template.id))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Button type="button" onClick={onApply} disabled={selected === null || apply.isPending}>
          {t('personal.template.apply')}
        </Button>
      </div>

      {selected && (
        <p className="text-meta text-muted-foreground">
          {t('personal.template.itemCount', { count: selected.items.length })}
        </p>
      )}
    </section>
  )
}
