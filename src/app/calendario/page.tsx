'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CalendarioPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 rounded-full border-2 border-rule border-t-primary-accent animate-spin" />
        <p className="text-sm text-ink-muted">Redirigiendo...</p>
      </div>
    </div>
  )
}
