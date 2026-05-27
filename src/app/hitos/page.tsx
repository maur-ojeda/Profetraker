'use client'

import { useState, useEffect } from 'react'
import AppHeader from '@/components/AppHeader'
import { BarChart3, FileText, Target, Users, Sparkles, Umbrella, Pin, Calendar, Star, Plus, Trash2 } from 'lucide-react'

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

const TIPO_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pme: { label: 'PME', color: 'badge-info', icon: BarChart3 },
  evaluacion: { label: 'Evaluación', color: 'badge-error', icon: FileText },
  simulacro: { label: 'Simulacro', color: 'badge-warning', icon: Target },
  reunion_apoderados: { label: 'Reunión Apoderados', color: 'badge-info', icon: Users },
  dia_especial: { label: 'Día Especial', color: 'bg-indigo-50 text-indigo-700', icon: Sparkles },
  feriado: { label: 'Feriado', color: 'badge-inactive', icon: Umbrella },
  otro: { label: 'Otro', color: 'badge-warning', icon: Pin },
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

  const hitosPorMes = hitos.reduce((acc, h) => {
    const mes = h.fecha.substring(0, 7)
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
    <div className="min-h-screen bg-surface">
      <AppHeader />

      {/* ═══ Main ═══ */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-display font-semibold tracking-tight text-ink">Hitos del PME</h2>
          <p className="text-sm text-ink-muted mt-0.5">Fechas clave, evaluaciones, reuniones y días especiales</p>
          <div className="flex flex-wrap gap-2 mt-4">
            <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="input max-w-[180px]">
              <option value="">Todos los tipos</option>
              {Object.entries(TIPO_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> Nuevo Hito
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-ink-muted">Cargando...</div>
        ) : hitos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-ink-muted">No hay hitos registrados</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(hitosPorMes).map(([mes, items]) => (
              <div key={mes}>
                <h3 className="text-sm font-semibold text-ink-muted uppercase tracking-wider mb-3">{formatMes(mes)}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {items.map((h) => {
                    const config = TIPO_CONFIG[h.tipo] || TIPO_CONFIG.otro
                    return (
                      <div key={h.id} className={`card flex items-center gap-3 ${h.importante ? 'border-l-[3px] border-l-error' : ''}`}>
                        <div className="p-1.5 rounded-lg bg-surface-muted">
                          <config.icon className="w-5 h-5 text-ink-slate" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`badge ${config.color}`}>{config.label}</span>
                            {h.importante && (
                              <span className="badge badge-error flex items-center gap-1">
                                <Star className="w-3 h-3" /> Importante
                              </span>
                            )}
                          </div>
                          <p className="font-medium text-ink truncate">{h.titulo}</p>
                          <p className="text-xs text-ink-muted flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            {new Date(h.fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })}
                            {h.fecha_fin && ` - ${new Date(h.fecha_fin + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })}`}
                          </p>
                          {h.descripcion && <p className="text-xs text-ink-slate mt-1">{h.descripcion}</p>}
                        </div>
                        <button onClick={() => handleDelete(h.id)} className="btn-secondary text-sm shrink-0">
                          <Trash2 className="w-3.5 h-3.5" /> Eliminar
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ═══ Modal ═══ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-surface rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-display font-semibold text-ink mb-4">Nuevo Hito</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Título *</label>
                <input type="text" required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ej: Prueba PAES" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Tipo *</label>
                <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="input">
                  {Object.entries(TIPO_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Fecha inicio *</label>
                  <input type="date" required value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Fecha fin</label>
                  <input type="date" value={form.fecha_fin} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} className="input" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Descripción</label>
                <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  rows={2} className="input" placeholder="Detalle adicional (opcional)" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.importante} onChange={(e) => setForm({ ...form, importante: e.target.checked })}
                  className="rounded text-error" />
                <span className="text-sm font-medium text-ink flex items-center gap-1.5"><Star className="w-4 h-4" /> Marcar como importante</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Guardando...' : 'Crear Hito'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
