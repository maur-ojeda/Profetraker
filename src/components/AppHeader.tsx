'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import UserAvatar from '@/components/UserAvatar'
import {
  LayoutDashboard,
  Users,
  HeartPulse,
  Bus,
  Handshake,
  Building2,
  Flag,
  MessageCircle,
  LogOut,
  Menu,
  X,
  ChevronUp,
  HelpCircle,
} from 'lucide-react'
import dynamic from 'next/dynamic'

const OnboardingTour = dynamic(() => import('@/components/OnboardingTour'), { ssr: false })

// ─── Navigation modules ──────────────────────────────────────────────

interface ModuleLink {
  href: string
  label: string
  description: string
  icon: React.ElementType
}

const modules: ModuleLink[] = [
  { href: '/profesores', label: 'Profesores', description: 'Gestión de planta docente', icon: Users },
  { href: '/licencias', label: 'Licencias', description: 'Licencias médicas', icon: HeartPulse },
  { href: '/salidas', label: 'Salidas', description: 'Salidas pedagógicas', icon: Bus },
  { href: '/reuniones', label: 'Reuniones', description: 'Acuerdos y actas', icon: Handshake },
  { href: '/consejo', label: 'Consejo', description: 'Consejo de profesores', icon: Building2 },
  { href: '/hitos', label: 'Hitos PME', description: 'Fechas clave y evaluaciones', icon: Flag },
  { href: '/chat', label: 'Chat', description: 'Asistente con IA', icon: MessageCircle },
]

// ─── Component ───────────────────────────────────────────────────────

export default function AppHeader() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [runTour, setRunTour] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Auth check
  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      setLoading(false)
    })()
  }, [router])

  // Scroll to top
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Don't render header during auth redirect
  if (!user) return null

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* ═══ Header ═══ */}
      <header className="border-b border-border-light sticky top-0 bg-surface/95 backdrop-blur-sm z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
          <Link
            href="/dashboard"
            className="text-lg font-display font-semibold tracking-tight text-ink hover:text-primary-accent transition-colors"
          >
            PROFE TRACKER
          </Link>

          {/* Desktop: nav links */}
          <nav className="hidden lg:flex items-center gap-1">
            <Link
              href="/dashboard"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive('/dashboard') ? 'bg-primary-accent/10 text-primary-accent' : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
              }`}
            >
              Dashboard
            </Link>
            {modules.map((mod) => (
              <Link
                key={mod.label}
                href={mod.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(mod.href) ? 'bg-primary-accent/10 text-primary-accent' : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
                }`}
              >
                {mod.label}
              </Link>
            ))}
          </nav>

          {/* Desktop: avatar + email + tour + logout */}
          <div className="hidden sm:flex items-center gap-4">
            <div className="flex items-center gap-2">
              <UserAvatar name={user?.user_metadata?.name} email={user?.email} size="sm" />
              <span className="text-sm text-ink-muted">{user?.email}</span>
            </div>
            <button
              onClick={() => setRunTour(true)}
              title="Tour de la app"
              className="p-1.5 rounded-lg text-ink-muted hover:bg-surface-muted hover:text-ink transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button onClick={handleLogout} className="btn-secondary text-sm">
              <LogOut className="w-4 h-4" /> Cerrar sesión
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(true)}
            className="sm:hidden p-2 -mr-2 rounded-lg hover:bg-surface-muted transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5 text-ink" />
          </button>
        </div>
      </header>

      {/* ═══ Off-canvas Drawer ═══ */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-72 max-w-[85vw] bg-surface shadow-2xl flex flex-col animate-slide-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-light">
              <span className="font-display font-semibold text-ink">PROFE TRACKER</span>
              <button onClick={() => setMenuOpen(false)} className="p-1.5 rounded-lg hover:bg-surface-muted transition-colors" aria-label="Cerrar menú">
                <X className="w-5 h-5 text-ink" />
              </button>
            </div>

            <div className="flex items-center gap-3 px-5 py-3 border-b border-border-light">
              <UserAvatar name={user?.user_metadata?.name} email={user?.email} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink truncate">{user?.user_metadata?.name || 'Usuario'}</p>
                <p className="text-xs text-ink-muted truncate">{user?.email}</p>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              {/* Dashboard link */}
              <Link
                href="/dashboard"
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
                  isActive('/dashboard') ? 'bg-primary-accent/10 text-primary-accent' : 'hover:bg-surface-muted'
                }`}
              >
                <div className="p-1.5 rounded-lg bg-surface-muted group-hover:bg-surface-warm transition-colors">
                  <LayoutDashboard className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">Dashboard</p>
                  <p className="text-xs text-ink-muted truncate">Vista semanal</p>
                </div>
              </Link>

              {/* Module links */}
              {modules.map((mod) => {
                const Icon = mod.icon
                const active = isActive(mod.href)
                return (
                  <Link
                    key={mod.label}
                    href={mod.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
                      active ? 'bg-primary-accent/10 text-primary-accent' : 'hover:bg-surface-muted'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg transition-colors ${active ? 'bg-primary-accent/20' : 'bg-surface-muted group-hover:bg-surface-warm'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{mod.label}</p>
                      <p className="text-xs text-ink-muted truncate">{mod.description}</p>
                    </div>
                  </Link>
                )
              })}
            </nav>

            <div className="border-t border-border-light px-3 py-4">
              <button
                onClick={() => { setMenuOpen(false); handleLogout() }}
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-ink-muted hover:bg-red-50 hover:text-error transition-colors"
              >
                <LogOut className="w-4 h-4" /> Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding tour — auto on first visit, manual via ? button */}
      <OnboardingTour forceStart={runTour} onFinish={() => setRunTour(false)} />

      {/* Scroll to top */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-30 p-2.5 rounded-full bg-surface border border-border-light shadow-lg hover:shadow-xl hover:border-rule transition-all text-ink-muted hover:text-ink"
          aria-label="Volver arriba"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
    </>
  )
}