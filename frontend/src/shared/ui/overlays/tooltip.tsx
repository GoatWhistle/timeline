import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import type * as React from 'react'
import { cn } from '@/shared/styling/class-names/class-names'
import { FLOATING_SURFACE_COMPACT } from './overlay-chrome'

export const Tooltip = TooltipPrimitive.Root
export const TooltipTrigger = TooltipPrimitive.Trigger

export function TooltipProvider({
  delayDuration = 400,
  skipDelayDuration = 200,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
      {...props}
    />
  )
}

export function TooltipContent({
  className,
  sideOffset = 6,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          FLOATING_SURFACE_COMPACT,
          'max-w-xs px-2.5 py-1.5 text-caption',
          'data-[state=delayed-open]:motion-safe:animate-in data-[state=delayed-open]:motion-safe:fade-in-0',
          'data-[state=delayed-open]:motion-safe:duration-fast data-[state=delayed-open]:motion-safe:ease-out',
          'data-[state=instant-open]:motion-safe:animate-in data-[state=instant-open]:motion-safe:fade-in-0',
          'data-[state=instant-open]:motion-safe:duration-fast data-[state=instant-open]:motion-safe:ease-out',
          'data-[state=closed]:motion-safe:animate-out data-[state=closed]:motion-safe:fade-out-0',
          'data-[state=closed]:motion-safe:duration-fast-exit data-[state=closed]:motion-safe:ease-out',
          className,
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="fill-popover" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}
