import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Source } from '../types'

interface SourceState {
  sources: Record<string, Source>
  activeSourceId: string | null
  openSource: (id: string) => void
  closeSource: () => void
}

const SourceContext = createContext<SourceState | null>(null)

export function SourceProvider({ sources, children }: { sources: Record<string, Source>; children: ReactNode }) {
  const [activeSourceId, setActive] = useState<string | null>(null)
  const openSource = useCallback((id: string) => setActive(sources[id] ? id : null), [sources])
  const closeSource = useCallback(() => setActive(null), [])
  const value = useMemo(
    () => ({ sources, activeSourceId, openSource, closeSource }),
    [sources, activeSourceId, openSource, closeSource],
  )
  return <SourceContext.Provider value={value}>{children}</SourceContext.Provider>
}

export function useSource() {
  const ctx = useContext(SourceContext)
  if (!ctx) throw new Error('useSource must be used inside SourceProvider')
  return ctx
}
