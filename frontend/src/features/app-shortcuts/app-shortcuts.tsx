import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { type Command, CommandPalette } from '@/features/command-palette/command-palette'
import { ShortcutHelp } from '@/features/shortcut-help/shortcut-help'
import { type ShortcutDefinition, useShortcutScope } from '@/shared/keyboard/shortcut-registry'

export type GotoTarget = { id: string; path: string; titleKey: string; key: string }

export function AppShortcuts({ targets }: { targets: GotoTarget[] }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  const shortcuts = useMemo<ShortcutDefinition[]>(() => {
    const goto: ShortcutDefinition[] = targets.map((target) => ({
      id: `goto-${target.id}`,
      keys: [`g ${target.key}`],
      titleKey: target.titleKey,
      group: 'navigation',
      run: () => navigate(target.path),
    }))

    return [
      {
        id: 'command-palette',
        keys: ['mod+k'],
        titleKey: 'shortcuts.palette',
        group: 'global',
        allowInInput: true,
        run: () => setPaletteOpen(true),
      },
      {
        id: 'shortcut-help',
        keys: ['?'],
        titleKey: 'shortcuts.help',
        group: 'global',
        run: () => setHelpOpen(true),
      },
      ...goto,
    ]
  }, [navigate, targets])

  useShortcutScope('app', shortcuts)

  const commands = useMemo<Command[]>(
    () =>
      targets.map((target) => ({
        id: target.id,
        title: t(target.titleKey),
        hint: t('palette.goto'),
        keys: ['g', target.key],
        run: () => navigate(target.path),
      })),
    [targets, navigate, t],
  )

  return (
    <>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} commands={commands} />
      <ShortcutHelp open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  )
}
