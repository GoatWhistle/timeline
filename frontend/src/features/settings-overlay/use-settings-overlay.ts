import { useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router'
import { resolveSection, SETTINGS_PARAM, type SettingsSectionId } from './sections'

export function useSettingsOverlay() {
  const [params, setParams] = useSearchParams()
  const raw = params.get(SETTINGS_PARAM)

  const open = raw !== null
  const atIndex = raw === ''
  const shown = useRef<SettingsSectionId>(resolveSection(raw))
  if (open && !atIndex) shown.current = resolveSection(raw)
  const section = shown.current

  const write = useCallback(
    (value: string | null, replace: boolean) => {
      setParams(
        (previous) => {
          const updated = new URLSearchParams(previous)
          if (value === null) updated.delete(SETTINGS_PARAM)
          else updated.set(SETTINGS_PARAM, value)
          return updated
        },
        { replace },
      )
    },
    [setParams],
  )

  const openSettings = useCallback(
    (next: SettingsSectionId) => {
      write(next, false)
    },
    [write],
  )

  const setSection = useCallback(
    (next: SettingsSectionId) => {
      write(next, true)
    },
    [write],
  )

  const showIndex = useCallback(() => {
    write('', true)
  }, [write])

  const openIndex = useCallback(() => {
    write('', false)
  }, [write])

  const closeSettings = useCallback(() => {
    write(null, false)
  }, [write])

  return { open, section, atIndex, openSettings, openIndex, setSection, showIndex, closeSettings }
}
