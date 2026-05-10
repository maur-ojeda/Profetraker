import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/consejo?estado=programada
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const estado = searchParams.get('estado')

  let query = supabase
    .from('consejo_profesores')
    .select('*')
    .order('fecha', { ascending: false })
    .order('hora_inicio', { ascending: false })

  if (estado) query = query.eq('estado', estado)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enriquecer responsables
  const enriched = await Promise.all(
    (data || []).map(async (consejo) => {
      if (consejo.responsables?.length > 0) {
        const { data: profs } = await supabase
          .from('profesores')
          .select('id, nombre, departamento')
          .in('id', consejo.responsables)
        return { ...consejo, responsables_detalle: profs || [] }
      }
      return { ...consejo, responsables_detalle: [] }
    })
  )

  return NextResponse.json({ data: enriched })
}

// POST /api/consejo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { titulo, fecha, hora_inicio, hora_fin, lugar, responsables, temas_a_tratar } = body

    if (!fecha || !hora_inicio) {
      return NextResponse.json({ error: 'fecha y hora_inicio son requeridos' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('consejo_profesores')
      .insert({
        titulo: titulo || 'Consejo de Profesores',
        fecha,
        hora_inicio,
        hora_fin: hora_fin || null,
        lugar: lugar || null,
        responsables: responsables || [],
        temas_a_tratar: temas_a_tratar || null,
      })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 })
  }
}