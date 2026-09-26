import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/shared/ui/overlays/dialog'
import { CloseButton } from '@/shared/ui/primitives/close-button'
import { FilterBody, FilterHead, type FilterSurfaceProps } from './filter-parts'
import { FilterTrigger } from './filter-trigger'

export function FilterSheet({
  count,
  available,
  onAdd,
  onReset,
  onOpenChange,
  children,
}: FilterSurfaceProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  function change(next: boolean) {
    setOpen(next)
    onOpenChange?.(next)
  }

  return (
    <>
      <FilterTrigger count={count} onClick={() => change(true)} />
      <Dialog open={open} onOpenChange={change}>
        <DialogContent
          sheet
          hideClose
          data-filter-panel=""
          aria-describedby={undefined}
          className="flex max-h-[85vh] flex-col gap-0 p-0 safe-pb"
        >
          <FilterHead
            count={count}
            onReset={onReset}
            title={
              <DialogTitle className="font-medium text-caption text-muted-foreground">
                {t('filters.title')}
              </DialogTitle>
            }
            end={
              <DialogClose asChild>
                <CloseButton />
              </DialogClose>
            }
          />
          <div className="min-h-0 overflow-y-auto">
            <FilterBody available={available} onAdd={onAdd}>
              {children}
            </FilterBody>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
