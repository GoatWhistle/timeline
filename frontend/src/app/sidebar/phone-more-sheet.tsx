import { LogOut, Settings, Shield, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { useLogout } from '@/entities/session/session.queries'
import { listName } from '@/entities/user/person-name/person-name'
import { UserAvatar } from '@/entities/user/user-avatar/user-avatar'
import { useSettingsOverlay } from '@/features/settings-overlay/use-settings-overlay'
import type { MeResponse } from '@/shared/api/types.gen'
import { useLocale } from '@/shared/i18n/i18n-context'
import { cn } from '@/shared/styling/class-names/class-names'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/overlays/dialog'
import { ADMIN_NAV } from './nav-section'
import { PhoneSheetLink, PhoneSheetRow, SHEET_ROW } from './phone-sheet-row'

export function PhoneMoreSheet({
  user,
  isAdmin,
  inAdmin,
  open,
  onOpenChange,
}: {
  user: MeResponse | undefined
  isAdmin: boolean
  inAdmin: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const navigate = useNavigate()
  const logout = useLogout()
  const { openSettings } = useSettingsOverlay()

  const displayedName = user
    ? listName(
        { first_name: user.first_name, middle_name: user.middle_name, last_name: user.last_name },
        locale,
      )
    : ''

  function close() {
    onOpenChange(false)
  }

  async function onLogout() {
    close()
    await logout.mutateAsync().catch(() => undefined)
    navigate('/login', { replace: true })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-phone-more-sheet=""
        className="top-auto bottom-0 max-w-none translate-y-0 gap-2 rounded-b-none px-4 pt-11 pb-4 safe-pb"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{t('app.account')}</DialogTitle>
        </DialogHeader>

        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-2 mx-auto h-1 w-9 rounded-pill bg-border-strong"
        />

        {user && (
          <button
            type="button"
            data-phone-profile
            onClick={() => {
              close()
              openSettings('profile')
            }}
            className={cn(
              SHEET_ROW,
              'h-auto gap-3 border border-border bg-surface-1 px-3 py-2 text-left',
              'hover:bg-surface-2',
            )}
          >
            <UserAvatar
              seed={user.id}
              displayName={displayedName}
              firstName={user.first_name}
              lastName={user.last_name}
              avatarUrl={user.avatar_url}
              className="size-9"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-copy">{displayedName}</span>
              <span className="block truncate text-caption text-muted-foreground">
                {user.email}
              </span>
            </span>
            <Settings className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        )}

        {isAdmin && inAdmin && (
          <nav aria-label={t('nav.adminPanel')} className="flex flex-col gap-1">
            {ADMIN_NAV.map(({ to, labelKey, icon }) => (
              <PhoneSheetLink key={to} to={to} icon={icon} label={t(labelKey)} onNavigate={close} />
            ))}
          </nav>
        )}

        {isAdmin && (
          <PhoneSheetLink
            data-phone-panel-switch
            to={inAdmin ? '/catalog' : '/admin/events'}
            icon={inAdmin ? User : Shield}
            label={t(inAdmin ? 'nav.userPanel' : 'nav.adminPanel')}
            onNavigate={close}
          />
        )}

        {user && (
          <PhoneSheetRow
            data-phone-logout
            icon={LogOut}
            label={t('action.logout')}
            onClick={() => void onLogout()}
            className="border-border border-t pt-3 text-muted-foreground"
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
