import { useTranslation } from 'react-i18next'
import {
  type ShortcutDefinition,
  type ShortcutGroup,
  useShortcutList,
  useShortcutScope,
} from '@/shared/keyboard/shortcut-registry'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/overlays/dialog'

const HELP_SCOPE = 'shortcut-help'

const GROUP_ORDER: ShortcutGroup[] = ['global', 'navigation', 'list', 'action']

const GROUP_KEY: Record<ShortcutGroup, string> = {
  global: 'shortcuts.groupGlobal',
  navigation: 'shortcuts.groupNavigation',
  list: 'shortcuts.groupList',
  action: 'shortcuts.groupAction',
}

const KEY_GLYPH: Record<string, string> = {
  mod: '⌘ / Ctrl',
  arrowdown: '↓',
  arrowup: '↑',
  arrowleft: '←',
  arrowright: '→',
  escape: 'Esc',
  space: 'Space',
}

function keySteps(combo: string): { id: string; label: string }[] {
  return combo
    .split(' ')
    .flatMap((step) => step.split('+'))
    .map((step, index) => ({
      id: `${combo}-${index}`,
      label: KEY_GLYPH[step] ?? step,
    }))
}

function KeyCap({ combo }: { combo: string }) {
  return (
    <span className="flex items-center gap-1">
      {keySteps(combo).map(({ id, label }) => (
        <kbd
          key={id}
          className="rounded-[4px] border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-caption"
        >
          {label}
        </kbd>
      ))}
    </span>
  )
}

export function ShortcutHelp({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const shortcuts = useShortcutList(HELP_SCOPE)
  useShortcutScope(HELP_SCOPE, [], { mode: 'exclusive', enabled: open })

  const grouped = GROUP_ORDER.map((group) => ({
    group,
    items: shortcuts.filter(
      (shortcut: ShortcutDefinition) => shortcut.group === group && !shortcut.hidden,
    ),
  })).filter((entry) => entry.items.length > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-heading">{t('shortcuts.title')}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {grouped.map(({ group, items }) => (
            <section key={group} className="flex flex-col gap-1">
              <h3 className="font-medium text-caption text-muted-foreground uppercase tracking-wide">
                {t(GROUP_KEY[group])}
              </h3>
              <dl className="flex flex-col">
                {items.map((shortcut) => (
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
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
