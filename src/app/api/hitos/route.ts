import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/hitos?mes=2026-05&tipo=pme
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mes = searchParams.get('mes')
  const tipo = searchParams.get('tipo')
  const fechaDesde = searchParams.get('fecha_desde')
  const fechaHasta = searchParams.get('fecha_hasta')

  let query = supabase
    .from('hitos_pme')
    .select('*')
    .order('fecha', { ascending: true })

  if (tipo) query = query.eq('tipo', tipo)

  // Si se especifica mes, filtrar por ese rango
  if (mes) {
    const [year, month] = mes.split('-').map(Number)
    const desde = `${mes}-01`
    const hasta = new Date(year, month, 0).toISOString().split('T')[0]
    query = query.gte('fecha', desde).lte('fecha', hasta)
  } else if (fechaDesde || fechaHasta) {
    if (fechaDesde) query = query.gte('fecha', fechaDesde)
    if (fechaHasta) query = query.lte('fecha', fechaHasta)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/hitos
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { titulo, descripcion, fecha, fecha_fin, tipo, importante } = body

    if (!titulo || !fecha || !tipo) {
      return NextResponse.json({ error: 'titulo, fecha y tipo son requeridos' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('hitos_pme')
      .insert({
        titulo,
        descripcion: descripcion || null,
        fecha,
        fecha_fin: fecha_fin || null,
        tipo,
        importante: importante || false,
      })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 })
  }
}