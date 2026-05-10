import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// DELETE /api/hitos/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { data: hito } = await supabase.from('hitos_pme').select('id').eq('id', id).single()
    if (!hito) return NextResponse.json({ error: 'Hito no encontrado' }, { status: 404 })

    const { error } = await supabase.from('hitos_pme').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ message: 'Hito eliminado' })
  } catch (err) {
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 })
  }
}