import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// DELETE /api/consejo/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { data: consejo } = await supabase.from('consejo_profesores').select('id').eq('id', id).single()
    if (!consejo) return NextResponse.json({ error: 'Consejo no encontrado' }, { status: 404 })

    const { error } = await supabase.from('consejo_profesores').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ message: 'Consejo eliminado' })
  } catch (err) {
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 })
  }
}

// PATCH /api/consejo/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    const allowedFields = ['titulo', 'fecha', 'hora_inicio', 'hora_fin', 'lugar', 'responsables', 'temas_a_tratar', 'acuerdos', 'compromisos', 'acta', 'estado']
    const updates: any = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) updates[field] = body[field]
    }
    updates.actualizado_en = new Date().toISOString()

    if (Object.keys(updates).length === 1) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('consejo_profesores')
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