import { cn } from '@/shared/styling/class-names/class-names'

export function ReminderChip({
  id,
  label,
  checked,
  disabled,
  children,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  disabled: boolean
  children: React.ReactNode
  onChange: (checked: boolean) => void
}) {
  return (
    <button
      id={id}
      type="button"
      aria-pressed={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'whitespace-nowrap rounded-pill border px-2.5 py-1 text-meta',
        'transition-colors duration-fast ease-out',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked
          ? 'border-primary bg-accent-surface text-foreground'
          : 'border-border text-muted-foreground hover:border-border-strong',
      )}
    >
      {children}
    </button>
  )
}
