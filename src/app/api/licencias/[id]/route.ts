import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// DELETE /api/licencias/[id] - Eliminar una licencia
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

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
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { estado } = body

    if (!estado || !['activa', 'finalizada', 'pendiente'].includes(estado)) {
      return NextResponse.json(
        { error: 'estado debe ser: activa, finalizada o pendiente' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('licencias')
      .update({ estado, actualizado_en: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 })
  }
}