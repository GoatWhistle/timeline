import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { cn } from '@/shared/styling/class-names/class-names'
import { LogoMark } from './logo-mark'
import styles from './wordmark.module.css'

const TRAVEL_MS = 320

export function Wordmark({ className }: { className?: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [travelling, setTravelling] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const name = t('app.name')
  const head = name.slice(0, 4)
  const tail = name.slice(4)

  const onClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
      event.preventDefault()
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduced) {
        navigate('/schedule')
        return
      }
      setTravelling(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        setTravelling(false)
        navigate('/schedule')
      }, TRAVEL_MS)
    },
    [navigate],
  )

  return (
    <a
      href="/schedule"
      onClick={onClick}
      data-travelling={travelling}
      className={cn(styles.link, className)}
    >
      <LogoMark className={cn(styles.mark, 'text-logo')} />
      <span className="truncate font-semibold text-screen uppercase tracking-[0.14em]">
        {head}
        <span className="text-logo">{tail}</span>
      </span>
    </a>
  )
}
