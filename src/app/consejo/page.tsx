'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import AppHeader from '@/components/AppHeader'
import { Calendar, Clock, MapPin, Users, FileText, Pin, BookOpen, CheckSquare, Save, Plus, Trash2, X } from 'lucide-react'
import PageAnimator from '@/components/PageAnimator'

interface Consejo {
  id: string
  titulo: string
  fecha: string
  hora_inicio: string
  hora_fin: string | null
  lugar: string | null
  responsables: string[]
  temas_a_tratar: string | null
  acuerdos: string | null
  compromisos: string | null
  acta: string | null
  estado: string
  creado_en: string
  responsables_detalle?: Array<{ id: string; nombre: string; departamento: string | null }>
}

function EstadoBadge({ estado }: { estado: string }) {
  const config: Record<string, string> = {
    programada: 'badge-info',
    realizado: 'badge-success',
    cancelado: 'badge-inactive',
  }
  return <span className={`badge ${config[estado] || 'badge-inactive'}`}>{estado}</span>
}

export default function ConsejoPage() {
  const [consejos, setConsejos] = useState<Consejo[]>([])
  const [profesores, setProfesores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState<Consejo | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    titulo: 'Consejo de Profesores',
    fecha: new Date().toISOString().split('T')[0],
    hora_inicio: '09:00',
    hora_fin: '',
    lugar: '',
    responsables: [] as string[],
    temas_a_tratar: '',
  })
  const [detailForm, setDetailForm] = useState({ acuerdos: '', compromisos: '', acta: '' })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const [cRes, pRes] = await Promise.all([
      supabase.from('consejo_profesores').select('*').order('fecha', { ascending: false }),
      supabase.from('profesores').select('id, nombre, departamento').eq('activo', true).order('nombre'),
    ])
    setConsejos((cRes.data || []).map(c => ({
      ...c,
      responsables_detalle: (c.responsables || [])
        .map((id: string) => (pRes.data || []).find(p => p.id === id))
        .filter(Boolean),
    })))
    setProfesores(pRes.data || [])
    setLoading(false)
  }

  const toggleResponsable = (id: string) => {
    setForm(prev => ({
      ...prev,
      responsables: prev.responsables.includes(id) ? prev.responsables.filter(r => r !== id) : [...prev.responsables, id]
    }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/consejo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          hora_fin: form.hora_fin || null,
          lugar: form.lugar || null,
          temas_a_tratar: form.temas_a_tratar || null,
        }),
      })
      if (!res.ok) { const j = await res.json(); alert(j.error || 'Error'); return }
      setShowModal(false)
      setForm({ titulo: 'Consejo de Profesores', fecha: new Date().toISOString().split('T')[0], hora_inicio: '09:00', hora_fin: '', lugar: '', responsables: [], temas_a_tratar: '' })
      fetchData()
    } catch { alert('Error') } finally { setSaving(false) }
  }

  const handleSaveDetail = async () => {
    if (!showDetail) return
    setSaving(true)
    try {
      await fetch(`/api/consejo/${showDetail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...detailForm, estado: 'realizado' }),
      })
      setShowDetail(null)
      fetchData()
    } catch { alert('Error') } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este consejo?')) return
    await fetch(`/api/consejo/${id}`, { method: 'DELETE' })
    fetchData()
  }

  return (
    <PageAnimator mode="all" className="min-h-screen bg-surface">
      <AppHeader />

      {/* ═══ Main ═══ */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-display font-semibold tracking-tight text-ink">Consejo de Profesores</h2>
          <p className="text-sm text-ink-muted mt-0.5">Convocatorias, temas, acuerdos y compromisos</p>
          <div className="mt-4">
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> Nueva Convocatoria
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-ink-muted">Cargando...</div>
        ) : consejos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-ink-muted">No hay consejos registrados</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {consejos.map((c) => (
              <div key={c.id} data-animate="card" className="card cursor-pointer border-l-[3px] border-l-info hover:border-rule transition-colors"
                onClick={() => { setShowDetail(c); setDetailForm({ acuerdos: c.acuerdos || '', compromisos: c.compromisos || '', acta: c.acta || '' }) }}>
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <EstadoBadge estado={c.estado} />
                    </div>
                    <h3 className="font-semibold text-ink">{c.titulo}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-ink-muted">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-ink-slate" /> {new Date(c.fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-ink-slate" /> {c.hora_inicio?.substring(0, 5)}{c.hora_fin ? ` - ${c.hora_fin.substring(0, 5)}` : ''}</span>
                      {c.lugar && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-ink-slate" /> {c.lugar}</span>}
                    </div>
                    {c.responsables_detalle && c.responsables_detalle.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="text-xs text-ink-muted">Responsables:</span>
                        {c.responsables_detalle.map(r => (
                          <span key={r.id} className="badge bg-surface-muted text-info text-[11px]">{r.nombre}</span>
                        ))}
                      </div>
                    )}
                    {c.acuerdos && (
                      <p className="text-xs text-success mt-2 flex items-center gap-1">
                        <CheckSquare className="w-3 h-3" /> Tiene acuerdos y compromisos
                      </p>
                    )}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id) }} className="btn-secondary text-sm shrink-0 ml-4">
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ═══ Modal Nueva Convocatoria ═══ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-surface rounded-xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-display font-semibold text-ink mb-4">Nueva Convocatoria</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Título</label>
                <input type="text" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className="input" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Fecha *</label>
                  <input type="date" required value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Hora inicio *</label>
                  <input type="time" required value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Hora fin</label>
                  <input type="time" value={form.hora_fin} onChange={(e) => setForm({ ...form, hora_fin: e.target.value })} className="input" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Lugar</label>
                <input type="text" value={form.lugar} onChange={(e) => setForm({ ...form, lugar: e.target.value })}
                  placeholder="Sala de reuniones" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Responsables</label>
                <div className="max-h-32 overflow-y-auto border border-border-light rounded-lg p-2 space-y-1">
                  {profesores.map(p => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer hover:bg-surface-muted p-1 rounded transition-colors">
                      <input type="checkbox" checked={form.responsables.includes(p.id)} onChange={() => toggleResponsable(p.id)}
                        className="rounded border-rule text-primary-accent focus:ring-focus" />
                      <span className="text-sm text-ink">{p.nombre}</span>
                      {p.departamento && <span className="text-xs text-ink-slate">({p.departamento})</span>}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Temas a tratar (orden del día)</label>
                <textarea value={form.temas_a_tratar} onChange={(e) => setForm({ ...form, temas_a_tratar: e.target.value })}
                  rows={5} className="input" placeholder="1. Revisión de acta anterior&#10;2. Estado del PME&#10;3. Temas varios&#10;4. Próxima reunión" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Guardando...' : 'Crear Convocatoria'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ Modal Detalle ═══ */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={() => setShowDetail(null)}>
          <div className="bg-surface rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <EstadoBadge estado={showDetail.estado} />
                <h3 className="text-lg font-display font-semibold text-ink mt-2">{showDetail.titulo}</h3>
                <p className="text-sm text-ink-muted flex items-center gap-1 mt-0.5">
                  <Calendar className="w-3.5 h-3.5" /> {new Date(showDetail.fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  {' • '}{showDetail.hora_inicio?.substring(0, 5)}
                </p>
              </div>
              <button onClick={() => setShowDetail(null)} className="p-1 hover:bg-surface-muted rounded-lg transition-colors">
                <X className="w-5 h-5 text-ink-muted" />
              </button>
            </div>

            {showDetail.lugar && <p className="text-sm text-ink-muted mb-3 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-ink-slate" /> {showDetail.lugar}</p>}

            {showDetail.responsables_detalle && showDetail.responsables_detalle.length > 0 && (
              <div className="mb-3">
                <h4 className="font-medium text-ink mb-1 flex items-center gap-1.5"><Users className="w-4 h-4 text-ink-slate" /> Responsables</h4>
                <div className="flex flex-wrap gap-1">
                  {showDetail.responsables_detalle.map(r => (
                    <span key={r.id} className="badge bg-surface-muted text-info">{r.nombre}</span>
                  ))}
                </div>
              </div>
            )}

            {showDetail.temas_a_tratar && (
              <div className="mb-4 p-3 bg-surface-muted rounded-sm">
                <h4 className="font-medium text-ink mb-1 flex items-center gap-1.5"><FileText className="w-4 h-4 text-ink-slate" /> Orden del día</h4>
                <p className="text-sm text-ink-muted whitespace-pre-wrap">{showDetail.temas_a_tratar}</p>
              </div>
            )}

            {showDetail.estado === 'realizado' && showDetail.acuerdos ? (
              <div className="space-y-3 border-t border-border-light pt-4">
                <div>
                  <h4 className="font-medium text-ink mb-1 flex items-center gap-1.5"><CheckSquare className="w-4 h-4 text-success" /> Acuerdos</h4>
                  <p className="text-sm text-ink-muted whitespace-pre-wrap">{showDetail.acuerdos}</p>
                </div>
                {showDetail.compromisos && (
                  <div>
                    <h4 className="font-medium text-ink mb-1 flex items-center gap-1.5"><Pin className="w-4 h-4 text-ink-slate" /> Compromisos</h4>
                    <p className="text-sm text-ink-muted whitespace-pre-wrap">{showDetail.compromisos}</p>
                  </div>
                )}
                {showDetail.acta && (
                  <div>
                    <h4 className="font-medium text-ink mb-1 flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-ink-slate" /> Acta</h4>
                    <p className="text-sm text-ink-muted whitespace-pre-wrap">{showDetail.acta}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="border-t border-border-light pt-4 mt-4 space-y-3">
                <h4 className="font-medium text-ink flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-ink-slate" /> Registrar resultado del consejo</h4>
                <div>
                  <label className="block text-sm text-ink mb-1">Acuerdos</label>
                  <textarea value={detailForm.acuerdos} onChange={(e) => setDetailForm({ ...detailForm, acuerdos: e.target.value })}
                    rows={3} className="input" placeholder="Acuerdos tomados..." />
                </div>
                <div>
                  <label className="block text-sm text-ink mb-1">Compromisos</label>
                  <textarea value={detailForm.compromisos} onChange={(e) => setDetailForm({ ...detailForm, compromisos: e.target.value })}
                    rows={3} className="input" placeholder="Compromisos asumidos..." />
                </div>
                <div>
                  <label className="block text-sm text-ink mb-1">Acta / Minuta</label>
                  <textarea value={detailForm.acta} onChange={(e) => setDetailForm({ ...detailForm, acta: e.target.value })}
                    rows={4} className="input" placeholder="Resumen del consejo..." />
                </div>
                <button onClick={handleSaveDetail} disabled={saving}
                  className="btn-primary flex items-center gap-1.5">
                  <Save className="w-4 h-4" />{saving ? 'Guardando...' : 'Guardar y marcar como realizado'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </PageAnimator>
  )
}
