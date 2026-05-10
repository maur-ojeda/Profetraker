'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Salida {
  id: string
  curso: string
  fecha: string
  hora_salida: string
  hora_regreso: string | null
  destino: string
  objetivo_pedagogico: string | null
  profesores_acompañantes: string[]
  notas: string | null
  creado_en: string
  acompanantes?: Array<{ id: string; nombre: string; departamento: string | null }>
}

interface Profesor {
  id: string
  nombre: string
  departamento: string | null
}

export default function SalidasPage() {
  const [salidas, setSalidas] = useState<Salida[]>([])
  const [profesores, setProfesores] = useState<Profesor[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    curso: '',
    fecha: new Date().toISOString().split('T')[0],
    hora_salida: '08:00',
    hora_regreso: '',
    destino: '',
    objetivo_pedagogico: '',
    acompanantes: [] as string[],
    notas: '',
  })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const [salRes, profRes] = await Promise.all([
      supabase.from('salidas_pedagogicas').select('*').order('fecha', { ascending: false }),
      supabase.from('profesores').select('id, nombre, departamento').eq('activo', true).order('nombre'),
    ])
    setSalidas(salRes.data || [])
    setProfesores(profRes.data || [])
    setLoading(false)
  }

  const toggleAcompanante = (id: string) => {
    setForm(prev => ({
      ...prev,
      acompanantes: prev.acompanantes.includes(id)
        ? prev.acompanantes.filter(a => a !== id)
        : [...prev.acompanantes, id]
    }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.curso || !form.fecha || !form.hora_salida || !form.destino) return

    setSaving(true)
    try {
      const res = await fetch('/api/salidas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          curso: form.curso,
          fecha: form.fecha,
          hora_salida: form.hora_salida,
          hora_regreso: form.hora_regreso || null,
          destino: form.destino,
          objetivo_pedagogico: form.objetivo_pedagogico || null,
          profesores_acompañantes: form.acompanantes,
          notas: form.notas || null,
        }),
      })
      if (!res.ok) { const j = await res.json(); alert(j.error || 'Error'); return }
      setShowModal(false)
      setForm({ curso: '', fecha: new Date().toISOString().split('T')[0], hora_salida: '08:00', hora_regreso: '', destino: '', objetivo_pedagogico: '', acompanantes: [], notas: '' })
      fetchData()
    } catch { alert('Error al guardar') } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta salida?')) return
    await fetch(`/api/salidas/${id}`, { method: 'DELETE' })
    fetchData()
  }

  const formatHora = (h: string) => h?.substring(0, 5)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">PROFE TRACKER</h1>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>
            <Link href="/profesores" className="text-blue-600 hover:underline">Profesores</Link>
            <Link href="/calendario" className="text-blue-600 hover:underline">Calendario</Link>
            <Link href="/salidas" className="text-blue-600 font-semibold border-b-2 border-blue-600">Salidas</Link>
            <Link href="/licencias" className="text-blue-600 hover:underline">Licencias</Link>
            <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }} className="text-gray-600 hover:text-gray-900">Cerrar sesión</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Salidas Pedagógicas</h2>
            <p className="text-sm text-gray-500">Registro de salidas de curso con acompañantes</p>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2">
            ➕ Nueva Salida
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Cargando salidas...</div>
        ) : salidas.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No hay salidas registradas</div>
        ) : (
          <div className="space-y-4">
            {salidas.map((salida) => (
              <div key={salida.id} className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded">{salida.curso}</span>
                      <span className="text-sm text-gray-500">
                        📅 {new Date(salida.fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </span>
                      <span className="text-sm text-gray-500">
                        🕐 {formatHora(salida.hora_salida)}{salida.hora_regreso ? ` - ${formatHora(salida.hora_regreso)}` : ''}
                      </span>
                    </div>
                    <p className="text-gray-800 font-medium">📍 {salida.destino}</p>
                    {salida.objetivo_pedagogico && (
                      <p className="text-sm text-gray-600 mt-1">🎯 {salida.objetivo_pedagogico}</p>
                    )}
                    {salida.acompanantes && salida.acompanantes.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="text-xs text-gray-500">Acompañantes:</span>
                        {salida.acompanantes.map((a) => (
                          <span key={a.id} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                            {a.nombre}
                          </span>
                        ))}
                      </div>
                    )}
                    {salida.notas && <p className="text-xs text-gray-400 mt-1">📝 {salida.notas}</p>}
                  </div>
                  <button onClick={() => handleDelete(salida.id)} className="text-sm text-red-600 hover:underline ml-4">Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Nueva Salida Pedagógica</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Curso *</label>
                  <input type="text" required value={form.curso} onChange={(e) => setForm({ ...form, curso: e.target.value })}
                    placeholder="Ej: 1°Medio A" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                  <input type="date" required value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora salida *</label>
                  <input type="time" required value={form.hora_salida} onChange={(e) => setForm({ ...form, hora_salida: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora regreso</label>
                  <input type="time" value={form.hora_regreso} onChange={(e) => setForm({ ...form, hora_regreso: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destino *</label>
                <input type="text" required value={form.destino} onChange={(e) => setForm({ ...form, destino: e.target.value })}
                  placeholder="Ej: Museo de Historia Natural" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Objetivo pedagógico</label>
                <input type="text" value={form.objetivo_pedagogico} onChange={(e) => setForm({ ...form, objetivo_pedagogico: e.target.value })}
                  placeholder="Ej: Observación de especímenes" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Profesores acompañantes</label>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                  {profesores.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input type="checkbox" checked={form.acompanantes.includes(p.id)} onChange={() => toggleAcompanante(p.id)} className="rounded" />
                      <span className="text-sm">{p.nombre}</span>
                      {p.departamento && <span className="text-xs text-gray-400">({p.departamento})</span>}
                    </label>
                  ))}
                </div>
                {form.acompanantes.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">{form.acompanantes.length} acompañante(s) seleccionado(s)</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })}
                  rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Observaciones adicionales (opcional)" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving || !form.curso || !form.fecha || !form.hora_salida || !form.destino}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Crear Salida'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}