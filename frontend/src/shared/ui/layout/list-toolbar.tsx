import type { ReactNode, RefObject } from 'react'
import { Input } from '@/shared/ui/forms/input'

export function ListToolbar({
  title,
  search,
  tools,
  end,
}: {
  title: string
  search: {
    value: string
    label: string
    placeholder: string
    ref?: RefObject<HTMLInputElement | null>
    onChange: (value: string) => void
  }
  tools: ReactNode
  end?: ReactNode
}) {
  return (
    <header
      data-list-toolbar=""
      className="flex flex-wrap items-center gap-2 border-border border-b px-4 py-3"
    >
      <h1 className="mr-2 font-semibold text-screen tracking-tight">{title}</h1>

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <Input
          ref={search.ref}
          aria-label={search.label}
          placeholder={search.placeholder}
          value={search.value}
          className="h-9 min-w-24 flex-1 text-copy sm:w-56 sm:flex-none"
          onChange={(event) => search.onChange(event.target.value)}
        />

        {tools}

        {end && <div className="ml-auto flex items-center gap-2">{end}</div>}
      </div>
    </header>
  )
}
