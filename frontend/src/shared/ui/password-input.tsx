import { Eye, EyeOff } from 'lucide-react'
import type * as React from 'react'
import { useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { Input } from './input'

/**
 * Поле пароля с переключателем видимости.
 *
 * Кнопка остаётся в порядке обхода с клавиатуры и сообщает своё состояние
 * через aria-pressed: показ пароля — это состояние, а не разовое действие
 * (требования доступности раздела 18 ТЗ).
 */
export function PasswordInput({ className, ...props }: React.ComponentProps<'input'>) {
  const [visible, setVisible] = useState(false)
  const Icon = visible ? EyeOff : Eye

  return (
    <div className="relative">
      <Input type={visible ? 'text' : 'password'} className={cn('pr-10', className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((previous) => !previous)}
        aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
        aria-pressed={visible}
        className={cn(
          'absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md',
          'text-muted-foreground transition-colors hover:text-foreground',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}
