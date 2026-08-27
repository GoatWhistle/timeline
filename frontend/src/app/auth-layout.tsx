import { Suspense } from 'react'
import { Outlet } from 'react-router'
import { RouteFallback } from './route-fallback'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-8">
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
    </div>
  )
}
