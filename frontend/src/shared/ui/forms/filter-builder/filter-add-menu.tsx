import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Plus } from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { FLOATING_MOTION, FLOATING_SURFACE } from '@/shared/ui/overlays/overlay-chrome'
import { Button } from '@/shared/ui/primitives/button'
import type { FilterOption } from './filter-choice'

const ITEM = cn(
  'flex h-8 cursor-pointer items-center gap-2 rounded-control px-2 text-copy outline-none',
  'data-[highlighted]:bg-accent-surface data-[highlighted]:text-accent-surface-foreground',
)

export function FilterAddMenu({
  available,
  onAdd,
}: {
  available: readonly FilterOption[]
  onAdd: (field: string) => void
}) {
  const { t } = useTranslation()
  const picked = useRef(false)

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={available.length === 0}
          data-filter-add=""
          className="-ml-2 self-start px-2"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          {t('filters.add')}
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={4}
          collisionPadding={12}
          onCloseAutoFocus={(event) => {
            if (picked.current) event.preventDefault()
            picked.current = false
          }}
          className={cn(FLOATING_SURFACE, FLOATING_MOTION, 'min-w-44 p-1')}
        >
          {available.map((option) => (
            <DropdownMenu.Item
              key={option.value}
              className={ITEM}
              onSelect={() => {
                picked.current = true
                onAdd(option.value)
              }}
            >
              {option.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
