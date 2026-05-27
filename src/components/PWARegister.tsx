'use client'

import { useEffect } from 'react'

export default function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Solo registrar en producción (no en dev con HMR)
      if (window.location.hostname !== 'localhost') {
        navigator.serviceWorker.register('/sw.js').catch(() => {
          // Fallo silencioso — no crítico
        })
      }
    }
  }, [])

  return null
}
