'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import AppHeader from '@/components/AppHeader'
import { FileText, FileSpreadsheet, Loader2, Download, BarChart3, CheckCircle2, XCircle } from 'lucide-react'

interface ParsedRow {
  nombre: string
  email: string
  telefono: string
  departamento: string
  cursos_asignados: string
}

interface ImportResult {
  importados: number
  errores: number
  detalle: Array<{ fila: number; nombre: string; estado: 'ok' | 'error'; mensaje?: string }>
}

export default function ImportarPage() {
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseCSV = useCallback((text: string) => {
    const lines = text.split('\n').filter((l) => l.trim())
    if (lines.length < 2) return

    const csvHeaders = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
    setHeaders(csvHeaders)

    const rows: ParsedRow[] = []
    for (let i = 1; i < Math.min(lines.length, 100); i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
      rows.push({
        nombre: values[0] || '',
        email: values[1] || '',
        telefono: values[2] || '',
        departamento: values[3] || '',
        cursos_asignados: values[4] || '',
      })
    }
    setParsedData(rows)
  }, [])

  const handleFile = useCallback((f: File) => {
    setFile(f)
    setResult(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      parseCSV(text)
    }
    reader.readAsText(f)
  }, [parseCSV])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0])
  }, [handleFile])

  const handleImport = async () => {
    if (parsedData.length === 0) return
    setImporting(true)

    try {
      const res = await fetch('/api/profesores/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parsedData }),
      })
      const json = await res.json()
      setResult(json)
    } catch { alert('Error al importar') } finally { setImporting(false) }
  }

  const reset = () => {
    setFile(null)
    setParsedData([])
    setHeaders([])
    setResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="min-h-screen bg-surface">
      <AppHeader />

      {/* ═══ Main ═══ */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-display font-semibold tracking-tight text-ink">Importar Profesores desde CSV</h2>
          <p className="text-sm text-ink-muted mt-0.5">Cargá un archivo CSV con los datos de tus profesores</p>
        </div>

        {/* Formato esperado */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="font-medium text-blue-800 text-sm mb-2 flex items-center gap-1.5"><FileText className="w-4 h-4" /> Formato esperado del CSV:</p>
          <code className="text-xs text-blue-700 block leading-relaxed">
            nombre,email,telefono,departamento,cursos<br />
            María González,m.gonzalez@colegio.edu,+569 1234 5678,Matemática,"MAT101, MAT202"
          </code>
        </div>

        {/* Drop Zone */}
        {!result && (
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
              dragActive ? 'border-primary-accent bg-surface-muted' : 'border-rule hover:border-primary-accent'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-ink-slate" />
            <p className="text-ink font-medium">
              {file ? `Archivo: ${file.name}` : 'Arrastrá tu archivo CSV aquí'}
            </p>
            <p className="text-sm text-ink-muted mt-1">o hacé click para seleccionar</p>
          </div>
        )}

        {/* Preview */}
        {parsedData.length > 0 && !result && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-ink">
                Preview — {parsedData.length} fila{parsedData.length > 1 ? 's' : ''}
              </h3>
              <button onClick={reset} className="btn-secondary text-sm">Cambiar archivo</button>
            </div>

            <div className="card overflow-x-auto !p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-light">
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">#</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">Nombre</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">Email</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">Teléfono</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">Departamento</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">Cursos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {parsedData.slice(0, 5).map((row, i) => (
                    <tr key={i} className="hover:bg-surface-muted transition-colors">
                      <td className="px-3 py-2.5 text-ink-slate">{i + 1}</td>
                      <td className="px-3 py-2.5 font-medium text-ink">{row.nombre || <span className="text-error">—</span>}</td>
                      <td className="px-3 py-2.5 text-ink">{row.email || <span className="text-error">—</span>}</td>
                      <td className="px-3 py-2.5 text-ink-muted">{row.telefono || '—'}</td>
                      <td className="px-3 py-2.5 text-ink-muted">{row.departamento || '—'}</td>
                      <td className="px-3 py-2.5 text-ink-muted">{row.cursos_asignados || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedData.length > 5 && (
                <p className="text-sm text-ink-slate text-center py-2 border-t border-rule">... y {parsedData.length - 5} filas más</p>
              )}
            </div>

            <button onClick={handleImport} disabled={importing}
              className="btn-primary w-full mt-4 py-3 text-base justify-center">
              {importing ? <>
                <Loader2 className="w-5 h-5 animate-spin" /> Importando...
              </> : <>
                <Download className="w-5 h-5" /> Importar {parsedData.length} profesor{parsedData.length > 1 ? 'es' : ''}
              </>}
            </button>
          </div>
        )}

        {/* Resultado */}
        {result && (
          <div className="mt-6">
            <h3 className="font-semibold text-ink mb-3 flex items-center gap-1.5"><BarChart3 className="w-5 h-5" /> Resultado de la importación</h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-green-700">{result.importados}</p>
                <p className="text-sm text-green-600 font-medium">Importados</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-red-700">{result.errores}</p>
                <p className="text-sm text-red-600 font-medium">Errores</p>
              </div>
            </div>

            {result.detalle.length > 0 && (
              <div className="card overflow-x-auto !p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-light">
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">Fila</th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">Nombre</th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">Estado</th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule">
                    {result.detalle.map((d, i) => (
                      <tr key={i} className="hover:bg-surface-muted transition-colors">
                        <td className="px-3 py-2.5 text-ink-slate">{d.fila}</td>
                        <td className="px-3 py-2.5 font-medium text-ink">{d.nombre}</td>
                        <td className="px-3 py-2.5">
                          {d.estado === 'ok'
                            ? <span className="badge badge-success"><CheckCircle2 className="w-3 h-3" /> OK</span>
                            : <span className="badge badge-error"><XCircle className="w-3 h-3" /> Error</span>}
                        </td>
                        <td className="px-3 py-2.5 text-ink-muted">{d.mensaje || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <Link href="/profesores" className="btn-primary flex-1 justify-center text-center">
                Ver Profesores
              </Link>
              <button onClick={reset} className="btn-secondary flex-1 justify-center">
                Importar otro archivo
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
