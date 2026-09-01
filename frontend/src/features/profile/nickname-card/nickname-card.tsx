import { zodResolver } from '@hookform/resolvers/zod'
import { ExternalLink as ExternalLinkIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { useUpdateProfile } from '@/entities/user/profile.queries'
import { applyServerErrors } from '@/shared/forms/server-errors'
import { cn } from '@/shared/styling/class-names/class-names'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import { Switch } from '@/shared/ui/forms/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { Button } from '@/shared/ui/primitives/button'

const NICKNAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{1,37}[A-Za-z0-9]$/

const nicknameSchema = z.object({
  nickname: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || NICKNAME_PATTERN.test(value),
      'auth:validation.nicknameFormat',
    ),
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
            label={t('profile.nickname')}
            htmlFor="nickname"
            hideLabel
            error={form.formState.errors.nickname?.message}
          >
            <Input
              id="nickname"
              autoComplete="username"
              aria-invalid={Boolean(form.formState.errors.nickname)}
              aria-describedby="nickname-hint"
              {...form.register('nickname')}
            />
          </Field>
          <p id="nickname-hint" className="text-caption text-muted-foreground">
            {t('profile.nicknameHint')}
          </p>
          <div className="flex justify-end">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {t('action.save')}
            </Button>
          </div>
        </form>

        <div className="border-border border-t pt-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-medium text-copy" id="profile-public-label">
                {t('profile.visibilityLabel')}
              </p>
              <p className="mt-1 text-caption text-muted-foreground">
                {nickname ? t('profile.visibilityHint') : t('profile.nicknameEmpty')}
              </p>
            </div>
            <Switch
              checked={profilePublic}
              disabled={!nickname}
              aria-labelledby="profile-public-label"
              onCheckedChange={onToggleVisibility}
            />
          </div>
          {nickname && profilePublic ? (
            <a
              className={cn(
                'mt-3 flex items-center justify-between gap-3 rounded-control border border-border',
                'bg-surface-2 px-3 py-2 transition-colors duration-fast ease-out',
                'hover:border-border-strong',
                'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
              )}
              href={`/@${nickname}`}
              target="_blank"
              rel="noreferrer"
              aria-label={t('profile.publicProfileLink')}
            >
              <span className="min-w-0 truncate font-medium text-copy">/@{nickname}</span>
              <ExternalLinkIcon
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </a>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
