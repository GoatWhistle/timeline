import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { useUpdateProfile } from '@/entities/user/profile.queries'
import { applyServerErrors } from '@/shared/forms/server-errors'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { Button } from '@/shared/ui/primitives/button'

const profileSchema = z.object({
  display_name: z.string().min(2, 'auth:validation.nameMin').max(120),
})
type ProfileValues = z.infer<typeof profileSchema>

export function PersonalDataCard({ displayName }: { displayName: string }) {
  const { t } = useTranslation()
  const updateProfile = useUpdateProfile()
  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    values: { display_name: displayName },
  })

  async function onSaveProfile(values: ProfileValues) {
    try {
      await updateProfile.mutateAsync({ display_name: values.display_name })
      toast.success(t('profile.saved'))
    } catch (error) {
      applyServerErrors(error, profileForm.setError, ['display_name'])
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profile.personalTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={profileForm.handleSubmit(onSaveProfile)}
          noValidate
        >
          <Field
            label={t('profile.name')}
            htmlFor="display_name"
            error={profileForm.formState.errors.display_name?.message}
          >
            <Input
              id="display_name"
              aria-invalid={Boolean(profileForm.formState.errors.display_name)}
              {...profileForm.register('display_name')}
            />
          </Field>
          <div>
            <Button type="submit" disabled={profileForm.formState.isSubmitting}>
              {t('action.save')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
