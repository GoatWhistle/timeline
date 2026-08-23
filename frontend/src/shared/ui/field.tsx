import type * as React from 'react'
import { cn } from '@/shared/lib/cn'
import { Label } from './label'

type FieldProps = {
  label: string
  htmlFor: string
  error?: string | undefined
  hint?: string | undefined
  children: React.ReactNode
  className?: string
}

/**
 * Поле формы с меткой, подсказкой и сообщением об ошибке.
 * Ошибка связывается с полем через aria-describedby: это требование
 * доступности раздела 18 ТЗ, а не только визуальное оформление.
 */
export function Field({ label, htmlFor, error, hint, children, className }: FieldProps) {
  const errorId = `${htmlFor}-error`
  const hintId = `${htmlFor}-hint`
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error && (
        <p id={hintId} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </div>
  )
}
