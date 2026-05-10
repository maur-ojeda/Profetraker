'use client'

import { supabase } from '@/lib/supabase'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError
      
      // Redirect to dashboard after successful login
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  // Para desarrollo: crear usuario de prueba si no existe
  const handleDevLogin = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Intentar primero con las credenciales de desarrollo
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'admin@colegio.edu',
        password: 'password123',
      })

      if (signInError && signInError.message.includes('Invalid login credentials')) {
        // Si falla, intentar crear el usuario
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: 'admin@colegio.edu',
          password: 'password123',
          options: {
            data: {
              name: 'Administrador',
              rol: 'admin'
            }
          }
        })

        if (signUpError && !signUpError.message.includes('User already registered')) {
          throw signUpError
        }

        // Ahora intentar iniciar sesión nuevamente
        const { data: signInData2, error: signInError2 } = await supabase.auth.signInWithPassword({
          email: 'admin@colegio.edu',
          password: 'password123',
        })

        if (signInError2) throw signInError2
      } else if (signInError) {
        throw signInError
      }

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Error en login de desarrollo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">PROFE TRACKER</h1>
        <p className="text-gray-600 mb-4">
          Sistema de gestión de asistencia docente
        </p>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
            <p className="font-medium">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="admin@colegio.edu"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:opacity-50 ${
              loading ? 'bg-blue-400 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <h2 className="text-sm font-medium text-gray-500 mb-3">Opciones de desarrollo</h2>
          <button
            onClick={handleDevLogin}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md transition-colors"
          >
            Ingresar como admin (dev: admin@colegio.edu / password123)
          </button>
          
          <p className="mt-3 text-xs text-gray-500">
            Credenciales de desarrollo: se crea el usuario si no existe
          </p>
        </div>
      </div>
    </div>
  )
}