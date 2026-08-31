import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { LogoMark } from './logo-mark'

export function Wordmark({ className }: { className?: string }) {
  const { t } = useTranslation()
  const name = t('app.name')
  const head = name.slice(0, 4)
  const tail = name.slice(4)

  return (
    <span className={cn('flex min-w-0 items-center gap-2', className)}>
      <LogoMark className="text-logo" />
      <span className="truncate font-semibold text-screen uppercase tracking-[0.14em]">
        {head}
        <span className="text-logo">{tail}</span>
      </span>
    </span>
  )
}
