'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, isSameMonth, isToday, isSameDay } from 'date-fns'
import {
  Calendar,
  HeartPulse,
  Bus,
  Handshake,
  Building2,
  Flag,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  UserCheck,
  Clock,
  Sun,
  Sunset,
  AlertCircle,
  MapPin,
  RefreshCw,
  Plus,
} from 'lucide-react'
import AppHeader from '@/components/AppHeader'

// ─── Calendar types ──────────────────────────────────────────────────

interface Profesor { id: string; nombre: string; email: string; departamento: string; telefono?: string }
interface LicenciaEvento { id: string; profesor_id: string; profesor_nombre: string; profesor_departamento: string; tipo: string; fecha_desde: string; fecha_hasta: string; motivo: string | null }
interface PermisoEvento { id: string; profesor_id: string; profesor_nombre: string; tipo: string; motivo: string | null }
interface AusenciaEvento { id: string; profesor_id: string; profesor_nombre: string; tipo: string; justificacion: string | null }
interface HitoEvento { id: string; titulo: string; tipo: string; descripcion: string | null; importante: boolean | null }
interface ReunionEvento { id: string; titulo: string; tipo: string; hora_inicio: string | null; lugar: string | null }
interface SalidaEvento { id: string; curso: string; destino: string; hora_salida: string | null; hora_regreso: string | null; objetivo_pedagogico: string | null }
interface DiaEventos { fecha: string; label: string; licencias: LicenciaEvento[]; permisos: PermisoEvento[]; ausencias: AusenciaEvento[]; hitos: HitoEvento[]; reuniones: ReunionEvento[]; salidas: SalidaEvento[] }
interface Reemplazo { id: string; profesor_ausente_id: string; profesor_reemplazante_id: string; profesor_ausente: { id: string; nombre: string; email: string; departamento: string } | null; profesor_reemplazante: { id: string; nombre: string; email: string; departamento: string } | null; horas_asignadas: number; fecha: string; estado: string; licencia_id: string | null; ausencia_id: string | null; licencia: { id: string; tipo: string; fecha_desde: string; fecha_hasta: string; motivo: string | null } | null }
interface SemanalResponse { semana_desde: string; semana_hasta: string; lunes: string; viernes: string; eventos: Record<string, DiaEventos>; profesores: Profesor[]; reemplazos: Reemplazo[]; reemplazos_activos: Reemplazo[]; resumen: { total_profesores: number; licencias: number; permisos: number; ausencias: number; salidas: number; reuniones: number } }

// ─── Calendar constants ─────────────────────────────────────────────

const EVENTO_CONFIG = {
  licencia: { border: 'border-l-red-500', bg: 'bg-red-50', hover: 'hover:bg-red-100', label: 'Licencias', dot: 'bg-red-500' },
  permiso: { border: 'border-l-orange-500', bg: 'bg-orange-50', hover: 'hover:bg-orange-100', label: 'Permisos', dot: 'bg-orange-500' },
  ausencia: { border: 'border-l-gray-400', bg: 'bg-gray-50', hover: 'hover:bg-gray-100', label: 'Ausencias', dot: 'bg-gray-400' },
  reunion: { border: 'border-l-blue-500', bg: 'bg-blue-50', hover: 'hover:bg-blue-100', label: 'Reuniones', dot: 'bg-blue-500' },
  salida: { border: 'border-l-green-500', bg: 'bg-green-50', hover: 'hover:bg-green-100', label: 'Salidas', dot: 'bg-green-500' },
  hito: { border: 'border-l-indigo-500', bg: 'bg-indigo-50', hover: 'hover:bg-indigo-100', label: 'Hitos PME', dot: 'bg-indigo-500' },
} as const

type EventGroupKey = keyof typeof EVENTO_CONFIG
const NOMBRE_DIA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'] as const

// ─── Helpers ────────────────────────────────────────────────────────

function getMonday(date: Date): Date {
  const d = new Date(date); d.setHours(0, 0, 0, 0)
  const day = d.getDay(); d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return d
}

function formatDate(date: Date): string { return date.toISOString().split('T')[0] }

function dayOfWeekIndex(date: Date): number {
  const d = date.getDay() // 0=Sun, 1=Mon ... 6=Sat
  return d === 0 ? 4 : d - 1 // Sun→4(Fri), Mon→0 ... Fri→4, Sat→4
}

function formatWeekRange(lunes: Date): string {
  const v = new Date(lunes); v.setDate(lunes.getDate() + 4)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }
  if (lunes.getMonth() === v.getMonth() && lunes.getFullYear() === v.getFullYear())
    return `${lunes.getDate()} al ${v.toLocaleDateString('es-CL', opts)}`
  return `${lunes.toLocaleDateString('es-CL', opts)} al ${v.toLocaleDateString('es-CL', opts)}`
}

function formatHora(h: string | null) { return h ? (h.length >= 5 ? h.substring(0, 5) : h) : '' }
function formatTipoPermiso(t: string) { return { dia_completo: 'Completo', medio_dia_AM: 'AM', medio_dia_PM: 'PM' }[t] || t }
function formatTipoLicencia(t: string) { return { medica: 'Médica', prenatal: 'Prenatal', postnatal: 'Postnatal', personal: 'Personal', estudio: 'Estudio' }[t] || t }
function pluralize(c: number, s: string, p?: string) { return c === 1 ? s : (p || `${s}s`) }

// ─── Calendar sub-components ────────────────────────────────────────

function EstadoBadge({ estado }: { estado: string }) {
  const cfg: Record<string, { bg: string; text: string; label: string }> = {
    pendiente: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pendiente' },
    confirmado: { bg: 'bg-green-50', text: 'text-green-700', label: 'Confirmado' },
    completado: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Completado' },
    cancelado: { bg: 'bg-surface-muted', text: 'text-ink-slate', label: 'Cancelado' },
  }
  const c = cfg[estado] || { bg: 'bg-surface-muted', text: 'text-ink-slate', label: estado }
  return <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${c.bg} ${c.text}`}>{c.label}</span>
}

function EventCardContent({ event, typeKey }: { event: any; typeKey: EventGroupKey }) {
  switch (typeKey) {
    case 'licencia':
      return <><span className="font-medium text-ink truncate">{event.profesor_nombre}</span><span className="text-ink-muted shrink-0">— {formatTipoLicencia(event.tipo)}</span></>
    case 'permiso':
      return <><span className="font-medium text-ink truncate">{event.profesor_nombre}</span><span className="text-ink-muted shrink-0">— {formatTipoPermiso(event.tipo)}</span></>
    case 'ausencia': {
      const sad = event.tipo === 'sin_aviso'
      return <><span className={`font-medium truncate ${sad ? 'text-error' : 'text-ink'}`}>{event.profesor_nombre}</span>{sad && <AlertTriangle className="w-3 h-3 text-error shrink-0" />}<span className={`shrink-0 ${sad ? 'text-error font-medium' : 'text-ink-muted'}`}>— {sad ? 'Sin aviso' : 'Con aviso'}</span></>
    }
    case 'reunion': {
      const ec = event.tipo === 'consejo'
      return <>{event.hora_inicio && <span className="font-mono text-xs text-ink-muted shrink-0">{formatHora(event.hora_inicio)}</span>}<span className={`font-medium truncate ${ec ? 'text-purple-700' : 'text-ink'}`}>{event.titulo}</span>{ec && <span className="text-purple-500 text-[10px] shrink-0">Consejo</span>}{event.lugar && <span className="text-ink-slate truncate shrink-0 flex items-center gap-0.5 ml-auto"><MapPin className="w-2.5 h-2.5" /> {event.lugar}</span>}</>
    }
    case 'salida':
      return <><span className="font-medium text-ink truncate">{event.curso}</span><span className="text-ink-muted truncate">→ {event.destino}</span>{event.hora_salida && <span className="text-ink-slate text-[10px] shrink-0">{formatHora(event.hora_salida)}</span>}</>
    case 'hito':
      return <>{event.importante && <AlertTriangle className="w-3 h-3 text-error shrink-0" />}<span className={`font-medium truncate ${event.importante ? 'text-error' : 'text-indigo-700'}`}>{event.titulo}</span><span className="text-ink-muted shrink-0">— {event.tipo}</span></>
    default:
      return <span className="truncate">{event.titulo || event.profesor_nombre || 'Evento'}</span>
  }
}

function ResumenCard({ label, count, color, bg, border }: { label: string; count: number; color: string; bg: string; border: string }) {
  return <div className={`rounded-lg ${bg} ${border} border p-2.5 text-center`}><p className={`text-lg font-bold leading-none ${color}`}>{count}</p><p className="text-[10px] text-ink-muted mt-0.5">{label}</p></div>
}

function SidebarSection({ title, icon, accentColor, headerBg, headerBorder, urgent, count, children }: { title: string; icon: React.ReactNode; accentColor: string; headerBg: string; headerBorder: string; urgent?: boolean; count?: number; children: React.ReactNode }) {
  return (
    <div className={`bg-surface rounded-xl border ${urgent ? 'border-amber-300' : 'border-border-light'}`}>
      <div className={`flex items-center justify-between px-3.5 py-2.5 border-b ${headerBg} ${headerBorder} ${urgent ? 'border-amber-300' : ''}`}>
        <div className={`flex items-center gap-2 text-sm font-semibold ${accentColor}`}>{icon}{title}</div>
        {count !== undefined && count > 0 && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${urgent ? 'bg-amber-200 text-amber-800' : 'bg-surface-muted text-ink-muted'}`}>{count}</span>}
      </div>
      <div className="p-3">{children}</div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-5">
      <div className="grid grid-cols-5 gap-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-surface rounded-xl border border-border-light min-h-[420px] animate-pulse">
            <div className="h-12 bg-surface-muted rounded-t-xl border-b border-border-light" />
            <div className="p-3 space-y-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="space-y-1.5">
                  <div className="h-3 w-16 bg-surface-muted rounded" />
                  <div className="h-8 bg-surface-warm rounded border border-border-light" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-surface rounded-xl border border-border-light animate-pulse">
            <div className="h-10 bg-surface-muted rounded-t-xl border-b border-border-light" />
            <div className="p-3 space-y-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-14 bg-surface-warm rounded-lg border border-border-light" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertCircle className="w-12 h-12 text-error mb-4" />
      <h3 className="text-lg font-semibold text-ink mb-1">Error al cargar datos</h3>
      <p className="text-sm text-ink-muted mb-6 max-w-md">{message}</p>
      <button onClick={onRetry} className="btn-primary"><RefreshCw className="w-4 h-4" /> Reintentar</button>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Calendar className="w-12 h-12 text-ink-slate mb-4" />
      <h3 className="text-lg font-semibold text-ink mb-1">Sin datos</h3>
      <p className="text-sm text-ink-muted">No se encontraron eventos para esta semana.</p>
    </div>
  )
}

// ─── Event type config ──────────────────────────────────────────────

const EVENT_TYPES = [
  { key: 'licencia', label: 'Licencia Médica', icon: HeartPulse, color: 'text-red-600', bg: 'bg-red-50', hover: 'hover:bg-red-100', border: 'border-red-200' },
  { key: 'permiso', label: 'Permiso', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50', hover: 'hover:bg-orange-100', border: 'border-orange-200' },
  { key: 'ausencia', label: 'Ausencia', icon: AlertCircle, color: 'text-gray-600', bg: 'bg-gray-50', hover: 'hover:bg-gray-100', border: 'border-gray-200' },
  { key: 'salida', label: 'Salida Pedagógica', icon: Bus, color: 'text-green-600', bg: 'bg-green-50', hover: 'hover:bg-green-100', border: 'border-green-200' },
  { key: 'reunion', label: 'Reunión', icon: Handshake, color: 'text-blue-600', bg: 'bg-blue-50', hover: 'hover:bg-blue-100', border: 'border-blue-200' },
  { key: 'consejo', label: 'Consejo', icon: Building2, color: 'text-purple-600', bg: 'bg-purple-50', hover: 'hover:bg-purple-100', border: 'border-purple-200' },
] as const

// ─── Day Modal ──────────────────────────────────────────────────────

function DayModal({ selectedDate, selectedEventType, onSelectType, onBack, profesores, saving, formAusencia, setFormAusencia, onSaveAusencia, formPermiso, setFormPermiso, onSavePermiso, formLicencia, setFormLicencia, onSaveLicencia, formSalida, setFormSalida, onSaveSalida, formReunion, setFormReunion, onSaveReunion, formConsejo, setFormConsejo, onSaveConsejo, onClose }: {
  selectedDate: string
  selectedEventType: string | null
  onSelectType: (t: string) => void
  onBack: () => void
  profesores: Profesor[]
  saving: boolean
  formAusencia: { profesor_id: string; tipo: string; justificacion: string }
  setFormAusencia: (f: any) => void
  onSaveAusencia: (e: React.FormEvent) => Promise<void>
  formPermiso: { profesor_id: string; tipo: string; motivo: string }
  setFormPermiso: (f: any) => void
  onSavePermiso: (e: React.FormEvent) => Promise<void>
  formLicencia: { profesor_id: string; tipo: string; fecha_desde: string; fecha_hasta: string; motivo: string }
  setFormLicencia: (f: any) => void
  onSaveLicencia: (e: React.FormEvent) => Promise<void>
  formSalida: { profesor_id: string; curso: string; destino: string; hora_salida: string; hora_regreso: string; objetivo: string }
  setFormSalida: (f: any) => void
  onSaveSalida: (e: React.FormEvent) => Promise<void>
  formReunion: { titulo: string; tipo: string; hora_inicio: string; lugar: string; participantes: string[] }
  setFormReunion: (f: any) => void
  onSaveReunion: (e: React.FormEvent) => Promise<void>
  formConsejo: { titulo: string; hora_inicio: string; lugar: string; temas: string }
  setFormConsejo: (f: any) => void
  onSaveConsejo: (e: React.FormEvent) => Promise<void>
  onClose: () => void
}) {
  const fechaLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
  const currentType = EVENT_TYPES.find(t => t.key === selectedEventType)
  const Icon = currentType?.icon

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            {selectedEventType && (
              <button onClick={onBack} className="p-1 rounded-lg hover:bg-surface-muted transition-colors" aria-label="Volver">
                <ChevronLeft className="w-4 h-4 text-ink-muted" />
              </button>
            )}
            <h3 className="text-lg font-display font-semibold text-ink">
              {selectedEventType ? (currentType?.label || 'Registrar') : 'Registrar Evento'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-muted transition-colors"><X className="w-4 h-4 text-ink-muted" /></button>
        </div>
        <p className="text-sm text-ink-muted mb-5 flex items-center gap-1.5"><Calendar className="w-4 h-4 text-ink-slate" /> {fechaLabel}</p>

        {/* ── Step 1: Type picker ── */}
        {!selectedEventType && (
          <div className="grid grid-cols-2 gap-2.5">
            {EVENT_TYPES.map((t) => {
              const TIcon = t.icon
              return (
                <button
                  key={t.key}
                  onClick={() => onSelectType(t.key)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-transparent ${t.bg} ${t.hover} transition-all hover:shadow-sm active:scale-[0.98]`}
                >
                  <div className={`p-2.5 rounded-full ${t.bg} ${t.color}`}>
                    <TIcon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs font-semibold text-center leading-tight ${t.color}`}>{t.label}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* ── Step 2: Forms ── */}

        {selectedEventType === 'ausencia' && (
          <form onSubmit={onSaveAusencia} className="space-y-4">
            <div><label className="block text-xs font-medium text-ink mb-1">Profesor *</label><select required value={formAusencia.profesor_id} onChange={(e) => setFormAusencia({ ...formAusencia, profesor_id: e.target.value })} className="input"><option value="">Seleccionar profesor...</option>{profesores.map((p) => <option key={p.id} value={p.id}>{p.nombre}{p.departamento ? ` (${p.departamento})` : ''}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-ink mb-2">Tipo *</label><div className="flex gap-4"><label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={formAusencia.tipo === 'con_aviso'} onChange={() => setFormAusencia({ ...formAusencia, tipo: 'con_aviso' })} className="text-ink-muted" /><span className="text-sm text-ink">Con aviso</span></label><label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={formAusencia.tipo === 'sin_aviso'} onChange={() => setFormAusencia({ ...formAusencia, tipo: 'sin_aviso' })} className="text-error" /><span className="text-sm text-error font-medium flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Sin aviso</span></label></div></div>
            <div><label className="block text-xs font-medium text-ink mb-1">Justificación</label><textarea value={formAusencia.justificacion} onChange={(e) => setFormAusencia({ ...formAusencia, justificacion: e.target.value })} rows={2} className="input" placeholder="Motivo (opcional)" /></div>
            {formAusencia.tipo === 'sin_aviso' && <div className="bg-red-50 border border-red-200 rounded-lg p-3"><p className="text-xs text-red-700 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Se marcará como <strong>sin aviso</strong> y generará alerta.</p></div>}
            <div className="flex gap-3 pt-1"><button type="submit" disabled={saving || !formAusencia.profesor_id} className="btn-primary flex-1 disabled:opacity-50">{saving ? 'Guardando...' : 'Registrar Ausencia'}</button><button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button></div>
          </form>
        )}

        {selectedEventType === 'permiso' && (
          <form onSubmit={onSavePermiso} className="space-y-4">
            <div><label className="block text-xs font-medium text-ink mb-1">Profesor *</label><select required value={formPermiso.profesor_id} onChange={(e) => setFormPermiso({ ...formPermiso, profesor_id: e.target.value })} className="input"><option value="">Seleccionar profesor...</option>{profesores.map((p) => <option key={p.id} value={p.id}>{p.nombre}{p.departamento ? ` (${p.departamento})` : ''}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-ink mb-2">Tipo de permiso *</label><div className="space-y-2"><label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={formPermiso.tipo === 'dia_completo'} onChange={() => setFormPermiso({ ...formPermiso, tipo: 'dia_completo' })} className="text-amber-600" /><span className="text-sm text-ink flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-ink-slate" /> Día completo</span></label><label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={formPermiso.tipo === 'medio_dia_AM'} onChange={() => setFormPermiso({ ...formPermiso, tipo: 'medio_dia_AM' })} className="text-amber-600" /><span className="text-sm text-ink flex items-center gap-1.5"><Sun className="w-3.5 h-3.5 text-ink-slate" /> Medio día AM (mañana)</span></label><label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={formPermiso.tipo === 'medio_dia_PM'} onChange={() => setFormPermiso({ ...formPermiso, tipo: 'medio_dia_PM' })} className="text-amber-600" /><span className="text-sm text-ink flex items-center gap-1.5"><Sunset className="w-3.5 h-3.5 text-ink-slate" /> Medio día PM (tarde)</span></label></div></div>
            <div><label className="block text-xs font-medium text-ink mb-1">Motivo</label><textarea value={formPermiso.motivo} onChange={(e) => setFormPermiso({ ...formPermiso, motivo: e.target.value })} rows={2} className="input" placeholder="Motivo del permiso (opcional)" /></div>
            <div className="flex gap-3 pt-1"><button type="submit" disabled={saving || !formPermiso.profesor_id} className="btn-primary flex-1 disabled:opacity-50">{saving ? 'Guardando...' : 'Registrar Permiso'}</button><button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button></div>
          </form>
        )}

        {selectedEventType === 'licencia' && (
          <form onSubmit={onSaveLicencia} className="space-y-4">
            <div><label className="block text-xs font-medium text-ink mb-1">Profesor *</label><select required value={formLicencia.profesor_id} onChange={(e) => setFormLicencia({ ...formLicencia, profesor_id: e.target.value })} className="input"><option value="">Seleccionar profesor...</option>{profesores.map((p) => <option key={p.id} value={p.id}>{p.nombre}{p.departamento ? ` (${p.departamento})` : ''}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-ink mb-1">Tipo de licencia *</label><select required value={formLicencia.tipo} onChange={(e) => setFormLicencia({ ...formLicencia, tipo: e.target.value })} className="input"><option value="medica">Médica</option><option value="prenatal">Prenatal</option><option value="postnatal">Postnatal</option><option value="personal">Personal</option><option value="estudio">Estudio</option></select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-ink mb-1">Desde *</label><input type="date" required value={formLicencia.fecha_desde} onChange={(e) => setFormLicencia({ ...formLicencia, fecha_desde: e.target.value })} className="input" /></div>
              <div><label className="block text-xs font-medium text-ink mb-1">Hasta *</label><input type="date" required value={formLicencia.fecha_hasta} onChange={(e) => setFormLicencia({ ...formLicencia, fecha_hasta: e.target.value })} className="input" /></div>
            </div>
            <div><label className="block text-xs font-medium text-ink mb-1">Motivo</label><textarea value={formLicencia.motivo} onChange={(e) => setFormLicencia({ ...formLicencia, motivo: e.target.value })} rows={2} className="input" placeholder="Motivo (opcional)" /></div>
            <div className="flex gap-3 pt-1"><button type="submit" disabled={saving || !formLicencia.profesor_id} className="btn-primary flex-1 disabled:opacity-50">{saving ? 'Guardando...' : 'Registrar Licencia'}</button><button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button></div>
          </form>
        )}

        {selectedEventType === 'salida' && (
          <form onSubmit={onSaveSalida} className="space-y-4">
            <div><label className="block text-xs font-medium text-ink mb-1">Profesor responsable</label><select value={formSalida.profesor_id} onChange={(e) => setFormSalida({ ...formSalida, profesor_id: e.target.value })} className="input"><option value="">Sin asignar</option>{profesores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-ink mb-1">Curso</label><input type="text" value={formSalida.curso} onChange={(e) => setFormSalida({ ...formSalida, curso: e.target.value })} className="input" placeholder="Ej: 3° Medio A" /></div>
            <div><label className="block text-xs font-medium text-ink mb-1">Destino *</label><input type="text" required value={formSalida.destino} onChange={(e) => setFormSalida({ ...formSalida, destino: e.target.value })} className="input" placeholder="Ej: Museo de Historia Natural" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-ink mb-1">Hora salida</label><input type="time" value={formSalida.hora_salida} onChange={(e) => setFormSalida({ ...formSalida, hora_salida: e.target.value })} className="input" /></div>
              <div><label className="block text-xs font-medium text-ink mb-1">Hora regreso</label><input type="time" value={formSalida.hora_regreso} onChange={(e) => setFormSalida({ ...formSalida, hora_regreso: e.target.value })} className="input" /></div>
            </div>
            <div><label className="block text-xs font-medium text-ink mb-1">Objetivo pedagógico</label><textarea value={formSalida.objetivo} onChange={(e) => setFormSalida({ ...formSalida, objetivo: e.target.value })} rows={2} className="input" placeholder="Objetivo (opcional)" /></div>
            <div className="flex gap-3 pt-1"><button type="submit" disabled={saving || !formSalida.destino} className="btn-primary flex-1 disabled:opacity-50">{saving ? 'Guardando...' : 'Registrar Salida'}</button><button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button></div>
          </form>
        )}

        {selectedEventType === 'reunion' && (
          <form onSubmit={onSaveReunion} className="space-y-4">
            <div><label className="block text-xs font-medium text-ink mb-1">Título *</label><input type="text" required value={formReunion.titulo} onChange={(e) => setFormReunion({ ...formReunion, titulo: e.target.value })} className="input" placeholder="Ej: Reunión de departamento" /></div>
            <div><label className="block text-xs font-medium text-ink mb-1">Tipo</label><select value={formReunion.tipo} onChange={(e) => setFormReunion({ ...formReunion, tipo: e.target.value })} className="input"><option value="general">General</option><option value="departamento">Departamento</option><option value="apoderados">Apoderados</option><option value="consejo">Consejo</option><option value="otro">Otro</option></select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-ink mb-1">Hora inicio</label><input type="time" value={formReunion.hora_inicio} onChange={(e) => setFormReunion({ ...formReunion, hora_inicio: e.target.value })} className="input" /></div>
              <div><label className="block text-xs font-medium text-ink mb-1">Lugar</label><input type="text" value={formReunion.lugar} onChange={(e) => setFormReunion({ ...formReunion, lugar: e.target.value })} className="input" placeholder="Sala / link" /></div>
            </div>
            <div className="flex gap-3 pt-1"><button type="submit" disabled={saving || !formReunion.titulo} className="btn-primary flex-1 disabled:opacity-50">{saving ? 'Guardando...' : 'Programar Reunión'}</button><button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button></div>
          </form>
        )}

        {selectedEventType === 'consejo' && (
          <form onSubmit={onSaveConsejo} className="space-y-4">
            <div><label className="block text-xs font-medium text-ink mb-1">Título</label><input type="text" value={formConsejo.titulo} onChange={(e) => setFormConsejo({ ...formConsejo, titulo: e.target.value })} className="input" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-ink mb-1">Hora inicio</label><input type="time" value={formConsejo.hora_inicio} onChange={(e) => setFormConsejo({ ...formConsejo, hora_inicio: e.target.value })} className="input" /></div>
              <div><label className="block text-xs font-medium text-ink mb-1">Lugar</label><input type="text" value={formConsejo.lugar} onChange={(e) => setFormConsejo({ ...formConsejo, lugar: e.target.value })} className="input" placeholder="Sala / link" /></div>
            </div>
            <div><label className="block text-xs font-medium text-ink mb-1">Temas a tratar</label><textarea value={formConsejo.temas} onChange={(e) => setFormConsejo({ ...formConsejo, temas: e.target.value })} rows={3} className="input" placeholder="Orden del día..." /></div>
            <div className="flex gap-3 pt-1"><button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-50">{saving ? 'Guardando...' : 'Convocar Consejo'}</button><button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button></div>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── Mini Calendar Component ─────────────────────────────────────────

function MiniCalendar({
  eventos,
  currentWeekMonday,
  visibleTypes,
  onSelectDay,
}: {
  eventos: Record<string, DiaEventos>
  currentWeekMonday: Date
  visibleTypes: Record<string, boolean>
  onSelectDay: (date: Date) => void
}) {
  const today = new Date()
  const [viewMonth, setViewMonth] = useState(() => new Date(currentWeekMonday))

  // Sync mini calendar month when main calendar navigates weeks
  useEffect(() => {
    setViewMonth(new Date(currentWeekMonday))
  }, [currentWeekMonday])

  const monthStart = startOfMonth(viewMonth)
  const monthEnd = endOfMonth(viewMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const allDays = eachDayOfInterval({ start: calStart, end: calEnd })

  const weeks: Date[][] = []
  for (let i = 0; i < allDays.length; i += 7) weeks.push(allDays.slice(i, i + 7))

  const monthLabel = viewMonth.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
  const dayHeaders = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

  // Pre-compute colored dots per date from event types
  const dotsByDate = useMemo(() => {
    const map: Record<string, string[]> = {}
    const TYPE_DOT_MAP: [EventGroupKey, keyof DiaEventos, string][] = [
      ['licencia', 'licencias', 'bg-red-500'],
      ['permiso', 'permisos', 'bg-orange-500'],
      ['ausencia', 'ausencias', 'bg-gray-400'],
      ['reunion', 'reuniones', 'bg-blue-500'],
      ['salida', 'salidas', 'bg-green-500'],
      ['hito', 'hitos', 'bg-indigo-500'],
    ]
    for (const dateStr in eventos) {
      const dia = eventos[dateStr]
      const dots: string[] = []
      for (const [typeKey, diaKey, cls] of TYPE_DOT_MAP) {
        if (visibleTypes[typeKey] && (dia?.[diaKey] as any[])?.length > 0) dots.push(cls)
      }
      if (dots.length > 0) map[dateStr] = dots
    }
    return map
  }, [eventos, visibleTypes])

  const isInCurrentWeek = (date: Date) => {
    const m = getMonday(date)
    return formatDate(m) === formatDate(currentWeekMonday)
  }

  return (
    <div className="bg-surface rounded-xl border border-border-light p-3">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-2.5">
        <button onClick={() => setViewMonth(subMonths(viewMonth, 1))} className="p-1 rounded-md hover:bg-surface-muted transition-colors" aria-label="Mes anterior">
          <ChevronLeft className="w-4 h-4 text-ink-muted" />
        </button>
        <span className="text-sm font-semibold text-ink capitalize">{monthLabel}</span>
        <button onClick={() => setViewMonth(addMonths(viewMonth, 1))} className="p-1 rounded-md hover:bg-surface-muted transition-colors" aria-label="Mes siguiente">
          <ChevronRight className="w-4 h-4 text-ink-muted" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {dayHeaders.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-semibold text-ink-slate uppercase tracking-wider py-1">{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="space-y-0.5">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((day) => {
              const dateStr = formatDate(day)
              const isCurrentMonth = isSameMonth(day, viewMonth)
              const dayIsToday = isToday(day)
              const inWeek = isInCurrentWeek(day)
              const dots = dotsByDate[dateStr]
              return (
                <button
                  key={dateStr}
                  onClick={() => onSelectDay(day)}
                  className={`relative flex flex-col items-center justify-center rounded-lg transition-all py-1
                    ${isCurrentMonth ? 'text-ink' : 'text-ink-slate/40'}
                    ${dayIsToday ? '' : ''}
                    ${inWeek ? 'bg-primary-accent/10 ring-1 ring-primary-accent/30' : 'hover:bg-surface-muted'}
                  `}
                  style={{ minHeight: '32px' }}
                  aria-label={day.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
                >
                  <span className={`text-xs leading-none ${dayIsToday ? 'text-primary-accent font-bold' : 'font-medium'}`}>
                    {day.getDate()}
                  </span>
                  {dots && dots.length > 0 && (
                    <div className="flex items-center gap-[2px] mt-[3px]" style={{ minHeight: '4px' }}>
                      {dots.slice(0, 4).map((cls, di) => (
                        <span key={di} className={`w-1 h-1 rounded-full ${cls}`} />
                      ))}
                      {dots.length > 4 && <span className="text-[6px] text-ink-slate font-semibold leading-none">+{dots.length - 4}</span>}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────

export default function DashboardPage() {
  // Calendar state
  const [weekMonday, setWeekMonday] = useState(() => getMonday(new Date()))
  const [data, setData] = useState<SemanalResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [departamentoFilter, setDepartamentoFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedEventType, setSelectedEventType] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [mobileDayIdx, setMobileDayIdx] = useState(0)
  const miniCalendarNav = useRef(false)
  const allTypeKeys = Object.keys(EVENTO_CONFIG) as EventGroupKey[]
  const [visibleTypes, setVisibleTypes] = useState<Record<string, boolean>>(
    () => Object.fromEntries(allTypeKeys.map(k => [k, true]))
  )
  const toggleType = (key: EventGroupKey) => setVisibleTypes(prev => ({ ...prev, [key]: !prev[key] }))
  const [formAusencia, setFormAusencia] = useState({ profesor_id: '', tipo: 'con_aviso' as 'con_aviso' | 'sin_aviso', justificacion: '' })
  const [formPermiso, setFormPermiso] = useState({ profesor_id: '', tipo: 'dia_completo' as 'dia_completo' | 'medio_dia_AM' | 'medio_dia_PM', motivo: '' })
  const [formLicencia, setFormLicencia] = useState({ profesor_id: '', tipo: 'medica' as string, fecha_desde: '', fecha_hasta: '', motivo: '' })
  const [formSalida, setFormSalida] = useState({ profesor_id: '', curso: '', destino: '', hora_salida: '09:00', hora_regreso: '13:00', objetivo: '' })
  const [formReunion, setFormReunion] = useState({ titulo: '', tipo: 'general' as string, hora_inicio: '09:00', lugar: '', participantes: [] as string[] })
  const [formConsejo, setFormConsejo] = useState({ titulo: 'Consejo de Profesores', hora_inicio: '09:00', lugar: '', temas: '' })

  // ── Calendar fetching ──

  const fetchSemanal = useCallback(async (monday: Date) => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/semanal?fecha=${formatDate(monday)}`)
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `Error ${res.status}`) }
      setData(await res.json())
    } catch (err: any) { setError(err.message) } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchSemanal(weekMonday) }, [weekMonday, fetchSemanal])

  // Reset mobile day when week changes (unless mini calendar triggered the nav)
  useEffect(() => {
    if (miniCalendarNav.current) { miniCalendarNav.current = false; return }
    const todayStr = formatDate(new Date())
    const todayIdx = diasSemana.findIndex(d => d.dateStr === todayStr)
    setMobileDayIdx(todayIdx >= 0 ? todayIdx : 0)
  }, [weekMonday]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Calendar navigation ──

  const prevWeek = () => { const p = new Date(weekMonday); p.setDate(p.getDate() - 7); setWeekMonday(p) }
  const nextWeek = () => { const n = new Date(weekMonday); n.setDate(n.getDate() + 7); setWeekMonday(n) }
  const goToday = () => { setMobileDayIdx(dayOfWeekIndex(new Date())); setWeekMonday(getMonday(new Date())) }
  const isCurrentWeek = useMemo(() => formatDate(getMonday(new Date())) === formatDate(weekMonday), [weekMonday])

  // ── Calendar derived data ──

  const diasSemana = useMemo(() => Array.from({ length: 5 }, (_, i) => { const d = new Date(weekMonday); d.setDate(weekMonday.getDate() + i); return { date: d, dateStr: formatDate(d), label: NOMBRE_DIA[i] } }), [weekMonday])
  const departamentos = useMemo(() => data ? [...new Set(data.profesores.map(p => p.departamento).filter(Boolean))].sort() as string[] : [], [data])
  const reemplazosActivos = useMemo(() => data?.reemplazos_activos || [], [data])
  const licenciasSinCubrir = useMemo(() => {
    if (!data) return []
    const map = new Map<string, LicenciaEvento>()
    Object.values(data.eventos).forEach((dia: any) => dia.licencias.forEach((l: LicenciaEvento) => map.set(l.id, l)))
    const cubiertas = new Set(data.reemplazos.filter(r => (r.estado === 'pendiente' || r.estado === 'confirmado') && r.licencia_id).map(r => r.licencia_id))
    return [...map.values()].filter(l => !cubiertas.has(l.id))
  }, [data])

  const TYPE_TO_DIA_KEY: Record<string, keyof DiaEventos> = {
    licencia: 'licencias',
    permiso: 'permisos',
    ausencia: 'ausencias',
    reunion: 'reuniones',
    salida: 'salidas',
    hito: 'hitos',
  }
  const filteredResumen = useMemo(() => {
    const counts: Record<string, number> = { licencias: 0, permisos: 0, ausencias: 0, reuniones: 0, salidas: 0, hitos: 0 }
    Object.values(data?.eventos || {}).forEach((dia: any) => {
      allTypeKeys.forEach((typeKey) => {
        const diaKey = TYPE_TO_DIA_KEY[typeKey]
        if (visibleTypes[typeKey] && dia?.[diaKey]) counts[diaKey] += dia[diaKey].length
      })
    })
    return counts
  }, [data, visibleTypes])

  // ── Calendar modal handlers ──

  const openModal = (fecha: string) => {
    setSelectedDate(fecha)
    setSelectedEventType(null)
    setFormAusencia({ profesor_id: '', tipo: 'con_aviso', justificacion: '' })
    setFormPermiso({ profesor_id: '', tipo: 'dia_completo', motivo: '' })
    setFormLicencia({ profesor_id: '', tipo: 'medica', fecha_desde: fecha, fecha_hasta: fecha, motivo: '' })
    setFormSalida({ profesor_id: '', curso: '', destino: '', hora_salida: '09:00', hora_regreso: '13:00', objetivo: '' })
    setFormReunion({ titulo: '', tipo: 'general', hora_inicio: '09:00', lugar: '', participantes: [] })
    setFormConsejo({ titulo: 'Consejo de Profesores', hora_inicio: '09:00', lugar: '', temas: '' })
    setShowModal(true)
  }
  const handleSaveAusencia = async (e: React.FormEvent) => { e.preventDefault(); if (!formAusencia.profesor_id || !selectedDate) return; setSaving(true); try { const res = await fetch('/api/ausencias', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profesor_id: formAusencia.profesor_id, fecha: selectedDate, tipo: formAusencia.tipo, justificacion: formAusencia.justificacion || null }) }); const j = await res.json(); if (!res.ok) { alert(j.error || 'Error'); return }; setShowModal(false); fetchSemanal(weekMonday) } catch { alert('Error') } finally { setSaving(false) } }
  const handleSavePermiso = async (e: React.FormEvent) => { e.preventDefault(); if (!formPermiso.profesor_id || !selectedDate) return; setSaving(true); try { const res = await fetch('/api/permisos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profesor_id: formPermiso.profesor_id, fecha: selectedDate, tipo: formPermiso.tipo, motivo: formPermiso.motivo || null }) }); const j = await res.json(); if (!res.ok) { alert(j.error || 'Error'); return }; setShowModal(false); fetchSemanal(weekMonday) } catch { alert('Error') } finally { setSaving(false) } }

  const handleSaveLicencia = async (e: React.FormEvent) => { e.preventDefault(); if (!formLicencia.profesor_id || !selectedDate) return; setSaving(true); try { const res = await fetch('/api/licencias', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...formLicencia, fecha_desde: formLicencia.fecha_desde || selectedDate, fecha_hasta: formLicencia.fecha_hasta || selectedDate, motivo: formLicencia.motivo || null }) }); const j = await res.json(); if (!res.ok) { alert(j.error || 'Error'); return }; setShowModal(false); fetchSemanal(weekMonday) } catch { alert('Error') } finally { setSaving(false) } }

  const handleSaveSalida = async (e: React.FormEvent) => { e.preventDefault(); if (!formSalida.destino || !selectedDate) return; setSaving(true); try { const profesor_id = formSalida.profesor_id || null; const res = await fetch('/api/salidas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...formSalida, profesor_id, fecha: selectedDate, hora_salida: formSalida.hora_salida || null, hora_regreso: formSalida.hora_regreso || null, objetivo_pedagogico: formSalida.objetivo || null }) }); const j = await res.json(); if (!res.ok) { alert(j.error || 'Error'); return }; setShowModal(false); fetchSemanal(weekMonday) } catch { alert('Error') } finally { setSaving(false) } }

  const handleSaveReunion = async (e: React.FormEvent) => { e.preventDefault(); if (!formReunion.titulo || !selectedDate) return; setSaving(true); try { const res = await fetch('/api/reuniones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...formReunion, fecha: selectedDate, lugar: formReunion.lugar || null, hora_inicio: formReunion.hora_inicio || null }) }); const j = await res.json(); if (!res.ok) { alert(j.error || 'Error'); return }; setShowModal(false); fetchSemanal(weekMonday) } catch { alert('Error') } finally { setSaving(false) } }

  const handleSaveConsejo = async (e: React.FormEvent) => { e.preventDefault(); if (!selectedDate) return; setSaving(true); try { const res = await fetch('/api/consejo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...formConsejo, fecha: selectedDate, lugar: formConsejo.lugar || null, temas_a_tratar: formConsejo.temas || null }) }); const j = await res.json(); if (!res.ok) { alert(j.error || 'Error'); return }; setShowModal(false); fetchSemanal(weekMonday) } catch { alert('Error') } finally { setSaving(false) } }

  // ── Calendar event renderer ──

  const renderEventGroup = (events: any[], typeKey: EventGroupKey, label: string) => {
    if (!events || events.length === 0) return null
    if (!visibleTypes[typeKey]) return null
    let filtered = events
    if (departamentoFilter && ['licencia', 'permiso', 'ausencia'].includes(typeKey)) filtered = events.filter((e: any) => e.profesor_departamento === departamentoFilter)
    if (filtered.length === 0) return null
    const cfg = EVENTO_CONFIG[typeKey]
    return (
      <div>
        <div className="flex items-center gap-1 mb-1 px-0.5"><span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} /><span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">{label}</span><span className="text-[10px] text-ink-slate font-medium">({filtered.length})</span></div>
        <div className="space-y-1">{filtered.map((ev: any) => (
          <div key={ev.id || Math.random()} className={`border-l-[3px] ${cfg.border} ${cfg.bg} ${cfg.hover} px-2 py-1.5 rounded-r text-xs cursor-default transition-colors`}>
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap"><EventCardContent event={ev} typeKey={typeKey} /></div>
            {(ev.motivo || (typeKey === 'ausencia' && ev.justificacion)) && <p className="text-[10px] text-ink-slate mt-0.5 truncate leading-tight">{ev.motivo || ev.justificacion}</p>}
          </div>
        ))}</div>
      </div>
    )
  }

  const totalEventCount = (dia: DiaEventos | undefined) => {
    if (!dia) return 0
    const map: [EventGroupKey, keyof DiaEventos][] = [
      ['licencia', 'licencias'],
      ['permiso', 'permisos'],
      ['ausencia', 'ausencias'],
      ['reunion', 'reuniones'],
      ['salida', 'salidas'],
      ['hito', 'hitos'],
    ]
    return map.reduce((sum, [typeKey, diaKey]) => sum + (visibleTypes[typeKey] ? (dia[diaKey] as any[])?.length || 0 : 0), 0)
  }

  return (
    <div className="min-h-screen bg-surface">
      <AppHeader />

      {/* ═══ Calendar Main ═══ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex items-center gap-1.5 bg-surface border border-border-light rounded-lg px-3 py-1.5">
            <Calendar className="w-4 h-4 text-ink-slate" />
            <span className="text-sm font-semibold text-ink whitespace-nowrap">{formatWeekRange(weekMonday)}</span>
            {data && <span className="text-[11px] text-ink-slate ml-1 hidden sm:inline">— {data.resumen.total_profesores} {pluralize(data.resumen.total_profesores, 'profesor', 'profesores')}</span>}
          </div>
          {!isCurrentWeek && <button onClick={goToday} className="btn-primary text-xs !px-3 !py-1.5">Volver a hoy</button>}
          <div className="flex items-center bg-surface border border-border-light rounded-lg overflow-hidden">
            <button onClick={prevWeek} className="p-2 hover:bg-surface-muted transition-colors border-r border-border-light" aria-label="Semana anterior"><ChevronLeft className="w-4 h-4 text-ink" /></button>
            <span className="px-3 text-xs font-medium text-ink-muted select-none">{isCurrentWeek ? 'Esta semana' : `Sem ${weekMonday.toLocaleDateString('es-CL', { day: 'numeric' })}`}</span>
            <button onClick={nextWeek} className="p-2 hover:bg-surface-muted transition-colors border-l border-border-light" aria-label="Semana siguiente"><ChevronRight className="w-4 h-4 text-ink" /></button>
          </div>
          <select value={departamentoFilter} onChange={(e) => setDepartamentoFilter(e.target.value)} className="input !py-1.5 !px-2.5 text-xs max-w-[180px]">
            <option value="">Todos los deptos.</option>
            {departamentos.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* ── Filter toggles (click legend to show/hide types) ── */}
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 mb-5 px-0.5">
          {(Object.entries(EVENTO_CONFIG) as [EventGroupKey, typeof EVENTO_CONFIG[EventGroupKey]][]).map(([key, cfg]) => {
            const visible = visibleTypes[key]
            return (
              <button
                key={key}
                onClick={() => toggleType(key)}
                className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-all cursor-pointer
                  ${visible
                    ? 'bg-surface border-border-light text-ink-muted hover:border-rule hover:text-ink'
                    : 'bg-surface-muted/50 border-border-light/50 text-ink-slate/50 line-through hover:bg-surface-muted hover:text-ink-slate'
                  }
                `}
                aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${cfg.label}`}
              >
                <span className={`w-2 h-2 rounded-full ${cfg.dot} ${visible ? '' : 'opacity-30'}`} />
                {cfg.label}
              </button>
            )
          })}
        </div>

        {/* ── Content ── */}
        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={() => fetchSemanal(weekMonday)} />
        ) : !data ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-5">
            {/* ── Mobile day tabs ── */}
            <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 sm:hidden scrollbar-thin">
              {diasSemana.map(({ date, dateStr, label }, idx) => {
                const dia = data.eventos[dateStr]
                const total = totalEventCount(dia)
                const todayStr = formatDate(new Date())
                const isToday = todayStr === dateStr
                const isActive = idx === mobileDayIdx
                return (
                  <button
                    key={dateStr}
                    onClick={() => setMobileDayIdx(idx)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold whitespace-nowrap transition-all shrink-0
                      ${isActive
                        ? 'bg-surface border-rule text-ink shadow-sm'
                        : 'bg-surface-muted/60 border-border-light text-ink-muted hover:bg-surface-muted'
                      }
                      ${isToday ? 'ring-1 ring-info' : ''}
                    `}
                  >
                    <span>{label}</span>
                    <span className={`font-bold ${isActive ? 'text-ink' : 'text-ink-muted'}`}>{date.getDate()}</span>
                    {total > 0 && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-surface-muted text-ink-muted' : 'bg-surface text-ink-slate'}`}>
                        {total}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* LEFT: Calendar grid — single day on mobile, 5 cols on desktop */}
            <div data-calendar-grid className="sm:grid sm:grid-cols-5 sm:gap-2.5 min-h-0">
              {diasSemana.map(({ date, dateStr, label }, idx) => {
                const dia = data.eventos[dateStr]
                const total = totalEventCount(dia)
                const todayStr = formatDate(new Date())
                const isToday = todayStr === dateStr
                const dayNum = date.getDate()
                const isVisible = idx === mobileDayIdx
                return (
                  <div
                    key={dateStr}
                    data-day-column
                    onClick={() => openModal(dateStr)}
                    className={`
                      bg-surface rounded-xl border flex flex-col min-h-[420px] transition-all cursor-pointer
                      ${isToday ? 'ring-2 ring-info border-info/60' : 'border-border-light'}
                      ${isVisible ? 'flex sm:flex' : 'hidden sm:flex'}
                    `}
                  >
                    <div className={`flex items-center justify-between px-3 py-2.5 border-b rounded-t-xl w-full text-left transition-colors ${isToday ? 'bg-blue-50 border-info/60' : 'bg-surface-muted/60 border-border-light'}`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold uppercase tracking-wider ${isToday ? 'text-info' : 'text-ink-muted'}`}>{label}</span>
                        <span className={`text-lg font-bold leading-none ${isToday ? 'text-info' : 'text-ink'}`}>{dayNum}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {total > 0 && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${isToday ? 'bg-blue-200 text-blue-800' : 'bg-surface-muted text-ink-muted'}`}>{total}</span>}
                        <Plus className="w-3 h-3 text-ink-slate" />
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-3 scrollbar-thin">
                      {total === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center px-2">
                          <p className="text-xs text-ink-slate font-medium">Sin eventos</p>
                          <p className="text-[10px] text-ink-slate/50 mt-0.5">Toca para registrar</p>
                        </div>
                      ) : (
                        <>
                          {renderEventGroup(dia?.licencias, 'licencia', 'Licencias')}
                          {renderEventGroup(dia?.permisos, 'permiso', 'Permisos')}
                          {renderEventGroup(dia?.ausencias, 'ausencia', 'Ausencias')}
                          {renderEventGroup(dia?.reuniones, 'reunion', 'Reuniones')}
                          {renderEventGroup(dia?.salidas, 'salida', 'Salidas')}
                          {renderEventGroup(dia?.hitos, 'hito', 'Hitos')}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* RIGHT: Sidebar */}
            <div className="space-y-4 lg:sticky lg:top-5 lg:self-start">
              <MiniCalendar
                eventos={data.eventos}
                currentWeekMonday={weekMonday}
                visibleTypes={visibleTypes}
                onSelectDay={(day) => {
                  const idx = dayOfWeekIndex(day)
                  miniCalendarNav.current = true
                  setMobileDayIdx(idx)
                  setWeekMonday(getMonday(day))
                  requestAnimationFrame(() => {
                    const grid = document.querySelector('[data-calendar-grid]')
                    if (grid) {
                      grid.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                      // Highlight the target day column briefly
                      const cols = grid.querySelectorAll('[data-day-column]')
                      const target = cols[idx]
                      if (target) {
                        target.classList.add('ring-2', 'ring-primary-accent/40', 'animate-[highlight-pulse_800ms_ease-out]')
                        setTimeout(() => {
                          target.classList.remove('ring-2', 'ring-primary-accent/40', 'animate-[highlight-pulse_800ms_ease-out]')
                        }, 1000)
                      }
                    }
                  })
                }}
              />
              <div className="grid grid-cols-3 gap-2">
                <ResumenCard label="Licencias" count={filteredResumen.licencias} color="text-red-600" bg="bg-red-50" border="border-red-200" />
                <ResumenCard label="Permisos" count={filteredResumen.permisos} color="text-orange-600" bg="bg-orange-50" border="border-orange-200" />
                <ResumenCard label="Ausencias" count={filteredResumen.ausencias} color="text-ink-muted" bg="bg-surface-muted" border="border-border-light" />
                <ResumenCard label="Reuniones" count={filteredResumen.reuniones} color="text-blue-600" bg="bg-blue-50" border="border-blue-200" />
                <ResumenCard label="Salidas" count={filteredResumen.salidas} color="text-green-600" bg="bg-green-50" border="border-green-200" />
                <ResumenCard label="Profesores" count={data.resumen.total_profesores} color="text-ink" bg="bg-surface-muted" border="border-border-light" />
              </div>

              <SidebarSection title="Reemplazos activos" icon={<UserCheck className="w-4 h-4" />} accentColor="text-emerald-700" headerBg="bg-emerald-50" headerBorder="border-emerald-200" count={reemplazosActivos.length}>
                {reemplazosActivos.length === 0 ? (
                  <p className="text-sm text-ink-slate py-6 text-center">Sin reemplazos activos</p>
                ) : (
                  <div className="space-y-2">
                    {reemplazosActivos.map((r) => {
                      const rn = r.profesor_reemplazante?.nombre?.split(' ')[0] || '?'
                      const an = r.profesor_ausente?.nombre?.split(' ')[0] || '?'
                      return (
                        <div key={r.id} className="bg-surface rounded-lg border border-border-light p-2.5 text-xs space-y-1.5 hover:border-rule transition-colors">
                          <div className="flex items-center justify-between gap-2"><span className="font-medium text-ink truncate">{r.profesor_ausente?.nombre || 'Profesor eliminado'}</span><EstadoBadge estado={r.estado} /></div>
                          <div className="flex items-center gap-1.5 text-ink-muted"><Users className="w-3 h-3 text-ink-slate" /><span className="text-ink font-medium">{rn}</span><ChevronRight className="w-2.5 h-2.5 text-ink-slate" /><span className="text-ink font-medium">{an}</span></div>
                          <div className="flex items-center gap-3 text-[10px] text-ink-slate"><span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric' })}</span><span className="flex items-center gap-1"><Clock className="w-3 h-3" />{r.horas_asignadas}h</span></div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </SidebarSection>

              <SidebarSection title="Alertas" icon={<AlertTriangle className="w-4 h-4" />} accentColor="text-amber-700" headerBg="bg-amber-50" headerBorder="border-amber-200" count={licenciasSinCubrir.length} urgent={licenciasSinCubrir.length > 0}>
                {licenciasSinCubrir.length === 0 ? (
                  <p className="text-sm text-ink-slate py-6 text-center">Sin alertas pendientes</p>
                ) : (
                  <div className="space-y-2">
                    {licenciasSinCubrir.map((lic) => (
                      <div key={lic.id} className="bg-surface rounded-lg border border-amber-200 p-2.5 text-xs space-y-1 hover:border-amber-300 transition-colors">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-ink truncate">{lic.profesor_nombre}</p>
                            <p className="text-[10px] text-ink-muted">{formatTipoLicencia(lic.tipo)}</p>
                            <p className="text-[10px] text-ink-slate mt-0.5">
                              {new Date(lic.fecha_desde + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                              {' → '}
                              {new Date(lic.fecha_hasta + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SidebarSection>
            </div>
          </div>
        )}
      </main>

      {/* ═══ Modal — Event Center ═══ */}
      {showModal && selectedDate && (
        <DayModal
          selectedDate={selectedDate}
          selectedEventType={selectedEventType}
          onSelectType={setSelectedEventType}
          onBack={() => setSelectedEventType(null)}
          profesores={data?.profesores || []}
          saving={saving}
          formAusencia={formAusencia} setFormAusencia={setFormAusencia} onSaveAusencia={handleSaveAusencia}
          formPermiso={formPermiso} setFormPermiso={setFormPermiso} onSavePermiso={handleSavePermiso}
          formLicencia={formLicencia} setFormLicencia={setFormLicencia} onSaveLicencia={handleSaveLicencia}
          formSalida={formSalida} setFormSalida={setFormSalida} onSaveSalida={handleSaveSalida}
          formReunion={formReunion} setFormReunion={setFormReunion} onSaveReunion={handleSaveReunion}
          formConsejo={formConsejo} setFormConsejo={setFormConsejo} onSaveConsejo={handleSaveConsejo}
          onClose={() => setShowModal(false)}
        />
      )}


    </div>
  )
}
