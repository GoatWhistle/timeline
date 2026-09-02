import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import type * as React from 'react'
import { cn } from '@/shared/styling/class-names/class-names'
import { FLOATING_MOTION, FLOATING_SURFACE } from './overlay-chrome'

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
        className={cn(FLOATING_SURFACE, FLOATING_MOTION, 'p-3', className)}
        {...props}
      />
    </DropdownMenu.Portal>
  )
}
