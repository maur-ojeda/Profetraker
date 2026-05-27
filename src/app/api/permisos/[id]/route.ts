import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// DELETE /api/permisos/[id] - Eliminar un permiso
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { data: permiso } = await supabase
      .from('permisos_administrativos')
      .select('id')
      .eq('id', id)
      .single()

    if (!permiso) {
      return NextResponse.json({ error: 'Permiso no encontrado' }, { status: 404 })
    }

    const { error } = await supabase
      .from('permisos_administrativos')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ message: 'Permiso eliminado' })
  } catch (err) {
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 })
  }
}