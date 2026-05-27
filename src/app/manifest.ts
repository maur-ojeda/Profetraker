import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Profe Tracker — Gestión Docente',
    short_name: 'ProfeTracker',
    description: 'Sistema de gestión de asistencia, licencias y actividades docentes',
    start_url: '/dashboard',
    display: 'standalone',
    orientation: 'any',
    background_color: '#ffffff',
    theme_color: '#17171c',
    categories: ['education', 'productivity'],
    lang: 'es-CL',
    icons: [
      { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
      { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
    ],
    screenshots: [],
  }
}
