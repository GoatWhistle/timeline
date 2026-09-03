import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { useUpdateProfile } from '@/entities/user/profile.queries'
import { nicknameProblem } from '@/shared/forms/nickname'
import { applyServerErrors } from '@/shared/forms/server-errors'
import { publicProfilePath } from '@/shared/routing/public-profile-path'
import { Field } from '@/shared/ui/forms/field'
import { Switch } from '@/shared/ui/forms/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { Button } from '@/shared/ui/primitives/button'
import { NicknameLinkField } from './nickname-link-field'

const nicknameSchema = z.object({
  nickname: z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      const problem = nicknameProblem(value)
      if (problem !== null) ctx.addIssue({ code: 'custom', message: problem })
    }),
})
type NicknameValues = z.infer<typeof nicknameSchema>

export function NicknameCard({
  nickname,
  profilePublic,
}: {
  nickname?: string | null
  profilePublic: boolean
}) {
  const { t } = useTranslation()
  const updateProfile = useUpdateProfile()
  const form = useForm<NicknameValues>({
    resolver: zodResolver(nicknameSchema),
    values: { nickname: nickname ?? '' },
  })
  const saved = nickname ?? ''
  const invalid = Boolean(form.formState.errors.nickname)
  const opens = saved !== '' && profilePublic

  async function onSave(values: NicknameValues) {
    try {
      await updateProfile.mutateAsync({ nickname: values.nickname })
      toast.success(t('profile.saved'))
    } catch (error) {
      applyServerErrors(error, form.setError, ['nickname'])
    }
  }

  async function onToggleVisibility(next: boolean) {
    try {
      await updateProfile.mutateAsync({ profile_public: next })
      toast.success(t('profile.saved'))
    } catch {
      toast.error(t('profile.saveFailed'))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profile.nickname')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form className="flex items-start gap-2" onSubmit={form.handleSubmit(onSave)} noValidate>
          <Field
            label={t('profile.nickname')}
            htmlFor="nickname"
            hideLabel
            className="min-w-0 flex-1"
            error={form.formState.errors.nickname?.message}
          >
            <NicknameLinkField
              id="nickname"
              autoComplete="username"
              spellCheck={false}
              autoCapitalize="off"
              placeholder={t('profile.nicknamePlaceholder')}
              invalid={invalid}
              openHref={opens ? publicProfilePath(saved) : undefined}
              {...form.register('nickname')}
            />
          </Field>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {t('action.save')}
          </Button>
        </form>

        <Field
          label={t('profile.visibilityLabel')}
          htmlFor="profile-public"
          inline
          hint={saved === '' ? t('profile.nicknameEmpty') : t('profile.visibilityHint')}
          className="border-border border-t pt-4"
        >
          <Switch
            id="profile-public"
            checked={profilePublic}
            disabled={saved === ''}
            onCheckedChange={onToggleVisibility}
          />
        </Field>
      </CardContent>
    </Card>
  )
}
