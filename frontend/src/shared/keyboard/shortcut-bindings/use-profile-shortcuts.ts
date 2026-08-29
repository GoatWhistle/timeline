import { useEffect } from 'react'
import { useShortcutRegistry } from '../shortcut-registry'
import type { ShortcutBindings } from './bindings'

export function useProfileShortcuts(bindings: ShortcutBindings): void {
  const registry = useShortcutRegistry()
  const serialized = JSON.stringify(bindings)

  useEffect(() => {
    registry.setBindings(JSON.parse(serialized) as ShortcutBindings)
  }, [registry, serialized])
}
