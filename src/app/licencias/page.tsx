'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import AppHeader from '@/components/AppHeader'
import { HeartPulse, Baby, BabyIcon, User, BookOpen, Plus, FileWarning, Calendar, AlertTriangle, FileText, Trash2, Search } from 'lucide-react'
import PageAnimator from '@/components/PageAnimator'

interface Licencia {
  id: string
  profesor_id: string
  tipo: string
  fecha_desde: string
  fecha_hasta: string
  motivo: string | null
  documento_adjunto: string | null
  estado: string
  creado_en: string
  profesor?: { nombre: string; departamento: string | null }
}

const TIPO_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  medica: { label: 'Médica', icon: HeartPulse },
  prenatal: { label: 'Prenatal', icon: Baby },
  postnatal: { label: 'Postnatal', icon: BabyIcon },
  personal: { label: 'Personal', icon: User },
  estudio: { label: 'Estudio', icon: BookOpen },
}

function EstadoBadge({ estado }: { estado: string }) {
  const config: Record<string, string> = {
    activa: 'badge-warning',
    finalizada: 'badge-inactive',
    pendiente: 'badge-info',
  }
  return <span className={`badge ${config[estado] || 'badge-inactive'}`}>{estado}</span>
}

export default function LicenciasPage() {
  const [licencias, setLicencias] = useState<Licencia[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [profesores, setProfesores] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    profesor_id: '',
    tipo: 'medica',
    fecha_desde: '',
    fecha_hasta: '',
    motivo: '',
  })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const [licRes, profRes] = await Promise.all([
      supabase.from('licencias').select('*, profesor:profesor_id(*)').order('fecha_desde', { ascending: false }),
      supabase.from('profesores').select('id, nombre, departamento').eq('activo', true).order('nombre'),
    ])
    setLicencias(licRes.data || [])
    setProfesores(profRes.data || [])
    setLoading(false)
  }

  const calcDias = (desde: string, hasta: string) => {
    if (!desde || !hasta) return 0
    const d1 = new Date(desde + 'T12:00:00')
    const d2 = new Date(hasta + 'T12:00:00')
    return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.profesor_id || !form.fecha_desde || !form.fecha_hasta) return

    setSaving(true)
    try {
      const res = await fetch('/api/licencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profesor_id: form.profesor_id,
          tipo: form.tipo,
          fecha_desde: form.fecha_desde,
          fecha_hasta: form.fecha_hasta,
          motivo: form.motivo || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) { alert(json.error || 'Error al crear licencia'); return }

      const alertas: string[] = []
      if (json.alerta_pago) alertas.push('• Pendiente de ingreso al sistema de pagos')
      if (json.alerta_largo) alertas.push(`• Licencia mayor a 7 días (${json.dias_corridos} días) - Revisar cambio de faena`)
      if (alertas.length > 0) alert(alertas.join('\n'))

      setShowModal(false)
      setForm({ profesor_id: '', tipo: 'medica', fecha_desde: '', fecha_hasta: '', motivo: '' })
      fetchData()
    } catch { alert('Error al crear licencia') } finally { setSaving(false) }
  }

  const handleFinalizar = async (id: string) => {
    if (!confirm('¿Marcar esta licencia como finalizada?')) return
    try {
      const res = await fetch(`/api/licencias/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'finalizada' }),
      })
      const json = await res.json()
      if (!res.ok) {
        alert(json.error || 'Error al finalizar licencia')
        return
      }
      fetchData()
    } catch {
      alert('Error al finalizar licencia')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta licencia?')) return
    try {
      const res = await fetch(`/api/licencias/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) {
        alert(json.error || 'Error al eliminar licencia')
        return
      }
      fetchData()
    } catch {
      alert('Error al eliminar licencia')
    }
  }

  const dias = calcDias(form.fecha_desde, form.fecha_hasta)

  const filteredLicencias = useMemo(() => {
    if (!searchQuery.trim()) return licencias
    const q = searchQuery.toLowerCase()
    return licencias.filter((l) =>
      (l.profesor?.nombre && l.profesor.nombre.toLowerCase().includes(q)) ||
      (l.profesor?.departamento && l.profesor.departamento.toLowerCase().includes(q)) ||
      (TIPO_CONFIG[l.tipo]?.label && TIPO_CONFIG[l.tipo].label.toLowerCase().includes(q)) ||
      (l.motivo && l.motivo.toLowerCase().includes(q))
    )
  }, [licencias, searchQuery])

  return (
    <PageAnimator mode="all" className="min-h-screen bg-surface">
      <AppHeader />

      {/* ═══ Main ═══ */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-display font-semibold tracking-tight text-ink">Licencias Médicas</h2>
          <p className="text-sm text-ink-muted mt-0.5">Registro de licencias con seguimiento de pagos</p>
          <div className="mt-4">
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> Nueva Licencia
            </button>
          </div>
        </div>

        {/* Buscador */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-slate pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por profesor, departamento, tipo o motivo..."
              className="input w-full pr-10"
            />
          </div>
        </div>

        {/* Alertas */}
        {licencias.filter(l => l.estado === 'activa').length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <FileWarning className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-orange-800">Pendientes de ingreso al sistema de pagos</p>
              <p className="text-sm text-orange-700 mt-0.5">
                {licencias.filter(l => l.estado === 'activa').length} licencia(s) activa(s) requieren documentación.
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-ink-muted">Cargando licencias...</div>
        ) : filteredLicencias.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-ink-muted">{searchQuery ? 'No se encontraron resultados' : 'No hay licencias registradas'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredLicencias.map((lic) => {
              const diasCorridos = calcDias(lic.fecha_desde, lic.fecha_hasta)
              const Icon = TIPO_CONFIG[lic.tipo]?.icon || FileText
              return (
                <div key={lic.id} data-animate="card" className="card">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="font-medium text-ink truncate">{lic.profesor?.nombre || '—'}</p>
                      <p className="text-xs text-ink-muted">{lic.profesor?.departamento}</p>
                    </div>
                    <EstadoBadge estado={lic.estado} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted mb-2">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-ink-slate" />
                      {TIPO_CONFIG[lic.tipo]?.label || lic.tipo}
                    </span>
                    <span>{new Date(lic.fecha_desde + 'T12:00:00').toLocaleDateString('es-CL')} — {new Date(lic.fecha_hasta + 'T12:00:00').toLocaleDateString('es-CL')}</span>
                    <span className={`font-medium ${diasCorridos > 7 ? 'text-error' : 'text-ink'}`}>
                      {diasCorridos} día{diasCorridos > 1 ? 's' : ''}
                    </span>
                  </div>
                  {lic.motivo && (
                    <p className="text-xs text-ink-muted mb-2 truncate">{lic.motivo}</p>
                  )}
                  <div className="flex gap-2 pt-2 border-t border-border-light">
                    {lic.estado === 'activa' && (
                      <button onClick={() => handleFinalizar(lic.id)} className="btn-secondary text-xs">Finalizar</button>
                    )}
                    <button onClick={() => handleDelete(lic.id)} className="btn-secondary text-xs text-error">
                      <Trash2 className="w-3 h-3" /> Eliminar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* ═══ Modal Nueva Licencia ═══ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-surface rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-display font-semibold text-ink mb-4">Nueva Licencia</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Profesor *</label>
                <select required value={form.profesor_id} onChange={(e) => setForm({ ...form, profesor_id: e.target.value })} className="input">
                  <option value="">Seleccionar...</option>
                  {profesores.map((p) => (<option key={p.id} value={p.id}>{p.nombre} ({p.departamento})</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Tipo *</label>
                <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="input">
                  <option value="medica">Médica</option>
                  <option value="prenatal">Prenatal</option>
                  <option value="postnatal">Postnatal</option>
                  <option value="personal">Personal</option>
                  <option value="estudio">Estudio</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Fecha desde *</label>
                  <input type="date" required value={form.fecha_desde} onChange={(e) => setForm({ ...form, fecha_desde: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Fecha hasta *</label>
                  <input type="date" required value={form.fecha_hasta} onChange={(e) => setForm({ ...form, fecha_hasta: e.target.value })} className="input" />
                </div>
              </div>
              {dias > 0 && (
                <div className={`rounded-lg p-3 ${dias > 7 ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}>
                  <p className={`text-sm flex items-center gap-1.5 ${dias > 7 ? 'text-error' : 'text-info'}`}>
                    {dias > 7 ? <AlertTriangle className="w-4 h-4" /> : <Calendar className="w-4 h-4" />} {dias} día{dias > 1 ? 's' : ''} corrido{dias > 1 ? 's' : ''}
                    {dias > 7 && ' — Licencia mayor a 7 días. Revisar cambio de faena.'}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Motivo</label>
                <textarea value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                  rows={2} className="input" placeholder="Motivo de la licencia (opcional)" />
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-sm text-orange-700 flex items-center gap-1.5"><FileWarning className="w-4 h-4" /> Al crear la licencia se marcará como pendiente de ingreso al sistema de pagos.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving || !form.profesor_id || !form.fecha_desde || !form.fecha_hasta}
                  className="btn-primary flex-1 disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Crear Licencia'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageAnimator>
  )
}
