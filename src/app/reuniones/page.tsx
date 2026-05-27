'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import AppHeader from '@/components/AppHeader'
import { Calendar, Clock, MapPin, FileText, Users, Building2, Pin, CheckSquare, BookOpen, Save, Link2, ClipboardList, Plus, Trash2, X } from 'lucide-react'

interface Reunion {
  id: string
  titulo: string
  tipo: string
  fecha: string
  hora_inicio: string
  hora_fin: string | null
  lugar: string | null
  link_virtual: string | null
  participantes: string[]
  responsable_id: string | null
  temas_a_tratar: string | null
  acuerdos: string | null
  acta: string | null
  estado: string
  creado_en: string
  responsable?: { id: string; nombre: string }
  participantes_detalle?: Array<{ id: string; nombre: string; departamento: string | null }>
}

const TIPO_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  general: { label: 'General', icon: ClipboardList },
  departamento: { label: 'Departamento', icon: Building2 },
  apoderados: { label: 'Apoderados', icon: Users },
  consejo: { label: 'Consejo', icon: Building2 },
  otro: { label: 'Otro', icon: Pin },
}

function EstadoBadge({ estado }: { estado: string }) {
  const config: Record<string, string> = {
    programada: 'badge-info',
    en_curso: 'badge-warning',
    finalizada: 'badge-success',
    cancelada: 'badge-inactive',
  }
  return <span className={`badge ${config[estado] || 'badge-inactive'}`}>{estado}</span>
}

export default function ReunionesPage() {
  const [reuniones, setReuniones] = useState<Reunion[]>([])
  const [profesores, setProfesores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState<Reunion | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    titulo: '',
    tipo: 'general',
    fecha: new Date().toISOString().split('T')[0],
    hora_inicio: '09:00',
    hora_fin: '',
    lugar: '',
    link_virtual: '',
    responsable_id: '',
    participantes: [] as string[],
    temas_a_tratar: '',
  })
  const [actaForm, setActaForm] = useState({ acuerdos: '', acta: '' })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const [reunRes, profRes] = await Promise.all([
      supabase.from('reuniones').select('*').order('fecha', { ascending: false }),
      supabase.from('profesores').select('id, nombre, departamento').eq('activo', true).order('nombre'),
    ])
    setReuniones((reunRes.data || []).map(r => ({
      ...r,
      responsable: r.responsable_id ? (profRes.data || []).find(p => p.id === r.responsable_id) || null : null,
      participantes_detalle: (r.participantes || [])
        .map((id: string) => (profRes.data || []).find(p => p.id === id))
        .filter(Boolean),
    })))
    setProfesores(profRes.data || [])
    setLoading(false)
  }

  const toggleParticipante = (id: string) => {
    setForm(prev => ({
      ...prev,
      participantes: prev.participantes.includes(id)
        ? prev.participantes.filter(p => p !== id)
        : [...prev.participantes, id]
    }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.titulo || !form.fecha || !form.hora_inicio) return
    setSaving(true)
    try {
      const res = await fetch('/api/reuniones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          hora_fin: form.hora_fin || null,
          lugar: form.lugar || null,
          link_virtual: form.link_virtual || null,
          responsable_id: form.responsable_id || null,
          temas_a_tratar: form.temas_a_tratar || null,
        }),
      })
      if (!res.ok) { const j = await res.json(); alert(j.error || 'Error'); return }
      setShowModal(false)
      setForm({ titulo: '', tipo: 'general', fecha: new Date().toISOString().split('T')[0], hora_inicio: '09:00', hora_fin: '', lugar: '', link_virtual: '', responsable_id: '', participantes: [], temas_a_tratar: '' })
      fetchData()
    } catch { alert('Error al guardar') } finally { setSaving(false) }
  }

  const handleSaveActa = async () => {
    if (!showDetail) return
    setSaving(true)
    try {
      await fetch(`/api/reuniones/${showDetail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...actaForm, estado: 'finalizada' }),
      })
      setShowDetail(null)
      fetchData()
    } catch { alert('Error') } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta reunión?')) return
    await fetch(`/api/reuniones/${id}`, { method: 'DELETE' })
    fetchData()
  }

  const formatHora = (h: string) => h?.substring(0, 5)

  return (
    <div className="min-h-screen bg-surface">
      <AppHeader />

      {/* ═══ Main ═══ */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-display font-semibold tracking-tight text-ink">Reuniones</h2>
          <p className="text-sm text-ink-muted mt-0.5">Registro de reuniones, acuerdos y actas</p>
          <div className="mt-4">
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> Nueva Reunión
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-ink-muted">Cargando...</div>
        ) : reuniones.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-ink-muted">No hay reuniones registradas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {reuniones.map((r) => (
              <div key={r.id} className="card cursor-pointer hover:border-rule transition-colors"
                onClick={() => { setShowDetail(r); setActaForm({ acuerdos: r.acuerdos || '', acta: r.acta || '' }) }}>
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                      <EstadoBadge estado={r.estado} />
                      <span className="text-sm text-ink-muted flex items-center gap-1">
                        {(() => { const Icon = TIPO_CONFIG[r.tipo]?.icon || Pin; return <Icon className="w-3.5 h-3.5" />; })()}
                        {TIPO_CONFIG[r.tipo]?.label || r.tipo}
                      </span>
                    </div>
                    <h3 className="font-semibold text-ink">{r.titulo}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-ink-muted">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-ink-slate" /> {new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-ink-slate" /> {formatHora(r.hora_inicio)}{r.hora_fin ? ` - ${formatHora(r.hora_fin)}` : ''}</span>
                      {r.lugar && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-ink-slate" /> {r.lugar}</span>}
                    </div>
                    {r.responsable && <p className="text-xs text-ink-slate mt-1">Responsable: {r.responsable.nombre}</p>}
                    {r.participantes_detalle && r.participantes_detalle.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {r.participantes_detalle.slice(0, 5).map(p => (
                          <span key={p.id} className="badge bg-surface-muted text-ink-muted text-[11px]">{p.nombre}</span>
                        ))}
                        {r.participantes_detalle.length > 5 && <span className="badge bg-surface-muted text-ink-slate text-[11px]">+{r.participantes_detalle.length - 5}</span>}
                      </div>
                    )}
                    {r.acuerdos && (
                      <p className="text-xs text-success mt-2 flex items-center gap-1">
                        <CheckSquare className="w-3 h-3" /> Tiene acuerdos registrados
                      </p>
                    )}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id) }} className="btn-secondary text-sm shrink-0 ml-4">
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ═══ Modal Nueva Reunión ═══ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-surface rounded-xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-display font-semibold text-ink mb-4">Nueva Reunión</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Título *</label>
                <input type="text" required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ej: Reunión mensual de profesores" className="input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Tipo *</label>
                  <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="input">
                    <option value="general">General</option>
                    <option value="departamento">Departamento</option>
                    <option value="apoderados">Apoderados</option>
                    <option value="consejo">Consejo</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Responsable</label>
                  <select value={form.responsable_id} onChange={(e) => setForm({ ...form, responsable_id: e.target.value })} className="input">
                    <option value="">Sin asignar</option>
                    {profesores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Lugar</label>
                  <input type="text" value={form.lugar} onChange={(e) => setForm({ ...form, lugar: e.target.value })}
                    placeholder="Sala de reuniones" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Link virtual</label>
                  <input type="url" value={form.link_virtual} onChange={(e) => setForm({ ...form, link_virtual: e.target.value })}
                    placeholder="https://meet.google.com/..." className="input" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Participantes</label>
                <div className="max-h-32 overflow-y-auto border border-border-light rounded-sm p-2 space-y-1">
                  {profesores.map(p => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer hover:bg-surface-muted p-1 rounded transition-colors">
                      <input type="checkbox" checked={form.participantes.includes(p.id)} onChange={() => toggleParticipante(p.id)}
                        className="rounded border-rule text-primary-accent focus:ring-focus" />
                      <span className="text-sm text-ink">{p.nombre}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Temas a tratar</label>
                <textarea value={form.temas_a_tratar} onChange={(e) => setForm({ ...form, temas_a_tratar: e.target.value })}
                  rows={3} className="input" placeholder="Orden del día..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Guardando...' : 'Crear Reunión'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ Modal Detalle / Acta ═══ */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={() => setShowDetail(null)}>
          <div className="bg-surface rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <EstadoBadge estado={showDetail.estado} />
                <h3 className="text-lg font-display font-semibold text-ink mt-2">{showDetail.titulo}</h3>
                <p className="text-sm text-ink-muted flex items-center gap-1 mt-0.5">
                  <Calendar className="w-3.5 h-3.5" /> {new Date(showDetail.fecha + 'T12:00:00').toLocaleDateString('es-CL')} • {formatHora(showDetail.hora_inicio)}
                </p>
              </div>
              <button onClick={() => setShowDetail(null)} className="p-1 hover:bg-surface-muted rounded-lg transition-colors">
                <X className="w-5 h-5 text-ink-muted" />
              </button>
            </div>

            {showDetail.lugar && <p className="text-sm text-ink-muted mb-2 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-ink-slate" /> {showDetail.lugar}</p>}
            {showDetail.link_virtual && (
              <p className="text-sm text-link mb-2 flex items-center gap-1.5">
                <Link2 className="w-4 h-4" /> <a href={showDetail.link_virtual} target="_blank" className="underline">Link virtual</a>
              </p>
            )}

            {showDetail.temas_a_tratar && (
              <div className="mb-4">
                <h4 className="font-medium text-ink mb-1 flex items-center gap-1.5"><FileText className="w-4 h-4 text-ink-slate" /> Temas a tratar</h4>
                <p className="text-sm text-ink-muted whitespace-pre-wrap">{showDetail.temas_a_tratar}</p>
              </div>
            )}

            {showDetail.participantes_detalle && showDetail.participantes_detalle.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-ink mb-1 flex items-center gap-1.5"><Users className="w-4 h-4 text-ink-slate" /> Participantes ({showDetail.participantes_detalle.length})</h4>
                <div className="flex flex-wrap gap-1">
                  {showDetail.participantes_detalle.map(p => (
                    <span key={p.id} className="badge bg-surface-muted text-ink">{p.nombre}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Acuerdos y Acta */}
            {showDetail.estado === 'finalizada' && showDetail.acuerdos ? (
              <div className="space-y-3 border-t border-border-light pt-4">
                <div>
                  <h4 className="font-medium text-ink mb-1 flex items-center gap-1.5"><CheckSquare className="w-4 h-4 text-ink-slate" /> Acuerdos</h4>
                  <p className="text-sm text-ink-muted whitespace-pre-wrap">{showDetail.acuerdos}</p>
                </div>
                {showDetail.acta && (
                  <div>
                    <h4 className="font-medium text-ink mb-1 flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-ink-slate" /> Acta</h4>
                    <p className="text-sm text-ink-muted whitespace-pre-wrap">{showDetail.acta}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="border-t border-border-light pt-4 mt-4">
                <h4 className="font-medium text-ink mb-2 flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-ink-slate" /> Registrar acuerdos y acta</h4>
                <div className="space-y-3 border-t border-border-light pt-4">
                  <div>
                    <label className="block text-sm text-ink mb-1">Acuerdos</label>
                    <textarea value={actaForm.acuerdos} onChange={(e) => setActaForm({ ...actaForm, acuerdos: e.target.value })}
                      rows={3} className="input" placeholder="Acuerdos tomados en la reunión..." />
                  </div>
                  <div>
                    <label className="block text-sm text-ink mb-1">Acta / Minuta</label>
                    <textarea value={actaForm.acta} onChange={(e) => setActaForm({ ...actaForm, acta: e.target.value })}
                      rows={4} className="input" placeholder="Resumen de lo tratado..." />
                  </div>
                  <button onClick={handleSaveActa} disabled={saving}
                    className="btn-primary flex items-center gap-1.5">
                    <Save className="w-4 h-4" />{saving ? 'Guardando...' : 'Guardar acta y marcar como finalizada'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
