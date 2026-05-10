import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// DELETE /api/reuniones/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const { data: reunion } = await supabase
      .from('reuniones')
      .select('id')
      .eq('id', id)
      .single()

    if (!reunion) {
      return NextResponse.json({ error: 'Reunión no encontrada' }, { status: 404 })
    }

    const { error } = await supabase
      .from('reuniones')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ message: 'Reunión eliminada' })
  } catch (err) {
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 })
  }
}

// PATCH /api/reuniones/[id] - Actualizar reunión (acuerdos, acta, estado)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    const allowedFields = ['titulo', 'tipo', 'fecha', 'hora_inicio', 'hora_fin', 'lugar', 'link_virtual', 'participantes', 'responsable_id', 'temas_a_tratar', 'acuerdos', 'acta', 'estado']
    const updates: any = {}
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) updates[field] = body[field]
    }
    
    updates.actualizado_en = new Date().toISOString()

    if (Object.keys(updates).length === 1) { // solo actualizado_en
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('reuniones')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 })
  }
}