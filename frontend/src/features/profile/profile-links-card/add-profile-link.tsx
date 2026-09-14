import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useCreateProfileLink } from '@/entities/user/profile.queries'
import type { NewLinkValues } from './links-schema'
import { ProfileLinkForm } from './profile-link-form'

export function AddProfileLink({ disabled, onAdded }: { disabled: boolean; onAdded: () => void }) {
  const { t } = useTranslation()
  const create = useCreateProfileLink()

  async function onSubmit(values: NewLinkValues) {
    await create.mutateAsync({
      url: values.url,
      ...(values.label === '' ? {} : { label: values.label }),
    })
    toast.success(t('profile.links.added'))
    onAdded()
  }

  return (
    <ProfileLinkForm
      key="add"
      idPrefix="new-link"
      initial={{ url: '', label: '' }}
      submitLabel={t('profile.links.add')}
      submitDisabled={disabled}
      clearOnSubmit
      onSubmit={onSubmit}
      onCancel={onAdded}
    />
  )
}
