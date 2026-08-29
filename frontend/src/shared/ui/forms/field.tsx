import type * as React from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { Label } from './label'

type FieldProps = {
  label: string
  htmlFor: string
  error?: string | undefined
  hint?: string | undefined
  children: React.ReactNode
  className?: string
}

const KEY_PATTERN = /^[a-z][a-zA-Z0-9]*(:[a-z][a-zA-Z0-9]*)?(\.[a-zA-Z0-9_]+)+$/

export function Field({ label, htmlFor, error, hint, children, className }: FieldProps) {
  const { t } = useTranslation()
  const errorId = `${htmlFor}-error`
  const hintId = `${htmlFor}-hint`
  const message = error && KEY_PATTERN.test(error) ? t(error) : error

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !message && (
        <p id={hintId} className="text-caption text-muted-foreground">
          {hint}
        </p>
      )}
      {message && (
        <p id={errorId} role="alert" className="text-caption text-destructive">
          {message}
        </p>
      )}
    </div>
  )
}
