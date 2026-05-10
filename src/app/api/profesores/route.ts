import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/profesores - List professors with optional filters
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const departamento = searchParams.get('departamento')
  const activo = searchParams.get('activo')
  const limit = parseInt(searchParams.get('limit') || '100')
  const offset = parseInt(searchParams.get('offset') || '0')

  let query = supabase
    .from('profesores')
    .select('*')
    .range(offset, offset + limit - 1)

  if (departamento) {
    query = query.eq('departamento', departamento)
  }

  if (activo !== null) {
    const isActive = activo === 'true'
    query = query.eq('activo', isActive)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, count })
}

// POST /api/profesores - Create a new professor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre, email, telefono, departamento, cursos_asignados, horario_habitual } = body

    // Basic validation
    if (!nombre || !email) {
      return NextResponse.json(
        { error: 'Nombre y email son requeridos' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('profesores')
      .insert({
        nombre,
        email,
        telefono,
        departamento,
        cursos_asignados: cursos_asignados || [],
        horario_habitual: horario_habitual || {},
      })
      .single()

    if (error) {
      if (error.code === '23505') { // Unique violation
        return NextResponse.json(
          { error: 'El correo electrónico ya está registrado' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}