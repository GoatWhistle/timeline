import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/forms/select'

export type FilterOption = { value: string; label: string }

export function FilterChoice({
  value,
  choices,
  label,
  placeholder,
  autoOpen = false,
  onChange,
}: {
  value: string
  choices: readonly FilterOption[]
  label: string
  placeholder?: string
  autoOpen?: boolean
  onChange: (value: string) => void
}) {
  return (
    <Select value={value} onValueChange={onChange} defaultOpen={autoOpen}>
      <SelectTrigger aria-label={label} data-filter-value="" className="min-w-0">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {choices.map((choice) => (
          <SelectItem key={choice.value} value={choice.value}>
            {choice.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
