import { Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { KeyCap } from '@/shared/keyboard/key-cap'
import { listByScope, useShortcutScopeList } from '@/shared/keyboard/shortcut-registry'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { scopeLabelKey } from './scope-labels'

const HIDDEN_SCOPES = ['shortcut-help', 'command-palette']

export function ShortcutSettings() {
  const { t } = useTranslation()
  const scopes = useShortcutScopeList(HIDDEN_SCOPES)
  const listings = listByScope(scopes)

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('shortcuts.settingsTitle')}</CardTitle>
          <CardDescription>{t('shortcuts.settingsHint')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {listings.length === 0 ? (
            <EmptyState title={t('shortcuts.emptyTitle')} description={t('shortcuts.emptyHint')} />
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
                    <div
                      key={shortcut.id}
                      className="flex h-row items-center justify-between gap-4 border-border/60 border-b last:border-b-0"
                    >
                      <dt className="min-w-0 truncate text-copy">{t(shortcut.titleKey)}</dt>
                      <dd className="flex shrink-0 items-center gap-2">
                        {shortcut.keys.map((combo) => (
                          <KeyCap key={combo} combo={combo} />
                        ))}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))
          )}
        </CardContent>
      </Card>

      <p className="flex items-start gap-2 text-meta text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{t('shortcuts.readOnlyNote')}</span>
      </p>
    </div>
  )
}
