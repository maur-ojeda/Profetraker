import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// DELETE /api/salidas/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const { data: salida } = await supabase
      .from('salidas_pedagogicas')
      .select('id')
      .eq('id', id)
      .single()

    if (!salida) {
      return NextResponse.json({ error: 'Salida no encontrada' }, { status: 404 })
    }

    const { error } = await supabase
      .from('salidas_pedagogicas')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ message: 'Salida eliminada' })
  } catch (err) {
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 })
  }
}