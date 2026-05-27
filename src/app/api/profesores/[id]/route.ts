import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// PATCH /api/profesores/[id] - Update a professor
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // Fields that can be updated
    const {
      nombre,
      email,
      telefono,
      departamento,
      cursos_asignados,
      horario_habitual,
      activo
    } = body

    // Build update object with only provided fields
    const updates: any = {}
    if (nombre !== undefined) updates.nombre = nombre
    if (email !== undefined) updates.email = email
    if (telefono !== undefined) updates.telefono = telefono
    if (departamento !== undefined) updates.departamento = departamento
    if (cursos_asignados !== undefined) updates.cursos_asignados = cursos_asignados
    if (horario_habitual !== undefined) updates.horario_habitual = horario_habitual
    if (activo !== undefined) updates.activo = activo

    // Always update the updated_at timestamp
    updates.actualizado_en = new Date().toISOString()

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('profesores')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') { // Unique violation
        return NextResponse.json(
          { error: 'El correo electrónico ya está registrado por otro profesor' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Profesor no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}

// DELETE /api/profesores/[id] - Soft delete a professor
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Soft delete: set activo to false
    const { data, error } = await supabase
      .from('profesores')
      .update({ 
        activo: false,
        actualizado_en: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Profesor no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}

// GET /api/profesores/[id] - Get a single professor
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const { data, error } = await supabase
      .from('profesores')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Profesor no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}