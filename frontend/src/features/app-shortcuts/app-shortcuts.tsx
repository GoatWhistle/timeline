import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { type Command, CommandPalette } from '@/features/command-palette/command-palette'
import { ShortcutHelp } from '@/features/shortcut-help/shortcut-help'
import { catalogEntry, catalogKeys, type GotoTarget } from '@/shared/keyboard/shortcut-catalog'
import { type ShortcutDefinition, useShortcutScope } from '@/shared/keyboard/shortcut-registry'

export function AppShortcuts({ targets }: { targets: GotoTarget[] }) {
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
    () =>
      targets.map((target) => ({
        id: target.id,
        title: t(target.titleKey),
        hint: t('palette.goto'),
        keys: catalogKeys(`goto-${target.id}`),
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
