import { Outlet } from 'react-router'
import { cn } from '@/shared/styling/class-names/class-names'
import { PAGE_WIDTH } from '@/shared/ui/layout/page-width'

export function ScrollPage() {
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-y-auto p-4">
      <div className={cn(PAGE_WIDTH, 'flex min-h-0 flex-1 flex-col')}>
        <Outlet />
      </div>
    </div>
  )
}
