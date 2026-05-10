import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface RowData {
  nombre: string
  email: string
  telefono?: string
  departamento?: string
  cursos_asignados?: string[]
}

// POST /api/profesores/import - Importar profesores desde CSV
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { rows } = body as { rows: RowData[] }

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No hay filas para importar' }, { status: 400 })
    }

    const resultados = {
      importados: 0,
      errores: 0,
      detalle: [] as Array<{ fila: number; nombre: string; estado: 'ok' | 'error'; mensaje?: string }>,
    }

    // Validar y insertar cada fila
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const filaNum = i + 1

      // Validaciones
      if (!row.nombre?.trim()) {
        resultados.errores++
        resultados.detalle.push({ fila: filaNum, nombre: row.nombre || '(vacío)', estado: 'error', mensaje: 'Nombre requerido' })
        continue
      }

      if (!row.email?.trim()) {
        resultados.errores++
        resultados.detalle.push({ fila: filaNum, nombre: row.nombre, estado: 'error', mensaje: 'Email requerido' })
        continue
      }

      // Validar formato email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(row.email.trim())) {
        resultados.errores++
        resultados.detalle.push({ fila: filaNum, nombre: row.nombre, estado: 'error', mensaje: `Email inválido: ${row.email}` })
        continue
      }

      // Verificar email duplicado
      const { data: existente } = await supabase
        .from('profesores')
        .select('id')
        .eq('email', row.email.trim().toLowerCase())
        .single()

      if (existente) {
        resultados.errores++
        resultados.detalle.push({ fila: filaNum, nombre: row.nombre, estado: 'error', mensaje: `Email ya registrado: ${row.email}` })
        continue
      }

      // Preparar cursos
      let cursos: string[] = []
      if (row.cursos_asignados) {
        if (Array.isArray(row.cursos_asignados)) {
          cursos = row.cursos_asignados
        } else if (typeof row.cursos_asignados === 'string') {
          cursos = (row.cursos_asignados as string).split(',').map((c: string) => c.trim()).filter(Boolean)
        }
      }

      // Insertar
      const { error } = await supabase
        .from('profesores')
        .insert({
          nombre: row.nombre.trim(),
          email: row.email.trim().toLowerCase(),
          telefono: row.telefono?.trim() || null,
          departamento: row.departamento?.trim() || null,
          cursos_asignados: cursos.length > 0 ? cursos : null,
        })

      if (error) {
        resultados.errores++
        resultados.detalle.push({ fila: filaNum, nombre: row.nombre, estado: 'error', mensaje: error.message })
      } else {
        resultados.importados++
        resultados.detalle.push({ fila: filaNum, nombre: row.nombre, estado: 'ok' })
      }
    }

    return NextResponse.json(resultados)
  } catch (err) {
    return NextResponse.json({ error: 'Error al procesar la importación' }, { status: 500 })
  }
}