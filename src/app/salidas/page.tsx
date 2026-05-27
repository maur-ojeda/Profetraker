'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import AppHeader from '@/components/AppHeader'
import { Calendar, Clock, MapPin, Target, FileText, Plus, Trash2 } from 'lucide-react'

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
    setSalidas((salRes.data || []).map(s => ({
      ...s,
      acompanantes: (s.profesores_acompañantes || [])
        .map((id: string) => (profRes.data || []).find(p => p.id === id))
        .filter(Boolean),
    })))
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
    <div className="min-h-screen bg-surface">
      <AppHeader />

      {/* ═══ Main ═══ */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-display font-semibold tracking-tight text-ink">Salidas Pedagógicas</h2>
          <p className="text-sm text-ink-muted mt-0.5">Registro de salidas de curso con acompañantes</p>
          <div className="mt-4">
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> Nueva Salida
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-ink-muted">Cargando salidas...</div>
        ) : salidas.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-ink-muted">No hay salidas registradas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {salidas.map((salida) => (
              <div key={salida.id} className="card border-l-[3px] border-l-info">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="badge badge-info">{salida.curso}</span>
                      <span className="text-sm text-ink-muted flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> {new Date(salida.fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </span>
                      <span className="text-sm text-ink-muted flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {formatHora(salida.hora_salida)}{salida.hora_regreso ? ` - ${formatHora(salida.hora_regreso)}` : ''}
                      </span>
                    </div>
                    <p className="text-ink font-medium flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-ink-slate" /> {salida.destino}
                    </p>
                    {salida.objetivo_pedagogico && (
                      <p className="text-sm text-ink-muted mt-1 flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-ink-slate" /> {salida.objetivo_pedagogico}
                      </p>
                    )}
                    {salida.acompanantes && salida.acompanantes.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="text-xs text-ink-muted">Acompañantes:</span>
                        {salida.acompanantes.map((a) => (
                          <span key={a.id} className="badge bg-surface-muted text-ink-muted">
                            {a.nombre}
                          </span>
                        ))}
                      </div>
                    )}
                    {salida.notas && (
                      <p className="text-xs text-ink-slate mt-1.5 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> {salida.notas}
                      </p>
                    )}
                  </div>
                  <button onClick={() => handleDelete(salida.id)} className="btn-secondary text-sm shrink-0 ml-4">
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ═══ Modal ═══ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-surface rounded-xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-display font-semibold text-ink mb-4">Nueva Salida Pedagógica</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Curso *</label>
                  <input type="text" required value={form.curso} onChange={(e) => setForm({ ...form, curso: e.target.value })}
                    placeholder="Ej: 1°Medio A" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Fecha *</label>
                  <input type="date" required value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Hora salida *</label>
                  <input type="time" required value={form.hora_salida} onChange={(e) => setForm({ ...form, hora_salida: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Hora regreso</label>
                  <input type="time" value={form.hora_regreso} onChange={(e) => setForm({ ...form, hora_regreso: e.target.value })} className="input" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Destino *</label>
                <input type="text" required value={form.destino} onChange={(e) => setForm({ ...form, destino: e.target.value })}
                  placeholder="Ej: Museo de Historia Natural" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Objetivo pedagógico</label>
                <input type="text" value={form.objetivo_pedagogico} onChange={(e) => setForm({ ...form, objetivo_pedagogico: e.target.value })}
                  placeholder="Ej: Observación de especímenes" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Profesores acompañantes</label>
                <div className="max-h-40 overflow-y-auto border border-border-light rounded-sm p-2 space-y-1">
                  {profesores.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer hover:bg-surface-muted p-1 rounded transition-colors">
                      <input type="checkbox" checked={form.acompanantes.includes(p.id)} onChange={() => toggleAcompanante(p.id)}
                        className="rounded border-rule text-primary-accent focus:ring-focus" />
                      <span className="text-sm text-ink">{p.nombre}</span>
                      {p.departamento && <span className="text-xs text-ink-slate">({p.departamento})</span>}
                    </label>
                  ))}
                </div>
                {form.acompanantes.length > 0 && (
                  <p className="text-xs text-ink-muted mt-1">{form.acompanantes.length} acompañante(s) seleccionado(s)</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Notas</label>
                <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })}
                  rows={2} className="input" placeholder="Observaciones adicionales (opcional)" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving || !form.curso || !form.fecha || !form.hora_salida || !form.destino}
                  className="btn-primary flex-1 disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Crear Salida'}
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
