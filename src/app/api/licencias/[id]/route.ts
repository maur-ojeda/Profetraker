import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// DELETE /api/licencias/[id] - Eliminar una licencia
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { data: licencia } = await supabase
      .from('licencias')
      .select('id')
      .eq('id', id)
      .single()

    if (!licencia) {
      return NextResponse.json({ error: 'Licencia no encontrada' }, { status: 404 })
    }

    const { error } = await supabase
      .from('licencias')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ message: 'Licencia eliminada' })
  } catch (err) {
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 })
  }
}

// PATCH /api/licencias/[id] - Actualizar estado de licencia
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { estado } = body

    if (!estado || !['activa', 'finalizada', 'pendiente'].includes(estado)) {
      return NextResponse.json(
        { error: 'estado debe ser: activa, finalizada o pendiente' },
        { status: 400 }
      )
    }

    // 1. Verificar que la licencia exista
    const { data: licencia, error: fetchError } = await supabase
      .from('licencias')
      .select('id, estado, fecha_desde, fecha_hasta')
      .eq('id', id)
      .single()

    if (fetchError || !licencia) {
      return NextResponse.json({ error: 'Licencia no encontrada' }, { status: 404 })
    }

    // 2. Validar transición de estado
    if (licencia.estado === estado) {
      return NextResponse.json(
        { error: `La licencia ya está en estado "${estado}"` },
        { status: 400 }
      )
    }

    if (estado === 'finalizada' && licencia.estado !== 'activa') {
      return NextResponse.json(
        { error: `Solo se puede finalizar una licencia activa. Estado actual: "${licencia.estado}"` },
        { status: 400 }
      )
    }

    // 3. Actualizar licencia
    const { data, error } = await supabase
      .from('licencias')
      .update({ estado, actualizado_en: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // 4. Si se finaliza, marcar reemplazos vinculados como completado
    if (estado === 'finalizada') {
      const { error: reemplazosError } = await supabase
        .from('reemplazos')
        .update({ estado: 'completado' })
        .eq('licencia_id', id)
        .in('estado', ['pendiente', 'confirmado'])

      if (reemplazosError) {
        console.error('Error actualizando reemplazos:', reemplazosError)
        // No falla la operación principal, solo loguea el error
      }
    }

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 })
  }
}