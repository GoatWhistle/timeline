import { useEffect, useRef, useState } from 'react'
import { readInvitationShown, writeInvitationShown } from './schedule-invitation'

export function useInvitationOnce(offering: boolean, viewKey: string): boolean {
  const [shown, setShown] = useState(readInvitationShown)
  const offeredFor = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!offering) return
    if (offeredFor.current === undefined) {
      offeredFor.current = viewKey
      writeInvitationShown()
      return
    }
    if (offeredFor.current !== viewKey) setShown(true)
  }, [offering, viewKey])

  return shown
}
