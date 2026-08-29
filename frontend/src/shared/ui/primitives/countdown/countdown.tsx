import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { type Countdown, countdownTickMs, countdownTo } from '@/shared/datetime/countdown'
import { cn } from '@/shared/styling/class-names/class-names'

export function useCountdown(iso: string | null | undefined): Countdown | null {
  const [value, setValue] = useState(() => countdownTo(iso))

  useEffect(() => {
    setValue(countdownTo(iso))
    if (!iso) return

    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      const next = countdownTo(iso)
      setValue(next)
      if (!next) return
      timer = setTimeout(tick, countdownTickMs(next.granularity))
    }
    const initial = countdownTo(iso)
    if (initial) timer = setTimeout(tick, countdownTickMs(initial.granularity))
    return () => clearTimeout(timer)
  }, [iso])

  return value
}

export function CountdownText({
  iso,
  className,
}: {
  iso: string | null | undefined
  className?: string
}) {
  const { t } = useTranslation()
  const countdown = useCountdown(iso)
  if (!countdown) return null

  if (countdown.granularity === 'past') {
    return (
      <span className={cn('tabular-nums', className)}>
        <span className="sr-only">{t('countdown.label')}: </span>
        {t('countdown.past')}
      </span>
    )
  }

  const parts: string[] = []
  if (countdown.granularity === 'days') {
    parts.push(t('countdown.days', { count: countdown.days }))
    if (countdown.hours) parts.push(t('countdown.hours', { count: countdown.hours }))
  } else if (countdown.granularity === 'hours') {
    parts.push(t('countdown.hours', { count: countdown.hours }))
    if (countdown.minutes) parts.push(t('countdown.minutes', { count: countdown.minutes }))
  } else if (countdown.granularity === 'minutes') {
    parts.push(t('countdown.minutes', { count: countdown.minutes }))
    if (countdown.seconds) parts.push(t('countdown.seconds', { count: countdown.seconds }))
  } else {
    parts.push(t('countdown.seconds', { count: countdown.seconds }))
  }

  return (
    <span className={cn('tabular-nums', className)}>
      <span className="sr-only">{t('countdown.label')}: </span>
      {t('countdown.left', { amount: parts.join(' ') })}
    </span>
  )
}
