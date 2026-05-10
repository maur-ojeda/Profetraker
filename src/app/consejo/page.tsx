'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

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

const ESTADO_COLORS: Record<string, string> = {
  programada: 'bg-blue-100 text-blue-700',
  realizado: 'bg-green-100 text-green-700',
  cancelado: 'bg-gray-100 text-gray-600',
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
    setConsejos(cRes.data || [])
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">PROFE TRACKER</h1>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>
            <Link href="/calendario" className="text-blue-600 hover:underline">Calendario</Link>
            <Link href="/salidas" className="text-blue-600 hover:underline">Salidas</Link>
            <Link href="/reuniones" className="text-blue-600 hover:underline">Reuniones</Link>
            <Link href="/consejo" className="text-blue-600 font-semibold border-b-2 border-blue-600">Consejo</Link>
            <Link href="/licencias" className="text-blue-600 hover:underline">Licencias</Link>
            <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }} className="text-gray-600 hover:text-gray-900">Cerrar sesión</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Consejo de Profesores</h2>
            <p className="text-sm text-gray-500">Convocatorias, temas, acuerdos y compromisos</p>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg">➕ Nueva Convocatoria</button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Cargando...</div>
        ) : consejos.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No hay consejos registrados</div>
        ) : (
          <div className="space-y-4">
            {consejos.map((c) => (
              <div key={c.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition cursor-pointer border-l-4 border-indigo-500"
                onClick={() => { setShowDetail(c); setDetailForm({ acuerdos: c.acuerdos || '', compromisos: c.compromisos || '', acta: c.acta || '' }) }}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-xs px-2 py-1 rounded ${ESTADO_COLORS[c.estado]}`}>{c.estado}</span>
                    </div>
                    <h3 className="font-semibold text-gray-800">{c.titulo}</h3>
                    <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
                      <span>📅 {new Date(c.fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      <span>🕐 {c.hora_inicio?.substring(0, 5)}{c.hora_fin ? ` - ${c.hora_fin.substring(0, 5)}` : ''}</span>
                      {c.lugar && <span>📍 {c.lugar}</span>}
                    </div>
                    {c.responsables_detalle && c.responsables_detalle.length > 0 && (
                      <div className="mt-2">
                        <span className="text-xs text-gray-400">Responsables: </span>
                        {c.responsables_detalle.map(r => (
                          <span key={r.id} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded mr-1">{r.nombre}</span>
                        ))}
                      </div>
                    )}
                    {c.acuerdos && <p className="text-xs text-green-600 mt-2">✅ Tiene acuerdos y compromisos</p>}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id) }} className="text-sm text-red-600 hover:underline ml-4">Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal Nueva Convocatoria */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Nueva Convocatoria</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input type="text" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2" />
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lugar</label>
                <input type="text" value={form.lugar} onChange={(e) => setForm({ ...form, lugar: e.target.value })}
                  placeholder="Sala de reuniones" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Responsables</label>
                <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                  {profesores.map(p => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input type="checkbox" checked={form.responsables.includes(p.id)} onChange={() => toggleResponsable(p.id)} className="rounded" />
                      <span className="text-sm">{p.nombre}</span>
                      {p.departamento && <span className="text-xs text-gray-400">({p.departamento})</span>}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Temas a tratar (orden del día)</label>
                <textarea value={form.temas_a_tratar} onChange={(e) => setForm({ ...form, temas_a_tratar: e.target.value })}
                  rows={5} className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="1. Revisión de acta anterior&#10;2. Estado del PME&#10;3. Temas varios&#10;4. Próxima reunión" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Crear Convocatoria'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalle */}
      {showDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className={`text-xs px-2 py-1 rounded ${ESTADO_COLORS[showDetail.estado]}`}>{showDetail.estado}</span>
                <h3 className="text-lg font-semibold mt-2">{showDetail.titulo}</h3>
                <p className="text-sm text-gray-500">
                  📅 {new Date(showDetail.fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  {' • '}{showDetail.hora_inicio?.substring(0, 5)}
                </p>
              </div>
              <button onClick={() => setShowDetail(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            {showDetail.lugar && <p className="text-sm text-gray-600 mb-3">📍 {showDetail.lugar}</p>}

            {showDetail.responsables_detalle && showDetail.responsables_detalle.length > 0 && (
              <div className="mb-3">
                <h4 className="font-medium text-gray-700 mb-1">👤 Responsables</h4>
                <div className="flex flex-wrap gap-1">
                  {showDetail.responsables_detalle.map(r => (
                    <span key={r.id} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">{r.nombre}</span>
                  ))}
                </div>
              </div>
            )}

            {showDetail.temas_a_tratar && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-700 mb-1">📋 Orden del día</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{showDetail.temas_a_tratar}</p>
              </div>
            )}

            {showDetail.estado === 'realizado' && showDetail.acuerdos ? (
              <div className="space-y-3 border-t pt-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-1">✅ Acuerdos</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{showDetail.acuerdos}</p>
                </div>
                {showDetail.compromisos && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-1">📌 Compromisos</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{showDetail.compromisos}</p>
                  </div>
                )}
                {showDetail.acta && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-1">📝 Acta</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{showDetail.acta}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="border-t pt-4 mt-4 space-y-3">
                <h4 className="font-medium text-gray-700">📝 Registrar resultado del consejo</h4>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Acuerdos</label>
                  <textarea value={detailForm.acuerdos} onChange={(e) => setDetailForm({ ...detailForm, acuerdos: e.target.value })}
                    rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Acuerdos tomados..." />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Compromisos</label>
                  <textarea value={detailForm.compromisos} onChange={(e) => setDetailForm({ ...detailForm, compromisos: e.target.value })}
                    rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Compromisos asumidos..." />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Acta / Minuta</label>
                  <textarea value={detailForm.acta} onChange={(e) => setDetailForm({ ...detailForm, acta: e.target.value })}
                    rows={4} className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Resumen del consejo..." />
                </div>
                <button onClick={handleSaveDetail} disabled={saving}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50">
                  {saving ? 'Guardando...' : '💾 Guardar y marcar como realizado'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}