import { useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router'
import { resolveSection, SETTINGS_PARAM, type SettingsSectionId } from './sections'

export function useSettingsOverlay() {
  const [params, setParams] = useSearchParams()
  const raw = params.get(SETTINGS_PARAM)

  const open = raw !== null
  const shown = useRef<SettingsSectionId>(resolveSection(raw))
  if (open) shown.current = resolveSection(raw)
  const section = shown.current

  const openSettings = useCallback(
    (next: SettingsSectionId) => {
      setParams(
        (previous) => {
          const updated = new URLSearchParams(previous)
          updated.set(SETTINGS_PARAM, next)
          return updated
        },
        { replace: false },
      )
    },
    [setParams],
  )

  const setSection = useCallback(
    (next: SettingsSectionId) => {
      setParams(
        (previous) => {
          const updated = new URLSearchParams(previous)
          updated.set(SETTINGS_PARAM, next)
          return updated
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const closeSettings = useCallback(() => {
    setParams(
      (previous) => {
        const updated = new URLSearchParams(previous)
        updated.delete(SETTINGS_PARAM)
        return updated
      },
      { replace: false },
    )
  }, [setParams])

  return { open, section, openSettings, setSection, closeSettings }
}
