import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { useUpdateProfile } from '@/entities/user/profile.queries'
import { applyServerErrors } from '@/shared/forms/server-errors'
import { MarkdownEditor } from '@/shared/markdown/markdown-editor'
import { Field } from '@/shared/ui/forms/field'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { Button } from '@/shared/ui/primitives/button'

const BIO_MAX = 2000

export const bioSchema = z.object({
  bio: z.string().max(BIO_MAX, 'validation.bioTooLong'),
})
type BioValues = z.infer<typeof bioSchema>

export function BioCard({ bio }: { bio?: string | null }) {
  const { t } = useTranslation()
  const updateProfile = useUpdateProfile()
  const form = useForm<BioValues>({
    resolver: zodResolver(bioSchema),
    values: { bio: bio ?? '' },
  })

  const length = (form.watch('bio') ?? '').length
  const tooLong = length > BIO_MAX

  async function onSave(values: BioValues) {
    try {
      await updateProfile.mutateAsync({ bio: values.bio })
      toast.success(t('profile.saved'))
    } catch (error) {
      applyServerErrors(error, form.setError, ['bio'])
    }
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>{t('profile.bio')}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-5">
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSave)} noValidate>
          <Field
            label={t('profile.bio')}
            htmlFor="bio"
            hideLabel
            error={form.formState.errors.bio?.message}
          >
            <Controller
              control={form.control}
              name="bio"
              render={({ field }) => (
                <MarkdownEditor
                  id="bio"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  rows={4}
                  maxLength={BIO_MAX}
                />
              )}
            />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" disabled={tooLong || form.formState.isSubmitting}>
              {t('action.save')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
