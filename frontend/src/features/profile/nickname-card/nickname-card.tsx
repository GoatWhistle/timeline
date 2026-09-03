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
      <CardContent className="flex flex-col gap-6">
        <form className="flex flex-col gap-3" onSubmit={form.handleSubmit(onSave)} noValidate>
          <Field
            label={t('profile.nicknameLinkLabel')}
            htmlFor="nickname"
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
          <div className="flex justify-end">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {t('action.save')}
            </Button>
          </div>
        </form>

        <div className="flex items-start justify-between gap-4 border-border border-t pt-4">
          <div className="min-w-0">
            <p className="font-medium text-copy" id="profile-public-label">
              {t('profile.visibilityLabel')}
            </p>
            <p className="mt-1 text-caption text-muted-foreground" id="profile-public-hint">
              {saved === '' ? t('profile.nicknameEmpty') : t('profile.visibilityHint')}
            </p>
          </div>
          <Switch
            checked={profilePublic}
            disabled={saved === ''}
            aria-labelledby="profile-public-label"
            aria-describedby="profile-public-hint"
            onCheckedChange={onToggleVisibility}
          />
        </div>
      </CardContent>
    </Card>
  )
}
