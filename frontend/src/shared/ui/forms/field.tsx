import type * as React from 'react'
import { cloneElement, isValidElement, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { Label } from './label'

type FieldProps = {
  label: string
  htmlFor: string
  error?: string | undefined
  hint?: string | undefined
  hideLabel?: boolean
  required?: boolean
  children: React.ReactNode
  className?: string
}

const KEY_PATTERN = /^[a-z][a-zA-Z0-9]*(:[a-z][a-zA-Z0-9]*)?(\.[a-zA-Z0-9_]+)+$/

function describe(
  children: ReactNode,
  describedBy: string | undefined,
  invalid: boolean,
): ReactNode {
  if (!isValidElement(children)) return children
  const own = children.props as { 'aria-describedby'?: string; 'aria-invalid'?: boolean }
  return cloneElement(children as React.ReactElement<Record<string, unknown>>, {
    'aria-describedby': own['aria-describedby'] ?? describedBy,
    'aria-invalid': own['aria-invalid'] ?? (invalid ? true : undefined),
  })
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  hideLabel,
  required,
  children,
  className,
}: FieldProps) {
  const { t } = useTranslation()
  const errorId = `${htmlFor}-error`
  const hintId = `${htmlFor}-hint`
  const message = error && KEY_PATTERN.test(error) ? t(error) : error
  const describedBy = message ? errorId : hint ? hintId : undefined

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={htmlFor} className={hideLabel ? 'sr-only' : undefined}>
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-destructive">
            *
          </span>
        )}
      </Label>
      {describe(children, describedBy, message !== undefined && message !== '')}
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
