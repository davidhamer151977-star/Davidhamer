import { useEffect, type ReactNode } from 'react'
import { handleAuthCallback } from '@netlify/identity'

export function CallbackHandler({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (/^#(confirmation_token|recovery_token|invite_token|email_change_token|access_token)=/.test(window.location.hash)) {
      handleAuthCallback().catch(() => undefined)
    }
  }, [])
  return <>{children}</>
}
