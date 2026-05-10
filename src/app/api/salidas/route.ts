import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/salidas?fecha_desde=2026-05-01&fecha_hasta=2026-05-31&curso=1°Medio
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const fechaDesde = searchParams.get('fecha_desde')
  const fechaHasta = searchParams.get('fecha_hasta')
  const curso = searchParams.get('curso')

  let query = supabase
    .from('salidas_pedagogicas')
    .select('*')
    .order('fecha', { ascending: false })
    .order('hora_salida', { ascending: false })

  if (fechaDesde) query = query.gte('fecha', fechaDesde)
  if (fechaHasta) query = query.lte('fecha', fechaHasta)
  if (curso) query = query.eq('curso', curso)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enriquecer con nombres de profesores acompañantes
  const enriched = await Promise.all(
    (data || []).map(async (salida) => {
      if (salida.profesores_acompañantes?.length > 0) {
        const { data: profs } = await supabase
          .from('profesores')
          .select('id, nombre, departamento')
          .in('id', salida.profesores_acompañantes)
        return { ...salida, acompanantes: profs || [] }
      }
      return { ...salida, acompanantes: [] }
    })
  )

  return NextResponse.json({ data: enriched })
}

// POST /api/salidas - Crear nueva salida pedagógica
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { curso, fecha, hora_salida, hora_regreso, destino, objetivo_pedagogico, profesores_acompañantes, notas } = body

    if (!curso || !fecha || !hora_salida || !destino) {
      return NextResponse.json(
        { error: 'curso, fecha, hora_salida y destino son requeridos' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('salidas_pedagogicas')
      .insert({
        curso,
        fecha,
        hora_salida,
        hora_regreso: hora_regreso || null,
        destino,
        objetivo_pedagogico: objetivo_pedagogico || null,
        profesores_acompañantes: profesores_acompañantes || [],
        notas: notas || null,
      })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 })
  }
}