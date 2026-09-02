import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { ShortcutFigure } from '@/shared/ui/data-display/empty-figures/system-figures'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { Button } from '@/shared/ui/primitives/button'
import { scopeLabelKey } from './scope-labels'
import { ShortcutRow } from './shortcut-row'

const HIDDEN_SCOPES = ['shortcut-help', 'command-palette']

export function ShortcutSettings() {
  const { t } = useTranslation()
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

  const busy = save.isPending || reset.isPending

  const onAssign = useCallback(
    (actionId: string, combo: string) => {
      const rejection = findRejection(listings, actionId, combo, platform, bindings)
      if (rejection) {
        setRejected({ actionId, rejection })
        return
      }
      setRejected(null)
      save.mutate(withBinding(bindings, actionId, combo))
    },
    [bindings, listings, platform, save],
  )

  const onReset = useCallback(
    (actionId: string) => {
      setRejected(null)
      save.mutate(withoutBinding(bindings, actionId))
    },
    [bindings, save],
  )

  const onRecording = useCallback((actionId: string | null) => {
    if (actionId === null) setRejected(null)
  }, [])

  const overrideCount = Object.keys(bindings).length

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle>{t('shortcuts.settingsTitle')}</CardTitle>
            <CardDescription>{t('shortcuts.settingsHint')}</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={busy || overrideCount === 0}
            onClick={() => {
              setRejected(null)
              reset.mutate()
            }}
          >
            {t('shortcuts.resetAll')}
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {listings.length === 0 ? (
            <EmptyState
              title={t('shortcuts.emptyTitle')}
              description={t('shortcuts.emptyHint')}
              figure={ShortcutFigure}
            />
          ) : (
            listings.map((scope) => (
              <section key={scope.id} className="flex flex-col gap-1">
                <div className="flex items-baseline gap-2">
                  <h3 className="font-medium text-caption text-muted-foreground uppercase tracking-wide">
                    {t(scopeLabelKey(scope.id))}
                  </h3>
                  <span className="text-caption text-muted-foreground/70">
                    {t('shortcuts.scopeCount', { count: scope.shortcuts.length })}
                  </span>
                </div>
                <dl className="flex flex-col">
                  {scope.shortcuts.map((shortcut) => (
                    <ShortcutRow
                      key={shortcut.id}
                      shortcut={shortcut}
                      platform={platform}
                      overridden={bindings[shortcut.id] !== undefined}
                      rejection={rejected?.actionId === shortcut.id ? rejected.rejection : null}
                      busy={busy}
                      onAssign={onAssign}
                      onReset={onReset}
                      onRecording={onRecording}
                    />
                  ))}
                </dl>
              </section>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
