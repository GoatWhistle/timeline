import type * as React from 'react'
import { cloneElement, isValidElement, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { CrossfadeSwap } from '@/shared/ui/motion/crossfade-swap'
import { Label } from './label'

type FieldProps = {
  label: string
  htmlFor: string
  error?: string | undefined
  hint?: string | undefined
  hideLabel?: boolean
  inline?: boolean
  required?: boolean
  children: React.ReactNode
  className?: string
}

const KEY_PATTERN = /^[a-z][a-zA-Z0-9]*(:[a-z][a-zA-Z0-9]*)?(\.[a-zA-Z0-9_]+)+$/

function describe(
  children: ReactNode,
  describedBy: string | undefined,
  invalid: boolean,
  required: boolean,
): ReactNode {
  if (!isValidElement(children)) return children
  const own = children.props as {
    'aria-describedby'?: string
    'aria-invalid'?: boolean
    'aria-required'?: boolean
  }
  return cloneElement(children as React.ReactElement<Record<string, unknown>>, {
    'aria-describedby': own['aria-describedby'] ?? describedBy,
    'aria-invalid': own['aria-invalid'] ?? (invalid ? true : undefined),
    'aria-required': own['aria-required'] ?? (required ? true : undefined),
  })
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  hideLabel,
  inline,
  required,
  children,
  className,
}: FieldProps) {
  const { t, i18n } = useTranslation()
  const errorId = `${htmlFor}-error`
  const hintId = `${htmlFor}-hint`
  const message = error && KEY_PATTERN.test(error) ? t(error) : error
  const describedBy = message ? errorId : hint ? hintId : undefined
  const control = describe(
    children,
    describedBy,
    message !== undefined && message !== '',
    required === true,
  )

  const labelNode = (
    <Label htmlFor={htmlFor} className={hideLabel ? 'sr-only' : undefined}>
      <CrossfadeSwap swapKey={i18n.language} className="inline-grid">
        {label}
      </CrossfadeSwap>
      {required && (
        <span className="ml-0.5 text-destructive" data-required-mark="">
          <span aria-hidden="true">*</span>
          <span className="sr-only"> ({t('common:validation.requiredMark')})</span>
        </span>
      )}
    </Label>
  )
  const hintText = hint && !message && (
    <p id={hintId} className="text-caption text-muted-foreground">
      {hint}
    </p>
  )
  const errorText = message && (
    <p id={errorId} role="alert" className="text-caption text-destructive">
      {message}
    </p>
  )

  if (inline) {
    return (
      <div className={cn('flex items-center justify-between gap-4', className)}>
        <div className="flex min-w-0 flex-col gap-1">
          {labelNode}
          {hintText}
          {errorText}
        </div>
        {control}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {labelNode}
      {control}
      {hintText}
      {errorText}
    </div>
  )
}
