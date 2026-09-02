import { Eye, EyeOff } from 'lucide-react'
import type * as React from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { Input } from './input'

export function PasswordInput({ className, ...props }: React.ComponentProps<'input'>) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  const Icon = visible ? EyeOff : Eye

  return (
    <div className="relative">
      <Input type={visible ? 'text' : 'password'} className={cn('pr-10', className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((previous) => !previous)}
        aria-label={visible ? t('password.hide') : t('password.show')}
        aria-pressed={visible}
        className={cn(
          'absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-control',
          'text-muted-foreground transition-colors hover:text-foreground',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}
