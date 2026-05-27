import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/remplazos?activos=true&semana=2026-05-04
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const activos = searchParams.get('activos')
  const semana = searchParams.get('semana')

  try {
    let query = supabase
      .from('reemplazos')
      .select(`
        *,
        profesor_ausente:profesor_ausente_id (id, nombre, email, departamento),
        profesor_reemplazante:profesor_reemplazante_id (id, nombre, email, departamento),
        licencia:licencia_id (id, tipo, fecha_desde, fecha_hasta, motivo),
        ausencia:ausencia_id (id, fecha, tipo, justificacion)
      `)

    if (activos === 'true') {
      query = query.in('estado', ['pendiente', 'confirmado'])
    }

    if (semana) {
      const fechaInicio = new Date(semana + 'T00:00:00')
      const fechaFin = new Date(fechaInicio)
      fechaFin.setDate(fechaFin.getDate() + 6)
      const finStr = fechaFin.toISOString().split('T')[0]
      query = query.gte('fecha', semana).lte('fecha', finStr)
    }

    const { data, error } = await query.order('fecha', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data: data || [] })
  } catch (err: any) {
    console.error('Remplazos error:', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}

// POST /api/remplazos
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { profesor_ausente_id, profesor_reemplazante_id, fecha, horas_asignadas, licencia_id, ausencia_id, notas } = body

    if (!profesor_ausente_id || !profesor_reemplazante_id || !fecha) {
      return NextResponse.json({ error: 'Faltan campos requeridos: profesor_ausente_id, profesor_reemplazante_id, fecha' }, { status: 400 })
    }

    if (!licencia_id && !ausencia_id) {
      return NextResponse.json({ error: 'Debe asociarse a una licencia o ausencia' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('reemplazos')
      .insert({
        profesor_ausente_id,
        profesor_reemplazante_id,
        fecha,
        horas_asignadas: horas_asignadas || 8,
        licencia_id: licencia_id || null,
        ausencia_id: ausencia_id || null,
        notas: notas || null,
        estado: 'pendiente',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err: any) {
    console.error('Remplazos POST error:', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}

// DELETE /api/remplazos?id=xxx
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Parámetro id requerido' }, { status: 400 })
  }

  try {
    const { error } = await supabase.from('reemplazos').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Remplazos DELETE error:', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}

// PATCH /api/remplazos
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Campo id requerido' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('reemplazos')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err: any) {
    console.error('Remplazos PATCH error:', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
