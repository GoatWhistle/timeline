import { AuthAside } from '@/features/auth/door/auth-aside'
import { AuthBrandBar } from '@/features/auth/door/auth-brand-bar'
import { AuthLanguageSwitch } from '@/features/auth/door/auth-language-switch'
import { AuthOutletSwap } from './auth-outlet-swap'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-background">
      <AuthLanguageSwitch className="fixed top-4 right-4 z-10" />
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-8 px-6 py-10 lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-center lg:gap-16">
        <div className="lg:hidden">
          <AuthBrandBar />
        </div>
        <div className="hidden lg:block">
          <AuthAside />
        </div>
        <main className="flex w-full justify-center lg:justify-end">
          <AuthOutletSwap />
        </main>
      </div>
    </div>
  )
}
