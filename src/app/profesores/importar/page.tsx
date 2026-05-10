'use client'

import { useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

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
    for (let i = 1; i < Math.min(lines.length, 100); i++) { // Máximo 100 filas
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">PROFE TRACKER</h1>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>
            <Link href="/profesores" className="text-blue-600 hover:underline">Profesores</Link>
            <Link href="/profesores/importar" className="text-blue-600 font-semibold border-b-2 border-blue-600">Importar CSV</Link>
            <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }} className="text-gray-600 hover:text-gray-900">Cerrar sesión</button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Importar Profesores desde CSV</h2>
        <p className="text-sm text-gray-500 mb-6">Cargá un archivo CSV con los datos de tus profesores</p>

        {/* Formato esperado */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="font-medium text-blue-800 text-sm mb-2">📋 Formato esperado del CSV:</p>
          <code className="text-xs text-blue-700 block">
            nombre,email,telefono,departamento,cursos<br />
            María González,m.gonzalez@colegio.edu,+569 1234 5678,Matemática,"MAT101, MAT202"
          </code>
        </div>

        {/* Drop Zone */}
        {!result && (
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
              dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            <p className="text-4xl mb-3">📄</p>
            <p className="text-gray-600 font-medium">
              {file ? `Archivo: ${file.name}` : 'Arrastrá tu archivo CSV aquí'}
            </p>
            <p className="text-sm text-gray-400 mt-1">o hacé click para seleccionar</p>
          </div>
        )}

        {/* Preview */}
        {parsedData.length > 0 && !result && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-800">
                Preview — {parsedData.length} fila{parsedData.length > 1 ? 's' : ''}
              </h3>
              <button onClick={reset} className="text-sm text-gray-500 hover:underline">Cambiar archivo</button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-600">#</th>
                    <th className="px-3 py-2 text-left text-gray-600">Nombre</th>
                    <th className="px-3 py-2 text-left text-gray-600">Email</th>
                    <th className="px-3 py-2 text-left text-gray-600">Teléfono</th>
                    <th className="px-3 py-2 text-left text-gray-600">Departamento</th>
                    <th className="px-3 py-2 text-left text-gray-600">Cursos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {parsedData.slice(0, 5).map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">{row.nombre || <span className="text-red-400">—</span>}</td>
                      <td className="px-3 py-2">{row.email || <span className="text-red-400">—</span>}</td>
                      <td className="px-3 py-2 text-gray-500">{row.telefono || '—'}</td>
                      <td className="px-3 py-2 text-gray-500">{row.departamento || '—'}</td>
                      <td className="px-3 py-2 text-gray-500">{row.cursos_asignados || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedData.length > 5 && (
                <p className="text-sm text-gray-400 text-center py-2">... y {parsedData.length - 5} filas más</p>
              )}
            </div>

            <button onClick={handleImport} disabled={importing}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg disabled:opacity-50 text-lg">
              {importing ? '⏳ Importando...' : `📥 Importar ${parsedData.length} profesor${parsedData.length > 1 ? 'es' : ''}`}
            </button>
          </div>
        )}

        {/* Resultado */}
        {result && (
          <div className="mt-6">
            <h3 className="font-semibold text-gray-800 mb-3">📊 Resultado de la importación</h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-green-700">{result.importados}</p>
                <p className="text-green-600">Importados</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-red-700">{result.errores}</p>
                <p className="text-red-600">Errores</p>
              </div>
            </div>

            {result.detalle.length > 0 && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-600">Fila</th>
                      <th className="px-3 py-2 text-left text-gray-600">Nombre</th>
                      <th className="px-3 py-2 text-left text-gray-600">Estado</th>
                      <th className="px-3 py-2 text-left text-gray-600">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.detalle.map((d, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-400">{d.fila}</td>
                        <td className="px-3 py-2 font-medium">{d.nombre}</td>
                        <td className="px-3 py-2">
                          {d.estado === 'ok'
                            ? <span className="text-green-600">✅ OK</span>
                            : <span className="text-red-600">❌ Error</span>}
                        </td>
                        <td className="px-3 py-2 text-gray-500">{d.mensaje || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <Link href="/profesores" className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg">
                Ver Profesores
              </Link>
              <button onClick={reset} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg">
                Importar otro archivo
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}