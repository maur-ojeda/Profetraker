import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/ausencias?profesor_id=xxx&fecha_desde=2026-05-01&fecha_hasta=2026-05-31
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const profesorId = searchParams.get('profesor_id')
  const fechaDesde = searchParams.get('fecha_desde')
  const fechaHasta = searchParams.get('fecha_hasta')

  let query = supabase
    .from('ausencias')
    .select(`
      *,
      profesor:profesores!ausencias_profesor_id_fkey (nombre, email, departamento)
    `)
    .order('fecha', { ascending: false })

  if (profesorId) {
    query = query.eq('profesor_id', profesorId)
  }
  if (fechaDesde) {
    query = query.gte('fecha', fechaDesde)
  }
  if (fechaHasta) {
    query = query.lte('fecha', fechaHasta)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

// POST /api/ausencias - Crear nueva ausencia
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { profesor_id, fecha, tipo, justificacion } = body

    // Validaciones
    if (!profesor_id || !fecha || !tipo) {
      return NextResponse.json(
        { error: 'profesor_id, fecha y tipo son requeridos' },
        { status: 400 }
      )
    }

    if (!['con_aviso', 'sin_aviso'].includes(tipo)) {
      return NextResponse.json(
        { error: 'tipo debe ser "con_aviso" o "sin_aviso"' },
        { status: 400 }
      )
    }

    // Verificar que el profesor existe y está activo
    const { data: profesor } = await supabase
      .from('profesores')
      .select('id, nombre')
      .eq('id', profesor_id)
      .eq('activo', true)
      .single()

    if (!profesor) {
      return NextResponse.json(
        { error: 'Profesor no encontrado o inactivo' },
        { status: 404 }
      )
    }

    // Verificar que no exista ya una ausencia para ese día
    const { data: existente } = await supabase
      .from('ausencias')
      .select('id')
      .eq('profesor_id', profesor_id)
      .eq('fecha', fecha)
      .single()

    if (existente) {
      return NextResponse.json(
        { error: 'Ya existe una ausencia registrada para este profesor en esta fecha' },
        { status: 409 }
      )
    }

    // Insertar ausencia
    const { data, error } = await supabase
      .from('ausencias')
      .insert({
        profesor_id,
        fecha,
        tipo,
        justificacion: justificacion || null,
      })
      .select(`
        *,
        profesor:profesores!ausencias_profesor_id_fkey (nombre, email, departamento)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    )
  }
}