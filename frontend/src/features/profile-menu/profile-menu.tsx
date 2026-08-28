import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronsUpDown, LogOut, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { useLogout } from '@/entities/session/session.queries'
import { UserAvatar } from '@/entities/user/user-avatar'
import { useSettingsOverlay } from '@/features/settings-overlay/use-settings-overlay'
import { cn } from '@/shared/styling/class-names/class-names'

const ITEM = cn(
  'flex h-8 cursor-pointer items-center gap-2 rounded-[6px] px-2 text-copy outline-none',
  'data-[highlighted]:bg-accent-surface data-[highlighted]:text-accent-surface-foreground',
)

export function ProfileMenu({
  userId,
  displayName,
  email,
}: {
  userId: string
  displayName?: string | null
  email?: string | null
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
          'flex w-full items-center gap-2.5 rounded-[8px] p-2 text-left',
          'transition-colors duration-instant hover:bg-surface-3',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        )}
      >
        <UserAvatar seed={userId} displayName={displayName} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-copy">{displayName}</span>
          <span className="block truncate text-caption text-muted-foreground">{email}</span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="top"
          align="start"
          sideOffset={6}
          className={cn(
            'z-50 min-w-56 rounded-[8px] border border-border bg-popover p-1 shadow-lg',
            'data-[state=open]:motion-safe:animate-in data-[state=open]:motion-safe:fade-in-0',
            'data-[state=closed]:motion-safe:animate-out data-[state=closed]:motion-safe:fade-out-0',
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
