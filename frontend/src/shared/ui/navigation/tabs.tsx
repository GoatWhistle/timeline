import * as TabsPrimitive from '@radix-ui/react-tabs'
import type * as React from 'react'
import { cn } from '@/shared/styling/class-names/class-names'
import { TOUCH_REACH } from '@/shared/styling/touch/touch-reach'
import { SlidingIndicator } from './sliding-indicator/sliding-indicator'
import { useSlidingIndicator } from './sliding-indicator/use-sliding-indicator'

export const Tabs = TabsPrimitive.Root

export function TabsList({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  const { containerRef, box } = useSlidingIndicator<HTMLDivElement>(null, 'x')

  return (
    <TabsPrimitive.List
      ref={containerRef}
      className={cn(
        'relative inline-flex h-9 items-center justify-center gap-1 rounded-surface bg-muted p-1 text-muted-foreground',
        'pointer-coarse:h-12',
        className,
      )}
      {...props}
    >
      <SlidingIndicator
        box={box}
        axis="x"
        className="my-1 rounded-control bg-background shadow-sm"
      />
      {children}
    </TabsPrimitive.List>
  )
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-indicator-item
      className={cn(
        'relative z-10 inline-flex items-center justify-center whitespace-nowrap rounded-control px-3 py-1',
        'pointer-coarse:self-stretch',
        'font-medium text-copy transition-colors duration-base ease-out',
        TOUCH_REACH,
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        'data-[state=active]:text-foreground',
        className,
      )}
      {...props}
    />
  )
}

export function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn('mt-6', className)} {...props} />
}
