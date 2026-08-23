import { Outlet } from 'react-router'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-8">
      <Outlet />
    </div>
  )
}
