import {
  Bell,
  Keyboard,
  Monitor,
  MonitorSmartphone,
  ShieldAlert,
  UserRound,
  UserRoundCog,
} from 'lucide-react'
import type { ComponentType } from 'react'

export const SETTINGS_PARAM = 'settings'

export type SettingsSectionId =
  | 'profile'
  | 'account'
  | 'appearance'
  | 'notifications'
  | 'shortcuts'
  | 'sessions'
  | 'danger'

export type SettingsSection = {
  id: SettingsSectionId
  labelKey: string
  icon: ComponentType<{ className?: string }>
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
  { id: 'profile', labelKey: 'settings.sectionProfile', icon: UserRound },
  { id: 'account', labelKey: 'settings.sectionAccount', icon: UserRoundCog },
  { id: 'appearance', labelKey: 'settings.sectionAppearance', icon: Monitor },
  { id: 'notifications', labelKey: 'settings.sectionNotifications', icon: Bell },
  { id: 'shortcuts', labelKey: 'settings.sectionShortcuts', icon: Keyboard },
  { id: 'sessions', labelKey: 'settings.sectionSessions', icon: MonitorSmartphone },
  { id: 'danger', labelKey: 'settings.sectionDanger', icon: ShieldAlert },
]

export const DEFAULT_SECTION: SettingsSectionId = 'profile'

export function resolveSection(value: string | null): SettingsSectionId {
  const match = SETTINGS_SECTIONS.find((section) => section.id === value)
  return match ? match.id : DEFAULT_SECTION
}
