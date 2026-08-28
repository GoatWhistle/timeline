import { Outlet } from 'react-router'

export function ScrollPage() {
  return (
    <div className="min-w-0 flex-1 overflow-y-auto p-6">
      <Outlet />
    </div>
  )
}
