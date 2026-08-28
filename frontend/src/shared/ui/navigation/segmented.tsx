import { cn } from '@/shared/styling/class-names/class-names'
import { Tabs, TabsList, TabsTrigger } from './tabs'

export type SegmentedOption<T extends string> = {
  value: T
  label: string
}

const EMPTY = '__all__'

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T
  options: readonly SegmentedOption<T>[]
  onChange: (value: T) => void
  label: string
  className?: string
}) {
  return (
    <Tabs
      value={value || EMPTY}
      onValueChange={(next) => onChange((next === EMPTY ? '' : next) as T)}
    >
      <TabsList aria-label={label} className={cn('gap-0.5', className)}>
        {options.map((option) => (
          <TabsTrigger key={option.value || EMPTY} value={option.value || EMPTY}>
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
