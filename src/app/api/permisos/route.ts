import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/permisos?profesor_id=xxx&fecha_desde=2026-05-01&fecha_hasta=2026-05-31
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const profesorId = searchParams.get('profesor_id')
  const fechaDesde = searchParams.get('fecha_desde')
  const fechaHasta = searchParams.get('fecha_hasta')

  let query = supabase
    .from('permisos_administrativos')
    .select('*')
    .order('fecha', { ascending: false })

  if (profesorId) query = query.eq('profesor_id', profesorId)
  if (fechaDesde) query = query.gte('fecha', fechaDesde)
  if (fechaHasta) query = query.lte('fecha', fechaHasta)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/permisos - Crear nuevo permiso
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { profesor_id, fecha, tipo, motivo } = body

    // Validaciones
    if (!profesor_id || !fecha || !tipo) {
      return NextResponse.json(
        { error: 'profesor_id, fecha y tipo son requeridos' },
        { status: 400 }
      )
    }

    if (!['dia_completo', 'medio_dia_AM', 'medio_dia_PM'].includes(tipo)) {
      return NextResponse.json(
        { error: 'tipo debe ser "dia_completo", "medio_dia_AM" o "medio_dia_PM"' },
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

    // Verificar solapamiento: si es día completo, no puede tener otro permiso o ausencia el mismo día
    if (tipo === 'dia_completo') {
      const { data: existente } = await supabase
        .from('permisos_administrativos')
        .select('id')
        .eq('profesor_id', profesor_id)
        .eq('fecha', fecha)
        .single()

      if (existente) {
        return NextResponse.json(
          { error: 'Ya existe un permiso registrado para este profesor en esta fecha' },
          { status: 409 }
        )
      }

      // Verificar ausencia
      const { data: ausenciaExistente } = await supabase
        .from('ausencias')
        .select('id')
        .eq('profesor_id', profesor_id)
        .eq('fecha', fecha)
        .single()

      if (ausenciaExistente) {
        return NextResponse.json(
          { error: 'Este profesor ya tiene una ausencia registrada para esta fecha' },
          { status: 409 }
        )
      }
    }

    // Verificar solapamiento de medios días
    if (tipo === 'medio_dia_AM') {
      // Si ya tiene permiso AM o día completo
      const { data: existente } = await supabase
        .from('permisos_administrativos')
        .select('id, tipo')
        .eq('profesor_id', profesor_id)
        .eq('fecha', fecha)
        .in('tipo', ['dia_completo', 'medio_dia_AM'])
        .single()

      if (existente) {
        return NextResponse.json(
          { error: 'Este profesor ya tiene un permiso AM o día completo para esta fecha' },
          { status: 409 }
        )
      }
    }

    if (tipo === 'medio_dia_PM') {
      // Si ya tiene permiso PM o día completo
      const { data: existente } = await supabase
        .from('permisos_administrativos')
        .select('id, tipo')
        .eq('profesor_id', profesor_id)
        .eq('fecha', fecha)
        .in('tipo', ['dia_completo', 'medio_dia_PM'])
        .single()

      if (existente) {
        return NextResponse.json(
          { error: 'Este profesor ya tiene un permiso PM o día completo para esta fecha' },
          { status: 409 }
        )
      }
    }

    // Insertar permiso
    const { data, error } = await supabase
      .from('permisos_administrativos')
      .insert({
        profesor_id,
        fecha,
        tipo,
        motivo: motivo || null,
        estado: 'aprobado', // Auto-aprobar en MVP
      })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 })
  }
}