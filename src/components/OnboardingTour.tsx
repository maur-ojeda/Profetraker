'use client'

import { useEffect, useCallback } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

const TOUR_KEY = 'profetraker_tour_done'

const steps = [
  {
    element: 'a[href="/dashboard"]',
    popover: {
      title: '👋 Bienvenido a Profe Tracker',
      description: 'Tu panel de gestión docente. Aquí ves el resumen semanal de ausencias, licencias y eventos del colegio.',
      side: 'bottom' as const,
      align: 'start' as const,
    },
  },
  {
    element: 'a[href="/profesores"]',
    popover: {
      title: '👩‍🏫 Profesores',
      description: 'Gestiona la planta docente: agrega, edita y consulta la información de cada profesor.',
      side: 'bottom' as const,
      align: 'start' as const,
    },
  },
  {
    element: 'a[href="/licencias"]',
    popover: {
      title: '🩺 Licencias médicas',
      description: 'Registra y consulta las licencias médicas. Puedes filtrar por profesor, fecha y tipo.',
      side: 'bottom' as const,
      align: 'start' as const,
    },
  },
  {
    element: 'a[href="/salidas"]',
    popover: {
      title: '🚌 Salidas pedagógicas',
      description: 'Administra las salidas a terreno: destino, fecha, profesores responsables y estado.',
      side: 'bottom' as const,
      align: 'start' as const,
    },
  },
  {
    element: 'a[href="/reuniones"]',
    popover: {
      title: '🤝 Reuniones',
      description: 'Registra acuerdos y actas de reuniones docentes para tener todo documentado.',
      side: 'bottom' as const,
      align: 'start' as const,
    },
  },
  {
    element: 'a[href="/consejo"]',
    popover: {
      title: '🏫 Consejo de profesores',
      description: 'Gestión específica del consejo: asistencia, acuerdos y seguimiento.',
      side: 'bottom' as const,
      align: 'start' as const,
    },
  },
  {
    element: 'a[href="/hitos"]',
    popover: {
      title: '🚩 Hitos PME',
      description: 'Fechas clave del calendario: evaluaciones, simulacros, reuniones de apoderados y más.',
      side: 'bottom' as const,
      align: 'start' as const,
    },
  },
  {
    element: 'a[href="/chat"]',
    popover: {
      title: '🤖 Chat con IA',
      description: 'Pregúntale al asistente: "¿Quién tiene licencia esta semana?", "Crea un hito para el 15 de noviembre", o cualquier consulta sobre la gestión del colegio.',
      side: 'bottom' as const,
      align: 'start' as const,
    },
  },
]

export default function OnboardingTour({ forceStart = false, onFinish }: { forceStart?: boolean; onFinish?: () => void }) {
  const startTour = useCallback(() => {
    const driverObj = driver({
      showProgress: true,
      progressText: '{{current}} de {{total}}',
      nextBtnText: 'Siguiente →',
      prevBtnText: '← Anterior',
      doneBtnText: '¡Listo!',
      steps,
      onDestroyed: () => {
        try { localStorage.setItem(TOUR_KEY, '1') } catch {}
        onFinish?.()
      },
    })
    driverObj.drive()
  }, [onFinish])

  // Auto-start on first visit
  useEffect(() => {
    if (forceStart) { startTour(); return }
    try {
      if (!localStorage.getItem(TOUR_KEY)) startTour()
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceStart])

  return null
}

export function resetTour() {
  try { localStorage.removeItem(TOUR_KEY) } catch {}
}
