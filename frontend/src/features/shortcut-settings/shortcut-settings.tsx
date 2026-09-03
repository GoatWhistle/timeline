import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSaveShortcutBindings, useShortcutBindings } from '@/entities/user/shortcuts.queries'
import {
  applyBindings,
  type BindingRejection,
  detectPlatform,
  findRejection,
  withBinding,
  withoutBinding,
} from '@/shared/keyboard/shortcut-bindings'
import { CATALOG } from '@/shared/keyboard/shortcut-catalog'
import type { ScopeListing } from '@/shared/keyboard/shortcut-registry'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { ShortcutSection } from './shortcut-section'

export function ShortcutSettings() {
  const { t } = useTranslation()
  const bindings = useShortcutBindings()
  const save = useSaveShortcutBindings()
  const platform = useMemo(() => detectPlatform(), [])

  const sections = useMemo(
    () =>
      CATALOG.map((section) => ({
        ...section,
        shortcuts: applyBindings(
          section.shortcuts.map((entry) => ({ ...entry, run: () => {} })),
          bindings,
        ),
      })),
    [bindings],
  )

  const listings = useMemo<ScopeListing[]>(
    () =>
      sections.map((section) => ({ id: section.id, mode: 'normal', shortcuts: section.shortcuts })),
    [sections],
  )

  const [rejected, setRejected] = useState<{
    actionId: string
    rejection: BindingRejection
  } | null>(null)
  const [recordingId, setRecordingId] = useState<string | null>(null)

  const busy = save.isPending

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
        <CardHeader>
          <CardTitle>{t('shortcuts.settingsTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {sections.map((section) => (
            <ShortcutSection
              key={section.id}
              title={t(section.titleKey)}
              shortcuts={section.shortcuts}
              {...shared}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
