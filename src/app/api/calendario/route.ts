import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/calendario?mes=2026-05&departamento=Mathemática
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mes = searchParams.get('mes') // formato: YYYY-MM
  const departamento = searchParams.get('departamento')

  if (!mes) {
    return NextResponse.json(
      { error: 'Parámetro mes requerido (formato: YYYY-MM)' },
      { status: 400 }
    )
  }

  // Calcular primer y último día del mes
  const [year, month] = mes.split('-').map(Number)
  const fechaDesde = `${mes}-01`
  const fechaHasta = new Date(year, month, 0).toISOString().split('T')[0] // último día del mes

  try {
    // 1. Obtener profesores (con filtro opcional)
    let profesoresQuery = supabase
      .from('profesores')
      .select('id, nombre, departamento, cursos_asignados')
      .eq('activo', true)

    if (departamento) {
      profesoresQuery = profesoresQuery.eq('departamento', departamento)
    }

    const { data: profesores, error: profError } = profesoresQuery

    if (profError) {
      return NextResponse.json({ error: profError.message }, { status: 500 })
    }

    const profesorIds = profesores?.map((p) => p.id) || []

    if (profesorIds.length === 0) {
      return NextResponse.json({ mes, eventos: {}, profesores: [] })
    }

    // 2. Licencias activas en el mes
    const { data: licencias } = await supabase
      .from('licencias')
      .select('id, profesor_id, tipo, fecha_desde, fecha_hasta, motivo, estado')
      .in('profesor_id', profesorIds)
      .lte('fecha_desde', fechaHasta)
      .gte('fecha_hasta', fechaDesde)
      .eq('estado', 'activa')

    // 3. Permisos en el mes
    const { data: permisos } = await supabase
      .from('permisos_administrativos')
      .select('id, profesor_id, tipo, fecha, motivo, estado')
      .in('profesor_id', profesorIds)
      .gte('fecha', fechaDesde)
      .lte('fecha', fechaHasta)

    // 4. Ausencias en el mes
    const { data: ausencias } = await supabase
      .from('ausencias')
      .select('id, profesor_id, fecha, tipo, justificacion')
      .in('profesor_id', profesorIds)
      .gte('fecha', fechaDesde)
      .lte('fecha', fechaHasta)

    // 5. Indexar profesores por ID
    const profesoresMap = new Map(
      profesores?.map((p) => [p.id, p]) || []
    )

    // 6. Construir mapa de eventos por fecha
    const eventos: Record<
      string,
      Array<{
        profesor_id: string
        profesor_nombre: string
        departamento: string | null
        tipo: 'licencia' | 'permiso' | 'ausencia_con_aviso' | 'ausencia_sin_aviso'
        subtipo: string | null
        detalle: string
      }>
    > = {}

    // Helper para agregar evento
    const addEvento = (
      fecha: string,
      profesorId: string,
      tipo: 'licencia' | 'permiso' | 'ausencia_con_aviso' | 'ausencia_sin_aviso',
      subtipo: string | null,
      detalle: string
    ) => {
      const profesor = profesoresMap.get(profesorId)
      if (!profesor) return

      if (!eventos[fecha]) eventos[fecha] = []
      eventos[fecha].push({
        profesor_id: profesorId,
        profesor_nombre: profesor.nombre,
        departamento: profesor.departamento,
        tipo,
        subtipo,
        detalle,
      })
    }

    // Procesar licencias (pueden abarcar múltiples días)
    licencias?.forEach((lic) => {
      const desde = new Date(lic.fecha_desde)
      const hasta = new Date(lic.fecha_hasta)
      for (let d = new Date(desde); d <= hasta; d.setDate(d.getDate() + 1)) {
        const fechaStr = d.toISOString().split('T')[0]
        // Solo incluir días del mes actual
        if (fechaStr >= fechaDesde && fechaStr <= fechaHasta) {
          addEvento(
            fechaStr,
            lic.profesor_id,
            'licencia',
            lic.tipo,
            `Licencia ${lic.tipo}${lic.motivo ? ': ' + lic.motivo : ''}`
          )
        }
      }
    })

    // Procesar permisos
    permisos?.forEach((perm) => {
      const tipoLabel =
        perm.tipo === 'dia_completo'
          ? 'Día completo'
          : perm.tipo === 'medio_dia_AM'
            ? 'Medio día AM'
            : 'Medio día PM'

      addEvento(
        perm.fecha,
        perm.profesor_id,
        'permiso',
        perm.tipo,
        `Permiso: ${tipoLabel}${perm.motivo ? ' - ' + perm.motivo : ''}`
      )
    })

    // Procesar ausencias
    ausencias?.forEach((aus) => {
      addEvento(
        aus.fecha,
        aus.profesor_id,
        aus.tipo === 'con_aviso' ? 'ausencia_con_aviso' : 'ausencia_sin_aviso',
        null,
        aus.tipo === 'sin_aviso'
          ? `Ausencia SIN AVISO${aus.justificacion ? ': ' + aus.justificacion : ''}`
          : `Ausencia con aviso${aus.justificacion ? ': ' + aus.justificacion : ''}`
      )
    })

    return NextResponse.json({
      mes,
      fecha_desde: fechaDesde,
      fecha_hasta: fechaHasta,
      profesores: profesores || [],
      eventos,
      resumen: {
        total_profesores: profesores?.length || 0,
        total_eventos: Object.values(eventos).flat().length,
        licencias: licencias?.length || 0,
        permisos: permisos?.length || 0,
        ausencias: ausencias?.length || 0,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}