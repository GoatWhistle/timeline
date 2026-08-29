import { useEffect } from 'react'
import { useSession } from '@/shared/api/session'
import { isTimeZone, setTimeZone } from './datetime'

export function useProfileTimezone(): void {
  const { user } = useSession()
  const profileTimezone = user?.timezone

  useEffect(() => {
    setTimeZone(isTimeZone(profileTimezone) ? profileTimezone : undefined)
  }, [profileTimezone])
}
