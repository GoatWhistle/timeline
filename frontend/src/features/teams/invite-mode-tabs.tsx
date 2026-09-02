import { AtSign, Link2, Mail } from 'lucide-react'
import type * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Segmented } from '@/shared/ui/navigation/segmented'

export type InviteMode = 'nickname' | 'email' | 'link'

const MODES: {
  value: InviteMode
  labelKey: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { value: 'nickname', labelKey: 'inviteByNickname', icon: AtSign },
  { value: 'email', labelKey: 'inviteByEmail', icon: Mail },
  { value: 'link', labelKey: 'inviteByLink', icon: Link2 },
]

export function InviteModeTabs({
  value,
  onChange,
}: {
  value: InviteMode
  onChange: (value: InviteMode) => void
}) {
  const { t } = useTranslation('team')

  return (
    <Segmented
      grow
      value={value}
      onChange={onChange}
      label={t('inviteTitle')}
      options={MODES.map(({ value: mode, labelKey, icon }) => ({
        value: mode,
        label: t(labelKey),
        icon,
      }))}
    />
  )
}
