import { createContext } from 'react'

export interface EditingGuard {
  hold: (owner: string) => void
  release: (owner: string) => void
  isHeld: () => boolean
}

export const EditingGuardContext = createContext<EditingGuard | null>(null)

export function createEditingGuard(): EditingGuard {
  const owners = new Set<string>()
  return {
    hold: (owner: string) => {
      owners.add(owner)
    },
    release: (owner: string) => {
      owners.delete(owner)
    },
    isHeld: () => owners.size > 0,
  }
}
