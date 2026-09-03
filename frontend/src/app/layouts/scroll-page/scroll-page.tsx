import { Outlet } from 'react-router'

export function ScrollPage() {
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-y-auto p-6">
      <Outlet />
    </div>
  )
}
