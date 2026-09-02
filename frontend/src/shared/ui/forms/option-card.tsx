import { Check } from 'lucide-react'
import type * as React from 'react'
import { cn } from '@/shared/styling/class-names/class-names'

export function OptionMark({ selected, className }: { selected: boolean; className?: string }) {
  return (
    <Check
      aria-hidden="true"
      data-option-mark={selected ? 'on' : 'off'}
      className={cn(
        'shrink-0 text-primary',
        'motion-safe:transition-[opacity,transform] motion-safe:duration-base motion-safe:ease-out',
        selected ? 'scale-100 opacity-100' : 'scale-75 opacity-0',
        className,
      )}
    />
  )
}

export type OptionCardProps = {
  name: string
  value: string
  selected: boolean
  onSelect: () => void
  children: React.ReactNode
  className?: string
} & Record<`data-${string}`, string | undefined>

export function OptionCard({
  name,
  value,
  selected,
  onSelect,
  children,
  className,
  ...rest
}: OptionCardProps) {
  return (
    <label
      data-option-card=""
      data-selected={selected ? 'true' : undefined}
      className={cn(
        'group flex cursor-pointer rounded-surface border',
        'motion-safe:transition-[colors,box-shadow] motion-safe:duration-base motion-safe:ease-out',
        selected && 'motion-safe:shadow-md',
        'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring',
        selected ? 'border-primary bg-accent-surface' : 'border-border hover:border-border-strong',
        className,
      )}
      {...rest}
    >
      {children}
      <input
        type="radio"
        name={name}
        value={value}
        checked={selected}
        onChange={onSelect}
        className="sr-only"
      />
    </label>
  )
}
