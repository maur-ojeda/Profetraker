import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/licencias?profesor_id=xxx&estado=activa
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const profesorId = searchParams.get('profesor_id')
  const estado = searchParams.get('estado')
  const fechaDesde = searchParams.get('fecha_desde')
  const fechaHasta = searchParams.get('fecha_hasta')

  let query = supabase
    .from('licencias')
    .select('*')
    .order('fecha_desde', { ascending: false })

  if (profesorId) query = query.eq('profesor_id', profesorId)
  if (estado) query = query.eq('estado', estado)
  if (fechaDesde) query = query.lte('fecha_desde', fechaDesde) // Licencia que empiece antes de esta fecha
  if (fechaHasta) query = query.gte('fecha_hasta', fechaHasta) // Licencia que termine después de esta fecha

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/licencias - Crear nueva licencia
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { profesor_id, tipo, fecha_desde, fecha_hasta, motivo, documento_adjunto } = body

    // Validaciones
    if (!profesor_id || !tipo || !fecha_desde || !fecha_hasta) {
      return NextResponse.json(
        { error: 'profesor_id, tipo, fecha_desde y fecha_hasta son requeridos' },
        { status: 400 }
      )
    }

    if (!['medica', 'prenatal', 'postnatal', 'personal', 'estudio'].includes(tipo)) {
      return NextResponse.json(
        { error: 'tipo debe ser: medica, prenatal, postnatal, personal o estudio' },
        { status: 400 }
      )
    }

    if (fecha_hasta < fecha_desde) {
      return NextResponse.json(
        { error: 'fecha_hasta no puede ser anterior a fecha_desde' },
        { status: 400 }
      )
    }

    // Verificar profesor
    const { data: profesor } = await supabase
      .from('profesores')
      .select('id, nombre')
      .eq('id', profesor_id)
      .eq('activo', true)
      .single()

    if (!profesor) {
      return NextResponse.json({ error: 'Profesor no encontrado o inactivo' }, { status: 404 })
    }

    // Insertar licencia
    const { data, error } = await supabase
      .from('licencias')
      .insert({
        profesor_id,
        tipo,
        fecha_desde,
        fecha_hasta,
        motivo: motivo || null,
        documento_adjunto: documento_adjunto || null,
        estado: 'activa',
      })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Calcular días corridos
    const desde = new Date(fecha_desde + 'T12:00:00')
    const hasta = new Date(fecha_hasta + 'T12:00:00')
    const diasCorridos = Math.floor((hasta.getTime() - desde.getTime()) / (1000 * 60 * 60 * 24)) + 1

    return NextResponse.json({
      ...data,
      dias_corridos: diasCorridos,
      alerta_pago: true, // Siempre pendiente de ingreso al sistema de pagos
      alerta_largo: diasCorridos > 7, // Licencia mayor a 7 días
    }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 })
  }
}