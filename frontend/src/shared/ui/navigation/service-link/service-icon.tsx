import { Link2 } from 'lucide-react'
import { cn } from '@/shared/styling/class-names/class-names'
import { detectService } from './detect-service'
import { SERVICE_GLYPHS } from './service-glyphs'
import type { ServiceId } from './service-registry'

function ServiceGlyph({ id, className }: { id: ServiceId; className?: string }) {
  const glyph = SERVICE_GLYPHS[id]
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

export function ServiceIcon({ href, className }: { href: string; className?: string }) {
  const service = detectService(href)
  if (service === null) {
    return <Link2 className={cn('size-4 shrink-0', className)} aria-hidden="true" />
  }

  return <ServiceGlyph id={service.id} className={className} />
}

export function TelegramMark({ className }: { className?: string }) {
  return <ServiceGlyph id="telegram" className={cn('text-telegram', className)} />
}

export function serviceLabel(href: string): string | null {
  return detectService(href)?.label ?? null
}
