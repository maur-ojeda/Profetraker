import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/semanal?fecha=2026-05-04 (cualquier día de la semana)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const fechaParam = searchParams.get('fecha')

  try {
    // Calcular lunes a viernes de la semana
    const ref = fechaParam ? new Date(fechaParam + 'T12:00:00') : new Date()
    const diaSemana = ref.getDay()
    const diffLunes = diaSemana === 0 ? -6 : 1 - diaSemana // Si es domingo, va al lunes anterior
    const lunes = new Date(ref)
    lunes.setDate(ref.getDate() + diffLunes)
    const viernes = new Date(lunes)
    viernes.setDate(lunes.getDate() + 4)

    const fechaDesde = lunes.toISOString().split('T')[0]
    const fechaHasta = viernes.toISOString().split('T')[0]
    const mesDesde = fechaDesde.substring(0, 7)

    // 1. Profesores activos
    const { data: profesores } = await supabase
      .from('profesores')
      .select('id, nombre, email, departamento, telefono')
      .eq('activo', true)

    const profesoresMap = new Map(profesores?.map((p) => [p.id, p]) || [])
    const profesorIds = [...profesoresMap.keys()]

    // 2. Licencias activas en el rango
    const { data: licencias } = await supabase
      .from('licencias')
      .select('*')
      .in('profesor_id', profesorIds)
      .lte('fecha_desde', fechaHasta)
      .gte('fecha_hasta', fechaDesde)
      .eq('estado', 'activa')

    // 3. Permisos en el rango
    const { data: permisos } = await supabase
      .from('permisos_administrativos')
      .select('*')
      .in('profesor_id', profesorIds)
      .gte('fecha', fechaDesde)
      .lte('fecha', fechaHasta)

    // 4. Ausencias en el rango
    const { data: ausencias } = await supabase
      .from('ausencias')
      .select('*')
      .in('profesor_id', profesorIds)
      .gte('fecha', fechaDesde)
      .lte('fecha', fechaHasta)

    // 5. Reemplazos en el rango
    const { data: reemplazos } = await supabase
      .from('reemplazos')
      .select(`
        *,
        profesor_ausente:profesor_ausente_id (id, nombre, email, departamento),
        profesor_reemplazante:profesor_reemplazante_id (id, nombre, email, departamento),
        licencia:licencia_id (id, tipo, fecha_desde, fecha_hasta, motivo)
      `)
      .gte('fecha', fechaDesde)
      .lte('fecha', fechaHasta)

    // 6. Hitos PME en el rango
    const { data: hitos } = await supabase
      .from('hitos_pme')
      .select('*')
      .gte('fecha', fechaDesde)
      .lte('fecha', fechaHasta)

    // 7. Reuniones en el rango
    const { data: reuniones } = await supabase
      .from('reuniones')
      .select('*')
      .gte('fecha', fechaDesde)
      .lte('fecha', fechaHasta)
      .eq('estado', 'programada')

    // 8. Consejo en el rango
    const { data: consejos } = await supabase
      .from('consejo_profesores')
      .select('*')
      .gte('fecha', fechaDesde)
      .lte('fecha', fechaHasta)

    // 9. Salidas en el rango
    const { data: salidas } = await supabase
      .from('salidas_pedagogicas')
      .select('*')
      .gte('fecha', fechaDesde)
      .lte('fecha', fechaHasta)

    // Construir eventos por día (lun-vie)
    const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie']
    const eventosPorDia: Record<string, {
      fecha: string
      label: string
      licencias: any[]
      permisos: any[]
      ausencias: any[]
      hitos: any[]
      reuniones: any[]
      salidas: any[]
    }> = {}

    for (let i = 0; i < 5; i++) {
      const d = new Date(lunes)
      d.setDate(lunes.getDate() + i)
      const fechaStr = d.toISOString().split('T')[0]
      eventosPorDia[fechaStr] = {
        fecha: fechaStr,
        label: `${dias[i]} ${d.getDate()}`,
        licencias: [],
        permisos: [],
        ausencias: [],
        hitos: [],
        reuniones: [],
        salidas: [],
      }
    }

    // Poblar licencias (expandir multi-día)
    licencias?.forEach((lic) => {
      const desde = new Date(lic.fecha_desde + 'T12:00:00')
      const hasta = new Date(lic.fecha_hasta + 'T12:00:00')
      const prof = profesoresMap.get(lic.profesor_id)

      for (let d = new Date(desde); d <= hasta; d.setDate(d.getDate() + 1)) {
        const fs = d.toISOString().split('T')[0]
        if (eventosPorDia[fs] && prof) {
          eventosPorDia[fs].licencias.push({
            id: lic.id,
            profesor_id: lic.profesor_id,
            profesor_nombre: prof.nombre,
            profesor_departamento: prof.departamento,
            tipo: lic.tipo,
            fecha_desde: lic.fecha_desde,
            fecha_hasta: lic.fecha_hasta,
            motivo: lic.motivo,
          })
        }
      }
    })

    // Poblar permisos
    permisos?.forEach((perm) => {
      const prof = profesoresMap.get(perm.profesor_id)
      if (eventosPorDia[perm.fecha] && prof) {
        eventosPorDia[perm.fecha].permisos.push({
          id: perm.id,
          profesor_id: perm.profesor_id,
          profesor_nombre: prof.nombre,
          tipo: perm.tipo,
          motivo: perm.motivo,
        })
      }
    })

    // Poblar ausencias
    ausencias?.forEach((aus) => {
      const prof = profesoresMap.get(aus.profesor_id)
      if (eventosPorDia[aus.fecha] && prof) {
        eventosPorDia[aus.fecha].ausencias.push({
          id: aus.id,
          profesor_id: aus.profesor_id,
          profesor_nombre: prof.nombre,
          tipo: aus.tipo,
          justificacion: aus.justificacion,
        })
      }
    })

    // Poblar hitos
    hitos?.forEach((hito) => {
      const desde = new Date(hito.fecha + 'T12:00:00')
      const hasta = hito.fecha_fin ? new Date(hito.fecha_fin + 'T12:00:00') : desde

      for (let d = new Date(desde); d <= hasta; d.setDate(d.getDate() + 1)) {
        const fs = d.toISOString().split('T')[0]
        if (eventosPorDia[fs]) {
          eventosPorDia[fs].hitos.push({
            id: hito.id,
            titulo: hito.titulo,
            tipo: hito.tipo,
            descripcion: hito.descripcion,
            importante: hito.importante,
          })
        }
      }
    })

    // Poblar reuniones
    reuniones?.forEach((r) => {
      if (eventosPorDia[r.fecha]) {
        eventosPorDia[r.fecha].reuniones.push({
          id: r.id,
          titulo: r.titulo,
          tipo: r.tipo,
          hora_inicio: r.hora_inicio,
          lugar: r.lugar,
        })
      }
    })

    // Poblar consejos
    consejos?.forEach((c) => {
      if (eventosPorDia[c.fecha]) {
        eventosPorDia[c.fecha].reuniones.push({
          id: c.id,
          titulo: c.titulo,
          tipo: 'consejo',
          hora_inicio: c.hora_inicio,
          lugar: c.lugar,
        })
      }
    })

    // Poblar salidas
    salidas?.forEach((s) => {
      if (eventosPorDia[s.fecha]) {
        eventosPorDia[s.fecha].salidas.push({
          id: s.id,
          curso: s.curso,
          destino: s.destino,
          hora_salida: s.hora_salida,
          hora_regreso: s.hora_regreso,
          objetivo_pedagogico: s.objetivo_pedagogico,
          acompanantes: s.profesores_acompañantes,
        })
      }
    })

    // Construir resumen
    const totalLicencias = licencias?.length || 0
    const totalPermisos = permisos?.length || 0
    const totalAusencias = ausencias?.length || 0
    const totalSalidas = salidas?.length || 0
    const totalReuniones = (reuniones?.length || 0) + (consejos?.length || 0)

    // Reemplazos activos (pendientes o confirmados)
    const reemplazosActivos = (reemplazos || []).filter(
      (r: any) => r.estado === 'pendiente' || r.estado === 'confirmado'
    )

    return NextResponse.json({
      semana_desde: fechaDesde,
      semana_hasta: fechaHasta,
      lunes: fechaDesde,
      viernes: fechaHasta,
      eventos: eventosPorDia,
      profesores: profesores || [],
      reemplazos: reemplazos || [],
      reemplazos_activos: reemplazosActivos,
      resumen: {
        total_profesores: profesores?.length || 0,
        licencias: totalLicencias,
        permisos: totalPermisos,
        ausencias: totalAusencias,
        salidas: totalSalidas,
        reuniones: totalReuniones,
      },
    })
  } catch (err: any) {
    console.error('Semanal error:', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
