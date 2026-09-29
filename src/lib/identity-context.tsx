import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getUser, logout as identityLogout, onAuthChange, type User } from '@netlify/identity'

type IdentityState = { user: User | null; ready: boolean; logout: () => Promise<void> }
const IdentityContext = createContext<IdentityState | null>(null)

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    getUser().then((value) => { setUser(value ?? null); setReady(true) })
    return onAuthChange((_event, value) => setUser(value ?? null))
  }, [])
  return <IdentityContext.Provider value={{ user, ready, logout: identityLogout }}>{children}</IdentityContext.Provider>
}

export function useIdentity() {
  const value = useContext(IdentityContext)
  if (!value) throw new Error('useIdentity must be inside IdentityProvider')
  return value
}
