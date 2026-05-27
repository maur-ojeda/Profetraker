'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import AppHeader from '@/components/AppHeader'
import PageAnimator from '@/components/PageAnimator'
import { Download, Plus, Mail, Phone, Building2, BookOpen, Trash2, Edit3, Search } from 'lucide-react'

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
  const [searchQuery, setSearchQuery] = useState('')
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
  }, [])

  const fetchProfesores = async () => {
    setLoading(true)
    let query = supabase
      .from('profesores')
      .select('*')
      .order('nombre', { ascending: true })

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
      const { error: updateError } = await supabase
        .from('profesores')
        .update(payload)
        .eq('id', editingProfesor.id)
      error = updateError
    } else {
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

  const filteredProfesores = useMemo(() => {
    if (!searchQuery.trim()) return profesores
    const q = searchQuery.toLowerCase()
    return profesores.filter((p) =>
      p.nombre.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      (p.departamento && p.departamento.toLowerCase().includes(q))
    )
  }, [profesores, searchQuery])

  return (
    <PageAnimator mode="all" className="min-h-screen bg-surface">
      <AppHeader />

      {/* ═══ Main ═══ */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-display font-semibold tracking-tight text-ink">Profesores</h2>
          <p className="text-sm text-ink-muted mt-0.5">Gestión de planta docente</p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Link href="/profesores/importar" className="btn-secondary text-sm">
              <Download className="w-4 h-4" /> Importar CSV
            </Link>
            <button
              onClick={() => {
                setEditingProfesor(null)
                setFormData({ nombre: '', email: '', telefono: '', departamento: '', cursos_asignados: '' })
                setShowModal(true)
              }}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" /> Agregar Profesor
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-slate pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, email o departamento..."
              className="input w-full pr-10"
            />
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12 text-ink-muted">Cargando...</div>
        ) : filteredProfesores.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-ink-muted">{searchQuery ? 'No se encontraron resultados' : 'No hay profesores registrados'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProfesores.map((profesor) => (
              <div
                key={profesor.id}
                data-animate="card"
                className={`card ${profesor.activo ? '' : 'opacity-60'}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-ink">{profesor.nombre}</h3>
                  <span className={`badge ${profesor.activo ? 'badge-success' : 'badge-inactive'}`}>
                    {profesor.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <div className="space-y-1.5 text-sm">
                  <p className="flex items-center gap-1.5 text-ink-muted">
                    <Mail className="w-3.5 h-3.5 text-ink-slate" /> {profesor.email}
                  </p>
                  {profesor.telefono && (
                    <p className="flex items-center gap-1.5 text-ink-muted">
                      <Phone className="w-3.5 h-3.5 text-ink-slate" /> {profesor.telefono}
                    </p>
                  )}
                  {profesor.departamento && (
                    <p className="flex items-center gap-1.5 text-ink-muted">
                      <Building2 className="w-3.5 h-3.5 text-ink-slate" /> {profesor.departamento}
                    </p>
                  )}
                  {profesor.cursos_asignados && (
                    <p className="flex items-center gap-1.5 text-ink-muted">
                      <BookOpen className="w-3.5 h-3.5 text-ink-slate" /> {profesor.cursos_asignados.join(', ')}
                    </p>
                  )}
                </div>

                {profesor.activo && (
                  <div className="mt-4 flex gap-3 pt-3 border-t border-border-light">
                    <button onClick={() => handleEdit(profesor)} className="btn-secondary text-sm flex items-center gap-1">
                      <Edit3 className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button onClick={() => handleDelete(profesor)} className="btn-secondary text-sm flex items-center gap-1 text-error">
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ═══ Modal ═══ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-surface rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-display font-semibold text-ink mb-4">
              {editingProfesor ? 'Editar Profesor' : 'Nuevo Profesor'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Nombre *</label>
                <input type="text" required value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className="input" />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1">Email *</label>
                <input type="email" required value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input" />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1">Teléfono</label>
                <input type="tel" value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} className="input" />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1">Departamento</label>
                <input type="text" value={formData.departamento}
                  onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                  placeholder="Ej: Matemática, Lenguaje, Ciencias" className="input" />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1">Cursos (separados por coma)</label>
                <input type="text" value={formData.cursos_asignados}
                  onChange={(e) => setFormData({ ...formData, cursos_asignados: e.target.value })}
                  placeholder="Ej: MAT101, FIS202" className="input" />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  {editingProfesor ? 'Guardar Cambios' : 'Crear Profesor'}
                </button>
                <button type="button" onClick={() => { setShowModal(false); setEditingProfesor(null) }}
                  className="btn-secondary flex-1 justify-center">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageAnimator>
  )
}
