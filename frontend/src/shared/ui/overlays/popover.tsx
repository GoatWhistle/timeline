import * as PopoverPrimitive from '@radix-ui/react-popover'
import type * as React from 'react'
import { cn } from '@/shared/styling/class-names/class-names'
import { FLOATING_MOTION, FLOATING_SURFACE } from './overlay-chrome'

export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger

export function PopoverContent({
  className,
  align = 'start',
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(FLOATING_SURFACE, FLOATING_MOTION, 'p-3', className)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}
