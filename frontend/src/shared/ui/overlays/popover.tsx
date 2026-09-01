import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import type * as React from 'react'
import { cn } from '@/shared/styling/class-names/class-names'

export const Popover = DropdownMenu.Root
export const PopoverTrigger = DropdownMenu.Trigger

export function PopoverContent({
  className,
  align = 'start',
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof DropdownMenu.Content>) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 rounded-surface border border-border bg-popover p-3 text-popover-foreground shadow-lg',
          'data-[state=open]:motion-safe:animate-in data-[state=open]:motion-safe:fade-in-0',
          'data-[state=open]:motion-safe:zoom-in-95',
          'data-[side=top]:motion-safe:slide-in-from-bottom-2',
          'data-[side=bottom]:motion-safe:slide-in-from-top-2',
          'data-[state=open]:motion-safe:duration-fast data-[state=open]:motion-safe:ease-out',
          'data-[state=closed]:motion-safe:animate-out data-[state=closed]:motion-safe:fade-out-0',
          'data-[state=closed]:motion-safe:zoom-out-95',
          'data-[state=closed]:motion-safe:duration-fast-exit data-[state=closed]:motion-safe:ease-in',
          className,
        )}
        {...props}
      />
    </DropdownMenu.Portal>
  )
}
