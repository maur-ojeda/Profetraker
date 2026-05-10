'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Profesor {
  id: string
  nombre: string
  email: string
  telefono: string | null
  departamento: string | null
  cursos_asignados: string[] | null
  activo: boolean
  creado_en: string
}

export default function ProfesoresPage() {
  const [profesores, setProfesores] = useState<Profesor[]>([])
  const [loading, setLoading] = useState(true)
  const [departamentoFilter, setDepartamentoFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingProfesor, setEditingProfesor] = useState<Profesor | null>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    departamento: '',
    cursos_asignados: '',
  })

  useEffect(() => {
    fetchProfesores()
  }, [departamentoFilter])

  const fetchProfesores = async () => {
    setLoading(true)
    let query = supabase
      .from('profesores')
      .select('*')
      .order('nombre', { ascending: true })

    if (departamentoFilter) {
      query = query.eq('departamento', departamentoFilter)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching profesores:', error)
    } else {
      setProfesores(data || [])
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const cursosArray = formData.cursos_asignados
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c)

    const payload = {
      nombre: formData.nombre,
      email: formData.email,
      telefono: formData.telefono || null,
      departamento: formData.departamento || null,
      cursos_asignados: cursosArray.length > 0 ? cursosArray : null,
    }

    let error

    if (editingProfesor) {
      // Update existing
      const { error: updateError } = await supabase
        .from('profesores')
        .update(payload)
        .eq('id', editingProfesor.id)
      error = updateError
    } else {
      // Create new
      const { error: insertError } = await supabase
        .from('profesores')
        .insert(payload)
      error = insertError
    }

    if (error) {
      alert('Error: ' + error.message)
    } else {
      setShowModal(false)
      setEditingProfesor(null)
      setFormData({ nombre: '', email: '', telefono: '', departamento: '', cursos_asignados: '' })
      fetchProfesores()
    }
  }

  const handleEdit = (profesor: Profesor) => {
    setEditingProfesor(profesor)
    setFormData({
      nombre: profesor.nombre,
      email: profesor.email,
      telefono: profesor.telefono || '',
      departamento: profesor.departamento || '',
      cursos_asignados: profesor.cursos_asignados?.join(', ') || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (profesor: Profesor) => {
    if (!confirm(`¿Estás seguro de eliminar a ${profesor.nombre}?`)) return

    const { error } = await supabase
      .from('profesores')
      .update({ activo: false })
      .eq('id', profesor.id)

    if (error) {
      alert('Error: ' + error.message)
    } else {
      fetchProfesores()
    }
  }

  const departamentos = [...new Set(profesores.map((p) => p.departamento).filter(Boolean))]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">PROFE TRACKER</h1>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-blue-600 hover:underline">
              Dashboard
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                window.location.href = '/login'
              }}
              className="text-gray-600 hover:text-gray-900"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Profesores</h2>
          <div className="flex gap-2">
            <Link href="/profesores/importar" className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg flex items-center gap-2">
              📄 Importar CSV
            </Link>
            <button
              onClick={() => {
                setEditingProfesor(null)
                setFormData({ nombre: '', email: '', telefono: '', departamento: '', cursos_asignados: '' })
                setShowModal(true)
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2"
            >
              <span>➕</span> Agregar Profesor
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filtrar por departamento
          </label>
          <select
            value={departamentoFilter}
            onChange={(e) => setDepartamentoFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 max-w-xs"
          >
            <option value="">Todos los departamentos</option>
            {departamentos.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Cargando...</div>
        ) : profesores.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No hay profesores registrados
          </div>
        ) : (
          /* Grid de profesores */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profesores.map((profesor) => (
              <div
                key={profesor.id}
                className={`bg-white rounded-lg shadow p-4 border-l-4 ${
                  profesor.activo ? 'border-green-500' : 'border-gray-300'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg text-gray-900">{profesor.nombre}</h3>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      profesor.activo
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {profesor.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <div className="space-y-1 text-sm text-gray-600">
                  <p>📧 {profesor.email}</p>
                  {profesor.telefono && <p>📞 {profesor.telefono}</p>}
                  {profesor.departamento && <p>🏫 {profesor.departamento}</p>}
                  {profesor.cursos_asignados && (
                    <p>📚 {profesor.cursos_asignados.join(', ')}</p>
                  )}
                </div>

                {profesor.activo && (
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleEdit(profesor)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(profesor)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingProfesor ? 'Editar Profesor' : 'Nuevo Profesor'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Departamento
                </label>
                <input
                  type="text"
                  value={formData.departamento}
                  onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                  placeholder="Ej: Matemática, Lenguaje, Ciencias"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cursos (separados por coma)
                </label>
                <input
                  type="text"
                  value={formData.cursos_asignados}
                  onChange={(e) => setFormData({ ...formData, cursos_asignados: e.target.value })}
                  placeholder="Ej: MAT101, FIS202"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
                >
                  {editingProfesor ? 'Guardar Cambios' : 'Crear Profesor'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingProfesor(null)
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}