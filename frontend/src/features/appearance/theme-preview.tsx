import { cn } from '@/shared/styling/class-names/class-names'
import type { ResolvedTheme } from '@/shared/theme/theme'

type ThemePreviewProps = {
  theme: ResolvedTheme
  className?: string
}

function PreviewBody() {
  return (
    <div className="flex h-full w-full">
      <div className="flex w-1/3 shrink-0 flex-col gap-1 border-border border-r bg-card p-1.5">
        <div className="h-1 w-2/3 rounded-pill bg-logo" />
        <div className="mt-0.5 h-1 w-full rounded-pill bg-accent-surface" />
        <div className="h-1 w-4/5 rounded-pill bg-muted" />
        <div className="h-1 w-3/5 rounded-pill bg-muted" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-1.5">
        <div className="h-1 w-1/2 rounded-pill bg-foreground/70" />
        <div className="mt-0.5 flex gap-1">
          <div className="h-3 flex-1 rounded-badge bg-card ring-1 ring-border" />
          <div className="h-3 flex-1 rounded-badge bg-card ring-1 ring-border" />
        </div>
        <div className="mt-auto flex items-center gap-1">
          <div className="h-1.5 w-1/3 rounded-pill bg-primary" />
          <div className="h-1 w-1/4 rounded-pill bg-muted" />
        </div>
      </div>
    </div>
  )
}

export function ThemePreview({ theme, className }: ThemePreviewProps) {
  return (
    <div
      data-theme-preview={theme}
      aria-hidden="true"
      className={cn(
        theme === 'dark' ? 'dark' : 'light',
        'pointer-events-none overflow-hidden rounded-control border border-border bg-background',
        'transition-colors duration-base ease-out',
        className,
      )}
    >
      <PreviewBody />
    </div>
  )
}

export function ThemePreviewSplit({ className }: { className?: string }) {
  return (
    <div
      data-theme-preview="system"
      aria-hidden="true"
      className={cn(
        'pointer-events-none relative overflow-hidden rounded-control border border-border',
        className,
      )}
    >
      <div
        data-theme-preview-half="light"
        className="light absolute inset-0 bg-background [clip-path:polygon(0_0,calc(58%-1px)_0,calc(42%-1px)_100%,0_100%)]"
      >
        <PreviewBody />
      </div>
      <div
        data-theme-preview-half="dark"
        className="dark absolute inset-0 bg-background [clip-path:polygon(calc(58%+1px)_0,100%_0,100%_100%,calc(42%+1px)_100%)]"
      >
        <PreviewBody />
      </div>
      <div
        data-theme-preview-divider=""
        aria-hidden="true"
        className="absolute inset-0 bg-border-strong [clip-path:polygon(calc(58%-1px)_0,calc(58%+1px)_0,calc(42%+1px)_100%,calc(42%-1px)_100%)]"
      />
    </div>
  )
}
