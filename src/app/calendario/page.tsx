'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Evento {
  profesor_id: string
  profesor_nombre: string
  departamento: string | null
  tipo: 'licencia' | 'permiso' | 'ausencia_con_aviso' | 'ausencia_sin_aviso'
  subtipo: string | null
  detalle: string
}

interface CalendarioData {
  mes: string
  fecha_desde: string
  fecha_hasta: string
  profesores: any[]
  eventos: Record<string, Evento[]>
  resumen: {
    total_profesores: number
    total_eventos: number
    licencias: number
    permisos: number
    ausencias: number
  }
}

const TIPO_CONFIG = {
  licencia: { color: 'bg-green-500', label: 'Licencia', emoji: '🟢' },
  permiso: { color: 'bg-yellow-500', label: 'Permiso', emoji: '🟡' },
  ausencia_sin_aviso: { color: 'bg-red-500', label: 'Ausencia s/aviso', emoji: '🔴' },
  ausencia_con_aviso: { color: 'bg-gray-400', label: 'Ausencia c/aviso', emoji: '⚪' },
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export default function CalendarioPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [data, setData] = useState<CalendarioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [departamentoFilter, setDepartamentoFilter] = useState('')
  const [departamentos, setDepartamentos] = useState<string[]>([])
  const [tooltipEvento, setTooltipEvento] = useState<{
    x: number
    y: number
    eventos: Evento[]
    fecha: string
  } | null>(null)

  // Modal de ausencia
  const [showModal, setShowModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formAusencia, setFormAusencia] = useState({
    profesor_id: '',
    tipo: 'con_aviso' as 'con_aviso' | 'sin_aviso',
    justificacion: '',
  })

  const mesStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`

  const fetchCalendario = useCallback(async () => {
    setLoading(true)
    let url = `/api/calendario?mes=${mesStr}`
    if (departamentoFilter) {
      url += `&departamento=${encodeURIComponent(departamentoFilter)}`
    }

    try {
      const res = await fetch(url)
      const json = await res.json()
      setData(json)

      if (json.profesores) {
        const deps = [...new Set(
          json.profesores
            .map((p: any) => p.departamento)
            .filter(Boolean)
        )] as string[]
        setDepartamentos(deps.sort())
      }
    } catch (err) {
      console.error('Error fetching calendario:', err)
    } finally {
      setLoading(false)
    }
  }, [mesStr, departamentoFilter])

  useEffect(() => {
    fetchCalendario()
  }, [fetchCalendario])

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  const goToday = () => setCurrentDate(new Date())

  const getCalendarDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    let startDayOfWeek = firstDay.getDay() - 1
    if (startDayOfWeek < 0) startDayOfWeek = 6

    const days: Array<{
      date: Date
      dateStr: string
      isCurrentMonth: boolean
      isToday: boolean
    }> = []

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month, -i)
      days.push({ date: d, dateStr: d.toISOString().split('T')[0], isCurrentMonth: false, isToday: false })
    }

    const today = new Date()
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i)
      days.push({
        date: d,
        dateStr: d.toISOString().split('T')[0],
        isCurrentMonth: true,
        isToday: d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear(),
      })
    }

    const remaining = 7 - (days.length % 7)
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(year, month + 1, i)
        days.push({ date: d, dateStr: d.toISOString().split('T')[0], isCurrentMonth: false, isToday: false })
      }
    }

    return days
  }

  const openModalAusencia = (fecha: string) => {
    setSelectedDate(fecha)
    setFormAusencia({ profesor_id: '', tipo: 'con_aviso', justificacion: '' })
    setShowModal(true)
  }

  const handleSaveAusencia = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formAusencia.profesor_id || !selectedDate) return

    setSaving(true)
    try {
      const res = await fetch('/api/ausencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profesor_id: formAusencia.profesor_id,
          fecha: selectedDate,
          tipo: formAusencia.tipo,
          justificacion: formAusencia.justificacion || null,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        alert(json.error || 'Error al registrar ausencia')
        return
      }

      setShowModal(false)
      fetchCalendario() // Refrescar calendario
    } catch (err) {
      alert('Error al registrar ausencia')
    } finally {
      setSaving(false)
    }
  }

  const handleMouseEnter = (e: React.MouseEvent, fecha: string, eventos: Evento[]) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltipEvento({
      x: rect.left + rect.width / 2,
      y: rect.top,
      eventos,
      fecha,
    })
  }

  const handleMouseLeave = () => setTooltipEvento(null)

  const days = getCalendarDays()
  const fechaSeleccionada = selectedDate
    ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
    : ''

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">PROFE TRACKER</h1>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>
            <Link href="/profesores" className="text-blue-600 hover:underline">Profesores</Link>
            <Link href="/calendario" className="text-blue-600 font-semibold border-b-2 border-blue-600">Calendario</Link>
            <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }} className="text-gray-600 hover:text-gray-900">
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Título y controles */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Calendario de Asistencia</h2>
            <p className="text-sm text-gray-500">Click en un día para registrar ausencia</p>
          </div>
          <div className="flex items-center gap-3">
            <select value={departamentoFilter} onChange={(e) => setDepartamentoFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Todos los departamentos</option>
              {departamentos.map((d) => (<option key={d} value={d}>{d}</option>))}
            </select>
          </div>
        </div>

        {/* Navegación del mes */}
        <div className="flex items-center justify-between mb-4 bg-white rounded-lg shadow p-3">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg text-xl">←</button>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">{MESES[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
            <button onClick={goToday} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">Hoy</button>
          </div>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg text-xl">→</button>
        </div>

        {/* Leyenda */}
        <div className="flex flex-wrap gap-4 mb-4 px-2">
          {Object.entries(TIPO_CONFIG).map(([key, config]) => (
            <div key={key} className="flex items-center gap-2 text-sm">
              <span className={`w-3 h-3 rounded-full ${config.color}`}></span>
              <span className="text-gray-600">{config.label}</span>
            </div>
          ))}
        </div>

        {/* Resumen */}
        {data?.resumen && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
            <div className="bg-white rounded-lg shadow p-3 text-center">
              <p className="text-2xl font-bold text-gray-800">{data.resumen.total_profesores}</p>
              <p className="text-xs text-gray-500">Profesores</p>
            </div>
            <div className="bg-white rounded-lg shadow p-3 text-center">
              <p className="text-2xl font-bold text-gray-800">{data.resumen.total_eventos}</p>
              <p className="text-xs text-gray-500">Total eventos</p>
            </div>
            <div className="bg-green-50 rounded-lg shadow p-3 text-center border border-green-200">
              <p className="text-2xl font-bold text-green-700">{data.resumen.licencias}</p>
              <p className="text-xs text-green-600">Licencias</p>
            </div>
            <div className="bg-yellow-50 rounded-lg shadow p-3 text-center border border-yellow-200">
              <p className="text-2xl font-bold text-yellow-700">{data.resumen.permisos}</p>
              <p className="text-xs text-yellow-600">Permisos</p>
            </div>
            <div className="bg-red-50 rounded-lg shadow p-3 text-center border border-red-200">
              <p className="text-2xl font-bold text-red-700">{data.resumen.ausencias}</p>
              <p className="text-xs text-red-600">Ausencias</p>
            </div>
          </div>
        )}

        {/* Calendario Grid */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Cargando calendario...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="grid grid-cols-7 bg-gray-100 border-b">
              {DIAS_SEMANA.map((dia) => (
                <div key={dia} className={`text-center py-2 text-sm font-medium ${dia === 'Sáb' || dia === 'Dom' ? 'text-red-500' : 'text-gray-700'}`}>
                  {dia}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {days.map((day, idx) => {
                const dayEvents = data?.eventos[day.dateStr] || []
                const hasEvents = dayEvents.length > 0
                const tipos = dayEvents.map((e) => e.tipo)

                let dayBorderColor = 'border-gray-200'
                if (tipos.includes('ausencia_sin_aviso')) dayBorderColor = 'border-red-400'
                else if (tipos.includes('licencia')) dayBorderColor = 'border-green-400'
                else if (tipos.includes('permiso')) dayBorderColor = 'border-yellow-400'
                else if (tipos.includes('ausencia_con_aviso')) dayBorderColor = 'border-gray-400'

                return (
                  <div
                    key={idx}
                    className={`min-h-[100px] p-1 border-b border-r ${dayBorderColor} ${
                      !day.isCurrentMonth ? 'bg-gray-50' : ''
                    } ${day.isToday ? 'bg-blue-50' : ''} relative cursor-pointer hover:bg-gray-50 transition-colors`}
                    onMouseEnter={hasEvents ? (e) => handleMouseEnter(e, day.dateStr, dayEvents) : undefined}
                    onMouseLeave={hasEvents ? handleMouseLeave : undefined}
                    onClick={() => day.isCurrentMonth && openModalAusencia(day.dateStr)}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                        day.isToday ? 'bg-blue-600 text-white' : !day.isCurrentMonth ? 'text-gray-400' : 'text-gray-700'
                      }`}>
                        {day.date.getDate()}
                      </span>
                      {hasEvents && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-1 rounded">{dayEvents.length}</span>
                      )}
                    </div>

                    {hasEvents && (
                      <div className="mt-1 space-y-0.5">
                        {dayEvents.slice(0, 3).map((evento, eIdx) => {
                          const config = TIPO_CONFIG[evento.tipo]
                          return (
                            <div key={eIdx} className={`text-xs px-1 py-0.5 rounded truncate ${config.color} text-white`}
                              title={`${evento.profesor_nombre}: ${evento.detalle}`}>
                              {evento.profesor_nombre.split(' ')[0]}
                            </div>
                          )
                        })}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-gray-500 px-1">+{dayEvents.length - 3} más</div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>

      {/* Tooltip flotante */}
      {tooltipEvento && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-xl border p-3 max-w-xs"
          style={{
            left: Math.min(tooltipEvento.x - 150, window.innerWidth - 320),
            top: tooltipEvento.y - 10,
            transform: 'translateY(-100%)',
          }}
        >
          <p className="font-semibold text-sm mb-2">
            📅 {new Date(tooltipEvento.fecha + 'T12:00:00').toLocaleDateString('es-CL', {
              weekday: 'long', day: 'numeric', month: 'long',
            })}
          </p>
          <div className="space-y-2">
            {tooltipEvento.eventos.map((ev, idx) => {
              const config = TIPO_CONFIG[ev.tipo]
              return (
                <div key={idx} className="flex items-start gap-2">
                  <span className={`w-2 h-2 rounded-full mt-1.5 ${config.color}`}></span>
                  <div>
                    <p className="text-sm font-medium">{ev.profesor_nombre}</p>
                    <p className="text-xs text-gray-500">{ev.detalle}</p>
                    {ev.departamento && <p className="text-xs text-gray-400">{ev.departamento}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal Registrar Ausencia */}
      {showModal && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-1">Registrar Ausencia</h3>
            <p className="text-sm text-gray-500 mb-4">
              📅 {fechaSeleccionada}
            </p>

            <form onSubmit={handleSaveAusencia} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profesor *</label>
                <select
                  required
                  value={formAusencia.profesor_id}
                  onChange={(e) => setFormAusencia({ ...formAusencia, profesor_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Seleccionar profesor...</option>
                  {data?.profesores
                    .filter((p) => p.activo !== false)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} {p.departamento ? `(${p.departamento})` : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de ausencia *</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tipo"
                      value="con_aviso"
                      checked={formAusencia.tipo === 'con_aviso'}
                      onChange={() => setFormAusencia({ ...formAusencia, tipo: 'con_aviso' })}
                      className="text-gray-600"
                    />
                    <span className="text-sm">Con aviso</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tipo"
                      value="sin_aviso"
                      checked={formAusencia.tipo === 'sin_aviso'}
                      onChange={() => setFormAusencia({ ...formAusencia, tipo: 'sin_aviso' })}
                      className="text-red-600"
                    />
                    <span className="text-sm text-red-600 font-medium">Sin aviso 🔴</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Justificación / Observación</label>
                <textarea
                  value={formAusencia.justificacion}
                  onChange={(e) => setFormAusencia({ ...formAusencia, justificacion: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Motivo de la ausencia (opcional)"
                />
              </div>

              {formAusencia.tipo === 'sin_aviso' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">
                    ⚠️ Esta ausencia se marcará como <strong>sin aviso</strong> y generará una alerta.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving || !formAusencia.profesor_id}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Registrar Ausencia'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}