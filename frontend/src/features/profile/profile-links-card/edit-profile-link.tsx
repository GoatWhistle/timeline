import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useUpdateProfileLink } from '@/entities/user/profile.queries'
import type { ProfileLink } from '@/shared/api/types.gen'
import type { NewLinkValues } from './links-schema'
import { ProfileLinkForm } from './profile-link-form'

export function EditProfileLink({ link, onDone }: { link: ProfileLink; onDone: () => void }) {
  const { t } = useTranslation()
  const update = useUpdateProfileLink()
  const had = link.label ?? ''

  async function onSubmit(values: NewLinkValues) {
    const cleared = values.label === '' && had !== ''
    try {
      await update.mutateAsync({
        id: link.id,
        body: {
          url: values.url,
          ...(cleared ? { clear_label: true } : {}),
          ...(values.label === '' ? {} : { label: values.label }),
        },
      })
    } catch (error) {
      toast.error(t('profile.links.saveFailed'))
      throw error
    }
    toast.success(t('profile.links.saved'))
    onDone()
  }

  return (
    <ProfileLinkForm
      idPrefix={`edit-link-${link.id}`}
      initial={{ url: link.url, label: had }}
      submitLabel={t('action.save')}
      onSubmit={onSubmit}
      canClearLabel={had !== ''}
      onCancel={onDone}
    />
  )
}
