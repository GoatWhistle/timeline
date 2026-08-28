import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react'
import {
  type ShortcutDefinition,
  ShortcutRegistry,
  type ShortcutScopeMode,
} from './shortcut-registry'

const RegistryContext = createContext<ShortcutRegistry | null>(null)

export function ShortcutProvider({
  children,
  registry,
}: {
  children: ReactNode
  registry?: ShortcutRegistry
}) {
  const fallback = useRef<ShortcutRegistry>(undefined)
  if (!fallback.current) fallback.current = new ShortcutRegistry()
  const value = registry ?? fallback.current

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.isComposing) return
      const found = value.handle(event, event.target)
      if (found) event.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [value])

  return <RegistryContext.Provider value={value}>{children}</RegistryContext.Provider>
}

export function useShortcutRegistry(): ShortcutRegistry {
  const registry = useContext(RegistryContext)
  if (!registry) throw new Error('ShortcutProvider is missing')
  return registry
}

export function useShortcutScope(
  id: string,
  shortcuts: ShortcutDefinition[],
  options: { mode?: ShortcutScopeMode; enabled?: boolean } = {},
): void {
  const registry = useShortcutRegistry()
  const { mode = 'normal', enabled = true } = options
  const latest = useRef(shortcuts)
  latest.current = shortcuts

  useEffect(() => {
    if (!enabled) return
    const proxied = latest.current.map((shortcut) => ({
      ...shortcut,
      run: () => {
        const current = latest.current.find((item) => item.id === shortcut.id)
        ;(current ?? shortcut).run()
      },
      when: shortcut.when
        ? () => {
            const current = latest.current.find((item) => item.id === shortcut.id)
            return (current?.when ?? shortcut.when ?? (() => true))()
          }
        : undefined,
    }))
    return registry.push({ id, mode, shortcuts: proxied })
  }, [registry, id, mode, enabled])
}

export function useShortcutList(excludeScopeId?: string): ShortcutDefinition[] {
  const registry = useShortcutRegistry()
  const subscribe = useMemo(() => registry.subscribe.bind(registry), [registry])
  const scopes = useSyncExternalStore(
    subscribe,
    () => registry.getScopes(),
    () => registry.getScopes(),
  )
  return useMemo(() => {
    void scopes
    return excludeScopeId ? registry.listExcluding(excludeScopeId) : registry.list()
  }, [registry, scopes, excludeScopeId])
}
