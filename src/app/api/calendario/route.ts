import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/calendario?mes=2026-05&departamento=Matemática
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mes = searchParams.get('mes')
  const departamento = searchParams.get('departamento')

  if (!mes) {
    return NextResponse.json(
      { error: 'Parámetro mes requerido (formato: YYYY-MM)' },
      { status: 400 }
    )
  }

  const [year, month] = mes.split('-').map(Number)
  const fechaDesde = `${mes}-01`
  const fechaHasta = new Date(year, month, 0).toISOString().split('T')[0]

  try {
    // 1. Profesores
    let profQuery = supabase.from('profesores').select('id, nombre, departamento, cursos_asignados').eq('activo', true)
    if (departamento) profQuery = profQuery.eq('departamento', departamento)

    const { data: profesores, error: profError } = await profQuery
    if (profError) return NextResponse.json({ error: profError.message }, { status: 500 })

    const profesoresMap = new Map(profesores?.map((p) => [p.id, p]) || [])
    const profesorIds = [...profesoresMap.keys()]

    if (profesorIds.length === 0) {
      return NextResponse.json({ mes, eventos: {}, profesores: [], resumen: { total_profesores: 0, total_eventos: 0, licencias: 0, permisos: 0, ausencias: 0 } })
    }

    // 2. Licencias
    const { data: licencias } = await supabase
      .from('licencias')
      .select('*')
      .in('profesor_id', profesorIds)
      .lte('fecha_desde', fechaHasta)
      .gte('fecha_hasta', fechaDesde)
      .eq('estado', 'activa')

    // 3. Permisos
    const { data: permisos } = await supabase
      .from('permisos_administrativos')
      .select('*')
      .in('profesor_id', profesorIds)
      .gte('fecha', fechaDesde)
      .lte('fecha', fechaHasta)

    // 4. Ausencias
    const { data: ausencias } = await supabase
      .from('ausencias')
      .select('*')
      .in('profesor_id', profesorIds)
      .gte('fecha', fechaDesde)
      .lte('fecha', fechaHasta)

    // 5. Construir eventos
    const eventos: Record<string, any[]> = {}

    const addEvento = (fecha: string, ev: any) => {
      if (!eventos[fecha]) eventos[fecha] = []
      eventos[fecha].push(ev)
    }

    // Procesar licencias (expandir día a día)
    licencias?.forEach((lic) => {
      const desde = new Date(lic.fecha_desde + 'T12:00:00')
      const hasta = new Date(lic.fecha_hasta + 'T12:00:00')
      const profesor = profesoresMap.get(lic.profesor_id)

      for (let d = new Date(desde); d <= hasta; d.setDate(d.getDate() + 1)) {
        const fechaStr = d.toISOString().split('T')[0]
        if (fechaStr >= fechaDesde && fechaStr <= fechaHasta && profesor) {
          addEvento(fechaStr, {
            profesor_id: lic.profesor_id,
            profesor_nombre: profesor.nombre,
            departamento: profesor.departamento,
            tipo: 'licencia',
            subtipo: lic.tipo,
            detalle: `Licencia ${lic.tipo}${lic.motivo ? ': ' + lic.motivo : ''}`,
          })
        }
      }
    })

    // Procesar permisos
    permisos?.forEach((perm) => {
      const profesor = profesoresMap.get(perm.profesor_id)
      if (!profesor) return
      const tipoLabel = perm.tipo === 'dia_completo' ? 'Día completo' : perm.tipo === 'medio_dia_AM' ? 'Medio día AM' : 'Medio día PM'
      addEvento(perm.fecha, {
        profesor_id: perm.profesor_id,
        profesor_nombre: profesor.nombre,
        departamento: profesor.departamento,
        tipo: 'permiso',
        subtipo: perm.tipo,
        detalle: `Permiso: ${tipoLabel}${perm.motivo ? ' - ' + perm.motivo : ''}`,
      })
    })

    // Procesar ausencias
    ausencias?.forEach((aus) => {
      const profesor = profesoresMap.get(aus.profesor_id)
      if (!profesor) return
      addEvento(aus.fecha, {
        profesor_id: aus.profesor_id,
        profesor_nombre: profesor.nombre,
        departamento: profesor.departamento,
        tipo: aus.tipo === 'con_aviso' ? 'ausencia_con_aviso' : 'ausencia_sin_aviso',
        subtipo: null,
        detalle: aus.tipo === 'sin_aviso'
          ? `Ausencia SIN AVISO${aus.justificacion ? ': ' + aus.justificacion : ''}`
          : `Ausencia con aviso${aus.justificacion ? ': ' + aus.justificacion : ''}`,
      })
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
  } catch (err: any) {
    console.error('Calendario error:', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}