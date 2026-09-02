import type * as React from 'react'
import { cn } from '@/shared/styling/class-names/class-names'
import { Tabs, TabsList, TabsTrigger } from './tabs'

export type SegmentedOption<T extends string> = {
  value: T
  label: string
  icon?: React.ComponentType<{ className?: string }>
}

const EMPTY = '__all__'

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
  grow = false,
}: {
  value: T
  options: readonly SegmentedOption<T>[]
  onChange: (value: T) => void
  label: string
  className?: string
  grow?: boolean
}) {
  return (
    <Tabs
      value={value || EMPTY}
      onValueChange={(next) => onChange((next === EMPTY ? '' : next) as T)}
    >
      <TabsList aria-label={label} className={cn('gap-0.5', grow && 'flex w-full', className)}>
        {options.map((option) => {
          const Icon = option.icon
          return (
            <TabsTrigger
              key={option.value || EMPTY}
              value={option.value || EMPTY}
              className={cn(grow && 'flex-1', Icon && 'gap-1.5')}
            >
              {Icon ? <Icon className="size-4 shrink-0" aria-hidden="true" /> : null}
              {option.label}
            </TabsTrigger>
          )
        })}
      </TabsList>
    </Tabs>
  )
}
