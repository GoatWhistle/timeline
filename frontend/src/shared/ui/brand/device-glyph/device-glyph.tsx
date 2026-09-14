import { Monitor } from 'lucide-react'
import type { BrowserName, PlatformName } from '@/entities/session/device-label'
import { cn } from '@/shared/styling/class-names/class-names'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/ui/overlays/tooltip'
import { BROWSER_GLYPHS } from './browser-glyphs'
import type { DeviceGlyph } from './device-glyph-shape'
import { PLATFORM_GLYPHS } from './platform-glyphs'

const DEVICE_GLYPHS: Partial<Record<BrowserName | PlatformName, DeviceGlyph>> = {
  ...BROWSER_GLYPHS,
  ...PLATFORM_GLYPHS,
}

function GlyphMark({ name, className }: { name: BrowserName | PlatformName; className?: string }) {
  const glyph = DEVICE_GLYPHS[name]

  if (!glyph) {
    return <Monitor className={cn('size-4 shrink-0', className)} aria-hidden="true" />
  }

  return (
    <svg
      viewBox={glyph.viewBox}
      fill="currentColor"
      aria-hidden="true"
      className={cn('size-4 shrink-0', className)}
    >
      <path d={glyph.path} />
    </svg>
  )
}

export function DeviceGlyphMark({
  name,
  className,
}: {
  name: BrowserName | PlatformName
  className?: string
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            data-device-glyph={name}
            className={cn('inline-flex shrink-0 items-center text-muted-foreground', className)}
          >
            <GlyphMark name={name} />
            <span className="sr-only">{name}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom">{name}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
