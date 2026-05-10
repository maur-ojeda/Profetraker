'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Hito {
  id: string
  titulo: string
  descripcion: string | null
  fecha: string
  fecha_fin: string | null
  tipo: string
  importante: boolean
  creado_en: string
}

const TIPO_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  pme: { label: 'PME', color: 'bg-indigo-100 text-indigo-700', emoji: '📊' },
  evaluacion: { label: 'Evaluación', color: 'bg-red-100 text-red-700', emoji: '📝' },
  simulacro: { label: 'Simulacro', color: 'bg-orange-100 text-orange-700', emoji: '🎯' },
  reunion_apoderados: { label: 'Reunión Apoderados', color: 'bg-blue-100 text-blue-700', emoji: '👨‍👩‍👧' },
  dia_especial: { label: 'Día Especial', color: 'bg-pink-100 text-pink-700', emoji: '🎉' },
  feriado: { label: 'Feriado', color: 'bg-gray-100 text-gray-600', emoji: '🏖️' },
  otro: { label: 'Otro', color: 'bg-yellow-100 text-yellow-700', emoji: '📌' },
}

export default function HitosPage() {
  const [hitos, setHitos] = useState<Hito[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filtro, setFiltro] = useState('')
  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    fecha: new Date().toISOString().split('T')[0],
    fecha_fin: '',
    tipo: 'pme',
    importante: false,
  })

  useEffect(() => { fetchHitos() }, [filtro])

  const fetchHitos = async () => {
    setLoading(true)
    let url = '/api/hitos'
    if (filtro) url += `?tipo=${filtro}`
    const res = await fetch(url)
    const json = await res.json()
    setHitos(json.data || [])
    setLoading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/hitos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          descripcion: form.descripcion || null,
          fecha_fin: form.fecha_fin || null,
        }),
      })
      if (!res.ok) { const j = await res.json(); alert(j.error || 'Error'); return }
      setShowModal(false)
      setForm({ titulo: '', descripcion: '', fecha: new Date().toISOString().split('T')[0], fecha_fin: '', tipo: 'pme', importante: false })
      fetchHitos()
    } catch { alert('Error') } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este hito?')) return
    await fetch(`/api/hitos/${id}`, { method: 'DELETE' })
    fetchHitos()
  }

  // Agrupar por mes
  const hitosPorMes = hitos.reduce((acc, h) => {
    const mes = h.fecha.substring(0, 7) // YYYY-MM
    if (!acc[mes]) acc[mes] = []
    acc[mes].push(h)
    return acc
  }, {} as Record<string, Hito[]>)

  const formatMes = (mes: string) => {
    const [y, m] = mes.split('-')
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    return `${meses[parseInt(m) - 1]} ${y}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">PROFE TRACKER</h1>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>
            <Link href="/calendario" className="text-blue-600 hover:underline">Calendario</Link>
            <Link href="/hitos" className="text-blue-600 font-semibold border-b-2 border-blue-600">Hitos PME</Link>
            <Link href="/licencias" className="text-blue-600 hover:underline">Licencias</Link>
            <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }} className="text-gray-600 hover:text-gray-900">Cerrar sesión</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Hitos del PME</h2>
            <p className="text-sm text-gray-500">Fechas clave, evaluaciones, reuniones y días especiales</p>
          </div>
          <div className="flex gap-2">
            <select value={filtro} onChange={(e) => setFiltro(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Todos los tipos</option>
              {Object.entries(TIPO_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
            </select>
            <button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg">➕ Nuevo Hito</button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Cargando...</div>
        ) : hitos.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No hay hitos registrados</div>
        ) : (
          <div className="space-y-6">
            {Object.entries(hitosPorMes).map(([mes, items]) => (
              <div key={mes}>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">{formatMes(mes)}</h3>
                <div className="space-y-2">
                  {items.map((h) => {
                    const config = TIPO_CONFIG[h.tipo] || TIPO_CONFIG.otro
                    return (
                      <div key={h.id} className={`bg-white rounded-lg shadow p-3 flex items-center gap-3 ${h.importante ? 'border-l-4 border-red-500' : 'border-l-4 border-gray-200'}`}>
                        <span className="text-2xl">{config.emoji}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${config.color}`}>{config.label}</span>
                            {h.importante && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">⭐ Importante</span>}
                          </div>
                          <p className="font-medium text-gray-800">{h.titulo}</p>
                          <p className="text-sm text-gray-500">
                            📅 {new Date(h.fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })}
                            {h.fecha_fin && ` - ${new Date(h.fecha_fin + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })}`}
                          </p>
                          {h.descripcion && <p className="text-xs text-gray-400 mt-1">{h.descripcion}</p>}
                        </div>
                        <button onClick={() => handleDelete(h.id)} className="text-sm text-red-600 hover:underline">Eliminar</button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Nuevo Hito</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                <input type="text" required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ej: Prueba PAES" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  {Object.entries(TIPO_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio *</label>
                  <input type="date" required value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha fin</label>
                  <input type="date" value={form.fecha_fin} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Detalle adicional (opcional)" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.importante} onChange={(e) => setForm({ ...form, importante: e.target.checked })}
                  className="rounded text-red-600" />
                <span className="text-sm font-medium text-gray-700">⭐ Marcar como importante</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Crear Hito'}
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