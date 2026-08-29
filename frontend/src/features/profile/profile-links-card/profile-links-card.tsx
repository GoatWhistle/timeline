import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useProfileLinks, useUpdateProfile } from '@/entities/user/profile.queries'
import type { MeResponse } from '@/shared/api/types.gen'
import { applyServerErrors } from '@/shared/forms/server-errors'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import { Textarea } from '@/shared/ui/forms/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { Button } from '@/shared/ui/primitives/button'
import { AddProfileLink } from './add-profile-link'
import { type LinksValues, linksSchema } from './links-schema'
import { ProfileLinkPreview } from './profile-link-preview'
import { ProfileLinksList } from './profile-links-list'

const BIO_MAX = 2000
const LINK_LIMIT = 10

export function ProfileLinksCard({ user }: { user: MeResponse }) {
  const { t } = useTranslation()
  const updateProfile = useUpdateProfile()
  const links = useProfileLinks()
  const form = useForm<LinksValues>({
    resolver: zodResolver(linksSchema),
    values: {
      avatar_url: user.avatar_url ?? '',
      bio: user.bio ?? '',
    },
  })

  async function onSave(values: LinksValues) {
    try {
      await updateProfile.mutateAsync(values)
      toast.success(t('profile.saved'))
    } catch (error) {
      applyServerErrors(error, form.setError, ['avatar_url', 'bio'])
    }
  }

  const bioLength = (form.watch('bio') ?? '').length
  const items = links.data ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profile.linksTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSave)} noValidate>
          <Field
            label={t('profile.avatar_url')}
            hint={t('profile.avatar_urlHint')}
            htmlFor="avatar_url"
            error={form.formState.errors.avatar_url?.message}
          >
            <Input
              id="avatar_url"
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder={t('profile.avatar_urlPlaceholder')}
              aria-invalid={Boolean(form.formState.errors.avatar_url)}
              {...form.register('avatar_url')}
            />
            <ProfileLinkPreview href={form.watch('avatar_url')} />
          </Field>

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

        <section className="flex flex-col gap-3">
          <h3 className="font-medium text-sm">{t('profile.links.title')}</h3>
          <p className="text-meta text-muted-foreground">{t('profile.links.hint')}</p>
          <ProfileLinksList links={items} />
          <AddProfileLink disabled={items.length >= LINK_LIMIT} />
        </section>
      </CardContent>
    </Card>
  )
}
