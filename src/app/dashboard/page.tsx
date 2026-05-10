'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    setUser(user)
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">PROFE TRACKER</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="text-blue-600 hover:underline"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Dashboard</h2>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Link
            href="/profesores"
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition"
          >
            <p className="text-3xl font-bold text-blue-600">👨‍🏫</p>
            <p className="text-gray-600 mt-2">Profesores</p>
          </Link>

          <Link
            href="/calendario"
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition"
          >
            <p className="text-3xl font-bold text-green-600">📅</p>
            <p className="text-gray-600 mt-2">Calendario</p>
          </Link>

          <Link href="/calendario" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition">
            <p className="text-3xl font-bold text-yellow-600">🪪</p>
            <p className="text-gray-600 mt-2">Permisos</p>
            <p className="text-xs text-gray-400 mt-1">Ver en calendario</p>
          </Link>

          <Link href="/licencias" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition">
            <p className="text-3xl font-bold text-red-600">🏥</p>
            <p className="text-gray-600 mt-2">Licencias</p>
            <p className="text-xs text-gray-400 mt-1">Gestionar licencias</p>
          </Link>
        </div>

        {/* Fila 2 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Link href="/salidas" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition">
            <p className="text-3xl font-bold text-purple-600">🚌</p>
            <p className="text-gray-600 mt-2">Salidas</p>
            <p className="text-xs text-gray-400 mt-1">Salidas pedagógicas</p>
          </Link>

          <Link href="/reuniones" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition">
            <p className="text-3xl font-bold text-orange-600">🤝</p>
            <p className="text-gray-600 mt-2">Reuniones</p>
            <p className="text-xs text-gray-400 mt-1">Acuerdos y actas</p>
          </Link>

          <div className="bg-white rounded-lg shadow p-6 opacity-50">
            <p className="text-3xl font-bold text-indigo-600">🏫</p>
            <p className="text-gray-600 mt-2">Consejo</p>
            <p className="text-xs text-gray-400 mt-1">(próximamente)</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 opacity-50">
            <p className="text-3xl font-bold text-teal-600">🎉</p>
            <p className="text-gray-600 mt-2">Hitos PME</p>
            <p className="text-xs text-gray-400 mt-1">(próximamente)</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Actividad Reciente</h3>
          <p className="text-gray-500 text-sm">
            Aquí se mostrarán las ausencias, permisos y licencias recientes.
          </p>
          <p className="text-gray-400 text-xs mt-2">
            (Funcionalidad en desarrollo)
          </p>
        </div>
      </main>
    </div>
  )
}