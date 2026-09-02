export const SCRIM = [
  'fixed inset-0 z-50 bg-scrim',
  'data-[state=open]:motion-safe:animate-in data-[state=open]:motion-safe:fade-in-0',
  'data-[state=open]:motion-safe:duration-base data-[state=open]:motion-safe:ease-out',
  'data-[state=closed]:motion-safe:animate-out data-[state=closed]:motion-safe:fade-out-0',
  'data-[state=closed]:motion-safe:duration-base-exit data-[state=closed]:motion-safe:ease-in',
].join(' ')

export const PANEL_MOTION = [
  'data-[state=open]:motion-safe:animate-in data-[state=open]:motion-safe:fade-in-0',
  'data-[state=open]:motion-safe:zoom-in-95 data-[state=open]:motion-safe:duration-base',
  'data-[state=open]:motion-safe:ease-out',
  'data-[state=closed]:motion-safe:animate-out data-[state=closed]:motion-safe:fade-out-0',
  'data-[state=closed]:motion-safe:zoom-out-95 data-[state=closed]:motion-safe:duration-base-exit',
  'data-[state=closed]:motion-safe:ease-in',
].join(' ')

export const PANEL_SURFACE = 'rounded-surface border border-border bg-background shadow-lg'

export const FLOATING_SURFACE =
  'z-50 rounded-surface border border-border bg-popover text-popover-foreground shadow-lg'

export const FLOATING_MOTION = [
  'data-[state=open]:motion-safe:animate-in data-[state=open]:motion-safe:fade-in-0',
  'data-[state=open]:motion-safe:zoom-in-95',
  'data-[side=top]:motion-safe:slide-in-from-bottom-2',
  'data-[side=bottom]:motion-safe:slide-in-from-top-2',
  'data-[state=open]:motion-safe:duration-fast data-[state=open]:motion-safe:ease-out',
  'data-[state=closed]:motion-safe:animate-out data-[state=closed]:motion-safe:fade-out-0',
  'data-[state=closed]:motion-safe:zoom-out-95',
  'data-[state=closed]:motion-safe:duration-fast-exit data-[state=closed]:motion-safe:ease-in',
].join(' ')
