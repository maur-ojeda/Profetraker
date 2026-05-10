import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/reuniones?estado=programada&tipo=general
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const estado = searchParams.get('estado')
  const tipo = searchParams.get('tipo')
  const fechaDesde = searchParams.get('fecha_desde')
  const fechaHasta = searchParams.get('fecha_hasta')

  let query = supabase
    .from('reuniones')
    .select('*')
    .order('fecha', { ascending: false })
    .order('hora_inicio', { ascending: false })

  if (estado) query = query.eq('estado', estado)
  if (tipo) query = query.eq('tipo', tipo)
  if (fechaDesde) query = query.gte('fecha', fechaDesde)
  if (fechaHasta) query = query.lte('fecha', fechaHasta)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enriquecer con nombres
  const enriched = await Promise.all(
    (data || []).map(async (reunion) => {
      const result: any = { ...reunion }

      // Responsable
      if (reunion.responsable_id) {
        const { data: prof } = await supabase
          .from('profesores')
          .select('id, nombre')
          .eq('id', reunion.responsable_id)
          .single()
        result.responsable = prof
      }

      // Participantes
      if (reunion.participantes?.length > 0) {
        const { data: profs } = await supabase
          .from('profesores')
          .select('id, nombre, departamento')
          .in('id', reunion.participantes)
        result.participantes_detalle = profs || []
      }

      return result
    })
  )

  return NextResponse.json({ data: enriched })
}

// POST /api/reuniones - Crear nueva reunión
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { titulo, tipo, fecha, hora_inicio, hora_fin, lugar, link_virtual, participantes, responsable_id, temas_a_tratar, acuerdos, acta, estado } = body

    if (!titulo || !tipo || !fecha || !hora_inicio) {
      return NextResponse.json(
        { error: 'titulo, tipo, fecha y hora_inicio son requeridos' },
        { status: 400 }
      )
    }

    if (!['general', 'departamento', 'apoderados', 'consejo', 'otro'].includes(tipo)) {
      return NextResponse.json({ error: 'tipo inválido' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('reuniones')
      .insert({
        titulo,
        tipo,
        fecha,
        hora_inicio,
        hora_fin: hora_fin || null,
        lugar: lugar || null,
        link_virtual: link_virtual || null,
        participantes: participantes || [],
        responsable_id: responsable_id || null,
        temas_a_tratar: temas_a_tratar || null,
        acuerdos: acuerdos || null,
        acta: acta || null,
        estado: estado || 'programada',
      })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 })
  }
}