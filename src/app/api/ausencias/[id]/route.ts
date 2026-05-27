import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// DELETE /api/ausencias/[id] - Eliminar una ausencia
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verificar que existe
    const { data: ausencia } = await supabase
      .from('ausencias')
      .select('id')
      .eq('id', id)
      .single()

    if (!ausencia) {
      return NextResponse.json(
        { error: 'Ausencia no encontrada' },
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from('ausencias')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Ausencia eliminada' })
  } catch (err) {
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    )
  }
}