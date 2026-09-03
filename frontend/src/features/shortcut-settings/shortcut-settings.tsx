import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'
import {
  useResetShortcutBindings,
  useSaveShortcutBindings,
  useShortcutBindings,
} from '@/entities/user/shortcuts.queries'
import {
  applyBindingsToScopes,
  type BindingRejection,
  detectPlatform,
  findRejection,
  withBinding,
  withoutBinding,
} from '@/shared/keyboard/shortcut-bindings'
import { listByScope, useShortcutScopeList } from '@/shared/keyboard/shortcut-registry'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { Button } from '@/shared/ui/primitives/button'
import { pageNameKey } from './page-name'
import { isGlobalScope } from './scope-labels'
import { ShortcutSection } from './shortcut-section'

const HIDDEN_SCOPES = ['shortcut-help', 'command-palette']

export function ShortcutSettings() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const scopes = useShortcutScopeList(HIDDEN_SCOPES)
  const bindings = useShortcutBindings()
  const listings = useMemo(
    () => listByScope(applyBindingsToScopes(scopes, bindings)),
    [scopes, bindings],
  )
  const save = useSaveShortcutBindings()
  const reset = useResetShortcutBindings()
  const platform = useMemo(() => detectPlatform(), [])

  const [rejected, setRejected] = useState<{
    actionId: string
    rejection: BindingRejection
  } | null>(null)
  const [recordingId, setRecordingId] = useState<string | null>(null)

  const busy = save.isPending || reset.isPending

  const globalShortcuts = useMemo(
    () => listings.filter((scope) => isGlobalScope(scope.id)).flatMap((scope) => scope.shortcuts),
    [listings],
  )
  const pageShortcuts = useMemo(
    () => listings.filter((scope) => !isGlobalScope(scope.id)).flatMap((scope) => scope.shortcuts),
    [listings],
  )

  const nameKey = pageNameKey(pathname)
  const pageTitle =
    nameKey === null ? t('shortcuts.scopeOther') : t('shortcuts.scopePage', { page: t(nameKey) })

  const onAssign = useCallback(
    (actionId: string, combo: string) => {
      const rejection = findRejection(listings, actionId, combo, platform, bindings)
      if (rejection) {
        setRejected({ actionId, rejection })
        return
      }
      setRejected(null)
      setRecordingId(null)
      save.mutate(withBinding(bindings, actionId, combo))
    },
    [bindings, listings, platform, save],
  )

  const onReset = useCallback(
    (actionId: string) => {
      setRejected(null)
      setRecordingId(null)
      save.mutate(withoutBinding(bindings, actionId))
    },
    [bindings, save],
  )

  const onRecording = useCallback((actionId: string | null) => {
    setRejected(null)
    setRecordingId(actionId)
  }, [])

  const overrideCount = Object.keys(bindings).length

  const shared = {
    platform,
    bindings,
    rejected,
    recordingId,
    busy,
    onAssign,
    onReset,
    onRecording,
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle>{t('shortcuts.settingsTitle')}</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={busy || overrideCount === 0}
            onClick={() => {
              setRejected(null)
              setRecordingId(null)
              reset.mutate()
            }}
          >
            {t('shortcuts.resetAll')}
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <ShortcutSection
            title={t('shortcuts.scopeApp')}
            shortcuts={globalShortcuts}
            emptyText={t('shortcuts.emptyHint')}
            {...shared}
          />
          <ShortcutSection
            title={pageTitle}
            shortcuts={pageShortcuts}
            emptyText={t('shortcuts.pageEmpty')}
            {...shared}
          />
        </CardContent>
      </Card>
    </div>
  )
}
