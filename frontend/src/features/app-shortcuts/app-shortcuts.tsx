import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { type Command, CommandPalette } from '@/features/command-palette/command-palette'
import { SETTINGS_PARAM, SETTINGS_SECTIONS } from '@/features/settings-overlay/sections'
import { ShortcutHelp } from '@/features/shortcut-help/shortcut-help'
import { catalogEntry, type GotoTarget } from '@/shared/keyboard/shortcut-catalog'
import { type ShortcutDefinition, useShortcutScope } from '@/shared/keyboard/shortcut-registry'

export function AppShortcuts({ targets, isAdmin }: { targets: GotoTarget[]; isAdmin: boolean }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  const shortcuts = useMemo<ShortcutDefinition[]>(() => {
    const goto: ShortcutDefinition[] = targets.map((target) => ({
      ...catalogEntry(`goto-${target.id}`),
      run: () => navigate(target.path),
    }))

    return [
      {
        ...catalogEntry('command-palette'),
        allowInInput: true,
        run: () => setPaletteOpen(true),
      },
      { ...catalogEntry('shortcut-help'), run: () => setHelpOpen(true) },
      ...goto,
    ]
  }, [navigate, targets])

  useShortcutScope('app', shortcuts)

  const commands = useMemo<Command[]>(
    () => [
      {
        id: 'shortcut-help',
        section: 'commands',
        title: t('shortcuts.help'),
        run: () => setHelpOpen(true),
      },
      ...SETTINGS_SECTIONS.map((entry) => ({
        id: `settings-${entry.id}`,
        section: 'commands' as const,
        title: t('command.openSettings', { section: t(entry.labelKey) }),
        run: () => navigate(`?${SETTINGS_PARAM}=${entry.id}`),
      })),
    ],
    [t, navigate],
  )

  return (
    <>
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        commands={commands}
        isAdmin={isAdmin}
      />
      <ShortcutHelp open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  )
}
