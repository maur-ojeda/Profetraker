'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      const code = new URLSearchParams(window.location.search).get('code')

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          console.error('Auth callback error:', error)
          router.push('/login?error=auth')
          return
        }
      }

      const { data: { session } } = await supabase.auth.getSession()
      router.push(session ? '/dashboard' : '/login')
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 rounded-full border-2 border-rule border-t-primary-accent animate-spin" />
        <p className="text-sm text-ink-muted">Autenticando...</p>
      </div>
    </div>
  )
}
