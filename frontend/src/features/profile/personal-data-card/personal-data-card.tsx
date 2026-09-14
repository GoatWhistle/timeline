import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { useUpdateProfile } from '@/entities/user/profile.queries'
import { AvatarField } from '@/features/profile/avatar-field/avatar-field'
import { applyServerErrors } from '@/shared/forms/server-errors'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import { Card, CardContent } from '@/shared/ui/layout/card'
import { Button } from '@/shared/ui/primitives/button'

export const profileSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(1, 'auth:validation.firstNameMin')
    .max(80, 'auth:validation.nameMax'),
  middle_name: z.string().trim().max(80, 'auth:validation.nameMax'),
  last_name: z
    .string()
    .trim()
    .min(1, 'auth:validation.lastNameMin')
    .max(80, 'auth:validation.nameMax'),
})
type ProfileValues = z.infer<typeof profileSchema>

export function PersonalDataCard({
  userId,
  firstName,
  middleName,
  lastName,
  legacyDisplayName,
  avatarUrl,
}: {
  userId: string
  firstName: string
  middleName?: string | null
  lastName: string
  legacyDisplayName?: string | null
  avatarUrl?: string | null
}) {
  const { t } = useTranslation()
  const updateProfile = useUpdateProfile()
  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    values: {
      first_name: firstName,
      middle_name: middleName ?? '',
      last_name: lastName,
    },
  })

  async function onSaveProfile(values: ProfileValues) {
    try {
      await updateProfile.mutateAsync({
        first_name: values.first_name,
        middle_name: values.middle_name,
        last_name: values.last_name,
      })
      toast.success(t('profile.saved'))
    } catch (error) {
      applyServerErrors(error, profileForm.setError, ['first_name', 'middle_name', 'last_name'])
    }
  }

  const errors = profileForm.formState.errors

  return (
    <Card>
      <CardContent>
        {legacyDisplayName ? (
          <div
            role="status"
            className="mb-4 rounded-control border border-status-todo/40 bg-status-todo/10 p-3 text-caption"
          >
            <p className="font-medium">{t('profile.legacyTitle')}</p>
            <p className="mt-1 text-muted-foreground">
              {t('profile.legacyHint', { value: legacyDisplayName })}
            </p>
          </div>
        ) : null}
        <form
          className="flex flex-col gap-4"
          onSubmit={profileForm.handleSubmit(onSaveProfile)}
          noValidate
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <AvatarField
              seed={userId}
              firstName={firstName}
              lastName={lastName}
              avatarUrl={avatarUrl}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              <Field
                label={t('profile.firstName')}
                htmlFor="first_name"
                error={errors.first_name?.message}
              >
                <Input
                  id="first_name"
                  autoComplete="given-name"
                  aria-invalid={Boolean(errors.first_name)}
                  {...profileForm.register('first_name')}
                />
              </Field>
              <Field
                label={t('profile.lastName')}
                htmlFor="last_name"
                error={errors.last_name?.message}
              >
                <Input
                  id="last_name"
                  autoComplete="family-name"
                  aria-invalid={Boolean(errors.last_name)}
                  {...profileForm.register('last_name')}
                />
              </Field>
              <Field
                label={t('profile.middleName')}
                htmlFor="middle_name"
                error={errors.middle_name?.message}
              >
                <Input
                  id="middle_name"
                  autoComplete="additional-name"
                  aria-invalid={Boolean(errors.middle_name)}
                  {...profileForm.register('middle_name')}
                />
              </Field>
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={profileForm.formState.isSubmitting}>
              {t('action.save')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
