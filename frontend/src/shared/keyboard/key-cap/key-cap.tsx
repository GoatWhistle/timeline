const KEY_GLYPH: Record<string, string> = {
  mod: '⌘ / Ctrl',
  alt: 'Alt',
  shift: 'Shift',
  arrowdown: '↓',
  arrowup: '↑',
  arrowleft: '←',
  arrowright: '→',
  escape: 'Esc',
  enter: 'Enter',
  space: 'Space',
}

export function keySteps(combo: string): { id: string; label: string }[] {
  return combo
    .split(' ')
    .flatMap((step) => step.split('+'))
    .map((step, index) => ({
      id: `${combo}-${index}`,
      label: KEY_GLYPH[step] ?? step,
    }))
}

export function KeyCap({ combo }: { combo: string }) {
  return (
    <span className="flex items-center gap-1">
      {keySteps(combo).map(({ id, label }) => (
        <kbd
          key={id}
          className="rounded-badge border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-caption"
        >
          {label}
        </kbd>
      ))}
    </span>
  )
}
