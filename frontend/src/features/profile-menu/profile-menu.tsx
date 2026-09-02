import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { LogOut, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { useLogout } from '@/entities/session/session.queries'
import { UserAvatar } from '@/entities/user/user-avatar'
import { useSettingsOverlay } from '@/features/settings-overlay/use-settings-overlay'
import { cn } from '@/shared/styling/class-names/class-names'
import { FLOATING_MOTION, FLOATING_SURFACE } from '@/shared/ui/overlays/overlay-chrome'

const ITEM = cn(
  'flex h-8 cursor-pointer items-center gap-2 rounded-control px-2 text-copy outline-none',
  'data-[highlighted]:bg-accent-surface data-[highlighted]:text-accent-surface-foreground',
)

export function ProfileMenu({
  userId,
  displayName,
  firstName,
  lastName,
  email,
  avatarUrl,
}: {
  userId: string
  displayName?: string | null
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  avatarUrl?: string | null
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const logout = useLogout()
  const { openSettings } = useSettingsOverlay()

  async function onLogout() {
    await logout.mutateAsync().catch(() => undefined)
    navigate('/login', { replace: true })
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          'flex w-full items-center gap-2.5 rounded-control p-2 text-left',
          'transition-colors duration-instant hover:bg-surface-2',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        )}
      >
        <UserAvatar
          seed={userId}
          displayName={displayName}
          firstName={firstName}
          lastName={lastName}
          avatarUrl={avatarUrl}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-copy">{displayName}</span>
          <span className="block truncate text-caption text-muted-foreground">{email}</span>
        </span>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="top"
          align="start"
          sideOffset={6}
          className={cn(
            FLOATING_SURFACE,
            FLOATING_MOTION,
            'w-[calc(var(--pane-sidebar)-1.5rem)] p-1',
          )}
        >
          <DropdownMenu.Item className={ITEM} onSelect={() => openSettings('profile')}>
            <Settings className="size-4" aria-hidden="true" />
            {t('nav.settings')}
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <DropdownMenu.Item className={ITEM} onSelect={() => void onLogout()}>
            <LogOut className="size-4" aria-hidden="true" />
            {t('action.logout')}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
