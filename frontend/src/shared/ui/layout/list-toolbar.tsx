import { ArrowLeft } from 'lucide-react'
import type { ReactNode, RefObject } from 'react'
import { NavLink } from 'react-router'
import { cn } from '@/shared/styling/class-names/class-names'
import { TOUCH_REACH } from '@/shared/styling/touch/touch-reach'
import { Input } from '@/shared/ui/forms/input'

export function ListToolbar({
  title,
  back,
  search,
  tools,
  end,
}: {
  title: string
  back?: { to: string; label: string }
  search?: {
    value: string
    label: string
    placeholder: string
    ref?: RefObject<HTMLInputElement | null>
    onChange: (value: string) => void
  }
  tools?: ReactNode
  end?: ReactNode
}) {
  return (
    <header
      data-list-toolbar=""
      className="flex min-h-15 flex-wrap items-center gap-2 border-border border-b px-4 py-3 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
    >
      <div className="order-1 mr-2 flex min-w-0 items-center gap-1.5">
        {back && (
          <NavLink
            to={back.to}
            aria-label={back.label}
            title={back.label}
            data-toolbar-back=""
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-control text-muted-foreground',
              TOUCH_REACH,
              'transition-colors duration-instant ease-out hover:bg-surface-2 hover:text-foreground',
              'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
            )}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
          </NavLink>
        )}
        <h1 className="min-w-0 truncate font-semibold text-screen tracking-tight">{title}</h1>
      </div>

      <div className="order-3 flex min-w-0 flex-1 basis-full flex-wrap items-center gap-2 sm:order-2 sm:basis-auto lg:justify-center">
        {search && (
          <Input
            ref={search.ref}
            aria-label={search.label}
            placeholder={search.placeholder}
            value={search.value}
            className="h-9 min-w-24 flex-1 text-copy sm:w-56 sm:flex-none"
            onChange={(event) => search.onChange(event.target.value)}
          />
        )}

        {tools}
      </div>

      {end && (
        <div className="order-2 ml-auto flex items-center gap-2 sm:order-3 lg:justify-self-end">
          {end}
        </div>
      )}
    </header>
  )
}

export function PageToolbar(props: Parameters<typeof ListToolbar>[0]) {
  return (
    <div data-page-toolbar="" className="-mx-4 -mt-4 mb-4">
      <ListToolbar {...props} />
    </div>
  )
}
