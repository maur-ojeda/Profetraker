'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

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

const TIPO_LABELS: Record<string, string> = {
  medica: '🏥 Médica',
  prenatal: '🤰 Prenatal',
  postnatal: '👶 Postnatal',
  personal: '👤 Personal',
  estudio: '📚 Estudio',
}

const ESTADO_COLORS: Record<string, string> = {
  activa: 'bg-green-100 text-green-700',
  finalizada: 'bg-gray-100 text-gray-600',
  pendiente: 'bg-yellow-100 text-yellow-700',
}

export default function LicenciasPage() {
  const [licencias, setLicencias] = useState<Licencia[]>([])
  const [loading, setLoading] = useState(true)
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
      supabase.from('licencias').select('*').order('fecha_desde', { ascending: false }),
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

      // Mostrar alertas
      const alertas: string[] = []
      if (json.alerta_pago) alertas.push('📄 Pendiente de ingreso al sistema de pagos')
      if (json.alerta_largo) alertas.push(`⚠️ Licencia mayor a 7 días (${json.dias_corridos} días) - Revisar cambio de faena`)
      if (alertas.length > 0) alert(alertas.join('\n'))

      setShowModal(false)
      setForm({ profesor_id: '', tipo: 'medica', fecha_desde: '', fecha_hasta: '', motivo: '' })
      fetchData()
    } catch { alert('Error al crear licencia') } finally { setSaving(false) }
  }

  const handleFinalizar = async (id: string) => {
    if (!confirm('¿Marcar esta licencia como finalizada?')) return
    await fetch(`/api/licencias/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'finalizada' }),
    })
    fetchData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta licencia?')) return
    await fetch(`/api/licencias/${id}`, { method: 'DELETE' })
    fetchData()
  }

  const dias = calcDias(form.fecha_desde, form.fecha_hasta)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">PROFE TRACKER</h1>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>
            <Link href="/profesores" className="text-blue-600 hover:underline">Profesores</Link>
            <Link href="/calendario" className="text-blue-600 hover:underline">Calendario</Link>
            <Link href="/licencias" className="text-blue-600 font-semibold border-b-2 border-blue-600">Licencias</Link>
            <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }} className="text-gray-600 hover:text-gray-900">Cerrar sesión</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Licencias Médicas</h2>
            <p className="text-sm text-gray-500">Registro de licencias con seguimiento de pagos</p>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2">
            ➕ Nueva Licencia
          </button>
        </div>

        {/* Alertas */}
        {licencias.filter(l => l.estado === 'activa').length > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <p className="font-medium text-yellow-800">📄 Pendientes de ingreso al sistema de pagos</p>
            <p className="text-sm text-yellow-700">
              {licencias.filter(l => l.estado === 'activa').length} licencia(s) activa(s) requieren documentación en el sistema de pagos.
            </p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-500">Cargando licencias...</div>
        ) : licencias.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No hay licencias registradas</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Profesor</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Tipo</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Desde</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Hasta</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Días</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Estado</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Motivo</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {licencias.map((lic) => {
                  const diasCorridos = calcDias(lic.fecha_desde, lic.fecha_hasta)
                  return (
                    <tr key={lic.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-sm">{lic.profesor?.nombre || '—'}</p>
                        <p className="text-xs text-gray-500">{lic.profesor?.departamento}</p>
                      </td>
                      <td className="px-4 py-3 text-sm">{TIPO_LABELS[lic.tipo] || lic.tipo}</td>
                      <td className="px-4 py-3 text-sm">{new Date(lic.fecha_desde + 'T12:00:00').toLocaleDateString('es-CL')}</td>
                      <td className="px-4 py-3 text-sm">{new Date(lic.fecha_hasta + 'T12:00:00').toLocaleDateString('es-CL')}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-medium ${diasCorridos > 7 ? 'text-red-600' : 'text-gray-800'}`}>
                          {diasCorridos}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded ${ESTADO_COLORS[lic.estado]}`}>
                          {lic.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{lic.motivo || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-2 justify-center">
                          {lic.estado === 'activa' && (
                            <button onClick={() => handleFinalizar(lic.id)} className="text-xs text-green-600 hover:underline">Finalizar</button>
                          )}
                          <button onClick={() => handleDelete(lic.id)} className="text-xs text-red-600 hover:underline">Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modal Nueva Licencia */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Nueva Licencia</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profesor *</label>
                <select required value={form.profesor_id} onChange={(e) => setForm({ ...form, profesor_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option value="">Seleccionar...</option>
                  {profesores.map((p) => (<option key={p.id} value={p.id}>{p.nombre} ({p.departamento})</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option value="medica">🏥 Médica</option>
                  <option value="prenatal">🤰 Prenatal</option>
                  <option value="postnatal">👶 Postnatal</option>
                  <option value="personal">👤 Personal</option>
                  <option value="estudio">📚 Estudio</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha desde *</label>
                  <input type="date" required value={form.fecha_desde} onChange={(e) => setForm({ ...form, fecha_desde: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha hasta *</label>
                  <input type="date" required value={form.fecha_hasta} onChange={(e) => setForm({ ...form, fecha_hasta: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                </div>
              </div>
              {dias > 0 && (
                <div className={`rounded-lg p-3 ${dias > 7 ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}>
                  <p className={`text-sm ${dias > 7 ? 'text-red-700' : 'text-blue-700'}`}>
                    {dias > 7 ? '⚠️' : '📅'} {dias} día{dias > 1 ? 's' : ''} corrido{dias > 1 ? 's' : ''}
                    {dias > 7 && ' — Licencia mayor a 7 días. Revisar cambio de faena.'}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                <textarea value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                  rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Motivo de la licencia (opcional)" />
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-700">📄 Al crear la licencia se marcará como pendiente de ingreso al sistema de pagos.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving || !form.profesor_id || !form.fecha_desde || !form.fecha_hasta}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Crear Licencia'}
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