import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useUpdateProfile } from '@/entities/user/profile.queries'
import type { MeResponse } from '@/shared/api/types.gen'
import { applyServerErrors } from '@/shared/forms/server-errors'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import { Textarea } from '@/shared/ui/forms/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { Button } from '@/shared/ui/primitives/button'
import { LINK_FIELDS, type LinksValues, linksSchema } from './links-schema'
import { ProfileLinkPreview } from './profile-link-preview'

const BIO_MAX = 2000

export function ProfileLinksCard({ user }: { user: MeResponse }) {
  const { t } = useTranslation()
  const updateProfile = useUpdateProfile()
  const form = useForm<LinksValues>({
    resolver: zodResolver(linksSchema),
    values: {
      avatar_url: user.avatar_url ?? '',
      bio: user.bio ?? '',
      github_url: user.github_url ?? '',
      website_url: user.website_url ?? '',
    },
  })

  async function onSave(values: LinksValues) {
    try {
      await updateProfile.mutateAsync(values)
      toast.success(t('profile.saved'))
    } catch (error) {
      applyServerErrors(error, form.setError, [...LINK_FIELDS, 'bio'])
    }
  }

  const bioLength = (form.watch('bio') ?? '').length

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profile.linksTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSave)} noValidate>
          {LINK_FIELDS.map((name) => (
            <Field
              key={name}
              label={t(`profile.${name}`)}
              hint={t(`profile.${name}Hint`)}
              htmlFor={name}
              error={form.formState.errors[name]?.message}
            >
              <Input
                id={name}
                type="url"
                inputMode="url"
                autoComplete="off"
                placeholder={t(`profile.${name}Placeholder`)}
                aria-invalid={Boolean(form.formState.errors[name])}
                {...form.register(name)}
              />
              <ProfileLinkPreview href={form.watch(name)} />
            </Field>
          ))}

          <Field
            label={t('profile.bio')}
            hint={t('profile.bioHint', { count: BIO_MAX })}
            htmlFor="bio"
            error={form.formState.errors.bio?.message}
          >
            <Textarea
              id="bio"
              rows={4}
              maxLength={BIO_MAX}
              aria-invalid={Boolean(form.formState.errors.bio)}
              aria-describedby="bio-count"
              {...form.register('bio')}
            />
            <p id="bio-count" className="mt-1 text-meta text-muted-foreground">
              {t('profile.bioCount', { current: bioLength, max: BIO_MAX })}
            </p>
          </Field>

          <div>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {t('action.save')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
