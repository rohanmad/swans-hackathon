import { useSyncExternalStore } from 'react'

const subscribe = (cb: () => void) => {
  window.addEventListener('popstate', cb)
  return () => window.removeEventListener('popstate', cb)
}

export function usePathname() {
  return useSyncExternalStore(subscribe, () => window.location.pathname)
}

export function navigate(path: string) {
  if (window.location.pathname === path) return
  window.history.pushState(null, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo(0, 0)
}
