'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

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

const TIPO_LABELS: Record<string, string> = {
  general: '📋 General',
  departamento: '🏫 Departamento',
  apoderados: '👨‍👩‍👧 Apoderados',
  consejo: '🏛️ Consejo',
  otro: '📌 Otro',
}

const ESTADO_COLORS: Record<string, string> = {
  programada: 'bg-blue-100 text-blue-700',
  en_curso: 'bg-yellow-100 text-yellow-700',
  finalizada: 'bg-green-100 text-green-700',
  cancelada: 'bg-gray-100 text-gray-600',
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
    setReuniones(reunRes.data || [])
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">PROFE TRACKER</h1>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>
            <Link href="/calendario" className="text-blue-600 hover:underline">Calendario</Link>
            <Link href="/salidas" className="text-blue-600 hover:underline">Salidas</Link>
            <Link href="/reuniones" className="text-blue-600 font-semibold border-b-2 border-blue-600">Reuniones</Link>
            <Link href="/licencias" className="text-blue-600 hover:underline">Licencias</Link>
            <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }} className="text-gray-600 hover:text-gray-900">Cerrar sesión</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Reuniones</h2>
            <p className="text-sm text-gray-500">Registro de reuniones, acuerdos y actas</p>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg">➕ Nueva Reunión</button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Cargando...</div>
        ) : reuniones.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No hay reuniones registradas</div>
        ) : (
          <div className="space-y-4">
            {reuniones.map((r) => (
              <div key={r.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition cursor-pointer" onClick={() => { setShowDetail(r); setActaForm({ acuerdos: r.acuerdos || '', acta: r.acta || '' }) }}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-xs px-2 py-1 rounded ${ESTADO_COLORS[r.estado]}`}>{r.estado}</span>
                      <span className="text-sm text-gray-500">{TIPO_LABELS[r.tipo]}</span>
                    </div>
                    <h3 className="font-semibold text-gray-800">{r.titulo}</h3>
                    <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
                      <span>📅 {new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                      <span>🕐 {formatHora(r.hora_inicio)}{r.hora_fin ? ` - ${formatHora(r.hora_fin)}` : ''}</span>
                      {r.lugar && <span>📍 {r.lugar}</span>}
                    </div>
                    {r.responsable && <p className="text-xs text-gray-400 mt-1">Responsable: {r.responsable.nombre}</p>}
                    {r.participantes_detalle && r.participantes_detalle.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {r.participantes_detalle.slice(0, 5).map(p => (
                          <span key={p.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{p.nombre}</span>
                        ))}
                        {r.participantes_detalle.length > 5 && <span className="text-xs text-gray-400">+{r.participantes_detalle.length - 5}</span>}
                      </div>
                    )}
                    {r.acuerdos && <p className="text-xs text-green-600 mt-2">✅ Tiene acuerdos registrados</p>}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id) }} className="text-sm text-red-600 hover:underline ml-4">Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal Nueva Reunión */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Nueva Reunión</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                <input type="text" required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ej: Reunión mensual de profesores" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                  <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option value="general">📋 General</option>
                    <option value="departamento">🏫 Departamento</option>
                    <option value="apoderados">👨‍👩‍👧 Apoderados</option>
                    <option value="consejo">🏛️ Consejo</option>
                    <option value="otro">📌 Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Responsable</label>
                  <select value={form.responsable_id} onChange={(e) => setForm({ ...form, responsable_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option value="">Sin asignar</option>
                    {profesores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                  <input type="date" required value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora inicio *</label>
                  <input type="time" required value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora fin</label>
                  <input type="time" value={form.hora_fin} onChange={(e) => setForm({ ...form, hora_fin: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lugar</label>
                  <input type="text" value={form.lugar} onChange={(e) => setForm({ ...form, lugar: e.target.value })}
                    placeholder="Sala de reuniones" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link virtual</label>
                  <input type="url" value={form.link_virtual} onChange={(e) => setForm({ ...form, link_virtual: e.target.value })}
                    placeholder="https://meet.google.com/..." className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Participantes</label>
                <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                  {profesores.map(p => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input type="checkbox" checked={form.participantes.includes(p.id)} onChange={() => toggleParticipante(p.id)} className="rounded" />
                      <span className="text-sm">{p.nombre}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Temas a tratar</label>
                <textarea value={form.temas_a_tratar} onChange={(e) => setForm({ ...form, temas_a_tratar: e.target.value })}
                  rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Orden del día..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Crear Reunión'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalle / Acta */}
      {showDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className={`text-xs px-2 py-1 rounded ${ESTADO_COLORS[showDetail.estado]}`}>{showDetail.estado}</span>
                <h3 className="text-lg font-semibold mt-2">{showDetail.titulo}</h3>
                <p className="text-sm text-gray-500">{TIPO_LABELS[showDetail.tipo]} • {new Date(showDetail.fecha + 'T12:00:00').toLocaleDateString('es-CL')} • {formatHora(showDetail.hora_inicio)}</p>
              </div>
              <button onClick={() => setShowDetail(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            {showDetail.lugar && <p className="text-sm text-gray-600 mb-2">📍 {showDetail.lugar}</p>}
            {showDetail.link_virtual && <p className="text-sm text-blue-600 mb-2">🔗 <a href={showDetail.link_virtual} target="_blank" className="underline">Link virtual</a></p>}

            {showDetail.temas_a_tratar && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-700 mb-1">📋 Temas a tratar</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{showDetail.temas_a_tratar}</p>
              </div>
            )}

            {showDetail.participantes_detalle && showDetail.participantes_detalle.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-700 mb-1">👥 Participantes ({showDetail.participantes_detalle.length})</h4>
                <div className="flex flex-wrap gap-1">
                  {showDetail.participantes_detalle.map(p => (
                    <span key={p.id} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">{p.nombre}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Acuerdos y Acta */}
            {showDetail.estado === 'finalizada' && showDetail.acuerdos ? (
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-gray-700 mb-1">✅ Acuerdos</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{showDetail.acuerdos}</p>
                </div>
                {showDetail.acta && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-1">📝 Acta</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{showDetail.acta}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium text-gray-700 mb-2">📝 Registrar acuerdos y acta</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Acuerdos</label>
                    <textarea value={actaForm.acuerdos} onChange={(e) => setActaForm({ ...actaForm, acuerdos: e.target.value })}
                      rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Acuerdos tomados en la reunión..." />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Acta / Minuta</label>
                    <textarea value={actaForm.acta} onChange={(e) => setActaForm({ ...actaForm, acta: e.target.value })}
                      rows={4} className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Resumen de lo tratado..." />
                  </div>
                  <button onClick={handleSaveActa} disabled={saving}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50">
                    {saving ? 'Guardando...' : '💾 Guardar acta y marcar como finalizada'}
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